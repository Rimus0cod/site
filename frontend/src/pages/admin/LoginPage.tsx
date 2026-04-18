import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useLogin } from "../../api/admin";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/authStore";

interface FormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      email: "admin@barberbook.local",
      password: "ChangeMe123!",
    },
  });
  const setSession = useAuthStore((state) => state.setSession);
  const login = useLogin();

  const submit = handleSubmit(async (values) => {
    const data = await login.mutateAsync(values);
    setSession(data);
    navigate("/admin");
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Admin login</p>
          <h1 className="font-display text-4xl text-brand-ink">Welcome back</h1>
        </div>
        <form className="grid gap-4" onSubmit={submit}>
          <Input placeholder="Email" {...register("email")} />
          <Input placeholder="Password" type="password" {...register("password")} />
          {login.isError ? <p className="text-sm text-red-600">Login failed. Check credentials.</p> : null}
          <Button disabled={login.isPending} type="submit">
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

