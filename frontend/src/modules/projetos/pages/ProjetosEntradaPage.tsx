import { Navigate, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { useProjetosPessoais } from "../hooks/useProjetos";
import { ProjetosPage } from "./ProjetosPage";
import { ProjetosDevEmptyState } from "../components/ProjetosDevEmptyState";

export function ProjetosEntradaPage({ projetoSemCasosId }: { projetoSemCasosId?: string }) {
  const perfil = useOutletContext<PerfilAtual>();
  const { t } = useTranslation();
  const dev = perfil.perfil_codigo === "USUARIO_PADRAO";
  const autorizado = perfil.permissoes.includes("test_cases.consultar");
  const projetos = useProjetosPessoais(perfil, dev && autorizado);
  if (!dev) return <ProjetosPage />;
  if (!autorizado) return <p role="alert">{t("permissionDenied")}</p>;
  const primeiro = projetos.data?.items[0];
  return <section className="flex h-full min-h-0 flex-col rounded-[42px] border border-border bg-card p-8">
    {projetos.isPending || projetos.isFetching ? <p role="status">{t("loadingProjects")}</p>
      : projetos.isError || (projetoSemCasosId && primeiro?.id === projetoSemCasosId) ? <div role="alert"><p>{t("projectsLoadError")}</p><Button variant="outline" onClick={() => void projetos.refetch()}>{t("retryQuery")}</Button></div>
        : primeiro ? <Navigate replace to={`/projetos/${primeiro.id}`} /> : <ProjetosDevEmptyState />}
  </section>;
}
