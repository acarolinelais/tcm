import { describe, expect, it } from "vitest";

import { formatarDiaIso as paraIso } from "@/shared/lib/utils";

import { avancar, colunas, periodoDe, rotuloPeriodo } from "./periodo";

const iso = ({ inicio, fim }: { inicio: Date; fim: Date }) => [paraIso(inicio), paraIso(fim)];

describe("periodo da timeline", () => {
  it("a semana vai de segunda a domingo, mesmo cruzando o ano", () => {
    expect(iso(periodoDe("semana", new Date(2026, 11, 31)))).toEqual(["2026-12-28", "2027-01-03"]);
    // Domingo pertence à semana que começou na segunda anterior.
    expect(iso(periodoDe("semana", new Date(2027, 0, 3)))).toEqual(["2026-12-28", "2027-01-03"]);
  });

  it("o mês vai do dia 1 ao último dia, com fevereiro bissexto", () => {
    expect(iso(periodoDe("mes", new Date(2028, 1, 10)))).toEqual(["2028-02-01", "2028-02-29"]);
  });

  it("avança e volta um período inteiro", () => {
    const semana = periodoDe("semana", new Date(2026, 11, 31));
    expect(iso(avancar("semana", semana, -1))).toEqual(["2026-12-21", "2026-12-27"]);
    expect(iso(avancar("semana", semana, 1))).toEqual(["2027-01-04", "2027-01-10"]);
    expect(iso(avancar("dia", periodoDe("dia", new Date(2026, 11, 31)), 1))).toEqual(["2027-01-01", "2027-01-01"]);
    // 31 de janeiro + 1 mês não pode cair em março.
    expect(iso(avancar("mes", periodoDe("mes", new Date(2027, 0, 31)), 1))).toEqual(["2027-02-01", "2027-02-28"]);
  });

  it("trocar de Semana para Mês usa o mês do primeiro dia da semana", () => {
    const semana = periodoDe("semana", new Date(2027, 0, 2));
    expect(iso(periodoDe("mes", semana.inicio))).toEqual(["2026-12-01", "2026-12-31"]);
  });

  it("tem 24 colunas no dia, 7 na semana e uma por dia no mês", () => {
    const dia = new Date(2026, 11, 31);
    expect(colunas("dia", periodoDe("dia", dia)).map((c) => c.getHours())).toEqual([...Array(24).keys()]);
    expect(colunas("semana", periodoDe("semana", dia))).toHaveLength(7);
    expect(colunas("mes", periodoDe("mes", dia))).toHaveLength(31);
  });

  it("monta o rótulo de cada visão no idioma da tela", () => {
    const semana = periodoDe("semana", new Date(2026, 11, 31));
    expect(rotuloPeriodo("semana", semana)).toBe("Dec 28 - Jan 3");
    expect(rotuloPeriodo("mes", periodoDe("mes", semana.inicio))).toBe("December 2026");
    expect(rotuloPeriodo("dia", periodoDe("dia", semana.inicio))).toBe("Dec 28");
  });
});
