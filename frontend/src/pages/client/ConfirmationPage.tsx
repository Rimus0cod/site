import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useBooking, useCancelBooking, useRescheduleBooking, useSlots } from "../../api/bookings";
import { ClientShell } from "../../components/client/ClientShell";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { getContent } from "../../lib/content";
import { formatCurrency, formatDateTime, formatTime } from "../../lib/locale";
import { SHOP_INFO } from "../../lib/shop";
import { useClientPortalStore } from "../../store/clientPortalStore";
import { usePreferencesStore } from "../../store/preferencesStore";

export function ConfirmationPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromQuery = params.get("token") ?? undefined;
  const language = usePreferencesStore((state) => state.language);
  const saveAccess = useClientPortalStore((state) => state.saveAccess);
  const getAccessToken = useClientPortalStore((state) => state.getAccessToken);
  const copy = getContent(language);
  const token = id ? tokenFromQuery ?? getAccessToken(id) : undefined;
  const { data, isLoading } = useBooking(id, token);
  const cancelBooking = useCancelBooking();
  const rescheduleBooking = useRescheduleBooking();
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const { data: slotsData, isLoading: slotsLoading } = useSlots(
    data?.barberId,
    rescheduleDate,
    data?.serviceId,
  );

  useEffect(() => {
    if (data?.startTime) {
      setRescheduleDate(data.startTime.slice(0, 10));
      setSelectedSlot("");
    }
  }, [data?.startTime]);

  useEffect(() => {
    if (id && tokenFromQuery) {
      saveAccess({ bookingId: id, token: tokenFromQuery });
      navigate(`/booking/confirm/${id}`, { replace: true });
    }
  }, [id, navigate, saveAccess, tokenFromQuery]);

  if (isLoading) {
    return (
      <ClientShell>
        <main className="mx-auto max-w-3xl px-6 py-12">{copy.confirmation.loading}</main>
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
            <Link to="/">
              <Button>{copy.confirmation.backHome}</Button>
            </Link>
          </Card>
        </main>
      </ClientShell>
    );
  }

  if (!data) {
    return (
      <ClientShell>
        <main className="mx-auto max-w-3xl px-6 py-12">{copy.confirmation.notFound}</main>
      </ClientShell>
    );
  }

  const canManage = data.status !== "canceled" && data.status !== "completed";

  return (
    <ClientShell>
      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.confirmation.accessLabel}</p>
            <h1 className="font-display text-4xl leading-none text-brand-ink sm:text-5xl">{copy.confirmation.title}</h1>
            <p className="text-brand-ink/70">
              {copy.confirmation.status}: {copy.status[data.status]}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-3 text-sm font-medium text-brand-ink/80">
              <p>{copy.confirmation.client}: {data.clientName}</p>
              <p>{copy.confirmation.phone}: {data.clientPhone}</p>
              <p>{copy.confirmation.barber}: {data.barber?.name ?? data.barberId}</p>
              <p>{copy.confirmation.service}: {data.service?.name ?? data.serviceId}</p>
            </div>
            <div className="grid gap-3 text-sm font-medium text-brand-ink/80">
              <p>{copy.confirmation.start}: {formatDateTime(data.startTime, language)}</p>
              <p>{copy.confirmation.end}: {formatTime(data.endTime, language)}</p>
              {data.depositAmount ? (
                <p>{copy.checkout.depositLabel}: {formatCurrency(data.depositAmount, language)}</p>
              ) : null}
              {data.paymentStatus ? (
                <p>{copy.checkout.paymentStatus}: {copy.paymentStatus[data.paymentStatus]}</p>
              ) : null}
              <p>
                {copy.confirmation.created}:{" "}
                {data.createdAt ? formatDateTime(data.createdAt, language) : copy.confirmation.justNow}
              </p>
              {data.cancellationReason ? (
                <p>{copy.confirmation.cancelReason}: {data.cancellationReason}</p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Link className="w-full sm:w-auto" to="/">
              <Button className="w-full sm:w-auto">{copy.confirmation.backHome}</Button>
            </Link>
            <Link className="w-full sm:w-auto" to="/account">
              <Button className="w-full bg-brand-sand sm:w-auto">{copy.confirmation.portal}</Button>
            </Link>
            <a className="w-full sm:w-auto" href={`tel:${SHOP_INFO.phone.replace(/\s+/g, "")}`}>
              <Button className="w-full border border-brand-line/10 bg-brand-panel sm:w-auto">{copy.confirmation.call}</Button>
            </a>
          </div>
          <div className="rounded-[1.5rem] border border-brand-line/10 bg-brand-sand/35 p-4 text-sm font-medium text-brand-ink/80">
            {copy.confirmation.accountSaved}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.confirmation.selfServiceLabel}</p>
              <h2 className="font-display text-3xl leading-none text-brand-ink sm:text-4xl">{copy.confirmation.selfServiceTitle}</h2>
              <p className="text-sm text-brand-ink/70">{copy.confirmation.selfServiceText}</p>
            </div>

            {canManage ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3 rounded-[1.75rem] border border-brand-line/10 bg-brand-cream/38 p-5">
                  <h3 className="font-semibold text-brand-ink">{copy.confirmation.cancelTitle}</h3>
                  <Textarea
                    className="min-h-24"
                    placeholder={copy.confirmation.cancelPlaceholder}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                  />
                  {cancelBooking.isError ? (
                    <p className="text-sm text-red-600">{copy.confirmation.cancelError}</p>
                  ) : null}
                  <Button
                    className="w-full bg-brand-sand"
                    disabled={cancelBooking.isPending}
                    onClick={() => {
                      if (!token) {
                        return;
                      }

                      void cancelBooking.mutateAsync({
                        id: data.id,
                        token,
                        reason: cancelReason || undefined,
                      });
                    }}
                    type="button"
                  >
                    {cancelBooking.isPending ? copy.confirmation.cancelPending : copy.confirmation.cancelAction}
                  </Button>
                </div>

                <div className="space-y-3 rounded-[1.75rem] border border-brand-line/10 bg-brand-cream/38 p-5">
                  <h3 className="font-semibold text-brand-ink">{copy.confirmation.rescheduleTitle}</h3>
                  <Input
                    min={new Date().toISOString().slice(0, 10)}
                    type="date"
                    value={rescheduleDate}
                    onChange={(event) => setRescheduleDate(event.target.value)}
                  />
                  {slotsLoading ? <p className="text-sm text-brand-ink/65">{copy.confirmation.slotsLoading}</p> : null}
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-2">
                    {slotsData?.slots?.map((slot) => (
                      <Button
                        key={slot}
                        className={selectedSlot === slot ? "bg-brand-olive text-white" : "bg-brand-sand"}
                        onClick={() => setSelectedSlot(slot)}
                        type="button"
                      >
                        {slot.slice(11, 16)}
                      </Button>
                    ))}
                  </div>
                  {rescheduleDate && slotsData?.slots?.length === 0 ? (
                    <p className="text-sm text-brand-ink/65">{copy.confirmation.slotsEmpty}</p>
                  ) : null}
                  {rescheduleBooking.isError ? (
                    <p className="text-sm text-red-600">{copy.confirmation.rescheduleError}</p>
                  ) : null}
                  <Button
                    disabled={!selectedSlot || rescheduleBooking.isPending}
                    onClick={() => {
                      if (!token || !selectedSlot) {
                        return;
                      }

                      void rescheduleBooking.mutateAsync({
                        id: data.id,
                        token,
                        startTime: selectedSlot,
                      });
                    }}
                    type="button"
                  >
                    {rescheduleBooking.isPending
                      ? copy.confirmation.reschedulePending
                      : copy.confirmation.rescheduleAction}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-brand-line/10 bg-brand-cream/38 p-5 text-sm text-brand-ink/70">
                {copy.confirmation.closedText}
              </div>
            )}
          </Card>

          <Card className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.confirmation.contactsLabel}</p>
              <h2 className="font-display text-3xl text-brand-ink">{SHOP_INFO.name}</h2>
            </div>
            <div className="grid gap-3 text-sm text-brand-ink/80">
              <p>Address: {SHOP_INFO.address}</p>
              <p>{copy.confirmation.phone}: {SHOP_INFO.phone}</p>
              <p>Telegram: {SHOP_INFO.telegram}</p>
              <p>Instagram: {SHOP_INFO.instagram}</p>
            </div>
            <div className="grid gap-2 text-sm text-brand-ink/70">
              {copy.shop.hours.map((item) => (
                <p key={item.label}>
                  {item.label}: {item.value}
                </p>
              ))}
            </div>
            <a
              href={`https://t.me/${SHOP_INFO.telegram.replace("@", "")}`}
              rel="noreferrer"
              target="_blank"
            >
              <Button className="w-full bg-brand-sand">{copy.confirmation.telegram}</Button>
            </a>
          </Card>
        </div>
      </main>
    </ClientShell>
  );
}
