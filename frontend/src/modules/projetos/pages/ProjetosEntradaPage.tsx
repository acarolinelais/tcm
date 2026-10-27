import { Navigate, useOutletContext } from "react-router";
import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { PerfilAtual } from "@/core/auth/api";
import { PageCard } from "@/shared/ui/page-card";
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
  return <PageCard>
    {projetos.isPending || projetos.isFetching ? <p role="status" className="text-[14px] text-muted">{t("loadingProjects")}</p>
      : projetos.isError || (projetoSemCasosId && primeiro?.id === projetoSemCasosId) ? <div role="alert" className="flex flex-col items-start gap-3 text-[14px] text-[#454442]"><p>{t("projectsLoadError")}</p><Button variant="outline" onPress={() => void projetos.refetch()}>{t("retryQuery")}</Button></div>
        : primeiro ? <Navigate replace to={`/projetos/${primeiro.id}`} /> : <ProjetosDevEmptyState />}
  </PageCard>;
}
