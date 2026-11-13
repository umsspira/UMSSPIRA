"use client";

import { CheckboxRow, FieldError } from "./review-ui";

type Props = {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  error?: string;
};

// Selección múltiple de motivos de observación (HU-16, CA-16.1).
// Los motivos se entregan siempre en el orden de la lista de opciones.
export function ReasonsSelector({ options, selected, onChange, disabled, error }: Props) {
  function toggle(option: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(option);
    else next.delete(option);
    onChange(options.filter((item) => next.has(item)));
  }

  return (
    <fieldset
      aria-describedby={error ? "observe-reasons-error" : undefined}
      className="min-w-0 space-y-2"
    >
      <legend className="mb-1.5 text-[13px] font-semibold text-abyssal-blue">
        Motivos de la observación
        <span className="text-truffle-trouble"> *</span>
      </legend>
      {options.map((option, index) => (
        <CheckboxRow
          key={option}
          id={`observe-reason-${index}`}
          checked={selected.includes(option)}
          onChange={(checked) => toggle(option, checked)}
          disabled={disabled}
          invalid={Boolean(error)}
        >
          {option}
        </CheckboxRow>
      ))}
      {error && (
        <div id="observe-reasons-error">
          <FieldError>{error}</FieldError>
        </div>
      )}
    </fieldset>
  );
}
