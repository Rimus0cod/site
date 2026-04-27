import axios from "axios";
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
  const { register, handleSubmit } = useForm<FormValues>();
  const setSession = useAuthStore((state) => state.setSession);
  const login = useLogin();

  const submit = handleSubmit(async (values) => {
    const data = await login.mutateAsync(values);
    setSession(data);
    navigate("/admin");
  });
  const errorMessage = getLoginErrorMessage(login.error);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Admin login</p>
          <h1 className="font-display text-4xl text-brand-ink">Welcome back</h1>
        </div>
        <form className="grid gap-4" onSubmit={submit}>
          <Input placeholder="Email from backend/.env" {...register("email")} />
          <Input placeholder="Password from backend/.env" type="password" {...register("password")} />
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
          <Button disabled={login.isPending} type="submit">
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

function getLoginErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 401) {
      return "Invalid admin email or password. Check ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env.";
    }

    if (status === 403) {
      return "The admin session or CSRF token is stale. Refresh the page and try again.";
    }

    if (status === 429) {
      return "Too many login attempts. Wait a moment and try again.";
    }

    if (!error.response) {
      return "The admin API is unavailable right now. Wait for the backend to finish restarting, then refresh and try again.";
    }
  }

  return "Login request failed. Check backend logs and try again.";
}
