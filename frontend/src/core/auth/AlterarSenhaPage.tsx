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
  const [errosCampos, setErrosCampos] = useState<{ novaSenha?: string; confirmacao?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    const novosErros: typeof errosCampos = {};
    if (!novaSenha) novosErros.novaSenha = t("passwordRequired");
    if (!confirmacao) novosErros.confirmacao = t("passwordRequired");
    if (Object.keys(novosErros).length) {
      setErrosCampos(novosErros);
      return;
    }
    if (novaSenha !== confirmacao) {
      setErrosCampos({ confirmacao: t("passwordsMismatch") });
      return;
    }
    setErrosCampos({});
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
      <form noValidate onSubmit={enviar} className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <h1 className="text-xl font-semibold">{t("createPassword")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("initialPasswordHint")}
          </p>
        </div>
        <div className="flex flex-col">
          <Label htmlFor="nova-senha">{t("newPassword")}</Label>
          <Input
            id="nova-senha"
            className="mt-2.5"
            type="password"
            autoComplete="new-password"
            maxLength={128}
            required
            aria-invalid={Boolean(errosCampos.novaSenha)}
            aria-describedby={errosCampos.novaSenha ? "nova-senha-error" : undefined}
            value={novaSenha}
            onChange={(event) => { setNovaSenha(event.target.value); setErrosCampos((errors) => ({ ...errors, novaSenha: undefined })); }}
          />
          {errosCampos.novaSenha && <p id="nova-senha-error" role="alert" className="mt-1.5 text-sm text-destructive">{errosCampos.novaSenha}</p>}
        </div>
        <div className="flex flex-col">
          <Label htmlFor="confirmacao-senha">{t("confirmPassword")}</Label>
          <Input
            id="confirmacao-senha"
            className="mt-2.5"
            type="password"
            autoComplete="new-password"
            maxLength={128}
            required
            aria-invalid={Boolean(errosCampos.confirmacao)}
            aria-describedby={errosCampos.confirmacao ? "confirmacao-senha-error" : undefined}
            value={confirmacao}
            onChange={(event) => { setConfirmacao(event.target.value); setErrosCampos((errors) => ({ ...errors, confirmacao: undefined })); }}
          />
          {errosCampos.confirmacao && <p id="confirmacao-senha-error" role="alert" className="mt-1.5 text-sm text-destructive">{errosCampos.confirmacao}</p>}
        </div>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" className="w-full" disabled={salvando}>
          {salvando ? t("saving") : t("savePassword")}
        </Button>
      </form>
    </main>
  );
}
