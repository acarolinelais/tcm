import { NavLink, useLocation } from "react-router";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import logo from "@/shared/assets/figma/icons/logo.svg";
import type { PerfilAtual } from "@/core/auth/api";
import {
  AdministrationIcon,
  BoardIcon,
  DocumentationIcon,
  OverviewIcon,
  ProjectsIcon,
  SectorsIcon,
  TeamsIcon,
  TimelineIcon,
  UsersIcon,
} from "./sidebar-icons";

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
    { to: "/overview", label: t("overview"), Icon: OverviewIcon },
    { to: "/board", label: t("board"), Icon: BoardIcon },
    { to: "/timeline", label: t("timeline"), Icon: TimelineIcon },
  ];
  if (perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar")) {
    itens.push({ to: "/projetos", label: t("myProjects"), Icon: ProjectsIcon });
  }
  const itensAdmin = [
    ["/admin/usuarios", t("users"), UsersIcon],
    ["/admin/setores", t("sectors"), SectorsIcon],
    ["/admin/times", t("teams"), TeamsIcon],
    ["/admin/perfis", t("profiles"), ShieldCheck],
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
            className={({ isActive }) =>
              `group relative flex items-center rounded-xl py-2 text-sm transition-colors ${recolhida ? "w-10 justify-center gap-0 px-0" : "w-full gap-2 px-2"} ${
                isActive ? "bg-[#EAF0FF] text-primary" : "text-foreground hover:bg-secondary"
              }`
            }
          >
            {({ isActive }) => <>
              <item.Icon aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span aria-hidden={recolhida} className={`${transicaoRotulo} truncate text-left ${larguraRotulo}`}>{item.label}</span>
              {recolhida && <TooltipRotulo titulo={item.label} />}
            </>}
          </NavLink>
        ))}
        {perfil.perfil_codigo === "ADMIN_UNIDADE" && (
          <>
            <button
              type="button"
              aria-expanded={adminAberto}
              aria-label={recolhida ? t("administration") : undefined}
              onClick={() => setAdminAberto((aberto) => !aberto)}
              className={`group relative flex items-center rounded-xl py-2 text-left text-sm text-foreground hover:bg-secondary ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"}`}
            >
              <AdministrationIcon aria-hidden="true" className={`size-[18px] shrink-0 ${estaNaAdmin ? "text-primary" : "text-muted-foreground"}`} />
              <span aria-hidden={recolhida} className={`${transicaoRotulo} flex-1 truncate ${larguraRotulo}`}>{t("administration")}</span>
              {!recolhida && <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform duration-200 ease-in-out motion-reduce:transition-none ${adminAberto ? "rotate-180" : ""}`} />}
              {recolhida && <TooltipRotulo titulo={t("administration")} />}
            </button>
            <div
              aria-hidden={!adminAberto}
              inert={!adminAberto}
              className={`grid w-full transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none ${adminAberto ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
            >
              <div className="min-h-0 w-full">
                {itensAdmin.map(([to, label, Icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    aria-label={recolhida ? label : undefined}
                    className={({ isActive }) => `group relative flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "ml-3 w-[calc(100%-0.75rem)] gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-primary" : "text-foreground hover:bg-secondary"}`}
                  >
                    {({ isActive }) => <>
                      <Icon aria-hidden="true" className={`size-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span aria-hidden={recolhida} className={`${transicaoRotulo} truncate ${larguraRotulo}`}>{label}</span>
                      {recolhida && <TooltipRotulo titulo={label} />}
                    </>}
                  </NavLink>
                ))}
              </div>
            </div>
          </>
        )}
        {perfil.perfil_codigo !== "ADMIN_UNIDADE" && ((perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("times.consultar") && perfil.setores_gerenciados.length > 0) || (perfil.perfil_codigo === "KP" && perfil.permissoes.includes("times.consultar") && perfil.times.length > 0)) && (
          <NavLink to="/times" aria-label={recolhida ? t("teams") : undefined} className={({ isActive }) => `group relative flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-primary" : "text-foreground hover:bg-secondary"}`}>
            {({ isActive }) => <>
              <TeamsIcon aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("teams")}</span>
              {recolhida && <TooltipRotulo titulo={t("teams")} />}
            </>}
          </NavLink>
        )}
        {(perfil.perfil_codigo === "GERENTE" || perfil.perfil_codigo === "KP") && perfil.permissoes.includes("usuarios.consultar") && (
          <NavLink to="/usuarios" aria-label={recolhida ? t("users") : undefined} className={({ isActive }) => `group relative flex items-center rounded-xl py-2 text-sm ${recolhida ? "w-10 justify-center px-0" : "w-full gap-2 px-2"} ${isActive ? "bg-[#EAF0FF] text-primary" : "text-foreground hover:bg-secondary"}`}>
            {({ isActive }) => <><UsersIcon aria-hidden="true" className={`size-[18px] shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} /><span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("users")}</span>{recolhida && <TooltipRotulo titulo={t("users")} />}</>}
          </NavLink>
        )}
      </nav>
      <div className="mt-auto pt-6">
        {!recolhida && <p className="px-2 pb-3 text-sm font-medium uppercase leading-5 tracking-[1px] text-[#454442]">{t("support")}</p>}
        <NavLink
          to="/documentation"
          aria-label={recolhida ? t("documentation") : undefined}
          className={({ isActive }) => `group relative flex items-center rounded-xl py-2.5 text-sm font-normal leading-5 tracking-normal ${recolhida ? "w-10 justify-center px-0" : "w-full gap-3 px-2"} ${isActive ? "bg-[#EAF0FF] text-primary" : "text-[#454442] hover:bg-secondary"}`}
        >
          {({ isActive }) => <>
            <DocumentationIcon aria-hidden="true" className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
            <span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("documentation")}</span>
            {recolhida && <TooltipRotulo titulo={t("documentation")} />}
          </>}
        </NavLink>
      </div>
    </aside>
  );
}

// Só aparece com a sidebar recolhida; o nome acessível já vem do aria-label do link.
function TooltipRotulo({ titulo }: { titulo: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground opacity-0 shadow-lg transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 motion-reduce:transition-none"
    >
      {titulo}
    </span>
  );
}
