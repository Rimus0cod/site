import type { ScheduleDay } from "../../lib/types";
import { dayLabel } from "../../lib/utils";
import { Input } from "../ui/Input";

interface Props {
  days: ScheduleDay[];
  onChange: (days: ScheduleDay[]) => void;
}

export function ScheduleGrid({ days, onChange }: Props) {
  const updateDay = (index: number, patch: Partial<ScheduleDay>) => {
    const next = [...days];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      {days.map((day, index) => (
        <div key={day.dayOfWeek} className="grid gap-3 rounded-3xl border border-brand-ink/10 bg-white/80 p-4 md:grid-cols-[90px_1fr_1fr_140px] md:items-center">
          <div className="font-semibold text-brand-ink">{dayLabel(day.dayOfWeek)}</div>
          <Input
            type="time"
            step={60}
            value={day.startTime ?? ""}
            disabled={day.isDayOff}
            className="font-semibold text-brand-ink"
            onChange={(event) => updateDay(index, { startTime: event.target.value })}
          />
          <Input
            type="time"
            step={60}
            value={day.endTime ?? ""}
            disabled={day.isDayOff}
            className="font-semibold text-brand-ink"
            onChange={(event) => updateDay(index, { endTime: event.target.value })}
          />
          <label className="flex items-center gap-3 text-sm font-medium text-brand-ink/85">
            <input
              className="h-4 w-4 accent-brand-olive"
              checked={Boolean(day.isDayOff)}
              type="checkbox"
              onChange={(event) =>
                updateDay(index, {
                  isDayOff: event.target.checked,
                  startTime: event.target.checked ? null : day.startTime ?? "09:00",
                  endTime: event.target.checked ? null : day.endTime ?? "18:00",
                })
              }
            />
            Day off
          </label>
        </div>
      ))}
    </div>
  );
}
