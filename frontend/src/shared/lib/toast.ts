import type { ReactNode } from "react";
import { toast as heroToast } from "@heroui/react";

interface OpcoesToast {
  description?: ReactNode;
}

/** Avisos do app (ADR 0037): a API de sempre (`success`/`error`) sobre o Toast do HeroUI. */
export const toast = {
  success: (mensagem: ReactNode, opcoes?: OpcoesToast) => heroToast.success(mensagem, opcoes),
  error: (mensagem: ReactNode, opcoes?: OpcoesToast) => heroToast.danger(mensagem, opcoes),
};
