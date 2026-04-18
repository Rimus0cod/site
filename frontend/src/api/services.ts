import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { Service } from "../lib/types";

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await apiClient.get<Service[]>("/services");
      return data;
    },
  });
}

export function useAdminServices() {
  return useQuery({
    queryKey: ["admin", "services"],
    queryFn: async () => {
      const { data } = await apiClient.get<Service[]>("/admin/services");
      return data;
    },
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Service>) => {
      const { data } = await apiClient.post<Service>("/admin/services", payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

