import { useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { overviewApi } from "../api/overview.api";
import type { OverviewTime } from "../model/overview";

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

/**
 * Projeto escolhido no seletor da Overview (spec 063, RN-04): abre no primeiro projeto ativo, em ordem alfabética
 * (a API já manda nessa ordem). Usado pelo KP (burndown e Pass Rate) e pelo gerente (Pass Rate, spec 064).
 */
export function useProjetoEscolhido(time: UseQueryResult<OverviewTime>) {
  const [escolhido, setEscolhido] = useState<string>();
  const projetos = time.data?.projetos ?? [];
  const projetoAberto = projetos.find((projeto) => projeto.id === escolhido) ?? projetos[0];
  const projeto = useOverviewProjeto(projetoAberto?.id);
  return {
    projetos,
    projetoAberto,
    escolher: setEscolhido,
    projeto,
    semProjetos: time.isSuccess && !projetos.length,
    // Os gráficos do projeto dependem das duas consultas: a lista de projetos e a do projeto aberto.
    tentarDeNovo: () => void (time.isError ? time.refetch() : projeto.refetch()),
    estado: (vazio: boolean): EstadoGrafico => (time.isError ? "erro" : estadoDe(projeto, vazio)),
  };
}

export type ProjetoEscolhido = ReturnType<typeof useProjetoEscolhido>;

export type EstadoGrafico = "carregando" | "erro" | "vazio" | "pronto";

/**
 * Estado do cartão a partir da consulta; `vazio` diz se os dados que chegaram não têm o que desenhar. Usa o
 * `isPending`, e não o `isLoading`: uma consulta ainda desligada (o projeto antes da lista chegar) carrega, e não
 * pisca o vazio.
 */
export function estadoDe(consulta: { isPending: boolean; isError: boolean }, vazio: boolean): EstadoGrafico {
  if (consulta.isError) return "erro";
  if (consulta.isPending) return "carregando";
  return vazio ? "vazio" : "pronto";
}
