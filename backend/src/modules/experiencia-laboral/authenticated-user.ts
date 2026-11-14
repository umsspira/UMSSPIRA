export interface AuthenticatedUser {
  authUserId: string;
  usuarioId: string;
  egresadoId: string;
  role: string | null;
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user: AuthenticatedUser;
}
