import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/api/problem-details";
import { login } from "./api";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/core/i18n/LanguageSelector";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await login(email, senha);
      // A troca de conta precisa descartar dados em cache da sessão anterior.
      queryClient.clear();
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.problem.status === 401) {
        setErro(t("invalidCredentials"));
      } else if (error instanceof ApiError && error.problem.status >= 500) {
        setErro(t("authError"));
      } else {
        setErro(t("connectionError"));
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBFBFB] p-4">
      <div className="absolute right-5 top-5"><LanguageSelector /></div>
      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h1 className="text-xl font-semibold">{t("loginTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("loginHint")}</p>
        </div>
        <label className="block space-y-1 text-sm">
          <span>{t("email")}</span>
          <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t("password")}</span>
          <input required type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <button disabled={carregando} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {carregando ? t("signingIn") : t("signIn")}
        </button>
      </form>
    </main>
  );
}
