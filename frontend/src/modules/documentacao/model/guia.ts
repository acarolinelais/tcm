import type { LanguageCode } from "@/core/i18n/resources";

// Ordem da lista (spec 048, RN-01). O slug é o endereço do guia (RN-04).
export const ORDEM_GUIAS = [
  "getting-started",
  "status-cycle",
  "status-and-situation",
  "import-spreadsheet",
  "sdf-report",
  "general-results-form-factor",
  "closed-projects",
  "board-and-timeline",
  "roles-and-permissions",
  "export-tables",
  "audit",
  "glossary",
] as const;

export type SlugGuia = (typeof ORDEM_GUIAS)[number];

export type SecaoGuia = { titulo: string; paragrafos?: string[]; itens?: string[] };

export type ConteudoGuia = { titulo: string; resumo: string; secoes: SecaoGuia[] };

// Guias em destaque no topo da lista, por perfil (RN-02).
export const DESTAQUES: Record<string, SlugGuia[]> = {
  USUARIO_PADRAO: ["status-cycle", "status-and-situation"],
  KP: ["import-spreadsheet", "sdf-report"],
  GERENTE: ["general-results-form-factor", "closed-projects"],
  ADMIN_UNIDADE: ["roles-and-permissions", "audit"],
};

// Guias com PDF em `public/docs/<idioma>/<slug>.pdf` (RN-07). O teste de `guias` confere que cada arquivo existe.
export const SLIDES: Record<LanguageCode, SlugGuia[]> = { en: [...ORDEM_GUIAS], "pt-BR": [], ko: [] };
