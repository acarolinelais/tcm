import { ApiError, type ProblemDetails } from "@/shared/api/problem-details";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens, type TokenResponse } from "@/core/auth/session";

let renovacaoEmAndamento: Promise<boolean> | null = null;

function renovarSessao(): Promise<boolean> {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;
      saveTokens((await response.json()) as TokenResponse);
      return true;
    })().finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const accessToken = getAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && retry && !path.includes("/api/auth/") && getRefreshToken()) {
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

function withQuery(url: string, params?: Record<string, string | number>) {
  if (!params) return url;
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );
  return `${url}?${query.toString()}`;
}

export const httpGet = <T>(url: string, params?: Record<string, string | number>) =>
  request<T>(withQuery(url, params));

export const httpPost = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "POST", body: JSON.stringify(body) });

export const httpPut = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "PUT", body: JSON.stringify(body) });

export const httpPatch = <T>(url: string) => request<T>(url, { method: "PATCH" });
export const httpPatchBody = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "PATCH", body: JSON.stringify(body) });

export const httpDelete = <T>(url: string) => request<T>(url, { method: "DELETE" });
