import { useOutletContext, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { PerfilAtual } from "@/core/auth/api";

import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { ProjetoSwitcher } from "../components/ProjetoSwitcher";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { useNavegacaoBoard, useProjeto } from "../hooks/useProjetos";
import { perfilGerenciaCasos } from "../model/projeto";

/** Kanban do projeto aberto pelo Board (spec 037, RN-12): só o quadro, sem as abas da tela do projeto. */
export function BoardKanbanPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const { projetoId = "" } = useParams();
  const projeto = useProjeto(projetoId, perfil);
  // Troca de projeto com a lista do Board: inclui todos os projetos do time do dev (RN-04a), não só os com casos dele.
  const navegacao = useNavegacaoBoard(perfil);
  const projetosDoBoard = navegacao.data?.setores.flatMap((setor) => setor.times.flatMap((time) => time.projetos)) ?? [];

  return (
    <PageCard>
      <div className="mb-6">
        {projeto.data
          ? <ProjetoSwitcher projetoId={projetoId} nome={projeto.data.nome} projetos={projetosDoBoard} destino={(id) => `/board/${id}`} />
          : <PageTitle>{t("board")}</PageTitle>}
      </div>
      {projeto.isLoading ? <p role="status" className="text-[14px] text-muted">{t("loadingProjects")}</p>
        : projeto.isError || !projeto.data ? <p role="alert" className="text-[14px] text-muted">{t("projectNotFound")}</p>
          : <KanbanBoard projetoId={projetoId} perfil={perfil} podeGerenciar={perfilGerenciaCasos(perfil)} />}
    </PageCard>
  );
}
