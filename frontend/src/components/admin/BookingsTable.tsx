import dayjs from "dayjs";
import { useUpdateBookingStatus } from "../../api/bookings";
import type { Booking, BookingStatus } from "../../lib/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "./StatusBadge";

export function BookingsTable({ bookings }: { bookings: Booking[] }) {
  const updateStatus = useUpdateBookingStatus();

  const actions: BookingStatus[] = ["confirmed", "completed", "canceled"];

  return (
    <Card className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="text-brand-ink/60">
          <tr>
            <th className="pb-4">Client</th>
            <th className="pb-4">Service</th>
            <th className="pb-4">Barber</th>
            <th className="pb-4">Starts</th>
            <th className="pb-4">Status</th>
            <th className="pb-4">Actions</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-t border-brand-ink/10">
              <td className="py-4">
                <div className="font-semibold text-brand-ink">{booking.clientName}</div>
                <div className="text-brand-ink/60">{booking.clientPhone}</div>
              </td>
              <td className="py-4">{booking.service?.name ?? "Unknown service"}</td>
              <td className="py-4">{booking.barber?.name ?? "Unknown barber"}</td>
              <td className="py-4">{dayjs(booking.startTime).format("MMM D, HH:mm")}</td>
              <td className="py-4">
                <StatusBadge status={booking.status} />
              </td>
              <td className="py-4">
                <div className="flex flex-wrap gap-2">
                  {actions.map((status) => (
                    <Button
                      key={status}
                      className="bg-brand-sand px-3 py-2 text-xs"
                      onClick={() => updateStatus.mutate({ id: booking.id, status })}
                      type="button"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

