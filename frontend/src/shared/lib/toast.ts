import type { ReactNode } from "react";
import { toast as heroToast } from "@heroui/react";

interface OpcoesToast {
  description?: ReactNode;
  /** Em ms; `0` deixa o aviso aberto até a pessoa fechar (lista longa que não dá para ler em 4 s). */
  timeout?: number;
}

/** Avisos do app (ADR 0037): a API de sempre (`success`/`error`) sobre o Toast do HeroUI. */
export const toast = {
  success: (mensagem: ReactNode, opcoes?: OpcoesToast) => heroToast.success(mensagem, opcoes),
  error: (mensagem: ReactNode, opcoes?: OpcoesToast) => heroToast.danger(mensagem, opcoes),
};
