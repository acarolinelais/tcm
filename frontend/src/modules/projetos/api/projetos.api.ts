import { httpGet, httpPatchBody, httpPost, httpPostForm } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { timesApi } from "@/modules/times/api/times.api";
import type { PagedResult } from "@/shared/types/paged-result";

export type StatusProjeto = "Created" | "To Do" | "InProgress" | "Completed" | "Canceled";
export interface Projeto {
  id: string;
  unidade_id: string;
  time_id: string;
  app: string;
  one_ui: string;
  nome: string;
  status: StatusProjeto;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}
export interface ModeloDispositivo { id: string; unidade_id: string; nome: string; ativo: boolean }
export interface ImportacaoProjeto { projeto: Projeto; quantidade_casos: number }

const STORAGE_KEY = "sdf.mock.projects.v1";
const modelosMock: ModeloDispositivo[] = [
  { id: "mock-model-s27-ultra", unidade_id: "mock-unit-manaus", nome: "S27 Ultra", ativo: true },
  { id: "mock-model-s26-ultra", unidade_id: "mock-unit-manaus", nome: "S26 Ultra", ativo: true },
  { id: "mock-model-sep-lite", unidade_id: "mock-unit-manaus", nome: "SEP Lite", ativo: true },
  { id: "mock-model-tab-s11", unidade_id: "mock-unit-manaus", nome: "Tab S11", ativo: true },
];

function mockList(): Projeto[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Projeto[]; }
  catch { return []; }
}
function saveMock(items: Projeto[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function createMock(timeId: string, app: string, oneUi: string): Projeto {
  const now = new Date().toISOString();
  const project: Projeto = {
    id: globalThis.crypto?.randomUUID?.() ?? `mock-project-${Date.now()}`,
    unidade_id: "mock-unit-manaus", time_id: timeId, app, one_ui: oneUi,
    nome: `${app} ${oneUi}`, status: "Created", ativo: true, created_at: now, updated_at: now,
  };
  saveMock([project, ...mockList()]);
  return project;
}

export const projetosApi = {
  async listar(page = 1, pageSize = 100) {
    if (!useMock) return httpGet<PagedResult<Projeto>>("/api/projetos", { page, page_size: pageSize });
    const visibleTeams = await timesApi.listar(1, 100);
    const teamIds = new Set(visibleTeams.items.map((team) => team.id));
    const items = mockList().filter((project) => teamIds.has(project.time_id));
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), page, page_size: pageSize, total_count: items.length };
  },
  criar(body: { time_id: string; app: string; one_ui: string; modelos_ids: string[] }) {
    if (useMock) return Promise.resolve(createMock(body.time_id, body.app, body.one_ui));
    return httpPost<Projeto>("/api/projetos", body);
  },
  importar(arquivo: File, timeId: string, modelosIds: string[], mockApp?: string, mockOneUi?: string) {
    if (useMock) {
      if (!mockApp?.trim() || !mockOneUi?.trim()) return Promise.reject(new Error("Informe o app e a versão One UI lidos da planilha."));
      return Promise.resolve({ projeto: createMock(timeId, mockApp.trim(), mockOneUi.trim()), quantidade_casos: 0 });
    }
    const body = new FormData();
    body.append("arquivo", arquivo);
    body.append("time_id", timeId);
    modelosIds.forEach((modelId) => body.append("modelos_ids", modelId));
    return httpPostForm<ImportacaoProjeto>("/api/projetos/importar", body);
  },
  atualizarStatus(id: string, status: StatusProjeto) {
    if (useMock) {
      const items = mockList();
      const project = items.find((item) => item.id === id);
      if (!project) return Promise.reject(new Error("Projeto não encontrado."));
      project.status = status;
      project.updated_at = new Date().toISOString();
      saveMock(items);
      return Promise.resolve(project);
    }
    return httpPatchBody<Projeto>(`/api/projetos/${id}/status`, { status });
  },
  listarModelos() {
    return useMock
      ? Promise.resolve({ items: modelosMock, page: 1, page_size: 100, total_count: modelosMock.length })
      : httpGet<PagedResult<ModeloDispositivo>>("/api/modelos-dispositivo", { page: 1, page_size: 100, ativo: "true" });
  },
};
