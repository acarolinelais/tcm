import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart3, Eye, EyeOff, Network, UsersRound } from "lucide-react";

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
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error(email.trim() ? t("invalidEmail") : t("emailRequired"));
      emailRef.current?.focus();
      return;
    }
    if (!senha) {
      toast.error(t("passwordRequired"));
      senhaRef.current?.focus();
      return;
    }
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

      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-white shadow-[0_16px_48px_-36px_rgba(15,23,42,0.28)] lg:min-h-[590px] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden flex-col justify-between bg-[#F3F6FF] px-10 py-11 lg:flex xl:px-14">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-6 w-6" />
            <span className="text-base font-semibold text-foreground">TCM</span>
          </div>
          <div className="max-w-sm">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">SDF Control</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("loginIntro")}</p>
            <ul className="mt-9 space-y-3">
              {[
                { icon: UsersRound, text: t("loginFeatureUsers") },
                { icon: Network, text: t("loginFeatureTeams") },
                { icon: BarChart3, text: t("loginFeatureProgress") },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 rounded-xl border border-[#E2E9FC] bg-white/85 px-3.5 py-3 text-sm text-foreground">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF0FF] text-primary">
                    <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">TCM · SDF Control</p>
        </aside>

        <div className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-14">
          <form noValidate onSubmit={enviar} className="w-full max-w-sm space-y-7">
            <header>
              <div className="mb-7 flex items-center gap-2.5 lg:hidden">
                <img src={logo} alt="" className="h-6 w-6" />
                <span className="text-base font-semibold text-foreground">TCM</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-primary">{t("loginTitle")}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("loginHint")}</p>
            </header>

            <div className="space-y-5">
              <label className="flex flex-col gap-4 text-sm font-medium text-foreground">
                <span>{t("email")}</span>
                <Input ref={emailRef} required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl border-border bg-white px-3.5" />
              </label>
              <label className="flex flex-col gap-4 text-sm font-medium text-foreground">
                <span>{t("password")}</span>
                <span className="relative block">
                  <Input ref={senhaRef} required type={mostrarSenha ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} className="h-11 rounded-xl border-border bg-white px-3.5 pr-11" />
                  <button type="button" onClick={() => setMostrarSenha((visivel) => !visivel)} aria-label={mostrarSenha ? t("hidePassword") : t("showPassword")} aria-pressed={mostrarSenha} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    {mostrarSenha ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                  </button>
                </span>
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
