import { NavLink } from "react-router";

import logo from "@/shared/assets/figma/icons/logo.svg";
import type { PerfilAtual } from "@/core/auth/api";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/board", label: "Board" },
  { to: "/timeline", label: "Timeline" },
  { to: "/usuarios", label: "Usuários" },
];

export function Sidebar({ perfil }: { perfil: PerfilAtual }) {
  const itens = perfil.admin_unidade || perfil.permissoes.includes("perfis.gerenciar")
    ? [...navItems, { to: "/perfis", label: "Perfis e permissões" }]
    : navItems;
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-6 rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 px-2 py-1">
        <img src={logo} alt="" className="h-6 w-6" />
        <span className="text-sm font-semibold">SDF Control</span>
      </div>
      <nav className="flex flex-col gap-1">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive ? "bg-primary/10 font-medium text-foreground" : "text-foreground hover:bg-secondary"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
