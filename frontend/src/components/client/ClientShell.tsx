import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";
import { getContent } from "../../lib/content";
import { usePreferencesStore } from "../../store/preferencesStore";

export function ClientShell({ children }: PropsWithChildren) {
  const language = usePreferencesStore((state) => state.language);
  const theme = usePreferencesStore((state) => state.theme);
  const toggleLanguage = usePreferencesStore((state) => state.toggleLanguage);
  const toggleTheme = usePreferencesStore((state) => state.toggleTheme);
  const copy = getContent(language);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-brand-line/10 bg-brand-cream/84 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <Link className="flex min-w-0 items-center gap-3" to="/">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-ink text-base font-extrabold text-brand-cream sm:h-11 sm:w-11 sm:text-lg">
                B
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-xl leading-none text-brand-ink sm:text-2xl">BarberBook</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-olive sm:text-xs sm:tracking-[0.32em]">
                  Studio
                </p>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                className="min-h-[42px] border border-brand-line/10 bg-brand-panel px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-brand-ink shadow-none sm:px-4 sm:text-xs sm:tracking-[0.18em]"
                onClick={toggleLanguage}
                type="button"
              >
                {copy.nav.language}
              </Button>
              <Button
                className="min-h-[42px] border border-brand-line/10 bg-brand-panel px-3 py-2 text-[11px] text-brand-ink shadow-none sm:px-4 sm:text-xs"
                onClick={toggleTheme}
                type="button"
              >
                {theme === "light" ? copy.nav.themeSwitchDark : copy.nav.themeSwitchLight}
              </Button>
            </div>
          </div>

          <nav className="grid grid-cols-3 gap-2">
            <NavItem to="/">{copy.nav.home}</NavItem>
            <NavItem to="/booking">{copy.nav.booking}</NavItem>
            <NavItem to="/account">{copy.nav.account}</NavItem>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

function NavItem({ children, to }: PropsWithChildren<{ to: string }>) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          "flex min-h-[44px] items-center justify-center rounded-full px-3 py-2 text-center text-xs font-semibold text-brand-ink/72 transition hover:bg-brand-panel hover:text-brand-ink sm:px-4 sm:text-sm",
          isActive && "bg-brand-ink text-brand-cream hover:bg-brand-ink hover:text-brand-cream",
        )
      }
      to={to}
    >
      <span className="line-clamp-1">{children}</span>
    </NavLink>
  );
}
