import { NavLink, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";

import logo from "@/shared/assets/figma/icons/logo-tcm.svg";
import type { PerfilAtual } from "@/core/auth/api";
import {
  AdministrationIcon,
  AuditIcon,
  BoardIcon,
  BugReportsIcon,
  ChevronIcon,
  CollapseIcon,
  DeviceIcon,
  DocumentationIcon,
  GeneralResultsIcon,
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
  if (["ADMIN_UNIDADE", "GERENTE", "KP", "USUARIO_PADRAO"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("form_factor.consultar")) {
    itens.push({ to: "/resultados-gerais", label: t("generalResults"), Icon: GeneralResultsIcon });
    itens.push({ to: "/bug-reports", label: t("bugReports"), Icon: BugReportsIcon });
  }
  if (perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar")) {
    itens.push({ to: "/projetos", label: t(perfil.perfil_codigo === "USUARIO_PADRAO" ? "projectsNav" : "myProjects"), Icon: ProjectsIcon });
  }
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  // Administration agrupa as telas de cadastro; cada item respeita sua permissão específica.
  const itensAdmin = [
    ...(admin ? [
      ["/admin/usuarios", t("users"), UsersIcon],
      ["/admin/setores", t("sectors"), SectorsIcon],
      ["/admin/times", t("teams"), TeamsIcon],
      ["/admin/perfis", t("profiles"), ProfilesIcon],
      ["/admin/auditoria", t("audit"), AuditIcon],
    ] as const : []),
    ...(perfil.permissoes.includes("modelos_dispositivo.gerenciar") ? [["/admin/modelos-dispositivo", t("deviceModels"), DeviceIcon] as const] : []),
  ];
  // Suporte aparece para todos os perfis (frames "Sidebar - Admin/Manager/KP/Dev" do Figma).
  const itensSuporte = [
    ["/documentation", t("documentation"), DocumentationIcon],
    ["/configuracoes", t("settings"), SettingsIcon],
  ] as const;
  const transicaoRotulo = "overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";
  const larguraRotulo = recolhida ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[14rem] translate-x-0 opacity-100";

  return (
    <aside aria-label={t("mainNav")} className={`relative col-start-1 row-span-2 row-start-1 flex h-full w-full min-w-0 flex-col rounded-[2rem] border border-edge bg-card p-3`}>
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
      <div className="flex w-full items-center px-[10.5px] pt-7">
        {/* O mesmo SVG tem o símbolo (27px) e o nome: recolhida, ou abaixo de 640px (coluna de 144px), a moldura corta no símbolo. max-w-none: o max-width: 100% padrão das imagens o espremia. */}
        <div className={cn("min-w-0 overflow-hidden transition-[max-width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none", recolhida ? "max-w-[27px]" : "max-w-[184px] max-sm:max-w-[27px]")}>
          <img src={logo} alt="Test Case Manager" className="h-[27px] w-[184px] max-w-none" />
        </div>
      </div>
      <nav aria-label={t("mainNav")} className="mt-[19px] flex w-full min-w-0 flex-col gap-0.5">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={recolhida ? item.label : undefined}
            className={({ isActive }) => classesDoItem({ ativo: isActive, recolhida })}
          >
            {({ isActive }) => <>
              <span className="flex w-4 shrink-0 justify-center"><item.Icon aria-hidden="true" className={`${isActive ? "text-accent-soft-foreground" : "text-body"}`} /></span>
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
              className={cn(classesDoItem({ ativo: false, recolhida }), "text-left")}
            >
              <span className="flex w-4 shrink-0 justify-center"><AdministrationIcon aria-hidden="true" className={`${estaNaAdmin ? "text-accent-soft-foreground" : "text-body"}`} /></span>
              <span aria-hidden={recolhida} className={`${transicaoRotulo} flex-1 truncate ${larguraRotulo}`}>{t("administration")}</span>
              {!recolhida && <ChevronIcon aria-hidden="true" className={`shrink-0 text-body transition-transform duration-200 ease-in-out motion-reduce:transition-none ${adminAberto ? "rotate-180" : ""}`} />}
              {recolhida && <TooltipRotulo titulo={t("administration")} />}
            </button>
            <div
              aria-hidden={!adminAberto}
              inert={!adminAberto}
              className={`grid w-full transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none ${adminAberto ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
            >
              {/* min-w-0: sem ele, o item da grade não encolhe abaixo do texto e o destaque vaza da sidebar. */}
              <div className="flex min-h-0 min-w-0 w-full flex-col gap-0.5">
                {itensAdmin.map(([to, label, Icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    aria-label={recolhida ? label : undefined}
                    className={({ isActive }) => classesDoItem({ ativo: isActive, recolhida, subitem: true })}
                  >
                    {({ isActive }) => <>
                      <span className="flex w-4 shrink-0 justify-center"><Icon aria-hidden="true" className={`${isActive ? "text-accent-soft-foreground" : "text-body"}`} /></span>
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
          <NavLink to="/times" aria-label={recolhida ? t("teams") : undefined} className={({ isActive }) => classesDoItem({ ativo: isActive, recolhida })}>
            {({ isActive }) => <>
              <span className="flex w-4 shrink-0 justify-center"><TeamsIcon aria-hidden="true" className={`${isActive ? "text-accent-soft-foreground" : "text-body"}`} /></span>
              <span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("teams")}</span>
              {recolhida && <TooltipRotulo titulo={t("teams")} />}
            </>}
          </NavLink>
        )}
        {(perfil.perfil_codigo === "GERENTE" || perfil.perfil_codigo === "KP") && perfil.permissoes.includes("usuarios.consultar") && (
          <NavLink to="/usuarios" aria-label={recolhida ? t("users") : undefined} className={({ isActive }) => classesDoItem({ ativo: isActive, recolhida })}>
            {({ isActive }) => <><span className="flex w-4 shrink-0 justify-center"><UsersIcon aria-hidden="true" className={`${isActive ? "text-accent-soft-foreground" : "text-body"}`} /></span><span aria-hidden={recolhida} className={`${transicaoRotulo} ${larguraRotulo}`}>{t("users")}</span>{recolhida && <TooltipRotulo titulo={t("users")} />}</>}
          </NavLink>
        )}
      </nav>
      <div className="mt-auto pt-6">
        <p aria-hidden={recolhida} className={`overflow-hidden whitespace-nowrap px-4 pb-3 text-[15px] font-medium uppercase leading-[21px] tracking-[1.8px] text-body transition-opacity duration-200 motion-reduce:transition-none ${recolhida ? "opacity-0" : "opacity-100"}`}>{t("support")}</p>
        {itensSuporte.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            aria-label={recolhida ? label : undefined}
            className={({ isActive }) => cn(classesDoItem({ ativo: isActive, recolhida }), "font-normal tracking-normal")}
          >
            {({ isActive }) => <>
              <span className="flex w-4 shrink-0 justify-center"><Icon aria-hidden="true" className={`${isActive ? "text-accent-soft-foreground" : "text-body"}`} /></span>
              <span aria-hidden={recolhida} className={`${transicaoRotulo} truncate ${larguraRotulo}`}>{label}</span>
              {recolhida && <TooltipRotulo titulo={label} />}
            </>}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}

/**
 * Classes de todos os itens da Sidebar (spec 050, RN-19): destaque em pílula no ativo e no hover, anel de foco no
 * mesmo raio e toque imediato (RN-14). Recolhida, o item vira um círculo de 30px centralizado no ícone (Figma
 * 2482-2227). Os subitens de Administração mantêm o recuo.
 */
function classesDoItem({ ativo, recolhida, subitem = false }: { ativo: boolean; recolhida: boolean; subitem?: boolean }) {
  return cn(
    "group relative flex items-center rounded-full text-[15px] leading-[21px] transition-[background-color,color,transform,margin,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
    recolhida ? "mx-auto size-[30px] justify-center gap-0 p-0" : cn("w-full gap-2.5 px-4", subitem ? "ml-3 w-[calc(100%-0.75rem)] py-2.5" : "py-[7.5px]"),
    ativo ? "bg-accent-tint text-accent-soft-foreground" : "text-body hover:bg-secondary",
  );
}

// Só aparece com a sidebar recolhida; o nome acessível já vem do aria-label do link.
function TooltipRotulo({ titulo }: { titulo: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-overlay px-2.5 py-1.5 text-sm text-foreground opacity-0 shadow-overlay transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100 motion-reduce:transition-none"
    >
      {titulo}
    </span>
  );
}
