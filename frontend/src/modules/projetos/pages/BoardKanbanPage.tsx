import { useEffect } from "react";
import { useOutletContext, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { PerfilAtual } from "@/core/auth/api";

import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { PilhaAvatares } from "@/shared/ui/pilha-avatares";
import { ProjetoSwitcher } from "../components/ProjetoSwitcher";
import { KanbanBoard } from "../components/kanban/KanbanBoard";
import { useKanban } from "../hooks/useKanban";
import { useNavegacaoBoard, useProjeto } from "../hooks/useProjetos";
import { perfilGerenciaCasos } from "../model/projeto";
import { salvarUltimoProjetoBoard } from "../utils/ultimo-projeto-board";

/** Kanban do projeto aberto pelo Board (spec 037, RN-12): só o quadro, sem as abas da tela do projeto. Cabeçalho do protótipo na spec 056. */
export function BoardKanbanPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const { projetoId = "" } = useParams();
  const projeto = useProjeto(projetoId, perfil);
  // O Board volta a este projeto da próxima vez que a pessoa entrar direto (RN-14).
  const projetoAberto = projeto.data?.id;
  useEffect(() => {
    if (projetoAberto) salvarUltimoProjetoBoard(perfil.id, projetoAberto);
  }, [projetoAberto, perfil.id]);
  // Troca de projeto com a lista do Board: inclui todos os projetos do time do dev (RN-04a), não só os com casos dele.
  const navegacao = useNavegacaoBoard(perfil);
  const projetosDoBoard = navegacao.data?.setores.flatMap((setor) => setor.times.flatMap((time) => time.projetos)) ?? [];
  // Mesma consulta do quadro (a chave é a mesma, então não há segunda chamada): os responsáveis viram a pilha de avatares.
  const kanban = useKanban(projetoId, perfil, Boolean(projeto.data));
  const pessoas = [...new Map((kanban.data?.colunas ?? []).flatMap((coluna) => coluna.casos).map((card) => [card.responsavel_id, { id: card.responsavel_id, nome: card.responsavel_nome, cor_avatar: card.responsavel_cor_avatar }])).values()]
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <PageCard>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <PageTitle>{t("board")}</PageTitle>
          <p className="max-w-xl text-[15px] leading-[21px] text-subtle">{t("boardKanbanHint")}</p>
        </div>
        <PilhaAvatares pessoas={pessoas} rotulo={t("boardPeople")} rotuloMais={(count) => t("timelineMorePeople", { count })} />
      </header>
      {projeto.isLoading ? <p role="status" className="text-[14px] text-muted">{t("loadingProjects")}</p>
        : projeto.isError || !projeto.data ? <p role="alert" className="text-[14px] text-muted">{t("projectNotFound")}</p>
          : (
            <KanbanBoard
              projetoId={projetoId}
              perfil={perfil}
              podeGerenciar={perfilGerenciaCasos(perfil)}
              faixa={<ProjetoSwitcher comoTitulo={false} projetoId={projetoId} nome={projeto.data.nome} projetos={projetosDoBoard} destino={(id) => `/board/${id}`} />}
            />
          )}
    </PageCard>
  );
}
