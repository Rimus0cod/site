import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-2xl border border-brand-line/14 bg-brand-cream/70 px-4 py-3 text-sm text-brand-ink outline-none transition focus:border-brand-clay focus:ring-2 focus:ring-brand-clay/30",
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
