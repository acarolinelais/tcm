import { ApiError, type ProblemDetails } from "@/shared/api/problem-details";
import { clearTokens, getAccessToken, saveTokens, type TokenResponse } from "@/core/auth/session";
import { useMock } from "@/core/config";

let renovacaoEmAndamento: Promise<boolean> | null = null;

async function trocarRefresh() {
  const response = await fetch("/api/auth/refresh", { method: "POST" });
  if (!response.ok) return false;
  saveTokens((await response.json()) as TokenResponse);
  return true;
}

export function renovarSessao(): Promise<boolean> {
  if (useMock) return Promise.resolve(false);
  if (!renovacaoEmAndamento) {
    // O async achata o Promise<Promise<boolean>> com que o lib.dom tipa o locks.request.
    renovacaoEmAndamento = (async () =>
      navigator.locks ? await navigator.locks.request("sdf.refresh", trocarRefresh) : trocarRefresh()
    )().finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const accessToken = getAccessToken();
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      // Tela de onde a operação saiu, para o histórico de auditoria (spec 038, ADR 0044).
      "X-Tela": window.location.pathname,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && retry && !path.includes("/api/auth/")) {
      if (await renovarSessao()) {
        return request<T>(path, init, false);
      }
      clearTokens();
    }
    const problem = (await response.json().catch(() => ({
      type: "about:blank",
      title: "Erro na comunicação com a API.",
      status: response.status,
    }))) as ProblemDetails;
    throw new ApiError(problem);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

type QueryParams = Record<string, string | number | readonly string[]>;

/** Uma lista vira o mesmo parâmetro repetido (`?a=1&a=2`), como o FastAPI lê `list[...]`. */
function withQuery(url: string, params?: QueryParams) {
  if (!params) return url;
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (Array.isArray(valor)) valor.forEach((item) => query.append(chave, item));
    else query.append(chave, String(valor));
  }
  return `${url}?${query.toString()}`;
}

export const httpGet = <T>(url: string, params?: QueryParams) =>
  request<T>(withQuery(url, params));

export const httpPost = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "POST", body: JSON.stringify(body) });

export const httpPostForm = <T>(url: string, body: FormData) =>
  request<T>(url, { method: "POST", body });

export const httpPut = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "PUT", body: JSON.stringify(body) });

export const httpPatch = <T>(url: string) => request<T>(url, { method: "PATCH" });
export const httpPatchBody = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "PATCH", body: JSON.stringify(body) });

export const httpDelete = <T>(url: string) => request<T>(url, { method: "DELETE" });
