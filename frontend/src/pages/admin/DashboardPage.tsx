import dayjs from "dayjs";
import { useAdminBookings } from "../../api/bookings";
import { BookingsTable } from "../../components/admin/BookingsTable";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useState } from "react";

export function DashboardPage() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { data, isLoading } = useAdminBookings(date);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-12">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Dashboard</p>
          <h1 className="font-display text-4xl text-brand-ink">Bookings overview</h1>
        </div>
        <div className="w-full max-w-52">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </Card>

      {isLoading ? <Card>Loading bookings...</Card> : <BookingsTable bookings={data ?? []} />}
    </main>
  );
}

