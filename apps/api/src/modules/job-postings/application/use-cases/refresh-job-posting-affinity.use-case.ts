import type { JobPostingAffinityResult } from '@umsspira/shared-types';
import type { JobPostingAffinityDataPort, JobPostingAffinityProfile, JobPostingAffinityRequirements } from '../ports/job-posting-affinity-data.port';
import type { AffinityApplication, JobPostingAffinityRefreshPort } from '../ports/job-posting-affinity-refresh.port';
import { jobPostingAffinityInputHash } from '../../domain/policies/job-posting-affinity-input-hash';
import { normalizeTechnicalRequirementName } from '../../domain/policies/normalize-technical-requirement-name';
import { CalculateJobPostingAffinity } from './calculate-job-posting-affinity.use-case';

export type RefreshedMatchStatus = JobPostingAffinityResult['status'] | 'pending' | 'error';
export type RefreshedMatches = Map<string, RefreshedMatchStatus>;
const PAGE_SIZE = 50;
type ClaimedApplication = {
  application: AffinityApplication;
  hash: string;
  vacancy: JobPostingAffinityRequirements;
  claimId: string;
};

export class RefreshJobPostingAffinity {
  constructor(
    private readonly data: JobPostingAffinityDataPort,
    private readonly repository: JobPostingAffinityRefreshPort,
    private readonly calculate: CalculateJobPostingAffinity,
  ) {}

  async forUser(userId: string): Promise<RefreshedMatches> {
    return this.pages((offset) => this.repository.listForUser(userId, offset, PAGE_SIZE));
  }

  async forVacancy(vacancyId: string, companyUserId: string): Promise<RefreshedMatches> {
    return this.pages((offset) => this.repository.listForVacancy(vacancyId, companyUserId, offset, PAGE_SIZE));
  }

  async forApplication(vacancyId: string, companyUserId: string, applicationId: string): Promise<RefreshedMatches> {
    return this.refresh(await this.repository.listOne(vacancyId, companyUserId, applicationId));
  }

  private async pages(read: (offset: number) => Promise<AffinityApplication[]>): Promise<RefreshedMatches> {
    const statuses: RefreshedMatches = new Map();
    let offset = 0;
    while (true) {
      const applications = await read(offset);
      if (!applications.length) {break;}
      for (const [id, status] of await this.refresh(applications)) {statuses.set(id, status);}
      offset += applications.length;
      if (applications.length < PAGE_SIZE) {break;}
    }
    return statuses;
  }

  private async refresh(applications: AffinityApplication[]): Promise<RefreshedMatches> {
    const statuses: RefreshedMatches = new Map();
    if (!applications.length) {return statuses;}
    const [profiles, vacancies] = await Promise.all([
      this.data.readProfiles([...new Set(applications.map((item) => item.userId))]),
      this.data.readRequirements([...new Set(applications.map((item) => item.vacancyId))]),
    ]);
    const byUser = new Map(profiles.map((profile) => [profile.userId, profile]));
    const byVacancy = new Map(vacancies.map((vacancy) => [vacancy.vacancyId, vacancy]));
    const pending = new Map<string, ClaimedApplication[]>();
    for (const application of applications) {
      const vacancy = byVacancy.get(application.vacancyId);
      if (!vacancy) { statuses.set(application.id, 'pending'); continue; }
      const hash = jobPostingAffinityInputHash(byUser.get(application.userId) ?? null, vacancy);
      if (hash === application.inputHash && application.matchStatus) {
        statuses.set(application.id, application.matchStatus as RefreshedMatchStatus);
        continue;
      }
      let claimId: string | null;
      try {
        claimId = await this.repository.claim(application, hash);
      } catch {
        statuses.set(application.id, 'error');
        continue;
      }
      if (!claimId) {statuses.set(application.id, 'pending'); continue;}
      const group = pending.get(application.userId) ?? [];
      group.push({ application, hash, vacancy, claimId });
      pending.set(application.userId, group);
      statuses.set(application.id, 'pending');
    }
    for (const [userId, group] of pending) {
      const profile: JobPostingAffinityProfile | null = byUser.get(userId) ?? null;
      const withoutRequirements = group.filter(({ vacancy }) =>
        !vacancy.requirements.some((name) => normalizeTechnicalRequirementName(name)));
      const withRequirements = group.filter(({ vacancy }) =>
        vacancy.requirements.some((name) => normalizeTechnicalRequirementName(name)));
      await this.calculateAndPersist(withoutRequirements, profile, statuses);
      await this.calculateAndPersist(withRequirements, profile, statuses);
    }
    return statuses;
  }

  private async calculateAndPersist(group: ClaimedApplication[], profile: JobPostingAffinityProfile | null, statuses: RefreshedMatches): Promise<void> {
    if (!group.length) {return;}
    try {
      const calculated = await this.calculate.execute({
        profile,
        vacancies: group.map(({ vacancy }) => vacancy),
      });
      const results = new Map(calculated.map((item) => [item.vacancyId, item.result]));
      for (const { application, hash, claimId } of group) {
        const result = results.get(application.vacancyId);
        if (!result) {
          await this.release(application.id, claimId);
          statuses.set(application.id, 'error');
          continue;
        }
        try {
          if (await this.repository.persistIfCurrent(application, hash, result, claimId)) {
            statuses.set(application.id, result.status);
          } else {
            await this.release(application.id, claimId);
          }
        } catch {
          await this.release(application.id, claimId);
          statuses.set(application.id, 'error');
        }
      }
    } catch {
      for (const { application, claimId } of group) {
        await this.release(application.id, claimId);
        statuses.set(application.id, 'error');
      }
    }
  }

  private async release(applicationId: string, claimId: string): Promise<void> {
    try {
      await this.repository.releaseClaim(applicationId, claimId);
    } catch {
      // El reclamo persistido vence; una lectura posterior podrá reintentarlo.
    }
  }
}
