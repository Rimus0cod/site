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
      <header className="sticky top-0 z-20 border-b border-brand-line/10 bg-brand-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-ink text-lg font-extrabold text-brand-cream">
              B
            </div>
            <div>
              <p className="font-display text-2xl leading-none text-brand-ink">BarberBook</p>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-olive">
                Studio
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            <NavItem to="/">{copy.nav.home}</NavItem>
            <NavItem to="/booking">{copy.nav.booking}</NavItem>
            <NavItem to="/account">{copy.nav.account}</NavItem>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="border border-brand-line/10 bg-brand-panel px-4 py-2 text-xs uppercase tracking-[0.18em] text-brand-ink shadow-none"
              onClick={toggleLanguage}
              type="button"
            >
              {copy.nav.language}
            </Button>
            <Button
              className="border border-brand-line/10 bg-brand-panel px-4 py-2 text-xs text-brand-ink shadow-none"
              onClick={toggleTheme}
              type="button"
            >
              {theme === "light" ? copy.nav.themeSwitchDark : copy.nav.themeSwitchLight}
            </Button>
          </div>
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
          "rounded-full px-4 py-2 text-sm font-semibold text-brand-ink/72 transition hover:bg-brand-panel hover:text-brand-ink",
          isActive && "bg-brand-ink text-brand-cream hover:bg-brand-ink hover:text-brand-cream",
        )
      }
      to={to}
    >
      {children}
    </NavLink>
  );
}
