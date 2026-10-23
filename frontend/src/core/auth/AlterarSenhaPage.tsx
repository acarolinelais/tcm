import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { alterarSenhaInicial } from "./api";
import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useTranslation } from "react-i18next";

export function AlterarSenhaPage() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    if (novaSenha !== confirmacao) {
      setErro(t("passwordsMismatch"));
      return;
    }
    setSalvando(true);
    try {
      await alterarSenhaInicial(novaSenha);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/overview", { replace: true });
    } catch (error) {
      setErro(error instanceof ApiError
        ? t("passwordChangeError")
        : t("connectionError"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBFBFB] p-4">
      <form onSubmit={enviar} className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <h1 className="text-xl font-semibold">{t("createPassword")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("initialPasswordHint")}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nova-senha">{t("newPassword")}</Label>
          <Input
            id="nova-senha"
            type="password"
            autoComplete="new-password"
            maxLength={128}
            required
            value={novaSenha}
            onChange={(event) => setNovaSenha(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmacao-senha">{t("confirmPassword")}</Label>
          <Input
            id="confirmacao-senha"
            type="password"
            autoComplete="new-password"
            maxLength={128}
            required
            value={confirmacao}
            onChange={(event) => setConfirmacao(event.target.value)}
          />
        </div>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" className="w-full" disabled={salvando}>
          {salvando ? t("saving") : t("savePassword")}
        </Button>
      </form>
    </main>
  );
}
