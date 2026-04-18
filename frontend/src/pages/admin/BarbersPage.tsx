import { useForm } from "react-hook-form";
import { useAdminBarbers, useCreateBarber } from "../../api/barbers";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface FormValues {
  name: string;
  photoUrl: string;
  bio: string;
}

export function BarbersPage() {
  const { data } = useAdminBarbers();
  const createBarber = useCreateBarber();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const submit = handleSubmit(async (values) => {
    await createBarber.mutateAsync(values);
    reset();
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
          <Button className="md:col-span-3 md:w-fit" type="submit">
            Add barber
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((barber) => (
          <Card key={barber.id} className="space-y-2">
            <h2 className="font-display text-2xl text-brand-ink">{barber.name}</h2>
            <p className="text-sm text-brand-ink/70">{barber.bio || "No bio yet."}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}

