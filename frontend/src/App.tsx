import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/client/HomePage";
import { BookingWizard } from "./pages/client/BookingWizard";
import { ConfirmationPage } from "./pages/client/ConfirmationPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { BarbersPage } from "./pages/admin/BarbersPage";
import { ServicesPage } from "./pages/admin/ServicesPage";
import { SchedulePage } from "./pages/admin/SchedulePage";
import { useAuthStore } from "./store/authStore";
import { Button } from "./components/ui/Button";

function AdminLayout() {
  const clearSession = useAuthStore((state) => state.clearSession);

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-ink/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <nav className="flex flex-wrap gap-3 text-sm font-semibold text-brand-ink">
            <NavLink to="/admin">Dashboard</NavLink>
            <NavLink to="/admin/barbers">Barbers</NavLink>
            <NavLink to="/admin/services">Services</NavLink>
            <NavLink to="/admin/schedule">Schedule</NavLink>
          </nav>
          <Button className="bg-brand-sand" onClick={clearSession} type="button">
            Sign out
          </Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function AdminGuard() {
  const accessToken = useAuthStore((state) => state.accessToken);
  return accessToken ? <AdminLayout /> : <Navigate replace to="/admin/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<BookingWizard />} path="/booking" />
      <Route element={<ConfirmationPage />} path="/booking/confirm/:id" />
      <Route element={<LoginPage />} path="/admin/login" />
      <Route element={<AdminGuard />}>
        <Route element={<DashboardPage />} path="/admin" />
        <Route element={<BarbersPage />} path="/admin/barbers" />
        <Route element={<ServicesPage />} path="/admin/services" />
        <Route element={<SchedulePage />} path="/admin/schedule" />
      </Route>
    </Routes>
  );
}

