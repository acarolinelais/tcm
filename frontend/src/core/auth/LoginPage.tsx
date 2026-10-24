import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import logo from "@/shared/assets/figma/icons/logo.svg";
import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { toast } from "@/shared/lib/toast";
import { login } from "./api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErros({ email: email.trim() ? t("invalidEmail") : t("emailRequired") });
      emailRef.current?.focus();
      return;
    }
    if (!senha) {
      setErros({ senha: t("passwordRequired") });
      senhaRef.current?.focus();
      return;
    }
    setErros({});
    setCarregando(true);
    try {
      await login(email, senha);
      // A troca de conta precisa descartar dados em cache da sessão anterior.
      queryClient.clear();
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.problem.status === 401) {
        toast.error(t("invalidCredentials"));
      } else if (error instanceof ApiError && error.problem.status >= 500) {
        toast.error(t("authError"));
      } else {
        toast.error(t("connectionError"));
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#FBFBFB] p-5 sm:p-8">
      <div className="absolute right-5 top-5 sm:right-8 sm:top-7">
        <LanguageSelector />
      </div>

      <section className="w-full max-w-md rounded-[2rem] border border-border bg-white shadow-[0_16px_48px_-36px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-center px-6 py-12 sm:px-12">
          <form noValidate onSubmit={enviar} className="w-full max-w-sm space-y-7">
            <header>
              <div className="mb-7 flex items-center gap-2.5">
                <img src={logo} alt="" className="h-6 w-6" />
                <span className="text-base font-semibold text-foreground">TCM</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-primary">{t("loginTitle")}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("loginHint")}</p>
            </header>

            <div className="space-y-5">
              <label className="flex flex-col gap-4 text-sm font-medium text-foreground">
                <span>{t("email")}</span>
                <Input ref={emailRef} required type="email" autoComplete="username" spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); setErros((atual) => ({ ...atual, email: undefined })); }} aria-invalid={Boolean(erros.email)} aria-describedby={erros.email ? "login-email-error" : undefined} className="h-11 rounded-xl border-border bg-white px-3.5 aria-[invalid=true]:border-destructive" />
                {erros.email && <span id="login-email-error" role="alert" className="-mt-2 text-xs font-normal text-destructive">{erros.email}</span>}
              </label>
              <label className="flex flex-col gap-4 text-sm font-medium text-foreground">
                <span>{t("password")}</span>
                <span className="relative block">
                  <Input ref={senhaRef} required type={mostrarSenha ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(event) => { setSenha(event.target.value); setErros((atual) => ({ ...atual, senha: undefined })); }} aria-invalid={Boolean(erros.senha)} aria-describedby={erros.senha ? "login-senha-error" : undefined} className="h-11 rounded-xl border-border bg-white px-3.5 pr-11 aria-[invalid=true]:border-destructive" />
                  <button type="button" onClick={() => setMostrarSenha((visivel) => !visivel)} aria-label={mostrarSenha ? t("hidePassword") : t("showPassword")} aria-pressed={mostrarSenha} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {mostrarSenha ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                  </button>
                </span>
                {erros.senha && <span id="login-senha-error" role="alert" className="-mt-2 text-xs font-normal text-destructive">{erros.senha}</span>}
              </label>
            </div>

            <Button disabled={carregando} className="h-11 w-full rounded-xl text-sm">
              {carregando ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
