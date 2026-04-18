import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdminBarbers } from "../../api/barbers";
import { useSaveSchedule, useSchedule } from "../../api/admin";
import { ScheduleGrid } from "../../components/admin/ScheduleGrid";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { ScheduleDay } from "../../lib/types";
import { normalizeTimeValue } from "../../lib/utils";

const defaultDays: ScheduleDay[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  startTime: "09:00",
  endTime: "18:00",
  isDayOff: dayOfWeek === 0,
}));

function getDefaultDays() {
  return defaultDays.map((day) => ({ ...day }));
}

export function SchedulePage() {
  const [params, setParams] = useSearchParams();
  const barberId = params.get("barberId") ?? undefined;
  const { data: barbers } = useAdminBarbers();
  const { data: schedule } = useSchedule(barberId);
  const saveSchedule = useSaveSchedule(barberId);
  const [days, setDays] = useState<ScheduleDay[]>(getDefaultDays);

  useEffect(() => {
    if (schedule?.days?.length) {
      const normalizedDays = schedule.days
        .map((day) => ({
          dayOfWeek: day.dayOfWeek,
          startTime: day.isDayOff ? null : normalizeTimeValue(day.startTime),
          endTime: day.isDayOff ? null : normalizeTimeValue(day.endTime),
          isDayOff: Boolean(day.isDayOff),
        }))
        .sort((left, right) => left.dayOfWeek - right.dayOfWeek);

      setDays(normalizedDays);
      return;
    }

    setDays(getDefaultDays());
  }, [schedule]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Admin</p>
          <h1 className="font-display text-4xl text-brand-ink">Weekly schedule</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {barbers?.map((barber) => (
            <Button
              key={barber.id}
              className={barberId === barber.id ? "bg-brand-olive text-white" : "bg-brand-sand"}
              onClick={() => setParams({ barberId: barber.id })}
              type="button"
            >
              {barber.name}
            </Button>
          ))}
        </div>
      </Card>

      <ScheduleGrid days={days} onChange={setDays} />

      <Button
        className="w-fit"
        disabled={!barberId || saveSchedule.isPending}
        onClick={() => saveSchedule.mutate({ days })}
        type="button"
      >
        {saveSchedule.isPending ? "Saving..." : "Save schedule"}
      </Button>
    </main>
  );
}
