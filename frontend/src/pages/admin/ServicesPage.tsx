import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAdminServices, useCreateService, useUpdateService } from "../../api/services";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import type { PaymentPolicy, Service } from "../../lib/types";
import { currency } from "../../lib/utils";

interface FormValues {
  name: string;
  description: string;
  price: number;
  durationMin: number;
  paymentPolicy: PaymentPolicy;
  depositValue: number | null;
  isActive: boolean;
}

const policyOptions: Array<{ value: PaymentPolicy; label: string }> = [
  { value: "deposit_percent", label: "Deposit %" },
  { value: "deposit_fixed", label: "Fixed deposit" },
  { value: "full_prepayment", label: "Full prepayment" },
  { value: "offline", label: "Offline" },
];

function selectClassName() {
  return "w-full rounded-2xl border border-brand-line/14 bg-brand-cream/70 px-4 py-3 text-sm font-semibold text-brand-ink outline-none transition focus:border-brand-clay focus:ring-2 focus:ring-brand-clay/30";
}

function formatPaymentPolicy(service: Service) {
  switch (service.paymentPolicy) {
    case "deposit_fixed":
      return `Deposit ${currency(service.depositValue ?? 0)}`;
    case "deposit_percent":
      return `Deposit ${Number(service.depositValue ?? 0)}%`;
    case "full_prepayment":
      return "Full prepayment";
    case "offline":
    default:
      return "Offline payment";
  }
}

function normalizePayload(values: FormValues) {
  const normalizedDepositValue =
    values.depositValue !== null && Number.isFinite(values.depositValue)
      ? values.depositValue
      : null;

  return {
    ...values,
    depositValue:
      values.paymentPolicy === "deposit_fixed" || values.paymentPolicy === "deposit_percent"
        ? normalizedDepositValue ?? 0
        : null,
  };
}

function ServiceEditor({ service }: { service: Service }) {
  const updateService = useUpdateService();
  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      name: service.name,
      description: service.description ?? "",
      price: Number(service.price),
      durationMin: service.durationMin,
      paymentPolicy: service.paymentPolicy,
      depositValue: service.depositValue ? Number(service.depositValue) : null,
      isActive: service.isActive,
    },
  });
  const paymentPolicy = watch("paymentPolicy");

  useEffect(() => {
    reset({
      name: service.name,
      description: service.description ?? "",
      price: Number(service.price),
      durationMin: service.durationMin,
      paymentPolicy: service.paymentPolicy,
      depositValue: service.depositValue ? Number(service.depositValue) : null,
      isActive: service.isActive,
    });
  }, [reset, service]);

  const submit = handleSubmit(async (values) => {
    await updateService.mutateAsync({
      id: service.id,
      ...normalizePayload(values),
    });
  });

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl text-brand-ink">{service.name}</h2>
        <p className="text-sm font-semibold text-brand-olive">
          {currency(service.price)} - {service.durationMin} min
        </p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-ink/55">
          {formatPaymentPolicy(service)}
        </p>
      </div>
      <form className="grid gap-3" onSubmit={submit}>
        <Input placeholder="Name" {...register("name")} />
        <Input placeholder="Description" {...register("description")} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input step="0.01" type="number" {...register("price", { valueAsNumber: true })} />
          <Input type="number" {...register("durationMin", { valueAsNumber: true })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <select className={selectClassName()} {...register("paymentPolicy")}>
            {policyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {(paymentPolicy === "deposit_fixed" || paymentPolicy === "deposit_percent") ? (
            <Input
              placeholder={paymentPolicy === "deposit_percent" ? "Deposit %" : "Deposit amount"}
              step="0.01"
              type="number"
              {...register("depositValue", { valueAsNumber: true })}
            />
          ) : (
            <div className="rounded-2xl border border-brand-line/10 bg-brand-panel/65 px-4 py-3 text-sm font-medium text-brand-ink/62">
              This policy calculates the amount automatically.
            </div>
          )}
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
  const { data, isError, isLoading } = useAdminServices();
  const createService = useCreateService();
  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      durationMin: 30,
      paymentPolicy: "deposit_percent",
      depositValue: 30,
      isActive: true,
    },
  });
  const paymentPolicy = watch("paymentPolicy");

  const submit = handleSubmit(async (values) => {
    await createService.mutateAsync(normalizePayload(values));
    reset({
      name: "",
      description: "",
      price: 0,
      durationMin: 30,
      paymentPolicy: "deposit_percent",
      depositValue: 30,
      isActive: true,
    });
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
          <select className={selectClassName()} {...register("paymentPolicy")}>
            {policyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {(paymentPolicy === "deposit_fixed" || paymentPolicy === "deposit_percent") ? (
            <Input
              placeholder={paymentPolicy === "deposit_percent" ? "Deposit %" : "Deposit amount"}
              step="0.01"
              type="number"
              {...register("depositValue", { valueAsNumber: true })}
            />
          ) : (
            <div className="rounded-2xl border border-brand-line/10 bg-brand-panel/65 px-4 py-3 text-sm font-medium text-brand-ink/62">
              This policy calculates the amount automatically.
            </div>
          )}
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
        {isLoading ? <Card className="md:col-span-2">Loading services...</Card> : null}
        {isError ? (
          <Card className="md:col-span-2">
            Unable to load admin services. Check the admin session and backend logs.
          </Card>
        ) : null}
        {!isLoading && !isError && !data?.length ? (
          <Card className="md:col-span-2">
            No services have been created yet. Use the form above to add the first service.
          </Card>
        ) : null}
        {data?.map((service) => <ServiceEditor key={service.id} service={service} />)}
      </div>
    </main>
  );
}
