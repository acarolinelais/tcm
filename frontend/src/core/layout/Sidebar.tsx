import { NavLink, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import logo from "@/shared/assets/figma/icons/logo-icone.svg";
import type { PerfilAtual } from "@/core/auth/api";
import {
  AdministrationIcon,
  BoardIcon,
  ChevronIcon,
  CollapseIcon,
  DeviceIcon,
  DocumentationIcon,
  OverviewIcon,
  ProfilesIcon,
  ProjectsIcon,
  SectorsIcon,
  SettingsIcon,
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
    itens.push({ to: "/projetos", label: t(perfil.perfil_codigo === "USUARIO_PADRAO" ? "projectsNav" : "myProjects"), Icon: ProjectsIcon });
  }
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  // Administration agrupa as telas de cadastro: o admin vê todas; o KP vê só o catálogo de modelos.
  const itensAdmin = [
    ...(admin ? [
      ["/admin/usuarios", t("users"), UsersIcon],
      ["/admin/setores", t("sectors"), SectorsIcon],
      ["/admin/times", t("teams"), TeamsIcon],
      ["/admin/perfis", t("profiles"), ProfilesIcon],
    ] as const : []),
    ...(admin || perfil.permissoes.includes("modelos_dispositivo.gerenciar") ? [["/admin/modelos-dispositivo", t("deviceModels"), DeviceIcon] as const] : []),
  ];
  // Suporte aparece para todos os perfis (frames "Sidebar - Admin/Manager/KP/Dev" do Figma).
  const itensSuporte = [
    ["/documentation", t("documentation"), DocumentationIcon],
    ["/configuracoes", t("settings"), SettingsIcon],
  ] as const;
  const transicaoRotulo = "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";
  const larguraRotulo = recolhida ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[14rem] translate-x-0 opacity-100";

  return (
    <aside aria-label={t("mainNav")} className={`relative col-start-1 row-span-2 row-start-1 flex h-full w-full min-w-0 flex-col rounded-[2rem] border border-border bg-card p-3`}>
      <button
        type="button"
        aria-expanded={!recolhida}
        aria-label={t(recolhida ? "expandSidebar" : "collapseSidebar")}
        title={t(recolhida ? "expandSidebar" : "collapseSidebar")}
        onClick={onToggle}
        className="absolute -right-3 top-14 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CollapseIcon aria-hidden="true" className={`transition-transform duration-200 motion-reduce:transition-none ${recolhida ? "rotate-180" : ""}`} />
      </button>
      <div className={"flex w-full items-center gap-2 px-[10.5px] pt-7"}>
        {/* max-w-none: o max-width: 100% padrão das imagens espremia o ícone no fim do recolhimento. */}
        <img src={logo} alt="" className="size-[27px] max-w-none shrink-0" />
        <span aria-hidden={recolhida} className={`${transicaoRotulo} text-xl font-semibold tracking-tight text-[#4285F4] ${larguraRotulo}`}>TCM</span>
      </div>
      <nav aria-label={t("mainNav")} className="mt-[19px] flex w-full min-w-0 flex-col gap-0.5">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={recolhida ? item.label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center rounded-lg py-[7.5px] text-[15px] leading-[21px] transition-colors w-full gap-2.5 px-4 ${
                isActive ? "bg-[#EAF1FF] text-primary" : "text-[#454442] hover:bg-secondary"
              }`
            }
          >
            {({ isActive }) => <>
              <span className="flex w-4 shrink-0 justify-center"><item.Icon aria-hidden="true" className={`${isActive ? "text-primary" : "text-[#454442]"}`} /></span>
              <span aria-hidden={recolhida} className={`${transicaoRotulo} truncate text-left ${larguraRotulo}`}>{item.label}</span>
              {recolhida && <TooltipRotulo titulo={item.label} />}
            </>}
          </NavLink>
        ))}
        {itensAdmin.length > 0 && (
          <>
            <button
              type="button"
              aria-expanded={adminAberto}
              aria-label={recolhida ? t("administration") : undefined}
              onClick={() => setAdminAberto((aberto) => !aberto)}
              className={`group relative flex items-center rounded-lg py-[7.5px] text-left text-[15px] leading-[21px] text-[#454442] hover:bg-secondary w-full gap-2.5 px-4`}
            >
              <span className="flex w-4 shrink-0 justify-center"><AdministrationIcon aria-hidden="true" className={`${estaNaAdmin ? "text-primary" : "text-[#454442]"}`} /></span>
              <span aria-hidden={recolhida} className={`${transicaoRotulo} flex-1 truncate ${larguraRotulo}`}>{t("administration")}</span>
              {!recolhida && <ChevronIcon aria-hidden="true" className={`shrink-0 text-[#454442] transition-transform duration-200 ease-in-out motion-reduce:transition-none ${adminAberto ? "rotate-180" : ""}`} />}
              {recolhida && <TooltipRotulo titulo={t("administration")} />}
            </button>
            <div
              aria-hidden={!adminAberto}
              inert={!adminAberto}
              className={`grid w-full transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none ${adminAberto ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
            >
              {/* min-w-0: sem ele, o item da grade não encolhe abaixo do texto e o destaque vaza da sidebar. */}
              <div className="min-h-0 min-w-0 w-full">
                {itensAdmin.map(([to, label, Icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    aria-label={recolhida ? label : undefined}
                    className={({ isActive }) => `group relative flex items-center rounded-lg py-2.5 text-[15px] leading-[21px] gap-2.5 px-4 transition-[margin,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${recolhida ? "ml-0 w-full" : "ml-3 w-[calc(100%-0.75rem)]"} ${isActive ? "bg-[#EAF1FF] text-primary" : "text-[#454442] hover:bg-secondary"}`}
                  >
                    {({ isActive }) => <>
                      <span className="flex w-4 shrink-0 justify-center"><Icon aria-hidden="true" className={`${isActive ? "text-primary" : "text-[#454442]"}`} /></span>
                      <span aria-hidden={recolhida} className={`${transicaoRotulo} truncate ${larguraRotulo}`}>{label}</span>
                      {recolhida && <TooltipRotulo titulo={label} />}
                    </>}
                  </NavLink>
                ))}
              </div>
            </div>
          </>
        )}
        {perfil.perfil_codigo !== "ADMIN_UNIDADE" && ((perfil.perfil_codigo === "GERENTE" && perfil.permissoes.includes("times.consultar") && (perfil.setores_gerenciados.length > 0 || perfil.times.length > 0)) || ((perfil.perfil_codigo === "KP" || perfil.perfil_codigo === "USUARIO_PADRAO") && perfil.permissoes.includes("times.consultar") && perfil.times.length > 0)) && (
          <NavLink to="/times" aria-label={recolhida ? t("teams") : undefined} className={({ isActive }) => `group relative flex items-center rounded-lg py-[7.5px] text-[15px] leading-[21px] w-full gap-2.5 px-4 ${isActive ? "bg-[#EAF1FF] text-primary" : "text-[#454442] hover:bg-secondary"}`}>
            {({ isActive }) => <>
              <span className="flex w-4 shrink-0 justify-center"><TeamsIcon aria-hidden="true" className={`${isActive ? "text-primary" : "text-[#454442]"}`} /></span>
              <span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("teams")}</span>
              {recolhida && <TooltipRotulo titulo={t("teams")} />}
            </>}
          </NavLink>
        )}
        {(perfil.perfil_codigo === "GERENTE" || perfil.perfil_codigo === "KP") && perfil.permissoes.includes("usuarios.consultar") && (
          <NavLink to="/usuarios" aria-label={recolhida ? t("users") : undefined} className={({ isActive }) => `group relative flex items-center rounded-lg py-[7.5px] text-[15px] leading-[21px] w-full gap-2.5 px-4 ${isActive ? "bg-[#EAF1FF] text-primary" : "text-[#454442] hover:bg-secondary"}`}>
            {({ isActive }) => <><span className="flex w-4 shrink-0 justify-center"><UsersIcon aria-hidden="true" className={`${isActive ? "text-primary" : "text-[#454442]"}`} /></span><span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("users")}</span>{recolhida && <TooltipRotulo titulo={t("users")} />}</>}
          </NavLink>
        )}
      </nav>
      <div className="mt-auto pt-6">
        <p aria-hidden={recolhida} className={`overflow-hidden whitespace-nowrap px-4 pb-3 text-[15px] font-medium uppercase leading-[21px] tracking-[1.8px] text-[#454442] transition-opacity duration-200 motion-reduce:transition-none ${recolhida ? "opacity-0" : "opacity-100"}`}>{t("support")}</p>
        {itensSuporte.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            aria-label={recolhida ? label : undefined}
            className={({ isActive }) => `group relative flex items-center rounded-lg py-[7.5px] text-[15px] font-normal leading-[21px] tracking-normal w-full gap-2.5 px-4 ${isActive ? "bg-[#EAF1FF] text-primary" : "text-[#454442] hover:bg-secondary"}`}
          >
            {({ isActive }) => <>
              <span className="flex w-4 shrink-0 justify-center"><Icon aria-hidden="true" className={`${isActive ? "text-primary" : "text-[#454442]"}`} /></span>
              <span aria-hidden={recolhida} className={`${transicaoRotulo} truncate ${larguraRotulo}`}>{label}</span>
              {recolhida && <TooltipRotulo titulo={label} />}
            </>}
          </NavLink>
        ))}
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
