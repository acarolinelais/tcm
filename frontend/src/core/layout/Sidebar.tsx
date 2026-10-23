import { NavLink, useLocation, useNavigate } from "react-router";
import { BookOpenText, ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";

import logo from "@/shared/assets/figma/icons/logo.svg";
import type { PerfilAtual } from "@/core/auth/api";
import { clearTokens } from "@/core/auth/session";
import { httpPost } from "@/core/api/http-client";

const navItems = [
  { to: "/overview", label: "Overview" },
  { to: "/board", label: "Board" },
  { to: "/timeline", label: "Timeline" },
];

export function Sidebar({ perfil }: { perfil: PerfilAtual }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminAberto, setAdminAberto] = useState(false);
  const estaNaAdmin = location.pathname.startsWith("/admin/");
  const itens = navItems;

  async function sair() {
    try {
      await httpPost<void>("/api/auth/logout", {});
    } finally {
      clearTokens();
      navigate("/login", { replace: true });
    }
  }

  return (
    <aside className="col-start-1 row-span-2 row-start-1 flex h-full w-[clamp(8.75rem,18vw,15rem)] flex-col rounded-[2rem] border border-border bg-card p-3 max-sm:w-14 max-sm:items-center max-sm:px-1.5">
      <div className="flex items-center gap-2 px-1.5 py-1.5 max-sm:justify-center max-sm:px-0">
        <img src={logo} alt="" className="h-[18px] w-[18px] shrink-0" />
        <span className="text-sm font-semibold max-sm:hidden">TCM</span>
      </div>
      <nav aria-label="Navegação principal" className="mt-3 flex flex-col gap-0.5">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors max-sm:justify-center max-sm:px-0 ${
                isActive ? "bg-[#EAF0FF] text-foreground" : "text-foreground hover:bg-secondary"
              }`
            }
            title={item.label}
          >
            {({ isActive }) => <>
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center">
                <span className={`h-3 w-3 rounded-full transition-all ${isActive ? "h-4 w-4 bg-[#5588F5]" : "bg-transparent"}`} />
              </span>
              <span className="truncate max-sm:hidden">{item.label}</span>
            </>}
          </NavLink>
        ))}
        {perfil.perfil_codigo === "ADMIN_UNIDADE" && (
          <>
            <button
              type="button"
              aria-expanded={adminAberto || estaNaAdmin}
              onClick={() => setAdminAberto((aberto) => !aberto)}
              className="flex w-full items-center gap-1 rounded-full px-2 py-1 text-left text-sm text-foreground hover:bg-secondary max-sm:justify-center max-sm:px-0"
            >
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center"><span className="h-3 w-3 rounded-full" /></span>
              <span className="flex-1 truncate max-sm:hidden">Administração</span>
              <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform max-sm:hidden ${adminAberto || estaNaAdmin ? "rotate-180" : ""}`} />
            </button>
            {(adminAberto || estaNaAdmin) && [
              ["/admin/usuarios", "Usuários"], ["/admin/setores", "Setores"], ["/admin/times", "Times"], ["/admin/perfis", "Perfis e permissões"],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `ml-3 flex items-center gap-1 rounded-full py-1 pl-2 pr-3 text-sm max-sm:hidden ${isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"}`}
              >
                {({ isActive }) => <>
                  <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <span className={`h-3 w-3 rounded-full transition-colors ${isActive ? "bg-[#5588F5]" : "bg-transparent"}`} />
                  </span>
                  <span className="truncate">{label}</span>
                </>}
              </NavLink>
            ))}
          </>
        )}
        {perfil.perfil_codigo !== "ADMIN_UNIDADE" && ((perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("times.consultar") && perfil.setores_gerenciados.length > 0) || (perfil.permissoes.includes("times.consultar") && perfil.times.some((time) => time.papel === "kp"))) && (
          <NavLink to="/times" className={({ isActive }) => `flex items-center gap-1 rounded-full px-2 py-1 text-sm max-sm:justify-center max-sm:px-0 ${isActive ? "bg-[#EAF0FF]" : "hover:bg-secondary"}`}>
            {({ isActive }) => <>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center"><span className={`h-3 w-3 rounded-full ${isActive ? "h-4 w-4 bg-[#5588F5]" : ""}`} /></span>
              <span className="max-sm:hidden">Times</span>
            </>}
          </NavLink>
        )}
      </nav>
      <div className="mt-auto pt-6">
        <p className="px-2 pb-2 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground max-sm:hidden">Suporte</p>
        <button type="button" className="flex w-full items-center gap-2 rounded-full px-2 py-2 text-xs text-foreground hover:bg-secondary max-sm:justify-center max-sm:px-0" title="Documentação">
          <BookOpenText aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="max-sm:hidden">Documentação</span>
        </button>
        <button type="button" onClick={sair} className="flex w-full items-center gap-2 rounded-full px-2 py-2 text-xs text-foreground hover:bg-secondary max-sm:justify-center max-sm:px-0" title="Sair">
          <LogOut aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="max-sm:hidden">Sair</span>
        </button>
      </div>
    </aside>
  );
}
