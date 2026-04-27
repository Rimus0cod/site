import { useDeferredValue, useEffect, useState } from "react";
import dayjs from "dayjs";
import { useAdminAuditLogs } from "../../api/admin";
import { useAdminBarbers } from "../../api/barbers";
import { useAdminBookings } from "../../api/bookings";
import { BookingsTable } from "../../components/admin/BookingsTable";
import { ManualBookingCard } from "../../components/admin/ManualBookingCard";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

export function DashboardPage() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [barberId, setBarberId] = useState("");
  const [status, setStatus] = useState<"" | "pending" | "confirmed" | "completed" | "canceled">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());
  const { data: barbers } = useAdminBarbers();
  const { data: auditLogs } = useAdminAuditLogs({ limit: 8 });
  const { data, isLoading } = useAdminBookings({
    date,
    barberId,
    status,
    search: deferredSearch,
    page,
    limit: 20,
  });
  const bookings = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages && meta.totalPages > 0 ? meta.totalPages : 1;

  useEffect(() => {
    setPage(1);
  }, [date, barberId, status, deferredSearch]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-12">
      <Card className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Dashboard</p>
          <h1 className="font-display text-4xl text-brand-ink">Bookings overview</h1>
        </div>
        <div>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div>
          <Select value={barberId} onChange={(event) => setBarberId(event.target.value)}>
            <option value="">All barbers</option>
            {barbers?.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </Select>
        </div>
        <div className="lg:col-span-4">
          <Input
            placeholder="Search by client name, phone, or note"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </Card>

      <ManualBookingCard />

      <Card className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Audit Log</p>
            <h2 className="font-display text-3xl text-brand-ink">Recent admin actions</h2>
          </div>
          <p className="text-sm text-brand-ink/60">
            {auditLogs?.meta.total ?? 0} recorded events
          </p>
        </div>
        <div className="grid gap-3">
          {auditLogs?.data.length ? (
            auditLogs.data.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[1.5rem] border border-brand-line/10 bg-brand-panel/60 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">{entry.summary}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-brand-olive">
                      {entry.resource} / {entry.action}
                    </p>
                  </div>
                  <div className="text-xs text-brand-ink/60 sm:text-right">
                    <p>{entry.adminEmail}</p>
                    <p>{dayjs(entry.createdAt).format("DD.MM.YYYY HH:mm")}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-brand-ink/60">No admin audit entries yet.</p>
          )}
        </div>
      </Card>

      {isLoading ? (
        <Card>Loading bookings...</Card>
      ) : (
        <>
          <BookingsTable bookings={bookings} />
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-brand-ink/60">
              Showing page {meta?.page ?? page} of {totalPages}. Total bookings: {meta?.total ?? 0}.
            </div>
            <div className="flex gap-3">
              <Button
                className="bg-brand-sand px-4 py-2 text-xs"
                disabled={!meta?.hasPreviousPage}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                type="button"
              >
                Previous
              </Button>
              <Button
                className="bg-brand-olive px-4 py-2 text-xs text-white"
                disabled={!meta?.hasNextPage}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                type="button"
              >
                Next
              </Button>
            </div>
          </Card>
        </>
      )}
    </main>
  );
}
