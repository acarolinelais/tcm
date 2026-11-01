import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CardTimeline } from "../model/timeline";
import { periodoDe } from "../utils/periodo";
import { TimelineGrade } from "./TimelineGrade";

const card = (dia: string, tc_id = "Clock_00046", primeira_em = `${dia}T15:00:00`): CardTimeline => ({
  caso_teste_id: tc_id, tc_id, responsavel_id: "ana", responsavel_nome: "Ana", responsavel_cor_avatar: "roxo", dia,
  primeira_em: new Date(primeira_em).toISOString(),
  alteracoes: [{ campo: "status", valor_anterior: "A", valor_novo: "B", usuario_nome: "Ana", usuario_perfil: null, origem: "api", alterado_em: "2026-12-29T15:00:00Z" }],
});

// Quarta, 30 de dezembro de 2026, 12h.
const agora = new Date(2026, 11, 30, 12);
const semanaAtual = periodoDe("semana", agora);

function montar(props: Partial<Parameters<typeof TimelineGrade>[0]> = {}) {
  return render(<TimelineGrade visao="semana" periodo={semanaAtual} cards={[]} onAbrir={vi.fn()} vazio={<p>Nada aqui</p>} agora={agora} {...props} />);
}

describe("TimelineGrade", () => {
  it("põe o card na coluna do seu dia", () => {
    montar({ cards: [card("2026-12-29"), card("2027-01-02", "Clock_00001")] });

    const terca = screen.getByRole("list", { name: "Tuesday, December 29" });
    expect(within(terca).getByRole("button", { name: /Clock_00046/ })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Saturday, January 2" })).getByRole("button", { name: /Clock_00001/ })).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(7);
    expect(screen.queryByText("Nada aqui")).not.toBeInTheDocument();
  });

  it("na visão Dia põe o card na hora da primeira mudança, e no Mês usa o card compacto", () => {
    const { unmount } = montar({ visao: "dia", periodo: periodoDe("dia", new Date(2026, 11, 29)), cards: [card("2026-12-29", "Clock_00046", "2026-12-29T09:20:00")] });
    expect(screen.getAllByRole("list")).toHaveLength(24);
    expect(within(screen.getByRole("list", { name: "09:00 AM" })).getByRole("button")).toBeInTheDocument();
    unmount();

    montar({ visao: "mes", periodo: periodoDe("mes", agora), cards: [card("2026-12-29")] });
    expect(screen.getAllByRole("list")).toHaveLength(31);
    expect(screen.getByRole("button", { name: /Clock_00046/ })).not.toHaveTextContent("Clock_00046");
  });

  it("mostra a linha de agora só no período atual", () => {
    const { unmount } = montar();
    expect(screen.getByTestId("linha-agora")).toBeInTheDocument();
    unmount();

    montar({ periodo: periodoDe("semana", new Date(2026, 11, 21)) });
    expect(screen.queryByTestId("linha-agora")).not.toBeInTheDocument();
  });

  it("sem card no período mostra o aviso de vazio", () => {
    montar({ cards: [card("2026-12-10")] });

    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
