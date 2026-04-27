import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAdminBarbers, useCreateBarber, useUpdateBarber } from "../../api/barbers";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import type { Barber } from "../../lib/types";

interface FormValues {
  name: string;
  photoUrl: string;
  bio: string;
  isActive: boolean;
}

function BarberEditor({ barber }: { barber: Barber }) {
  const updateBarber = useUpdateBarber();
  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      name: barber.name,
      photoUrl: barber.photoUrl ?? "",
      bio: barber.bio ?? "",
      isActive: barber.isActive,
    },
  });

  useEffect(() => {
    reset({
      name: barber.name,
      photoUrl: barber.photoUrl ?? "",
      bio: barber.bio ?? "",
      isActive: barber.isActive,
    });
  }, [barber, reset]);

  const photoUrl = watch("photoUrl");
  const submit = handleSubmit(async (values) => {
    await updateBarber.mutateAsync({
      id: barber.id,
      ...values,
    });
  });

  return (
    <Card className="space-y-4">
      {photoUrl ? (
        <img alt={barber.name} className="h-48 w-full rounded-[1.5rem] object-cover" src={photoUrl} />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-[1.5rem] bg-brand-ink text-5xl font-bold text-brand-cream">
          {barber.name.slice(0, 1)}
        </div>
      )}

      <form className="grid gap-3" onSubmit={submit}>
        <Input placeholder="Name" {...register("name")} />
        <Input placeholder="Photo URL" {...register("photoUrl")} />
        <Input placeholder="Bio" {...register("bio")} />
        <label className="flex items-center gap-3 text-sm font-medium text-brand-ink/80">
          <input className="h-4 w-4 accent-brand-olive" type="checkbox" {...register("isActive")} />
          Visible in client booking flow
        </label>
        <Button disabled={updateBarber.isPending} type="submit">
          {updateBarber.isPending ? "Saving..." : "Save barber"}
        </Button>
      </form>
    </Card>
  );
}

export function BarbersPage() {
  const { data, isError, isLoading } = useAdminBarbers();
  const createBarber = useCreateBarber();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: "",
      photoUrl: "",
      bio: "",
      isActive: true,
    },
  });

  const submit = handleSubmit(async (values) => {
    await createBarber.mutateAsync(values);
    reset({ name: "", photoUrl: "", bio: "", isActive: true });
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <Card className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Admin</p>
          <h1 className="font-display text-4xl text-brand-ink">Barbers</h1>
        </div>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={submit}>
          <Input placeholder="Name" {...register("name")} />
          <Input placeholder="Photo URL" {...register("photoUrl")} />
          <Input placeholder="Bio" {...register("bio")} />
          <label className="flex items-center gap-3 text-sm font-medium text-brand-ink/80 md:col-span-3">
            <input className="h-4 w-4 accent-brand-olive" type="checkbox" {...register("isActive")} />
            Show this barber publicly
          </label>
          <Button className="md:col-span-3 md:w-fit" type="submit">
            Add barber
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? <Card className="md:col-span-2">Loading barbers...</Card> : null}
        {isError ? (
          <Card className="md:col-span-2">
            Unable to load admin barbers. Check the admin session and backend logs.
          </Card>
        ) : null}
        {!isLoading && !isError && !data?.length ? (
          <Card className="md:col-span-2">
            No barbers have been created yet. Use the form above to add the first barber.
          </Card>
        ) : null}
        {data?.map((barber) => <BarberEditor key={barber.id} barber={barber} />)}
      </div>
    </main>
  );
}
