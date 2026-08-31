import axios, { AxiosError } from "axios";
import { BACKEND_URL } from "../utils/backend";

export type OfficeRole = "admin" | "member";

export interface Office {
  id: string;
  name: string;
  slug: string;
  role: OfficeRole;
  createdAt: string;
}

interface OfficeResponse {
  office: Office;
}

export const getApiErrorMessage = (error: unknown, fallback: string) =>
  (error as AxiosError<{ error?: string }>).response?.data?.error || fallback;

export const listOffices = async (signal?: AbortSignal) => {
  const response = await axios.get<{ offices: Office[] }>(`${BACKEND_URL}/api/offices`, { signal });
  return response.data.offices;
};

export const createOffice = async (name: string) => {
  const response = await axios.post<OfficeResponse>(`${BACKEND_URL}/api/offices`, { name });
  return response.data.office;
};

export const getOffice = async (slug: string, signal?: AbortSignal) => {
  const response = await axios.get<OfficeResponse>(
    `${BACKEND_URL}/api/offices/${encodeURIComponent(slug)}`,
    { signal },
  );
  return response.data.office;
};

export const createInvitation = async (slug: string) => {
  const response = await axios.post<{ invitation: { token: string; expiresAt: string } }>(
    `${BACKEND_URL}/api/offices/${encodeURIComponent(slug)}/invitations`,
  );
  return response.data.invitation;
};

export const acceptInvitation = async (token: string) => {
  const response = await axios.post<OfficeResponse>(
    `${BACKEND_URL}/api/invitations/${encodeURIComponent(token)}/accept`,
  );
  return response.data.office;
};
