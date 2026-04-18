import { useForm } from "react-hook-form";
import { useAdminServices, useCreateService } from "../../api/services";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { currency } from "../../lib/utils";

interface FormValues {
  name: string;
  description: string;
  price: number;
  durationMin: number;
}

export function ServicesPage() {
  const { data } = useAdminServices();
  const createService = useCreateService();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const submit = handleSubmit(async (values) => {
    await createService.mutateAsync(values);
    reset();
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
          <Button className="md:col-span-2 md:w-fit" type="submit">
            Add service
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((service) => (
          <Card key={service.id} className="space-y-2">
            <h2 className="font-display text-2xl text-brand-ink">{service.name}</h2>
            <p className="text-sm text-brand-ink/70">{service.description || "No description yet."}</p>
            <p className="text-sm font-semibold text-brand-olive">
              {currency(service.price)} · {service.durationMin} min
            </p>
          </Card>
        ))}
      </div>
    </main>
  );
}

