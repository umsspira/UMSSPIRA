"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DOCUMENT_ERROR_MESSAGES,
  validateDocumentFile,
} from "@/modules/documents/frontend/validation/document-file";

export type CorrectionValues = {
  firstName: string;
  lastName: string;
  birthDate: string;
  ci: string;
  complement: string;
  issuedIn: string;
  email: string;
  phone: string;
  career: string;
  graduationYear: string;
  sisCode: string;
  documentType: string;
};

export type CorrectionErrors = Partial<Record<keyof CorrectionValues | "file", string>>;

export type CorrectionResult = {
  values: CorrectionValues;
  changedFields: (keyof CorrectionValues)[];
  file: File | null;
  emailChanged: boolean;
};

// TODO: reemplazar por el schema de registration/frontend/validation/personal-data.schema.ts
const REQUIRED: (keyof CorrectionValues)[] = [
  "firstName",
  "lastName",
  "birthDate",
  "ci",
  "issuedIn",
  "email",
  "phone",
  "graduationYear",
  "documentType",
];

function validateField(name: keyof CorrectionValues, value: string): string | null {
  const v = value.trim();
  if (REQUIRED.includes(name) && !v) return "Este campo es obligatorio.";
  if (name === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    return "Ingresa un correo válido.";
  }
  if (name === "ci" && v && !/^\d{5,10}$/.test(v)) {
    return "El C.I. debe tener entre 5 y 10 dígitos.";
  }
  if (name === "phone" && v && !/^\d{8}$/.test(v)) {
    return "Ingresa un celular válido de 8 dígitos.";
  }
  return null;
}

export function useObservedCorrection(initial: CorrectionValues) {
  const [values, setValues] = useState<CorrectionValues>(initial);
  const [file, setFileState] = useState<File | null>(null);
  const [errors, setErrors] = useState<CorrectionErrors>({});

  const changedFields = useMemo(
    () =>
      (Object.keys(values) as (keyof CorrectionValues)[]).filter(
        (k) => values[k] !== initial[k],
      ),
    [values, initial],
  );

  const hasChanges = changedFields.length > 0 || file !== null;
  const emailChanged = values.email.trim() !== initial.email.trim();

  const setValue = useCallback((name: keyof CorrectionValues, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) ?? undefined }));
  }, []);

  const setFileError = useCallback((message: string | null) => {
    setErrors((prev) => ({ ...prev, file: message ?? undefined }));
  }, []);

  const setFile = useCallback(async (next: File | null) => {
    if (!next) {
      // No limpiar el error: el dropzone llama a onFileSelect(null) justo después de rechazar un archivo.
      setFileState(null);
      return;
    }
    const kind = await validateDocumentFile(next);
    if (!kind) {
      setFileState(null);
      setErrors((prev) => ({ ...prev, file: DOCUMENT_ERROR_MESSAGES.invalidFile }));
      return;
    }
    setFileState(next);
    setErrors((prev) => ({ ...prev, file: undefined }));
  }, []);

  const validateAll = useCallback((): CorrectionResult | null => {
    const next: CorrectionErrors = {};
    (Object.keys(values) as (keyof CorrectionValues)[]).forEach((k) => {
      const e = validateField(k, values[k]);
      if (e) next[k] = e;
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return { values, changedFields, file, emailChanged };
  }, [values, file, changedFields, emailChanged]);

  return {
    values,
    file,
    errors,
    hasChanges,
    emailChanged,
    setValue,
    setFile,
    setFileError,
    validateAll,
  };
}