import { apiClient } from "@/shared/services/api-client";

export const STATUS_QUERY_GENERIC_MESSAGE =
  "Si existe una solicitud vinculada a ese correo, recibirás un mensaje con su estado.";

interface StatusQueryResponse {
  data?: {
    message?: string;
  };
}

export async function requestApplicationStatus(
  email: string,
): Promise<string> {
  const response = await apiClient<StatusQueryResponse>(
    "/api/v1/registrations/status-query",
    {
      method: "POST",
      body: {
        email: email.trim().toLowerCase(),
      },
    },
  );

  return response.data?.message ?? STATUS_QUERY_GENERIC_MESSAGE;
}