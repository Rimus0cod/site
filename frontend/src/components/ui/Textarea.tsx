import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-brand-ink/15 bg-brand-cream px-4 py-3 text-sm text-brand-ink outline-none transition focus:border-brand-clay focus:ring-2 focus:ring-brand-clay/30",
        className,
      )}
      {...props}
    />
  );
}
