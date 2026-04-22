import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientShell } from "../../components/client/ClientShell";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { getContent } from "../../lib/content";
import { formatDateTime } from "../../lib/locale";
import { useClientPortalStore } from "../../store/clientPortalStore";
import { usePreferencesStore } from "../../store/preferencesStore";

export function ClientPortalPage() {
  const navigate = useNavigate();
  const language = usePreferencesStore((state) => state.language);
  const recentAccess = useClientPortalStore((state) => state.recentAccess);
  const removeAccess = useClientPortalStore((state) => state.removeAccess);
  const copy = getContent(language);
  const [bookingId, setBookingId] = useState("");
  const [token, setToken] = useState("");

  const openBooking = (targetId: string, targetToken: string) => {
    navigate(`/booking/confirm/${targetId}?token=${encodeURIComponent(targetToken)}`);
  };

  return (
    <ClientShell>
      <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <Card className="rounded-[2rem] border-brand-line/10 bg-brand-ink p-5 text-brand-cream sm:rounded-[2.5rem] sm:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-brand-sand">{copy.account.badge}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-none sm:text-5xl md:text-6xl">
            {copy.account.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-brand-cream/78">{copy.account.description}</p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
        </div>
      </main>
    </ClientShell>
  );
}
