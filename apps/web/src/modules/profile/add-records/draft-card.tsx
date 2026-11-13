import type { DraftRecord } from '@/modules/profile/state/drafts-store';

const SECTION_LABELS: Record<DraftRecord['section'], string> = {
  education: 'Formación guardada en borrador',
  experience: 'Experiencia guardada en borrador',
  certification: 'Certificación guardada en borrador',
  project: 'Proyecto guardado en borrador',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// AAAA-MM-DD -> «Jul 2023»
function formatMonth(date: string): string {
  const [year, month] = date.split('-');
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : date;
}

/** Título y detalle de la tarjeta según el apartado (Figma «E2S3 · P8 · 02 Con borradores»). */
export function describeDraft(draft: DraftRecord): { title: string; detail: string } {
  switch (draft.section) {
    case 'education':
      return {
        title: draft.data.titulo,
        detail: [draft.data.institucion, draft.data.anioEgreso, draft.data.grado].join(' · '),
      };
    case 'experience':
      return {
        title: draft.data.cargo,
        detail: `${draft.data.empresa} · ${formatMonth(draft.data.fechaInicio)} – ${
          draft.data.fechaFin ? formatMonth(draft.data.fechaFin) : 'Presente'
        }`,
      };
    case 'certification': {
      const { respaldo } = draft.data;
      const backup = respaldo ? `Respaldo ${respaldo.type === 'application/pdf' ? 'PDF' : 'JPG'}` : null;
      return {
        title: draft.data.nombre,
        detail: [draft.data.entidadEmisora, draft.data.anioEmision, backup].filter(Boolean).join(' · '),
      };
    }
    case 'project':
      return {
        title: draft.data.nombre,
        detail: [draft.data.enlace, draft.data.tecnologias].filter(Boolean).join(' · '),
      };
  }
}

const ACTION_CLASS =
  'rounded-lg border border-oatmeal bg-white px-3.5 py-2 text-[13px] font-semibold text-blue-fantastic transition hover:bg-palladian';

type DraftCardProps = {
  draft: DraftRecord;
  // El borrador está cargado en su formulario para editarlo
  isEditing?: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

export function DraftCard({ draft, isEditing = false, onEdit, onRemove }: DraftCardProps) {
  const described = describeDraft(draft);
  // Un borrador incompleto (HU-14) puede no tener título todavía
  const title = described.title || 'Sin título';
  const { detail } = described;
  return (
    <li
      className={`flex flex-col gap-1.5 rounded-lg border bg-white p-3.5 ${
        isEditing ? 'border-truffle-trouble' : 'border-oatmeal'
      }`}
    >
      <p className="text-xs font-semibold text-truffle-trouble">
        {draft.isIncomplete ? 'borrador incompleto' : SECTION_LABELS[draft.section]}
      </p>
      <p className="break-words text-sm font-semibold text-blue-fantastic">{title}</p>
      <p className="break-words text-xs text-blue-fantastic/55">{detail}</p>
      <div className="flex gap-2 pt-0.5">
        <button type="button" onClick={onEdit} aria-label={`Editar ${title}`} className={ACTION_CLASS}>
          Editar
        </button>
        <button type="button" onClick={onRemove} aria-label={`Quitar ${title}`} className={ACTION_CLASS}>
          Quitar
        </button>
      </div>
    </li>
  );
}
