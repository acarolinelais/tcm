import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { EyeOff } from "lucide-react";
import { Button, Input } from "@heroui/react";

import { ApiError } from "@/shared/api/problem-details";
import { PasswordEyeIcon } from "@/shared/ui/figma-icons";
import { toast } from "@/shared/lib/toast";
import { login } from "./api";
import { AuthLayout } from "./AuthLayout";

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
    <AuthLayout titulo={t("loginTitle")} dica={t("loginHint")}>
      <form noValidate onSubmit={enviar}>
        <div className="mt-[41px] space-y-10">
          <label className="flex flex-col gap-2.5 text-[15px] font-medium leading-[21px] text-auth-texto">
            <span>{t("email")}</span>
            <Input ref={emailRef} required type="email" autoComplete="username" spellCheck={false} value={email} onChange={(event) => { setEmail(event.target.value); setErros((atual) => ({ ...atual, email: undefined })); }} aria-invalid={Boolean(erros.email)} aria-describedby={erros.email ? "login-email-error" : undefined} className="h-10 w-full rounded-full border-auth-campo-borda bg-auth-campo px-4 font-normal text-auth-texto aria-[invalid=true]:border-destructive" />
            {erros.email && <span id="login-email-error" role="alert" className="text-xs font-normal leading-4 text-destructive">{erros.email}</span>}
          </label>
          <label className="flex flex-col gap-2.5 text-[15px] font-medium leading-[21px] text-auth-texto">
            <span>{t("password")}</span>
            <span className="relative block">
              <Input ref={senhaRef} required type={mostrarSenha ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(event) => { setSenha(event.target.value); setErros((atual) => ({ ...atual, senha: undefined })); }} aria-invalid={Boolean(erros.senha)} aria-describedby={erros.senha ? "login-senha-error" : undefined} className="h-10 w-full rounded-full border-auth-campo-borda bg-auth-campo px-4 pr-11 font-normal text-auth-texto aria-[invalid=true]:border-destructive" />
              <button type="button" onClick={() => setMostrarSenha((visivel) => !visivel)} aria-label={mostrarSenha ? t("hidePassword") : t("showPassword")} aria-pressed={mostrarSenha} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-full text-auth-icone transition-colors hover:text-auth-texto active:text-auth-texto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {mostrarSenha ? <EyeOff aria-hidden="true" className="size-[13px]" strokeWidth={1.5} /> : <PasswordEyeIcon className="h-[11px] w-[13px]" />}
              </button>
            </span>
            {erros.senha && <span id="login-senha-error" role="alert" className="text-xs font-normal leading-4 text-destructive">{erros.senha}</span>}
          </label>
        </div>

        <Button type="submit" isDisabled={carregando} className="mt-[37px] h-[46px] w-full rounded-full bg-auth-botao text-[15px] font-medium leading-[21px] text-auth-botao-texto hover:bg-auth-botao-hover">
          {carregando ? t("signingIn") : t("signIn")}
        </Button>
      </form>
    </AuthLayout>
  );
}
