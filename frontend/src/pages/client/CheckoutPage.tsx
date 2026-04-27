import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  useBookingHold,
  useCompleteMockPayment,
  useStartCheckout,
} from "../../api/bookings";
import { ClientShell } from "../../components/client/ClientShell";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getContent } from "../../lib/content";
import { formatCurrency, formatDateTime, formatTime } from "../../lib/locale";
import { useBookingHoldStore } from "../../store/bookingHoldStore";
import { useClientPortalStore } from "../../store/clientPortalStore";
import { usePreferencesStore } from "../../store/preferencesStore";

export function CheckoutPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const tokenFromQuery = params.get("token") ?? undefined;
  const navigate = useNavigate();
  const language = usePreferencesStore((state) => state.language);
  const saveAccess = useClientPortalStore((state) => state.saveAccess);
  const saveHoldAccess = useBookingHoldStore((state) => state.saveHoldAccess);
  const getHoldToken = useBookingHoldStore((state) => state.getHoldToken);
  const storedToken = id ? getHoldToken(id) : undefined;
  const token = tokenFromQuery ?? storedToken;
  const copy = getContent(language);
  const { data, isLoading } = useBookingHold(id, token);
  const startCheckout = useStartCheckout();
  const completeMockPayment = useCompleteMockPayment();
  const [autoStarted, setAutoStarted] = useState(false);

  useEffect(() => {
    if (id && tokenFromQuery) {
      saveHoldAccess({ holdId: id, token: tokenFromQuery });
      navigate(`/booking/hold/${id}`, { replace: true });
    }
  }, [id, navigate, saveHoldAccess, tokenFromQuery]);

  useEffect(() => {
    if (data?.convertedBookingId && token) {
      saveAccess({ bookingId: data.convertedBookingId, token });
      navigate(`/booking/confirm/${data.convertedBookingId}`, {
        replace: true,
      });
    }
  }, [data?.convertedBookingId, navigate, saveAccess, token]);

  useEffect(() => {
    if (!data || !id || !token) {
      return;
    }

    if (data.activePayment || data.convertedBookingId || autoStarted) {
      return;
    }

    if (data.status !== "created" && data.status !== "payment_pending") {
      return;
    }

    setAutoStarted(true);
    void startCheckout
      .mutateAsync({
        holdId: id,
        token,
      })
      .then((result) => {
        if (result.redirect) {
          submitCheckoutRedirect(result.redirect);
          return;
        }

        if (result.bookingId) {
          saveAccess({ bookingId: result.bookingId, token });
          navigate(`/booking/confirm/${result.bookingId}`, {
            replace: true,
          });
        }
      })
      .catch(() => {
        setAutoStarted(false);
      });
  }, [autoStarted, data, id, navigate, saveAccess, startCheckout, token]);

  if (isLoading) {
    return (
      <ClientShell>
        <main className="mx-auto max-w-3xl px-6 py-12">{copy.checkout.loading}</main>
      </ClientShell>
    );
  }

  if (!token) {
    return (
      <ClientShell>
        <main className="mx-auto max-w-3xl px-6 py-12">
          <Card className="space-y-4">
            <h1 className="font-display text-4xl text-brand-ink">{copy.confirmation.incompleteTitle}</h1>
            <p className="text-brand-ink/70">{copy.confirmation.incompleteText}</p>
            <Link to="/booking">
              <Button>{copy.checkout.retry}</Button>
            </Link>
          </Card>
        </main>
      </ClientShell>
    );
  }

  if (!data) {
    return (
      <ClientShell>
        <main className="mx-auto max-w-3xl px-6 py-12">{copy.checkout.notFound}</main>
      </ClientShell>
    );
  }

  const statusText = copy.holdStatus[data.status];
  const paymentText = data.activePayment ? copy.paymentStatus[data.activePayment.status] : null;
  const isExpired = data.status === "expired" || data.status === "released";
  const activeProvider = data.activePayment?.provider ?? startCheckout.data?.provider ?? null;
  const isMockProvider = activeProvider === "mock";
  const canPay = Boolean(data.activePayment?.id) && isMockProvider && !isExpired && !data.convertedBookingId;
  const isAwaitingConfirmation =
    data.activePayment?.status === "paid" && !isExpired && !data.convertedBookingId;
  const providerNote = isMockProvider
    ? copy.checkout.mockNote
    : language === "uk"
      ? "Після натискання система перенаправить вас на сторінку платіжного провайдера для завершення депозиту."
      : "When you continue, you will be redirected to the payment provider to finish the deposit.";

  const retryCheckout = async () => {
    if (!id || !token) {
      return;
    }

    const result = await startCheckout.mutateAsync({
      holdId: id,
      token,
    });

    if (result.redirect) {
      submitCheckoutRedirect(result.redirect);
      return;
    }

    if (result.bookingId) {
      saveAccess({ bookingId: result.bookingId, token });
      navigate(`/booking/confirm/${result.bookingId}`, {
        replace: true,
      });
    }
  };

  const completePayment = async () => {
    if (!data.activePayment?.id || !token) {
      return;
    }

    const result = await completeMockPayment.mutateAsync({
      paymentId: data.activePayment.id,
      token,
      holdId: data.id,
    });

    if (result.bookingId) {
      saveAccess({ bookingId: result.bookingId, token });
      navigate(`/booking/confirm/${result.bookingId}`, {
        replace: true,
      });
    }
  };

  return (
    <ClientShell>
      <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.checkout.badge}</p>
            <h1 className="font-display text-4xl leading-none text-brand-ink sm:text-5xl">
              {copy.checkout.title}
            </h1>
            <p className="text-sm text-brand-ink/72">{copy.checkout.description}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-3 text-sm font-medium text-brand-ink/82">
              <p>{copy.confirmation.client}: {data.clientName}</p>
              <p>{copy.confirmation.phone}: {data.clientPhone}</p>
              <p>{copy.confirmation.barber}: {data.barber?.name ?? data.barberId}</p>
              <p>{copy.confirmation.service}: {data.service?.name ?? data.serviceId}</p>
            </div>
            <div className="grid gap-3 text-sm font-medium text-brand-ink/82">
              <p>{copy.confirmation.start}: {formatDateTime(data.startTime, language)}</p>
              <p>{copy.confirmation.end}: {formatTime(data.endTime, language)}</p>
              <p>{copy.checkout.expiresAt}: {formatDateTime(data.expiresAt, language)}</p>
              <p>{copy.checkout.status}: {statusText}</p>
              {paymentText ? <p>{copy.checkout.paymentStatus}: {paymentText}</p> : null}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-5 bg-brand-panel">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-brand-line/10 bg-brand-cream/35 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-olive">{copy.checkout.depositLabel}</p>
                <p className="mt-3 font-display text-4xl text-brand-ink">
                  {formatCurrency(data.depositAmount, language)}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-brand-line/10 bg-brand-cream/35 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-brand-olive">{copy.checkout.totalLabel}</p>
                <p className="mt-3 font-display text-4xl text-brand-ink">
                  {formatCurrency(data.priceSnapshot, language)}
                </p>
              </div>
            </div>

            {isExpired ? (
              <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
                <p className="font-semibold">{copy.checkout.expiredTitle}</p>
                <p className="mt-2">{copy.checkout.expiredText}</p>
              </div>
            ) : (
              <div className="space-y-4 rounded-[1.75rem] border border-brand-line/10 bg-brand-sand/30 p-5">
                <p className="text-sm font-medium text-brand-ink/78">{providerNote}</p>
                {startCheckout.isPending && !data.activePayment ? (
                  <p className="text-sm text-brand-ink/70">{copy.checkout.preparing}</p>
                ) : null}
                {startCheckout.isError ? (
                  <p className="text-sm text-red-600">{copy.checkout.checkoutError}</p>
                ) : null}
                {completeMockPayment.isError ? (
                  <p className="text-sm text-red-600">{copy.checkout.paymentError}</p>
                ) : null}
                {canPay ? (
                  <Button
                    className="w-full bg-brand-clay"
                    disabled={completeMockPayment.isPending}
                    onClick={() => {
                      void completePayment();
                    }}
                    type="button"
                  >
                    {completeMockPayment.isPending
                      ? copy.checkout.processing
                      : copy.checkout.payAction}
                  </Button>
                ) : isAwaitingConfirmation ? (
                  <Button className="w-full bg-brand-sand" disabled type="button">
                    {copy.checkout.processing}
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-brand-sand"
                    disabled={startCheckout.isPending || completeMockPayment.isPending}
                    onClick={() => {
                      void retryCheckout();
                    }}
                    type="button"
                  >
                    {copy.checkout.retryPayment}
                  </Button>
                )}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.checkout.nextLabel}</p>
            <h2 className="font-display text-3xl leading-none text-brand-ink">{copy.checkout.nextTitle}</h2>
            <p className="text-sm text-brand-ink/72">{copy.checkout.nextText}</p>
            <div className="grid gap-3 text-sm text-brand-ink/76">
              <p>{copy.checkout.stepOne}</p>
              <p>{copy.checkout.stepTwo}</p>
              <p>{copy.checkout.stepThree}</p>
            </div>
            <Link className="w-full sm:w-auto" to="/booking">
              <Button className="w-full bg-brand-sand sm:w-auto" type="button">
                {copy.checkout.retry}
              </Button>
            </Link>
          </Card>
        </div>
      </main>
    </ClientShell>
  );
}

function submitCheckoutRedirect(redirect: { url: string; method: "GET" | "POST"; fields?: Record<string, string> }) {
  if (typeof document === "undefined") {
    return;
  }

  if (redirect.method === "GET") {
    const target = new URL(redirect.url, window.location.origin);

    Object.entries(redirect.fields ?? {}).forEach(([key, value]) => {
      target.searchParams.set(key, value);
    });

    window.location.assign(target.toString());
    return;
  }

  const form = document.createElement("form");
  form.method = redirect.method;
  form.action = redirect.url;
  form.style.display = "none";

  Object.entries(redirect.fields ?? {}).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
