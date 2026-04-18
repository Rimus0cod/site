import type { BookingStatus } from "../../lib/types";
import { cn } from "../../lib/utils";

const colorMap: Record<BookingStatus, string> = {
  pending: "bg-brand-sand text-brand-ink",
  confirmed: "bg-emerald-100 text-emerald-800",
  canceled: "bg-rose-100 text-rose-700",
  completed: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide", colorMap[status])}>
      {status}
    </span>
  );
}

