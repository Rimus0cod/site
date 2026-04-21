import { useDeferredValue, useState } from "react";
import dayjs from "dayjs";
import { useAdminBarbers } from "../../api/barbers";
import { useAdminBookings } from "../../api/bookings";
import { BookingsTable } from "../../components/admin/BookingsTable";
import { ManualBookingCard } from "../../components/admin/ManualBookingCard";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

export function DashboardPage() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [barberId, setBarberId] = useState("");
  const [status, setStatus] = useState<"" | "pending" | "confirmed" | "completed" | "canceled">("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const { data: barbers } = useAdminBarbers();
  const { data, isLoading } = useAdminBookings({
    date,
    barberId,
    status,
    search: deferredSearch,
  });

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

      {isLoading ? <Card>Loading bookings...</Card> : <BookingsTable bookings={data ?? []} />}
    </main>
  );
}
