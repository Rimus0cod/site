import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, prepareClientCsrfToken } from "../lib/api-client";
import type { ClientUser } from "../lib/types";

interface ClientAuthResponse {
  client: ClientUser | null;
}

export function useClientMe(enabled = true) {
  return useQuery({
    queryKey: ["client-auth", "me"],
    enabled,
    retry: false,
    queryFn: async () => {
      const { data } = await apiClient.get<ClientAuthResponse>("/client-auth/me");
      return data;
    },
  });
}

export function useClientRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      phone: string;
      pin: string;
      telegramUsername?: string;
    }) => {
      await prepareClientCsrfToken();
      const { data } = await apiClient.post<ClientAuthResponse>("/client-auth/register", payload);
      return data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["client-auth", "me"], data);
    },
  });
}

export function useClientLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { phone: string; pin: string }) => {
      await prepareClientCsrfToken();
      const { data } = await apiClient.post<ClientAuthResponse>("/client-auth/login", payload);
      return data;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["client-auth", "me"], data);
    },
  });
}

export function useClientLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await prepareClientCsrfToken();
      const { data } = await apiClient.post<{ success: true }>("/client-auth/logout");
      return data;
    },
    onSuccess: async () => {
      await queryClient.removeQueries({ queryKey: ["client-auth", "me"] });
    },
  });
}
