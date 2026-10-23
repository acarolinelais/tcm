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
import { useEffect, useState } from "react";
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
  const estaNaAdmin = location.pathname.startsWith("/admin/");
  const [adminAberto, setAdminAberto] = useState(estaNaAdmin);
  useEffect(() => setAdminAberto(estaNaAdmin), [estaNaAdmin]);
  const itens = [
    { to: "/overview", label: t("overview"), description: t("overviewDescription"), Icon: LayoutDashboard },
    { to: "/board", label: t("board"), description: t("boardDescription"), Icon: Kanban },
    { to: "/timeline", label: t("timeline"), description: t("timelineDescription"), Icon: CalendarDays },
  ];
  const itensAdmin = [
    ["/admin/usuarios", t("users"), t("usersDescription"), Users],
    ["/admin/setores", t("sectors"), t("sectorsDescription"), Building2],
    ["/admin/times", t("teams"), t("teamsDescription"), UsersRound],
    ["/admin/perfis", t("profiles"), t("profilesDescription"), ShieldCheck],
  ] as const;
  const transicaoRotulo = "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-in-out motion-reduce:transition-none";
  const larguraRotulo = recolhida ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[12rem] translate-x-0 opacity-100";

  return (
    <aside aria-label={t("mainNav")} className={`relative col-start-1 row-span-2 row-start-1 flex h-full min-w-0 flex-col rounded-[2rem] border border-border bg-card p-3 ${recolhida ? "w-16 items-center px-2" : "w-full"}`}>
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
        <span aria-hidden={recolhida} className={`${transicaoRotulo} text-sm font-semibold ${larguraRotulo}`}>TCM</span>
      </div>
      <nav aria-label={t("mainNav")} className="mt-3 flex w-full flex-col gap-0.5">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={recolhida ? item.label : undefined}
            aria-describedby={`sidebar-tooltip-${item.to.slice(1)}`}
            className={({ isActive }) =>
              `group relative flex items-center rounded-xl py-2 text-sm transition-colors ${recolhida ? "w-10 justify-center gap-0 px-0" : "w-full gap-2 px-2"} ${
                isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"
              }`
            }
          >
            {({ isActive }) => <>
              <item.Icon aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-[#3478F6]" : "text-muted-foreground"}`} />
              <span aria-hidden={recolhida} className={`${transicaoRotulo} truncate text-left ${larguraRotulo}`}>{item.label}</span>
              <TooltipDescricao id={item.to.slice(1)} titulo={item.label} descricao={item.description} />
            </>}
          </NavLink>
        ))}
        {perfil.perfil_codigo === "ADMIN_UNIDADE" && (
          <>
            <button
              type="button"
              aria-expanded={adminAberto}
              aria-label={recolhida ? t("administration") : undefined}
              aria-describedby="sidebar-tooltip-administration"
              onClick={() => setAdminAberto((aberto) => !aberto)}
              className={`group relative flex items-center rounded-xl py-2 text-left text-sm text-foreground hover:bg-secondary ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"}`}
            >
              <Settings2 aria-hidden="true" className={`size-[18px] shrink-0 ${estaNaAdmin ? "text-[#3478F6]" : "text-muted-foreground"}`} />
              <span aria-hidden={recolhida} className={`${transicaoRotulo} flex-1 truncate ${larguraRotulo}`}>{t("administration")}</span>
              {!recolhida && <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform duration-200 ease-in-out motion-reduce:transition-none ${adminAberto ? "rotate-180" : ""}`} />}
              <TooltipDescricao id="administration" titulo={t("administration")} descricao={t("administrationDescription")} />
            </button>
            <div
              aria-hidden={!adminAberto}
              inert={!adminAberto}
              className={`grid w-full transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none ${adminAberto ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
            >
              <div className="min-h-0 w-full">
                {itensAdmin.map(([to, label, description, Icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    aria-label={recolhida ? label : undefined}
                    aria-describedby={`sidebar-tooltip-${to.replaceAll("/", "-")}`}
                    className={({ isActive }) => `group relative flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "ml-3 w-[calc(100%-0.75rem)] gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"}`}
                  >
                    {({ isActive }) => <>
                      <Icon aria-hidden="true" className={`size-4 shrink-0 ${isActive ? "text-[#3478F6]" : "text-muted-foreground"}`} />
                      <span aria-hidden={recolhida} className={`${transicaoRotulo} truncate ${larguraRotulo}`}>{label}</span>
                      <TooltipDescricao id={to.replaceAll("/", "-")} titulo={label} descricao={description} />
                    </>}
                  </NavLink>
                ))}
              </div>
            </div>
          </>
        )}
        {perfil.perfil_codigo !== "ADMIN_UNIDADE" && ((perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("times.consultar") && perfil.setores_gerenciados.length > 0) || (perfil.perfil_codigo === "KP" && perfil.permissoes.includes("times.consultar") && perfil.times.length > 0)) && (
          <NavLink to="/times" aria-label={recolhida ? t("teams") : undefined} aria-describedby="sidebar-tooltip-teams" className={({ isActive }) => `group relative flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"}`}>
            {({ isActive }) => <>
              <UsersRound aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-[#3478F6]" : "text-muted-foreground"}`} />
              <span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("teams")}</span>
              <TooltipDescricao id="teams" titulo={t("teams")} descricao={t("teamsDescription")} />
            </>}
          </NavLink>
        )}
        {perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("usuarios.consultar") && (
          <NavLink to="/usuarios" aria-label={recolhida ? t("users") : undefined} aria-describedby="sidebar-tooltip-users" className={({ isActive }) => `group relative flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-foreground hover:bg-secondary"}`}>
            {({ isActive }) => <><Users aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-[#3478F6]" : "text-muted-foreground"}`} /><span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("users")}</span><TooltipDescricao id="users" titulo={t("users")} descricao={t("usersDescription")} /></>}
          </NavLink>
        )}
      </nav>
      <div className="mt-auto pt-6">
        {!recolhida && <p className="px-2 pb-3 text-sm font-medium uppercase leading-5 tracking-[1px] text-[#454442]">{t("support")}</p>}
        <NavLink
          to="/documentation"
          aria-label={recolhida ? t("documentation") : undefined}
          aria-describedby="sidebar-tooltip-documentation"
          className={({ isActive }) => `group relative flex items-center rounded-xl py-2.5 text-sm font-normal leading-5 tracking-normal ${recolhida ? "w-10 justify-center px-0" : "w-full gap-3 px-2"} ${isActive ? "bg-[#EAF0FF] text-[#3478F6]" : "text-[#454442] hover:bg-secondary"}`}
        >
          {({ isActive }) => <>
            <SquareTerminal aria-hidden="true" className={`h-5 w-5 shrink-0 ${isActive ? "text-[#3478F6]" : ""}`} />
            <span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("documentation")}</span>
            <TooltipDescricao id="documentation" titulo={t("documentation")} descricao={t("documentationDescription")} />
          </>}
        </NavLink>
      </div>
    </aside>
  );
}

function TooltipDescricao({ id, titulo, descricao }: { id: string; titulo: string; descricao: string }) {
  return (
    <span
      id={`sidebar-tooltip-${id}`}
      role="tooltip"
      className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 w-56 -translate-y-1/2 rounded-xl border border-border bg-card p-3 text-left opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 motion-reduce:transition-none"
    >
      <span className="block text-sm font-medium text-foreground">{titulo}</span>
      <span className="mt-1 block whitespace-normal text-xs leading-5 text-muted-foreground">{descricao}</span>
    </span>
  );
}
