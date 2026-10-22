import { ApiError, type ProblemDetails } from "@/shared/api/problem-details";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const problem = (await response.json()) as ProblemDetails;
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
