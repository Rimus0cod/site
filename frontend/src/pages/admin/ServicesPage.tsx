import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAdminServices, useCreateService, useUpdateService } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import type { Service } from "../../lib/types";
import { currency } from "../../lib/utils";

interface FormValues {
  name: string;
  description: string;
  price: number;
  durationMin: number;
  isActive: boolean;
}

function ServiceEditor({ service }: { service: Service }) {
  const updateService = useUpdateService();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: service.name,
      description: service.description ?? "",
      price: Number(service.price),
      durationMin: service.durationMin,
      isActive: service.isActive,
    },
  });

  useEffect(() => {
    reset({
      name: service.name,
      description: service.description ?? "",
      price: Number(service.price),
      durationMin: service.durationMin,
      isActive: service.isActive,
    });
  }, [reset, service]);

  const submit = handleSubmit(async (values) => {
    await updateService.mutateAsync({
      id: service.id,
      ...values,
    });
  });

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl text-brand-ink">{service.name}</h2>
        <p className="text-sm font-semibold text-brand-olive">
          {currency(service.price)} - {service.durationMin} min
        </p>
      </div>
      <form className="grid gap-3" onSubmit={submit}>
        <Input placeholder="Name" {...register("name")} />
        <Input placeholder="Description" {...register("description")} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input step="0.01" type="number" {...register("price", { valueAsNumber: true })} />
          <Input type="number" {...register("durationMin", { valueAsNumber: true })} />
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-brand-ink/80">
          <input className="h-4 w-4 accent-brand-olive" type="checkbox" {...register("isActive")} />
          Visible in client booking flow
        </label>
        <Button disabled={updateService.isPending} type="submit">
          {updateService.isPending ? "Saving..." : "Save service"}
        </Button>
      </form>
    </Card>
  );
}

export function ServicesPage() {
  const { data } = useAdminServices();
  const createService = useCreateService();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      durationMin: 30,
      isActive: true,
    },
  });

  const submit = handleSubmit(async (values) => {
    await createService.mutateAsync(values);
    reset({ name: "", description: "", price: 0, durationMin: 30, isActive: true });
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <Card className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Admin</p>
          <h1 className="font-display text-4xl text-brand-ink">Services</h1>
        </div>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <Input placeholder="Name" {...register("name")} />
          <Input placeholder="Description" {...register("description")} />
          <Input placeholder="Price" step="0.01" type="number" {...register("price", { valueAsNumber: true })} />
          <Input placeholder="Duration (min)" type="number" {...register("durationMin", { valueAsNumber: true })} />
          <label className="flex items-center gap-3 text-sm font-medium text-brand-ink/80 md:col-span-2">
            <input className="h-4 w-4 accent-brand-olive" type="checkbox" {...register("isActive")} />
            Show this service publicly
          </label>
          <Button className="md:col-span-2 md:w-fit" type="submit">
            Add service
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((service) => <ServiceEditor key={service.id} service={service} />)}
      </div>
    </main>
  );
}
