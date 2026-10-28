import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLeituraPlanilha } from "../../hooks/useLeituraPlanilha";
import { lerPlanilhaEmSegundoPlano } from "../../utils/ler-planilha-em-segundo-plano";
import { PlanilhaProjetoError, type PlanilhaProjeto } from "../../utils/planilha-projeto";
import { UploadPlanilha } from "./UploadPlanilha";

vi.mock("../../utils/ler-planilha-em-segundo-plano", () => ({ lerPlanilhaEmSegundoPlano: vi.fn() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/shared/lib/toast", () => ({ toast: toastMock }));

let leitura: { progresso: (valor: number) => void; resolver: (previa: PlanilhaProjeto) => void; rejeitar: (erro: unknown) => void };
const previa: PlanilhaProjeto = {
  app: "Clock", one_ui: "9.5", totalLinhas: 2, colunas: {} as PlanilhaProjeto["colunas"],
  casos: [1, 2].map((n) => ({ linha: n + 1, tc_id: `Clock_00${n}`, category: "A", difficulty: "Low", situation: "New", responsavel: "Ana", backup: "Bia", automation_level: null, title: null, precondition: null, procedure: null, expected_result: null })),
};
const xlsx = new File(["x"], "Table Name.xlsx");

function Upload({ onBaixarModelo = () => undefined }: { onBaixarModelo?: () => void }) {
  return <UploadPlanilha leitura={useLeituraPlanilha("Could not read")} onBaixarModelo={onBaixarModelo} />;
}

const area = () => screen.getByRole("button", { name: /Drag and drop/i });
const input = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;

describe("UploadPlanilha", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lerPlanilhaEmSegundoPlano).mockImplementation((_file, onProgress) => {
      const promessa = new Promise<PlanilhaProjeto>((resolver, rejeitar) => { leitura = { progresso: onProgress, resolver, rejeitar }; });
      return { promessa, cancelar: vi.fn() };
    });
  });

  it("a área inteira abre o seletor pelo clique, Enter e Espaço", async () => {
    const user = userEvent.setup();
    const { container } = render(<Upload />);
    const abrir = vi.spyOn(input(container), "click");

    await user.click(area());
    area().focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(abrir).toHaveBeenCalledTimes(3);
  });

  it("marca a área enquanto um arquivo é arrastado sobre ela", () => {
    render(<Upload />);

    fireEvent.dragEnter(area());
    expect(area()).toHaveAttribute("data-arrastando", "true");
    fireEvent.dragLeave(area(), { relatedTarget: document.body });
    expect(area()).toHaveAttribute("data-arrastando", "false");
  });

  it("sem arquivo mostra o card do modelo e baixa o modelo", async () => {
    const user = userEvent.setup();
    const onBaixarModelo = vi.fn();
    render(<Upload onBaixarModelo={onBaixarModelo} />);

    await user.click(screen.getByRole("button", { name: "Download template" }));

    expect(onBaixarModelo).toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("solto o arquivo, mostra o card com a barra e, ao concluir, recolhe a área e mostra a prévia", async () => {
    render(<Upload />);

    fireEvent.drop(area(), { dataTransfer: { files: [xlsx] } });
    expect(screen.getByText("Table Name.xlsx")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Reading spreadsheet…");
    act(() => leitura.progresso(40));
    expect(screen.getByRole("progressbar", { name: "Spreadsheet reading progress" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("40 %")).toBeInTheDocument();

    await act(async () => leitura.resolver(previa));

    expect(await screen.findByRole("region", { name: "Test Case preview" })).toBeInTheDocument();
    expect(screen.getByText("0.00 MB · 2 Test Cases")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Spreadsheet read: 2 Test Cases");
    expect(screen.queryByRole("button", { name: /Drag and drop/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Drag and drop/i, hidden: true }).closest("[inert]")).not.toBeNull();
  });

  it("erro de leitura deixa a barra em erro com texto e reabre a área", async () => {
    render(<Upload />);
    fireEvent.drop(area(), { dataTransfer: { files: [xlsx] } });
    act(() => leitura.progresso(30));

    await act(async () => leitura.rejeitar(new PlanilhaProjetoError([{ codigo: "sem_casos", linha: null, coluna: null, valor: null }], 0)));

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByText("The spreadsheet needs changes. See the problems below.", { selector: "p.text-destructive" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("The spreadsheet needs changes. See the problems below.");
    expect(area().closest("[inert]")).toBeNull();
  });

  it("recusa um .csv mostrando o motivo junto da área, sem iniciar a leitura", () => {
    render(<Upload />);

    fireEvent.drop(area(), { dataTransfer: { files: [new File(["a,b"], "casos.csv")] } });

    expect(screen.getByText("Choose an XLS or XLSX spreadsheet.", { selector: "p" })).toBeInTheDocument();
    expect(toastMock.error).toHaveBeenCalled();
    expect(lerPlanilhaEmSegundoPlano).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Download template" })).toBeInTheDocument();
  });

  it("remover a planilha lida devolve o foco à área e avisa a remoção", async () => {
    const user = userEvent.setup();
    render(<Upload />);
    fireEvent.drop(area(), { dataTransfer: { files: [xlsx] } });
    await act(async () => leitura.resolver(previa));
    await screen.findByRole("region", { name: "Test Case preview" });

    await user.click(screen.getByRole("button", { name: "Remove file" }));

    await waitFor(() => expect(area()).toHaveFocus());
    expect(toastMock.success).toHaveBeenCalledWith("Spreadsheet removed");
  });
});
