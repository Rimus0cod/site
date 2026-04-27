import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useClientLogin, useClientLogout, useClientMe, useClientRegister } from "../../api/client-auth";
import { ClientShell } from "../../components/client/ClientShell";
import { TelegramGuideCard } from "../../components/client/TelegramGuideCard";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { getClientExperienceContent } from "../../lib/clientExperienceContent";
import { getContent } from "../../lib/content";
import { formatDateTime } from "../../lib/locale";
import { useClientPortalStore } from "../../store/clientPortalStore";
import { useClientSessionStore } from "../../store/clientSessionStore";
import { usePreferencesStore } from "../../store/preferencesStore";

interface RegisterFormValues {
  name: string;
  phone: string;
  pin: string;
  telegramUsername: string;
}

interface LoginFormValues {
  phone: string;
  pin: string;
}

export function ClientPortalPage() {
  const navigate = useNavigate();
  const language = usePreferencesStore((state) => state.language);
  const recentAccess = useClientPortalStore((state) => state.recentAccess);
  const saveAccess = useClientPortalStore((state) => state.saveAccess);
  const removeAccess = useClientPortalStore((state) => state.removeAccess);
  const storedClient = useClientSessionStore((state) => state.client);
  const setClient = useClientSessionStore((state) => state.setClient);
  const clearClient = useClientSessionStore((state) => state.clearClient);
  const copy = getContent(language);
  const extraCopy = getClientExperienceContent(language);
  const { data, isError } = useClientMe();
  const registerClient = useClientRegister();
  const loginClient = useClientLogin();
  const logoutClient = useClientLogout();
  const [bookingId, setBookingId] = useState("");
  const [token, setToken] = useState("");
  const currentClient = data?.client ?? storedClient ?? null;

  const registerForm = useForm<RegisterFormValues>({
    defaultValues: {
      name: "",
      phone: "",
      pin: "",
      telegramUsername: "",
    },
  });
  const loginForm = useForm<LoginFormValues>({
    defaultValues: {
      phone: "",
      pin: "",
    },
  });

  useEffect(() => {
    if (data?.client) {
      setClient(data.client);
    }
  }, [data, setClient]);

  useEffect(() => {
    if (isError) {
      clearClient();
    }
  }, [clearClient, isError]);

  const openBooking = (targetId: string, targetToken: string) => {
    saveAccess({ bookingId: targetId, token: targetToken });
    navigate(`/booking/confirm/${targetId}`);
  };

  const submitRegister = registerForm.handleSubmit(async (values) => {
    const result = await registerClient.mutateAsync({
      name: values.name,
      phone: values.phone,
      pin: values.pin,
      telegramUsername: values.telegramUsername || undefined,
    });

    if (result.client) {
      setClient(result.client);
    }
    registerForm.reset();
  });

  const submitLogin = loginForm.handleSubmit(async (values) => {
    const result = await loginClient.mutateAsync(values);
    if (result.client) {
      setClient(result.client);
    }
    loginForm.reset();
  });

  const handleLogout = async () => {
    try {
      await logoutClient.mutateAsync();
    } finally {
      clearClient();
    }
  };

  return (
    <ClientShell>
      <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <Card className="rounded-[2rem] border-brand-line/10 bg-brand-ink p-5 text-brand-cream sm:rounded-[2.5rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-brand-sand">{copy.account.badge}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-none sm:text-5xl md:text-6xl">
            {copy.account.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-brand-cream/78">{extraCopy.clientAuth.profileText}</p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-5 bg-brand-panel">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-olive">{extraCopy.clientAuth.heroBadge}</p>
              <h2 className="font-display text-3xl leading-none text-brand-ink">{extraCopy.clientAuth.profileTitle}</h2>
              <p className="text-sm text-brand-ink/72">{extraCopy.clientAuth.profileText}</p>
            </div>
            {currentClient ? (
              <div className="space-y-4 rounded-[1.6rem] border border-brand-line/10 bg-brand-cream/35 p-5">
                <p className="text-lg font-extrabold text-brand-ink">{extraCopy.clientAuth.activeTitle}</p>
                <p className="text-sm text-brand-ink/72">{extraCopy.clientAuth.activeText}</p>
                <div className="grid gap-2 text-sm font-medium text-brand-ink/78">
                  <p>{extraCopy.clientAuth.phoneLabel}: {currentClient.phone}</p>
                  <p>{copy.confirmation.client}: {currentClient.name}</p>
                  {currentClient.telegramUsername ? (
                    <p>{extraCopy.clientAuth.telegramLabel}: @{currentClient.telegramUsername}</p>
                  ) : null}
                </div>
                <Button className="w-full bg-brand-sand sm:w-auto" onClick={handleLogout} type="button">
                  {extraCopy.clientAuth.logoutAction}
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <form className="grid gap-3 rounded-[1.6rem] border border-brand-line/10 bg-brand-cream/35 p-4" onSubmit={submitRegister}>
                  <p className="font-semibold text-brand-ink">{extraCopy.clientAuth.registerTitle}</p>
                  <p className="text-sm text-brand-ink/72">{extraCopy.clientAuth.registerText}</p>
                  <Input placeholder={extraCopy.clientAuth.namePlaceholder} {...registerForm.register("name", { required: true })} />
                  <Input placeholder={extraCopy.clientAuth.phonePlaceholder} type="tel" {...registerForm.register("phone", { required: true })} />
                  <Input placeholder={extraCopy.clientAuth.pinPlaceholder} type="password" {...registerForm.register("pin", { required: true })} />
                  <Input placeholder={extraCopy.clientAuth.telegramPlaceholder} {...registerForm.register("telegramUsername")} />
                  {registerClient.isError ? <p className="text-sm text-red-600">{extraCopy.clientAuth.authError}</p> : null}
                  <Button disabled={registerClient.isPending} type="submit">
                    {extraCopy.clientAuth.registerAction}
                  </Button>
                </form>

                <form className="grid gap-3 rounded-[1.6rem] border border-brand-line/10 bg-brand-cream/35 p-4" onSubmit={submitLogin}>
                  <p className="font-semibold text-brand-ink">{extraCopy.clientAuth.loginTitle}</p>
                  <p className="text-sm text-brand-ink/72">{extraCopy.clientAuth.loginText}</p>
                  <Input placeholder={extraCopy.clientAuth.phonePlaceholder} type="tel" {...loginForm.register("phone", { required: true })} />
                  <Input placeholder={extraCopy.clientAuth.pinPlaceholder} type="password" {...loginForm.register("pin", { required: true })} />
                  {loginClient.isError ? <p className="text-sm text-red-600">{extraCopy.clientAuth.authError}</p> : null}
                  <Button disabled={loginClient.isPending} type="submit">
                    {extraCopy.clientAuth.loginAction}
                  </Button>
                </form>
              </div>
            )}

            <div className="rounded-[1.6rem] border border-brand-line/10 bg-brand-panel/80 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-olive">{extraCopy.fairUse.badge}</p>
              <p className="mt-2 text-sm text-brand-ink/74">{extraCopy.fairUse.text}</p>
            </div>
          </Card>

          <Card className="space-y-5 bg-brand-panel">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-olive">{copy.account.recent}</p>
            </div>
            <div className="grid gap-3">
              {recentAccess.length > 0 ? (
                recentAccess.map((item) => (
                  <div
                    key={item.bookingId}
                    className="flex flex-col gap-3 rounded-[1.6rem] border border-brand-line/10 bg-brand-cream/35 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-brand-olive">
                        ID {item.bookingId.slice(0, 8)}
                      </p>
                      <p className="text-sm text-brand-ink/72">{formatDateTime(item.savedAt, language)}</p>
                    </div>
                    <div className="grid gap-2 sm:flex">
                      <Button className="w-full sm:w-auto" onClick={() => openBooking(item.bookingId, item.token)} type="button">
                        {copy.account.openBooking}
                      </Button>
                      <Button
                        className="w-full bg-brand-sand sm:w-auto"
                        onClick={() => removeAccess(item.bookingId)}
                        type="button"
                      >
                        {copy.account.removeBooking}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-brand-ink/70">{copy.account.noRecent}</p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="space-y-5 bg-brand-panel">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.28em] text-brand-olive">
                {copy.account.manualTitle}
              </p>
              <p className="text-sm text-brand-ink/72">{copy.account.manualDescription}</p>
            </div>
            <div className="grid gap-4">
              <Input
                placeholder={copy.account.bookingId}
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value)}
              />
              <Input
                placeholder={copy.account.token}
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
              <p className="text-xs text-brand-ink/65">{copy.account.helper}</p>
              <Button
                className="w-full sm:w-auto"
                disabled={!bookingId.trim() || !token.trim()}
                onClick={() => openBooking(bookingId.trim(), token.trim())}
                type="button"
              >
                {copy.account.open}
              </Button>
            </div>
          </Card>

          <TelegramGuideCard />
        </div>
      </main>
    </ClientShell>
  );
}
