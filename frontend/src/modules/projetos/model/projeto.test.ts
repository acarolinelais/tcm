import { describe, expect, it } from "vitest";

import { createLinkPullRequestSchema, MAX_URL_PULL_REQUEST } from "./projeto";

const schema = createLinkPullRequestSchema((key) => key);
const URL_VALIDA = "https://github.sec.samsung.net/org/repo/pull/12";

function erro(url: string) {
  const resultado = schema.safeParse({ url });
  return resultado.success ? null : resultado.error.issues[0].message;
}

describe("createLinkPullRequestSchema (spec 030)", () => {
  it.each([
    URL_VALIDA,
    "https://GitHub.sec.samsung.net/org/repo/pull/12",
    "HTTPS://github.sec.samsung.net/org/repo/pull/12",
    "https://github.sec.samsung.net",
  ])("aceita %s sem mudar o texto", (url) => {
    expect(schema.parse({ url: `  ${url} ` })).toEqual({ url });
  });

  it("aceita exatamente o limite e recusa um caractere a mais", () => {
    const prefixo = "https://github.sec.samsung.net/";
    expect(erro(prefixo + "a".repeat(MAX_URL_PULL_REQUEST - prefixo.length))).toBeNull();
    expect(erro(prefixo + "a".repeat(MAX_URL_PULL_REQUEST - prefixo.length + 1))).toBe("pullRequestUrlMax");
  });

  it.each(["", "   "])("pede o link quando o campo está vazio (%j)", (url) => {
    expect(erro(url)).toBe("pullRequestUrlRequired");
  });

  it.each([
    "github.sec.samsung.net/org/repo/pull/1",
    "http://github.sec.samsung.net/org/repo/pull/1",
    "ftp://github.sec.samsung.net/x",
    "https://",
    "https://github.sec.samsung.net/org/repo pull/1",
  ])("recusa o formato de %s", (url) => {
    expect(erro(url)).toBe("pullRequestUrlInvalid");
  });

  it.each([
    "https://github.com/org/repo/pull/1",
    "https://outro.github.sec.samsung.net/org/repo/pull/1",
    "https://github.sec.samsung.net.outro.com/org/repo/pull/1",
    "https://usuario@github.sec.samsung.net/org/repo/pull/1",
    "https://github.sec.samsung.net@outro.com/org/repo/pull/1",
    "https://github.sec.samsung.net:443/org/repo/pull/1",
  ])("recusa o domínio de %s", (url) => {
    expect(erro(url)).toBe("pullRequestUrlDomain");
  });
});
