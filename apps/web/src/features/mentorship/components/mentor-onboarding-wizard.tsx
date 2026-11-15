'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  InfoIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './mentor-button';
import { MentorOnboardingProgress } from './mentor-onboarding-progress';
import {
  OnboardingAreasStep,
  OnboardingAvailabilityStep,
  OnboardingInterestsStep,
} from './mentor-onboarding-steps';
import {
  getMentorOnboarding,
  MentorOnboardingError,
  saveMentorOnboardingAreas,
  saveMentorOnboardingAvailability,
  saveMentorOnboardingInterests,
  type MentorOnboardingState,
  type OnboardingAvailabilityStatus,
  type OnboardingSchedule,
} from '../services/mentor-onboarding-api';

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'Áreas técnicas',
  2: 'Intereses',
  3: 'Disponibilidad',
};

const WEEKDAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const STATUS_LABELS: Record<OnboardingAvailabilityStatus, string> = {
  DISPONIBLE: 'Disponible',
  EN_PAUSA: 'En pausa',
  NO_DISPONIBLE: 'No disponible',
};

function validateStep(
  step: Step,
  areaIds: string[],
  interestIds: string[],
  status: OnboardingAvailabilityStatus | null,
  schedules: OnboardingSchedule[],
): Record<string, string[]> | null {
  if (step === 1) {
    if (areaIds.length === 0) {
      return { areaIds: ['Selecciona al menos un área técnica para continuar'] };
    }
    if (areaIds.length > 5) {
      return { areaIds: ['Puedes seleccionar como máximo 5 áreas técnicas'] };
    }
    return null;
  }
  if (step === 2) {
    return interestIds.length === 0
      ? { interestIds: ['Selecciona al menos un interés para continuar'] }
      : null;
  }

  const fields: string[] = [];
  if (!status) {
    fields.push('Selecciona un estado de disponibilidad');
  }
  if (schedules.length === 0) {
    fields.push('Indica al menos un día y horario');
  }
  for (const schedule of schedules) {
    if (schedule.end <= schedule.start) {
      fields.push(`El horario del ${WEEKDAY_NAMES[schedule.weekday].toLowerCase()} debe terminar después de iniciar`);
    }
  }
  const seen = new Set<number>();
  for (const schedule of schedules) {
    if (seen.has(schedule.weekday)) {
      fields.push('Solo puede existir un horario por día');
      break;
    }
    seen.add(schedule.weekday);
  }
  return fields.length ? { schedules: fields } : null;
}

