import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type {
  JobPostingAffinityBatchItem,
  JobPostingAffinityBatchResponse,
  JobPostingAffinityResult,
  JobPostingAffinityBatchRequest,
} from '@umsspira/shared-types';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { AffinityDictionaryUnavailableError } from '../../domain/errors/affinity-dictionary-unavailable.error';
import { normalizeTechnicalRequirementName } from '../../domain/policies/normalize-technical-requirement-name';
import type {
  JobPostingAffinityDataPort,
  JobPostingAffinityProfile,
  JobPostingAffinityRequirements,
} from '../ports/job-posting-affinity-data.port';
import { JOB_POSTING_AFFINITY_DATA } from '../ports/job-posting-affinity-data.port';
import type { JobPostingAffinityBatchDataPort } from '../ports/job-posting-affinity-batch-data.port';
import { JOB_POSTING_AFFINITY_BATCH_DATA } from '../ports/job-posting-affinity-batch-data.port';
import { CalculateJobPostingAffinity } from './calculate-job-posting-affinity.use-case';


const ERROR_ITEM = {
  code: 'AFFINITY_CALCULATION_FAILED',
  message: 'No se pudo calcular la afinidad de este recurso. Inténtalo nuevamente.',
  retryable: true,
} as const;


@Injectable()
export class CalculateJobPostingAffinityBatch {
  constructor(
    @Inject(JOB_POSTING_AFFINITY_DATA) private readonly affinityData: JobPostingAffinityDataPort,
    @Inject(JOB_POSTING_AFFINITY_BATCH_DATA) private readonly batchData: JobPostingAffinityBatchDataPort,
    private readonly calculate: CalculateJobPostingAffinity,
    private readonly now: () => Date = () => new Date(),
  ) {}


  async execute(
    actor: ActorContext,
    input: JobPostingAffinityBatchRequest,
  ): Promise<JobPostingAffinityBatchResponse> {
    if (input.mode === 'vacancies') {
      this.assertAccess(actor, 'titulado', 'perfil:self:read');
      return this.forGraduate(actor, input.vacancyIds);
    }
    this.assertAccess(actor, 'empresa', 'empresas:self:read');
    return this.forCompany(actor, input.vacancyId, input.applicationIds);
  }


  private assertAccess(actor: ActorContext, role: ActorContext['role'], permission: string): void {
    if (actor.role !== role || !actor.permissions.includes(permission)) {
      throw new ForbiddenException();
    }
  }


  private async forGraduate(actor: ActorContext, ids: string[]): Promise<JobPostingAffinityBatchResponse> {
    const vacancies = await this.batchData.readPublicVacancies(ids, this.now());
    if (vacancies.length !== ids.length) throw new ForbiddenException();
    const [profile] = await this.affinityData.readProfiles([actor.id]);
    const results = await this.calculateByRequirements(profile ?? null, vacancies);
    return {
      data: ids.map((vacancyId) => {
        const result = results.get(vacancyId);
        return result
          ? this.success(vacancyId, result)
          : { vacancyId, result: null, error: ERROR_ITEM };
      }),
    };
  }


  private async forCompany(
    actor: ActorContext,
    vacancyId: string,
    applicationIds: string[],
  ): Promise<JobPostingAffinityBatchResponse> {
    const scoped = await this.batchData.readCompanyVacancyApplications(vacancyId, actor.id, applicationIds);
    if (!scoped || scoped.applications.length !== applicationIds.length) throw new ForbiddenException();
    const profiles = await this.affinityData.readProfiles(
      scoped.applications.flatMap(({ userId }) => userId ? [userId] : []),
    );
    const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
    const applicationById = new Map(
      scoped.applications.map((application) => [application.applicationId, application]),
    );
    const groups = new Map<string, string[]>();
    for (const applicationId of applicationIds) {
      const userId = applicationById.get(applicationId)?.userId ?? null;
      const key = userId ?? '__no_user__';
      groups.set(key, [...(groups.get(key) ?? []), applicationId]);
    }
    const resultByApplication = new Map<string, JobPostingAffinityResult | null>();
    const errorByApplication = new Map<string, JobPostingAffinityBatchItem['error']>();
    for (const [userKey, groupIds] of groups) {
      const profile = userKey === '__no_user__' ? null : profileByUser.get(userKey) ?? null;
      try {
        const calculated = await this.calculateByRequirements(profile, [scoped.vacancy]);
        const result = calculated.get(vacancyId);
        if (!result) throw new Error('Resultado ausente');
        for (const applicationId of groupIds) resultByApplication.set(applicationId, result);
      } catch (error) {
        if (error instanceof AffinityDictionaryUnavailableError) throw error;
        for (const applicationId of groupIds) {
          resultByApplication.set(applicationId, null);
          errorByApplication.set(applicationId, ERROR_ITEM);
        }
      }
    }
    return {
      data: applicationIds.map((applicationId) => {
        const result = resultByApplication.get(applicationId);
        return result
          ? { vacancyId, applicationId, result, error: null }
          : { vacancyId, applicationId, result: null, error: errorByApplication.get(applicationId) ?? ERROR_ITEM };
      }),
    };
  }


  private async calculateByRequirements(
    profile: JobPostingAffinityProfile | null,
    vacancies: readonly JobPostingAffinityRequirements[],
  ): Promise<Map<string, JobPostingAffinityResult | null>> {
    const empty = vacancies.filter((vacancy) =>
      !vacancy.requirements.some((name) => normalizeTechnicalRequirementName(name)),
    );
    const required = vacancies.filter((vacancy) =>
      vacancy.requirements.some((name) => normalizeTechnicalRequirementName(name)),
    );
    const results = new Map<string, JobPostingAffinityResult | null>();
    if (empty.length) {
      try {
        for (const item of await this.calculate.execute({ profile, vacancies: empty })) results.set(item.vacancyId, item.result);
      } catch {
        for (const { vacancyId } of empty) results.set(vacancyId, null);
      }
    }
    if (!required.length) return results;
    try {
      for (const item of await this.calculate.execute({ profile, vacancies: required })) results.set(item.vacancyId, item.result);
    } catch (error) {
      if (error instanceof AffinityDictionaryUnavailableError) throw error;
      for (const { vacancyId } of required) results.set(vacancyId, null);
    }
    return results;
  }


  private success(vacancyId: string, result: JobPostingAffinityResult): JobPostingAffinityBatchItem {
    return { vacancyId, result, error: null };
  }
}
