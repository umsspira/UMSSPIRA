import type { StatusQueryState } from '../../domain/policies/status-query.policy';

export const STATUS_QUERY_GENERIC_MESSAGE =
  'Si existe una solicitud vinculada a ese correo, recibirás un mensaje con su estado.';

export type StatusQueryKind =
  | 'pendiente'
  | 'observada'
  | 'rechazada'
  | 'aprobada_por_activar'
  | 'aprobada_activa';

export interface StatusQueryTarget {
  applicationId: string;
  email: string; // correo verificado guardado, nunca el escrito en la petición
  fullName: string | null;
  kind: StatusQueryKind;
}

export const STATUS_MAIL_DISPATCHER = Symbol('STATUS_MAIL_DISPATCHER');

export interface StatusMailDispatcher {
  // 18.2 implementa esto: elige la plantilla, usa la cola y no toca el dictamen
  dispatch(target: StatusQueryTarget): Promise<void>;
}

export interface StatusQueryRecord {
  applicationId: string;
  email: string;
  fullName: string | null;
  state: StatusQueryState;
  activated: boolean;
}

export const STATUS_QUERY_READER = Symbol('STATUS_QUERY_READER');

export interface StatusQueryReader {
  findLatestByEmail(email: string): Promise<StatusQueryRecord | null>;
}