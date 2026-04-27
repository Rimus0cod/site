import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { Service } from "../lib/types";

interface ServicePayload {
  name?: string;
  description?: string;
  price?: number;
  durationMin?: number;
  paymentPolicy?: "offline" | "deposit_fixed" | "deposit_percent" | "full_prepayment";
  depositValue?: number | null;
  isActive?: boolean;
}

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
    mutationFn: async (payload: ServicePayload) => {
      const { data } = await apiClient.post<Service>("/admin/services", payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ServicePayload & { id: string }) => {
      const { id, ...body } = payload;
      const { data } = await apiClient.patch<Service>(`/admin/services/${id}`, body);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      await queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
