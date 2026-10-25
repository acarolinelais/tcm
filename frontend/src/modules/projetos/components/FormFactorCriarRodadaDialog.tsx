import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export function FormFactorCriarRodadaDialog({ aberto, onAbertoChange, salvando, onCriar }: {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  salvando: boolean;
  onCriar: (sdfId: string) => void;
}) {
  const { t } = useTranslation();
  const [sdfId, setSdfId] = useState("");
  useEffect(() => { if (aberto) setSdfId(""); }, [aberto]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sdfId.length <= 50 && !salvando) onCriar(sdfId);
  };

  return <Dialog open={aberto} onOpenChange={onAbertoChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("createTestRound", { defaultValue: "Create a test round" })}</DialogTitle>
        <p className="text-sm text-muted-foreground">{t("createTestRoundHint", { defaultValue: "All Test Cases currently in In Validation will be included." })}</p>
      </DialogHeader>
      <form className="space-y-5" onSubmit={submit}>
        <div className="grid gap-2">
          <Label htmlFor="form-factor-sdf-id">{t("sdfId")}</Label>
          <Input id="form-factor-sdf-id" value={sdfId} maxLength={50} onChange={(event) => setSdfId(event.target.value)} aria-describedby="form-factor-sdf-id-hint" />
          <p id="form-factor-sdf-id-hint" className="text-xs text-muted-foreground">{t("sdfIdOptionalHint", { defaultValue: "Optional. Up to 50 characters; spaces and special characters are accepted." })}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onAbertoChange(false)}>{t("cancel")}</Button>
          <Button type="submit" disabled={salvando}>{salvando ? t("saving") : t("createTestRound", { defaultValue: "Create a test round" })}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
