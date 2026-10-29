'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SurveyDraftStatus } from '../components/survey-draft-notice';
import type { SurveyDraft, WorkCondition, WorkModality } from '../types/survey.types';

const KEY_PREFIX = 'umsspira:survey-draft:';
const CONDITIONS: WorkCondition[] = ['works', 'not-works'];
const MODALITIES: WorkModality[] = ['presencial', 'remoto', 'hibrido'];

const buildKey = (userId: string) => `${KEY_PREFIX}${userId}`;

function text(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined;
}

export function sanitizeDraft(raw: unknown): SurveyDraft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;
  const condition = data.workCondition;
  if (!CONDITIONS.includes(condition as WorkCondition)) return null;

  if (condition === 'not-works') return { workCondition: 'not-works' };

  const modalidad = MODALITIES.includes(data.modalidad as WorkModality)
    ? (data.modalidad as WorkModality)
    : undefined;

  return {
    workCondition: 'works',
    cargo: text(data.cargo, 100),
    empresa: text(data.empresa, 100),
    area: text(data.area, 100),
    modalidad,
  };
}

function readDraft(userId: string): SurveyDraft | null {
  try {
    const stored = window.localStorage.getItem(buildKey(userId));
    return stored ? sanitizeDraft(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

export function clearSurveyDraft(userId: string): void {
  try {
    window.localStorage.removeItem(buildKey(userId));
  } catch {
    /* sin acceso a storage */
  }
}

export function clearAllSurveyDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* sin acceso a storage */
  }
}

export function useSurveyDraft(userId: string | undefined) {
  const [draft, setDraft] = useState<SurveyDraft | null>(null);
  const [status, setStatus] = useState<SurveyDraftStatus>('idle');

  useEffect(() => {
    if (!userId) return;
    const stored = readDraft(userId);
    if (stored) {
      setDraft(stored);
      setStatus('recovered');
    }
  }, [userId]);

  const saveDraft = useCallback(
    (values: SurveyDraft) => {
      if (!userId) return;
      const clean = sanitizeDraft(values);
      if (!clean) return;
      try {
        window.localStorage.setItem(buildKey(userId), JSON.stringify(clean));
        setStatus('saved');
      } catch {
        /* storage lleno o bloqueado */
      }
    },
    [userId],
  );

  const clearDraft = useCallback(() => {
    if (userId) clearSurveyDraft(userId);
    setDraft(null);
    setStatus('idle');
  }, [userId]);

  return { draft, status, saveDraft, clearDraft };
}