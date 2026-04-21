import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-brand-line/14 bg-brand-cream/70 px-4 py-3 text-sm font-semibold text-brand-ink outline-none transition placeholder:text-brand-ink/45 focus:border-brand-clay focus:ring-2 focus:ring-brand-clay/30",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
