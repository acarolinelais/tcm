import { Navigate, useNavigate, useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { PerfilAtual } from "@/core/auth/api";

import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { SelectField } from "@/shared/ui/form-field";
import { PageCard, PageTitle } from "@/shared/ui/page-card";
import { useNavegacaoBoard } from "../hooks/useProjetos";

const linkDoKanban = (projetoId: string) => `/projetos/${projetoId}?aba=kanban`;
/** O item com o id da URL ou, se for o único, ele mesmo. */
const escolhido = <T extends { id: string }>(itens: T[], id: string | null) => itens.find((item) => item.id === id) ?? (itens.length === 1 ? itens[0] : undefined);
const opcoes = (itens: { id: string; nome: string }[]) => itens.map((item) => ({ value: item.id, label: item.nome }));

/**
 * Board (spec 037): escolha em cascata Setor → Time → Projeto dentro do escopo, que leva à aba Kanban do projeto.
 * A seleção fica na URL (?setor=&time=); um seletor com uma única opção já vem escolhido.
 */
export function BoardPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const navegacao = useNavegacaoBoard(perfil);

  if (navegacao.isLoading) return <BoardCard><Aviso>{t("loading")}</Aviso></BoardCard>;
  if (navegacao.isError || !navegacao.data) {
    return <BoardCard><ErroComRetry mensagem={t("boardLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void navegacao.refetch() }} /></BoardCard>;
  }

  const { setores } = navegacao.data;
  if (!setores.length) return <BoardCard><Aviso>{t("boardNoTeams")}</Aviso></BoardCard>;

  const setor = escolhido(setores, parametros.get("setor"));
  const time = setor && escolhido(setor.times, parametros.get("time"));
  const projetos = time?.projetos ?? [];

  // Um único caminho até um único projeto: vai direto para o Kanban dele (RN-14).
  if (time && projetos.length === 1) return <Navigate to={linkDoKanban(projetos[0].id)} replace />;

  return (
    <BoardCard>
      <div className="grid max-w-md gap-5">
        <SelectField label={t("sector")} value={setor?.id ?? ""} options={opcoes(setores)} onChange={(id) => setParametros(id ? { setor: id } : {}, { replace: true })} />
        {setor && (
          <SelectField label={t("team")} value={time?.id ?? ""} options={opcoes(setor.times)} onChange={(id) => setParametros(id ? { setor: setor.id, time: id } : { setor: setor.id }, { replace: true })} />
        )}
        {time && (projetos.length
          ? <SelectField label={t("project")} value="" options={opcoes(projetos)} onChange={(id) => { if (id) navigate(linkDoKanban(id)); }} />
          : <Aviso>{t("boardTeamWithoutProjects")}</Aviso>)}
      </div>
    </BoardCard>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p role="status" className="text-[14px] text-muted">{children}</p>;
}

function BoardCard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <PageCard>
      <PageTitle className="mb-2">{t("board")}</PageTitle>
      <p className="mb-6 text-[14px] text-muted">{t("boardHint")}</p>
      {children}
    </PageCard>
  );
}
