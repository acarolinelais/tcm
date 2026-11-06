import { useQuery } from "@tanstack/react-query";

import { overviewApi } from "../api/overview.api";

/** Gráficos do escopo de times (KP, spec 063). */
export function useOverviewTime() {
  return useQuery({ queryKey: ["overview", "time"], queryFn: overviewApi.obterTime });
}

/** Burndown e Pass Rate do projeto escolhido; espera haver um projeto. */
export function useOverviewProjeto(projetoId: string | undefined) {
  return useQuery({
    queryKey: ["overview", "projeto", projetoId],
    queryFn: () => overviewApi.obterProjeto(projetoId!),
    enabled: Boolean(projetoId),
  });
}

/** Gráficos de quem está logado, como responsável principal (dev, spec 063). */
export function useOverviewPessoal() {
  return useQuery({ queryKey: ["overview", "pessoal"], queryFn: overviewApi.obterPessoal });
}
