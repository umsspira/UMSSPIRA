"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CURRENT_EGRESADO_ID,
  createAcademicEducation,
  deleteAcademicEducation,
  listAcademicEducation,
  listCarreras,
  updateAcademicEducation,
} from "@/lib/academic-education/service";
import type {
  AcademicEducation,
  AcademicEducationPayload,
  Carrera,
} from "@/components/academic-education/types";

export function useAcademicEducation() {
  const [records, setRecords] = useState<AcademicEducation[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const items = await listAcademicEducation(CURRENT_EGRESADO_ID);
    setRecords(items);
    setError(null);
  }, []);

  useEffect(() => {
    let isActive = true;

    void listAcademicEducation(CURRENT_EGRESADO_ID)
      .then((items) => {
        if (isActive) {
          setRecords(items);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (isActive) setError(reason);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return {
    idEgresado: CURRENT_EGRESADO_ID,
    records,
    error,
    isLoading,
    async create(payload: AcademicEducationPayload) {
      const created = await createAcademicEducation(payload);
      await refresh();
      return created;
    },
    async update(idFormacion: string, payload: AcademicEducationPayload) {
      const updated = await updateAcademicEducation(idFormacion, payload);
      await refresh();
      return updated;
    },
    async remove(idFormacion: string) {
      await deleteAcademicEducation(idFormacion);
      await refresh();
    },
  };
}

export function useCarreras() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void listCarreras()
      .then((items) => {
        if (isActive) {
          setCarreras(items);
          setError(null);
        }
      })
      .catch((reason: unknown) => {
        if (isActive) setError(reason);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return { carreras, error, isLoading };
}
