import { vi } from "vitest";

// `vi.mock("@/shared/lib/exportar-planilha")` sem factory usa este arquivo: a busca das páginas e o nome do arquivo
// continuam reais; só a geração do .xlsx e o download viram espiões.
const real = await vi.importActual<typeof import("../exportar-planilha")>("../exportar-planilha");

export const { CACHE_EXPORTACAO_MS, TAMANHO_PAGINA_EXPORTACAO, buscarTodasAsPaginas, nomeArquivoExportacao } = real;
export const montarPlanilha = vi.fn(async () => new ArrayBuffer(1));
export const baixarPlanilha = vi.fn();
