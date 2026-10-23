import { NavLink, useLocation } from "react-router";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Kanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  Users,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import logo from "@/shared/assets/figma/icons/logo.svg";
import type { PerfilAtual } from "@/core/auth/api";

export function Sidebar({
  perfil,
  recolhida,
  onToggle,
}: {
  perfil: PerfilAtual;
  recolhida: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const [adminAberto, setAdminAberto] = useState(false);
  const estaNaAdmin = location.pathname.startsWith("/admin/");
  const itens = [
    { to: "/overview", label: t("overview"), Icon: LayoutDashboard },
    { to: "/board", label: t("board"), Icon: Kanban },
    { to: "/timeline", label: t("timeline"), Icon: CalendarDays },
  ];
  const itensAdmin = [
    ["/admin/usuarios", t("users"), Users],
    ["/admin/setores", t("sectors"), Building2],
    ["/admin/times", t("teams"), UsersRound],
    ["/admin/perfis", t("profiles"), ShieldCheck],
  ] as const;

  return (
    <aside aria-label={t("mainNav")} className={`relative col-start-1 row-span-2 row-start-1 flex h-full min-w-0 flex-col rounded-[2rem] border border-border bg-card p-3 transition-[width] ${recolhida ? "w-16 items-center px-2" : "w-full"}`}>
      <button
        type="button"
        aria-expanded={!recolhida}
        aria-label={t(recolhida ? "expandSidebar" : "collapseSidebar")}
        title={t(recolhida ? "expandSidebar" : "collapseSidebar")}
        onClick={onToggle}
        className="absolute -right-3 top-4 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {recolhida ? <PanelLeftOpen aria-hidden="true" className="size-4" /> : <PanelLeftClose aria-hidden="true" className="size-4" />}
      </button>
      <div className={`flex w-full items-center py-1.5 ${recolhida ? "justify-center px-0" : "gap-2 px-1.5"}`}>
        <img src={logo} alt="" className="h-[18px] w-[18px] shrink-0" />
        {!recolhida && <span className="text-sm font-semibold">TCM</span>}
      </div>
      <nav aria-label={t("mainNav")} className="mt-3 flex w-full flex-col gap-0.5">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={recolhida ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl py-2 text-sm transition-colors ${recolhida ? "w-10 justify-center px-0" : "w-full px-2"} ${
                isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"
              }`
            }
            title={item.label}
          >
            {({ isActive }) => <>
              <item.Icon aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-[#3478F6]" : "text-muted-foreground"}`} />
              {!recolhida && <span className="truncate">{item.label}</span>}
            </>}
          </NavLink>
        ))}
        {perfil.perfil_codigo === "ADMIN_UNIDADE" && (
          <>
            <button
              type="button"
              aria-expanded={adminAberto || estaNaAdmin}
              aria-label={recolhida ? t("administration") : undefined}
              onClick={() => setAdminAberto((aberto) => !aberto)}
              title={t("administration")}
              className={`flex items-center rounded-xl py-2 text-left text-sm text-foreground hover:bg-secondary ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"}`}
            >
              <Settings2 aria-hidden="true" className={`size-[18px] shrink-0 ${estaNaAdmin ? "text-[#3478F6]" : "text-muted-foreground"}`} />
              {!recolhida && <span className="flex-1 truncate">{t("administration")}</span>}
              {!recolhida && <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${adminAberto || estaNaAdmin ? "rotate-180" : ""}`} />}
            </button>
            {(adminAberto || estaNaAdmin) && itensAdmin.map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                aria-label={recolhida ? label : undefined}
                title={label}
                className={({ isActive }) => `flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "ml-3 w-[calc(100%-0.75rem)] gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"}`}
              >
                {({ isActive }) => <>
                  <Icon aria-hidden="true" className={`size-4 shrink-0 ${isActive ? "text-[#3478F6]" : "text-muted-foreground"}`} />
                  {!recolhida && <span className="truncate">{label}</span>}
                </>}
              </NavLink>
            ))}
          </>
        )}
        {perfil.perfil_codigo !== "ADMIN_UNIDADE" && ((perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("times.consultar") && perfil.setores_gerenciados.length > 0) || (perfil.perfil_codigo === "KP" && perfil.permissoes.includes("times.consultar") && perfil.times.length > 0)) && (
          <NavLink to="/times" title={t("teams")} aria-label={recolhida ? t("teams") : undefined} className={({ isActive }) => `flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"}`}>
            {({ isActive }) => <>
              <UsersRound aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-[#3478F6]" : "text-muted-foreground"}`} />
              {!recolhida && <span>{t("teams")}</span>}
            </>}
          </NavLink>
        )}
        {perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("usuarios.consultar") && (
          <NavLink to="/usuarios" title={t("users")} aria-label={recolhida ? t("users") : undefined} className={({ isActive }) => `flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"}`}>
            {({ isActive }) => <><Users aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-[#3478F6]" : "text-muted-foreground"}`} />{!recolhida && <span>{t("users")}</span>}</>}
          </NavLink>
        )}
      </nav>
      <div className="mt-auto pt-6">
        {!recolhida && <p className="px-2 pb-3 text-sm font-medium uppercase leading-5 tracking-[1px] text-[#454442]">{t("support")}</p>}
        <button type="button" aria-label={recolhida ? t("documentation") : undefined} className={`flex items-center rounded-xl py-2.5 text-sm font-normal leading-5 tracking-normal text-[#454442] hover:bg-secondary ${recolhida ? "w-10 justify-center px-0" : "w-full gap-3 px-2"}`} title={t("documentation")}>
          <SquareTerminal aria-hidden="true" className="h-5 w-5 shrink-0" />
          {!recolhida && <span>{t("documentation")}</span>}
        </button>
      </div>
    </aside>
  );
}
