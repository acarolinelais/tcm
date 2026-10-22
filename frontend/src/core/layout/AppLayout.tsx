import { NavLink, Outlet } from "react-router";

const navItems = [{ to: "/usuarios", label: "Usuários" }];

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border p-4">
        <div className="mb-6 text-lg font-semibold">SDF Manager</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${isActive ? "bg-secondary font-medium" : "hover:bg-secondary"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
