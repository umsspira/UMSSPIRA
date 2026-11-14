"use client";

import { CheckboxRow, FieldError } from "./review-ui";

type Props = {
  options: readonly { code: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  error?: string;
};

// Selección múltiple de motivos de observación (HU-16, CA-16.1).
// Los motivos se entregan siempre en el orden de la lista de opciones.
export function ReasonsSelector({ options, selected, onChange, disabled, error }: Props) {
  function toggle(code: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(code);
    else next.delete(code);
    onChange(options.filter((item) => next.has(item.code)).map((item) => item.code));
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
          key={option.code}
          id={`observe-reason-${index}`}
          checked={selected.includes(option.code)}
          onChange={(checked) => toggle(option.code, checked)}
          disabled={disabled}
          invalid={Boolean(error)}
        >
          {option.label}
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
