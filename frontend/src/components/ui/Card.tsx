import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

type Props = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export function Card({ children, className, ...props }: Props) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-brand-ink/10 bg-white/90 p-6 shadow-card backdrop-blur",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