export function MentorOnboardingWizard() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState<MentorOnboardingState | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [status, setStatus] = useState<OnboardingAvailabilityStatus | null>(null);
  const [schedules, setSchedules] = useState<OnboardingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadCode, setLoadCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [savedNotice, setSavedNotice] = useState('');
  const [completeView, setCompleteView] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);

  const applyState = (state: MentorOnboardingState) => {
    setAreaIds(state.areas.selectedIds);
    setInterestIds(state.interests.selectedIds);
    setStatus(state.availability.availabilityStatus);
    setSchedules(state.availability.schedules);
  };

  function load() {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setLoadCode('');
    getMentorOnboarding(controller.signal)
      .then((state) => {
        if (controller.signal.aborted) return;
        setOnboarding(state);
        applyState(state);
        setStep(state.currentStep);
        setCompleteView(state.isComplete);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        const error = reason instanceof MentorOnboardingError ? reason : null;
        setLoadCode(error?.code ?? '');
        setLoadError(
          error?.status === 401
            ? 'Inicia sesión para configurar tu perfil de mentor.'
            : error?.status === 403
              ? error.message
              : 'No se pudo cargar tu configuración. Intenta nuevamente.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }

  useEffect(() => {
    mounted.current = true;
    const abort = load();
    return () => {
      mounted.current = false;
      abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!savedNotice) return;
    const timeout = window.setTimeout(() => setSavedNotice(''), 2500);
    return () => window.clearTimeout(timeout);
  }, [savedNotice]);

  useEffect(() => {
    if (!completeView) return;
    const timeout = window.setTimeout(() => router.push('/mentorship/profile'), 5000);
    return () => window.clearTimeout(timeout);
  }, [completeView, router]);

  function chooseDraft(stepValue: Step) {
    if (stepValue < step) {
      setFieldErrors({});
      setSaveError('');
      setStep(stepValue);
    }
  }

  async function saveAndContinue() {
    if (busy.current || saving) return;
    const errors = validateStep(step, areaIds, interestIds, status, schedules);
    if (errors) {
      setFieldErrors(errors);
      setSaveError('');
      return;
    }

    busy.current = true;
    setSaving(true);
    setSaveError('');
    setFieldErrors({});
    setSavedNotice('');
    try {
      let next: MentorOnboardingState;
      if (step === 1) {
        next = await saveMentorOnboardingAreas(areaIds);
      } else if (step === 2) {
        next = await saveMentorOnboardingInterests(interestIds);
      } else {
        next = await saveMentorOnboardingAvailability(status!, schedules);
      }
      if (!mounted.current) return;
      setOnboarding(next);
      applyState(next);
      if (next.isComplete) {
        setCompleteView(true);
        setStep(3);
        return;
      }
      setSavedNotice('Paso guardado correctamente');
      setStep(Math.min(3, step + 1) as Step);
    } catch (reason) {
      if (!mounted.current) return;
      const error = reason instanceof MentorOnboardingError ? reason : null;
      if (error) {
        setFieldErrors(error.fields);
        setSaveError(
          error.code === 'MENTOR_NO_HABILITADO'
            ? error.message
            : error.code === 'PASO_PREVIO_INCOMPLETO'
              ? 'Completa el paso anterior antes de guardar este paso.'
              : 'No se pudo guardar. Intenta nuevamente',
        );
      } else {
        setSaveError('No se pudo guardar. Intenta nuevamente');
      }
    } finally {
      if (mounted.current) setSaving(false);
      busy.current = false;
    }
  }

  if (loading) {
    return (
      <main className="mentorship-shell">
        <p role="status" className="onboarding-loading">Cargando tu configuración…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mentorship-shell">
        <section className="onboarding-load-error" role="alert">
          <InfoIcon aria-hidden="true" />
          <h1>No se pudo abrir la configuración</h1>
          <p>{loadError}</p>
          <div className="onboarding-actions">
            {loadCode === 'MENTOR_NO_HABILITADO' || loadCode === 'FORBIDDEN' ? (
              <Link href="/mentorship/profile" className="mentor-button mentor-button-primary">
                Revisar mi participación
              </Link>
            ) : loadError.startsWith('Inicia sesión') ? (
              <Link href="/login" className="mentor-button mentor-button-primary">
                Iniciar sesión
              </Link>
            ) : (
              <SecondaryButton onClick={() => void load()}>Reintentar</SecondaryButton>
            )}
            <Link href="/mentorship" className="mentor-button mentor-button-secondary">
              Volver a Mentorías
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!onboarding) return null;

  const selectedAreaNames = onboarding.areas.catalog
    .filter((area) => onboarding.areas.selectedIds.includes(area.id))
    .map((area) => area.nombre);
  const selectedInterestNames = onboarding.interests.catalog.flatMap((group) =>
    group.intereses.filter((interest) => onboarding.interests.selectedIds.includes(interest.id)).map((interest) => interest.nombre),
  );

  if (completeView && onboarding.isComplete) {
    return (
      <main className="mentorship-shell onboarding-page">
        <nav aria-label="Ruta de navegación" className="mentorship-breadcrumb">
          <ol className="breadcrumb-list">
            <li><Link href="/" className="breadcrumb-link">Inicio</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/mentorship" className="breadcrumb-link">Mentorías</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="breadcrumb-current">Configuración de mentor</li>
          </ol>
        </nav>
        <section className="onboarding-complete" role="status" aria-labelledby="onboarding-complete-title">
          <span aria-hidden="true" className="onboarding-complete-icon"><CheckCircle2Icon /></span>
          <h1 id="onboarding-complete-title">Tu perfil de mentor está completo</h1>
          <p>Tu configuración quedó guardada y ya puedes recibir solicitudes de mentoría.</p>
          <dl className="onboarding-summary">
            <div>
              <dt>Áreas técnicas</dt>
              <dd>{selectedAreaNames.join(', ') || 'Sin áreas'}</dd>
            </div>
            <div>
              <dt>Intereses</dt>
              <dd>{selectedInterestNames.join(', ') || 'Sin intereses'}</dd>
            </div>
            <div>
              <dt>Disponibilidad</dt>
              <dd>{onboarding.availability.availabilityStatus ? STATUS_LABELS[onboarding.availability.availabilityStatus] : 'Sin configurar'}</dd>
            </div>
            <div>
              <dt>Días y horarios</dt>
              <dd>
                {onboarding.availability.schedules.length
                  ? onboarding.availability.schedules
                      .map((schedule) => `${WEEKDAY_NAMES[schedule.weekday]} ${schedule.start}–${schedule.end}`)
                      .join(' · ')
                  : 'Sin horarios'}
              </dd>
            </div>
          </dl>
          <div className="onboarding-actions">
            <Link href="/mentorship/profile" className="mentor-button mentor-button-primary">
              Ir a mi perfil de mentor <ArrowRightIcon className="icon" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mentorship-shell onboarding-page">
      <nav aria-label="Ruta de navegación" className="mentorship-breadcrumb">
        <ol className="breadcrumb-list">
          <li><Link href="/" className="breadcrumb-link">Inicio</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/mentorship" className="breadcrumb-link">Mentorías</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="breadcrumb-current">Configuración de mentor</li>
        </ol>
      </nav>

      <p className="page-eyebrow">Red universitaria de desarrollo</p>
      <h1 className="page-title page-title-with-eyebrow">Configura tu perfil de mentor</h1>
      <p className="page-description">
        Completa los tres pasos en orden. Tu avance se guarda paso a paso y puedes retomarlo cuando quieras.
      </p>

      <MentorOnboardingProgress
        currentStep={step}
        totalSteps={onboarding.totalSteps}
        steps={onboarding.steps}
        completedSteps={onboarding.completedSteps}
        onSelect={chooseDraft}
      />

      <section className="onboarding-card" aria-labelledby="onboarding-step-title">
        <div className="onboarding-card-heading">
          <span aria-hidden="true"><ShieldCheckIcon /></span>
          <div>
            <p>Paso {step} de {onboarding.totalSteps}</p>
            <h2 id="onboarding-step-title">{STEP_TITLES[step]}</h2>
          </div>
        </div>

        {step === 1 && (
          <OnboardingAreasStep
            catalog={onboarding.areas.catalog}
            selectedIds={areaIds}
            errors={fieldErrors}
            disabled={saving}
            onChange={(ids) => {
              setAreaIds(ids);
              setFieldErrors((current) => ({ ...current, areaIds: [] }));
            }}
          />
        )}
        {step === 2 && (
          <OnboardingInterestsStep
            groups={onboarding.interests.catalog}
            selectedIds={interestIds}
            errors={fieldErrors}
            disabled={saving}
            onChange={(ids) => {
              setInterestIds(ids);
              setFieldErrors((current) => ({ ...current, interestIds: [] }));
            }}
          />
        )}
        {step === 3 && (
          <OnboardingAvailabilityStep
            status={status}
            schedules={schedules}
            errors={fieldErrors}
            disabled={saving}
            onStatusChange={(value) => {
              setStatus(value);
              setFieldErrors((current) => ({ ...current, availabilityStatus: [] }));
            }}
            onSchedulesChange={(value) => {
              setSchedules(value);
              setFieldErrors((current) => ({ ...current, schedules: [] }));
            }}
          />
        )}

        {savedNotice && <p className="onboarding-saved" role="status">{savedNotice}</p>}
        {saveError && (
          <div className="onboarding-error" role="alert">
            <InfoIcon aria-hidden="true" />
            <p>{saveError}</p>
          </div>
        )}

        <footer className="onboarding-footer">
          <SecondaryButton
            onClick={() => (step > 1 ? chooseDraft((step - 1) as Step) : router.push('/mentorship/profile'))}
            disabled={saving}
          >
            <ArrowLeftIcon className="icon-small" aria-hidden="true" /> Atrás
          </SecondaryButton>
          <PrimaryButton
            onClick={() => void saveAndContinue()}
            loading={saving}
            loadingLabel="Guardando…"
            iconRight={ArrowRightIcon}
            disabled={saving}
          >
            Guardar y continuar
          </PrimaryButton>
        </footer>
      </section>
    </main>
  );
}
