import { SKILLS_STORAGE_KEY } from './comparison-data';
import {
  VACANCIES_CHANGED_EVENT,
  VACANCIES_STORAGE_KEY,
} from './vacancy-data';

export const SERVER_STORAGE_SNAPSHOT = '__umsspira_server_snapshot__';
export const STORAGE_READ_ERROR_SNAPSHOT = '__umsspira_storage_read_error__';

export function subscribeToLocalStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(VACANCIES_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(VACANCIES_CHANGED_EVENT, onChange);
  };
}

export function readVacancySnapshot(): string | null {
  try {
    return localStorage.getItem(VACANCIES_STORAGE_KEY);
  } catch {
    return STORAGE_READ_ERROR_SNAPSHOT;
  }
}

export function readComparisonSnapshot(): string {
  try {
    return JSON.stringify([
      localStorage.getItem(VACANCIES_STORAGE_KEY),
      localStorage.getItem(SKILLS_STORAGE_KEY),
    ]);
  } catch {
    return STORAGE_READ_ERROR_SNAPSHOT;
  }
}
