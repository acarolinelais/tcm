import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { EyeOff } from "lucide-react";

import { LanguageSelector } from "@/core/i18n/LanguageSelector";
import { ThemeToggle } from "@/core/theme/ThemeToggle";
import ilustracao from "@/shared/assets/figma/illustrations/login.svg";
import logo from "@/shared/assets/figma/icons/logo-tcm.svg";
import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { PasswordEyeIcon } from "@/shared/ui/figma-icons";
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
    <main className="relative flex min-h-screen items-center justify-center bg-page p-5 sm:p-8">
      <div className="absolute right-5 top-5 flex items-center gap-4 sm:right-20 sm:top-[3.25rem]">
        <ThemeToggle />
        <LanguageSelector className="gap-1.5 text-[15px] text-body" />
      </div>

      {/* Layout do Figma (TCM, node 2191:99): card de 1042×612, ilustração à esquerda e formulário à direita. */}
      <section className="grid w-full max-w-[65.125rem] overflow-hidden rounded-[2rem] border border-surface-secondary bg-surface lg:min-h-[38.25rem] lg:grid-cols-2 lg:rounded-[50px]">
        <aside className="hidden items-center justify-center rounded-[50px] border border-surface-secondary bg-accent-tint px-10 lg:flex">
          <img src={ilustracao} alt="" className="w-full max-w-[27.375rem] dark:brightness-[.85]" />
        </aside>

        <div className="flex flex-col px-6 pb-[35px] pt-[55px] sm:px-12 lg:px-[5.5rem]">
          <form noValidate onSubmit={enviar} className="w-full max-w-[22.125rem]">
            <header>
              <img src={logo} alt="TCM" className="h-[35px] w-auto" />
              <h1 className="mt-[34px] text-[25px] font-medium leading-[30px] text-accent-text">{t("loginTitle")}</h1>
              <p className="mt-2.5 text-sm leading-[17px] text-subtle">{t("loginHint")}</p>
            </header>

            <div className="mt-[41px] space-y-10">
              <label className="flex flex-col gap-2.5 text-[15px] font-medium leading-[21px] text-body">
                <span>{t("email")}</span>
                <Input ref={emailRef} required type="email" autoComplete="username" spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); setErros((atual) => ({ ...atual, email: undefined })); }} aria-invalid={Boolean(erros.email)} aria-describedby={erros.email ? "login-email-error" : undefined} className="h-10 rounded-full border-border bg-field px-4 font-normal text-body aria-[invalid=true]:border-destructive" />
                {erros.email && <span id="login-email-error" role="alert" className="text-xs font-normal leading-4 text-destructive">{erros.email}</span>}
              </label>
              <label className="flex flex-col gap-2.5 text-[15px] font-medium leading-[21px] text-body">
                <span>{t("password")}</span>
                <span className="relative block">
                  <Input ref={senhaRef} required type={mostrarSenha ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(event) => { setSenha(event.target.value); setErros((atual) => ({ ...atual, senha: undefined })); }} aria-invalid={Boolean(erros.senha)} aria-describedby={erros.senha ? "login-senha-error" : undefined} className="h-10 rounded-full border-border bg-field px-4 pr-11 font-normal text-body aria-[invalid=true]:border-destructive" />
                  <button type="button" onClick={() => setMostrarSenha((visivel) => !visivel)} aria-label={mostrarSenha ? t("hidePassword") : t("showPassword")} aria-pressed={mostrarSenha} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-full text-muted transition-colors hover:text-body active:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {mostrarSenha ? <EyeOff aria-hidden="true" className="size-[13px]" strokeWidth={1.5} /> : <PasswordEyeIcon className="h-[11px] w-[13px]" />}
                  </button>
                </span>
                {erros.senha && <span id="login-senha-error" role="alert" className="text-xs font-normal leading-4 text-destructive">{erros.senha}</span>}
              </label>
            </div>

            <Button disabled={carregando} className="mt-[37px] h-[46px] w-full rounded-full bg-accent text-[15px] font-medium leading-[21px] text-accent-foreground hover:bg-accent-hover">
              {carregando ? t("signingIn") : t("signIn")}
            </Button>
          </form>
          <p className="mt-[73px] w-full max-w-[22.125rem] text-center text-sm leading-[17px] text-subtle">{t("loginCredits")}</p>
        </div>
      </section>
    </main>
  );
}
