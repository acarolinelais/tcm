import { useState, type ReactNode } from "react";
import { Link, Navigate, useOutletContext } from "react-router";
import { SearchField } from "@heroui/react";
import { ChevronRight, FolderKanban, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PerfilAtual } from "@/core/auth/api";

import { cn } from "@/shared/lib/utils";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { FiltroEncerrados } from "@/shared/ui/filtro-encerrados";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { TagChip } from "@/shared/ui/tag-chip";
import { statusProjetoTons } from "../components/status/status-projeto-estilos";
import { useNavegacaoBoard } from "../hooks/useProjetos";
import { filtrarEncerrados, projetoEncerrado, ROTULO_STATUS_PROJETO, type NavegacaoBoard } from "../model/projeto";
import { lerUltimoProjetoBoard } from "../utils/ultimo-projeto-board";

type Time = NavegacaoBoard["setores"][number]["times"][number];
type CardDoTime = Time & { soEncerrados: boolean };

const linkDoKanban = (projetoId: string) => `/board/${projetoId}`;

/**
 * Board (spec 037, RN-12 a RN-16). O dev e quem tem um time só vão direto para um Kanban; admin, gerente e KP com
 * vários times escolhem o projeto em cards por time, agrupados por setor.
 */
export function BoardPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const navegacao = useNavegacaoBoard(perfil);
  const [busca, setBusca] = useState("");
  const [comEncerrados, setComEncerrados] = useState(false);
  const filtro = <FiltroEncerrados ligado={comEncerrados} onChange={setComEncerrados} />;

  if (navegacao.isLoading) return <BoardCard><Aviso>{t("loading")}</Aviso></BoardCard>;
  if (navegacao.isError || !navegacao.data) {
    return <BoardCard><ErroComRetry mensagem={t("boardLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void navegacao.refetch() }} /></BoardCard>;
  }

  const { setores } = navegacao.data;
  const times = setores.flatMap((setor) => setor.times);
  if (!times.length) return <BoardCard><EstadoVazio className="m-auto" titulo={t("boardNoTeams")} dica={t("boardNoTeamsHint")} /></BoardCard>;

  if (perfil.perfil_codigo === "USUARIO_PADRAO" || times.length === 1) {
    const projetos = times.flatMap((time) => time.projetos);
    if (!projetos.length) return <BoardCard><EstadoVazio className="m-auto" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} /></BoardCard>;
    const candidatos = filtrarEncerrados(projetos, comEncerrados);
    const ultimo = lerUltimoProjetoBoard(perfil.id);
    const destino = candidatos.find((projeto) => projeto.id === ultimo) ?? candidatos[0];
    return destino ? <Navigate to={linkDoKanban(destino.id)} replace /> : <BoardCard busca={filtro}><EstadoVazio className="m-auto" titulo={t("noOpenProjects")} dica={t("noOpenProjectsHint")} /></BoardCard>;
  }

  const termo = busca.trim().toLocaleLowerCase();
  // Um time que bate com a busca mostra todos os projetos; senão, só os projetos que batem.
  const filtrarTime = (todos: Time): CardDoTime | null => {
    const projetosVisiveis = filtrarEncerrados(todos.projetos, comEncerrados);
    const time = { ...todos, projetos: projetosVisiveis, soEncerrados: todos.projetos.length > 0 && !projetosVisiveis.length };
    if (!termo || time.nome.toLocaleLowerCase().includes(termo)) return time;
    const projetos = time.projetos.filter((projeto) => projeto.nome.toLocaleLowerCase().includes(termo));
    return projetos.length ? { ...time, projetos } : null;
  };
  const visiveis = setores
    .map((setor) => ({ ...setor, times: setor.times.map(filtrarTime).filter((time): time is CardDoTime => time !== null) }))
    .filter((setor) => setor.times.length > 0);

  return (
    <BoardCard
      busca={
        <div className="flex flex-wrap items-center gap-4">
          {filtro}
          <SearchField aria-label={t("boardSearch")} value={busca} onChange={setBusca} className="w-full sm:w-72">
            <SearchField.Group className="h-9 rounded-full">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t("boardSearch")} className="text-[14px]" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      }
    >
      {visiveis.length ? (
        <div className="thin-scroll -mr-2 grid min-h-0 flex-1 content-start gap-8 overflow-y-auto pr-2">
          {visiveis.map((setor) => (
            <section key={setor.id} aria-labelledby={`setor-${setor.id}`} className="grid gap-3">
              <h2 id={`setor-${setor.id}`} className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-muted">
                {setor.nome}
                <span className="rounded-full bg-panel px-2 py-0.5 text-[11px] normal-case tracking-normal">{t("boardTeams", { count: setor.times.length })}</span>
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4">
                {setor.times.map((time) => <CardTime key={time.id} time={time} />)}
              </div>
            </section>
          ))}
        </div>
      ) : <Aviso>{t("boardNoSearchResults")}</Aviso>}
    </BoardCard>
  );
}

/** Iniciais do time para o selo do card: "SDF Automation" → "SA", "Site" → "SI". */
function iniciais(nome: string) {
  const palavras = nome.trim().split(/\s+/);
  return (palavras.length > 1 ? palavras[0][0] + palavras[1][0] : nome.slice(0, 2)).toLocaleUpperCase();
}

function CardTime({ time }: { time: CardDoTime }) {
  const { t } = useTranslation();
  return (
    <article
      aria-label={time.nome}
      className="flex flex-col gap-4 rounded-3xl bg-panel p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-[14px] font-semibold text-accent-text">
          {iniciais(time.nome)}
        </span>
        <div className="grid min-w-0 gap-0.5">
          <h3 className="truncate text-[16px] font-semibold text-body">{time.nome}</h3>
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <Users aria-hidden="true" className="size-3.5" />
            {t("boardMembers", { count: time.membros })}
            <span aria-hidden="true">·</span>
            {t("boardProjects", { count: time.projetos.length })}
          </p>
        </div>
      </header>
      {time.projetos.length ? (
        <ul className="grid gap-1">
          {time.projetos.map((projeto) => (
            <li key={projeto.id}>
              <Link
                to={linkDoKanban(projeto.id)}
                className={cn(
                  "group/projeto flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  projetoEncerrado(projeto.status) ? "text-muted" : "text-body",
                )}
              >
                <FolderKanban aria-hidden="true" className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate font-medium">{projeto.nome}</span>
                <TagChip tom={statusProjetoTons[projeto.status]}>{t(ROTULO_STATUS_PROJETO[projeto.status])}</TagChip>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover/projeto:opacity-100 group-focus-visible/projeto:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-xl bg-surface px-3 py-3 text-[13px] text-muted">{t(time.soEncerrados ? "noOpenProjects" : "boardTeamWithoutProjects")}</p>}
    </article>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return <p role="status" className="text-[14px] text-muted">{children}</p>;
}

function BoardCard({ children, busca }: { children: ReactNode; busca?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <PageCard>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <PageTitle>{t("board")}</PageTitle>
          <p className="text-[14px] text-muted">{t("boardHint")}</p>
        </div>
        {busca}
      </div>
      {children}
    </PageCard>
  );
}
