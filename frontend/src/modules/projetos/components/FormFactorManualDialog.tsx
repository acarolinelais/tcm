import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import type { CriarRodadaFormFactorInput, LinhaFormFactor, ModeloFormFactor } from "../model/projeto";

type ResultadoManual = "PASS" | "FAIL";

export function FormFactorManualDialog({ aberto, onAbertoChange, linha, modelos, salvando, onSalvar }: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  linha: Pick<LinhaFormFactor, "caso_teste_id" | "tc_id"> | null;
  modelos: ModeloFormFactor[];
  salvando: boolean;
  onSalvar: (input: CriarRodadaFormFactorInput) => void;
}) {
  const { t } = useTranslation();
  const [resultados, setResultados] = useState<Record<string, ResultadoManual>>({});

  useEffect(() => {
    if (aberto) setResultados({});
  }, [aberto, linha?.caso_teste_id]);

  const selecionados = Object.keys(resultados).length;
  const salvar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!linha || !selecionados || salvando) return;
    onSalvar({ caso_teste_id: linha.caso_teste_id, resultados });
  };

  return <Dialog open={aberto} onOpenChange={onAbertoChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("recordResultsTitle", { defaultValue: "Record Form Factor results" })}</DialogTitle>
        <p className="text-sm text-muted-foreground">{t("tcId")}: <span className="font-medium text-foreground">{linha?.tc_id ?? "—"}</span></p>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("manualResultsHint", { defaultValue: "Choose a result for each model you tested. Models left blank are not included." })}</p>
      </DialogHeader>
      <form className="space-y-5" onSubmit={salvar}>
        <div className="space-y-2">
          {modelos.map((modelo) => {
            const value = resultados[modelo.id] ?? "unselected";
            return <div key={modelo.id} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40">
              <Label htmlFor={`manual-result-${modelo.id}`} className="truncate text-sm font-medium">{modelo.nome}</Label>
              <Select
                value={value}
                onValueChange={(next) => setResultados((current) => {
                  if (next === "unselected") {
                    return Object.fromEntries(Object.entries(current).filter(([id]) => id !== modelo.id));
                  }
                  return { ...current, [modelo.id]: next as ResultadoManual };
                })}
              >
                <SelectTrigger id={`manual-result-${modelo.id}`} aria-label={t("resultForModel", { defaultValue: "Result for {{model}}", model: modelo.nome })}>
                  <SelectValue placeholder={t("chooseResult", { defaultValue: "Choose result" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unselected">{t("notSet", { defaultValue: "Not set" })}</SelectItem>
                  <SelectItem value="PASS">PASS</SelectItem>
                  <SelectItem value="FAIL">FAIL</SelectItem>
                </SelectContent>
              </Select>
            </div>;
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>{t("cancel")}</Button>
          <Button type="submit" disabled={!selecionados || salvando}>
            {salvando ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
