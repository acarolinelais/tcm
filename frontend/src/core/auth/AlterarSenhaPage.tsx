import { useRef, useState, type FormEvent, type Ref } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, FieldError, InputGroup, Label, TextField } from "@heroui/react";
import { EyeOff } from "lucide-react";

import { alterarSenhaInicial, type PerfilAtual } from "./api";
import { AuthLayout } from "./AuthLayout";
import { useSair } from "./useSair";
import { ApiError } from "@/shared/api/problem-details";
import { PasswordEyeIcon } from "@/shared/ui/figma-icons";

// Mesmo visual do login (ADR 0037: tela redesenhada usa só HeroUI; as classes imitam os campos shadcn do login,
// por isso tiram o asterisco do rótulo, a divisória antes do olho e o recuo do erro).
function CampoSenha({ label, value, onChange, error, inputRef }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputRef: Ref<HTMLInputElement>;
}) {
  const { t } = useTranslation();
  const [visivel, setVisivel] = useState(false);
  return (
    <TextField value={value} onChange={onChange} isInvalid={Boolean(error)} isRequired validationBehavior="aria" type={visivel ? "text" : "password"} autoComplete="new-password" className="flex flex-col gap-2.5">
      <Label className="text-[15px] font-medium leading-[21px] text-body after:hidden">{label}</Label>
      <InputGroup className="h-10 rounded-full border border-border bg-field data-[invalid=true]:border-destructive">
        <InputGroup.Input ref={inputRef} maxLength={128} className="px-4 text-body" />
        <InputGroup.Suffix className="items-center border-0 px-1 pt-0">
          <Button isIconOnly variant="ghost" size="sm" aria-label={t("showPassword")} aria-pressed={visivel} onPress={() => setVisivel((atual) => !atual)} className="rounded-full text-muted hover:text-body">
            {visivel ? <EyeOff aria-hidden="true" className="size-[13px]" strokeWidth={1.5} /> : <PasswordEyeIcon className="h-[11px] w-[13px]" />}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      {error && <FieldError className="px-0 text-xs leading-4 text-destructive"><span role="alert">{error}</span></FieldError>}
    </TextField>
  );
}

export function AlterarSenhaPage() {
  const perfil = useOutletContext<PerfilAtual>();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [errosCampos, setErrosCampos] = useState<{ novaSenha?: string; confirmacao?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sair = useSair();
  const { t } = useTranslation();
  const novaSenhaRef = useRef<HTMLInputElement>(null);
  const confirmacaoRef = useRef<HTMLInputElement>(null);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    const novosErros: typeof errosCampos = {};
    if (!novaSenha) novosErros.novaSenha = t("passwordRequired");
    if (!confirmacao) novosErros.confirmacao = t("passwordRequired");
    if (Object.keys(novosErros).length) {
      setErrosCampos(novosErros);
      (novosErros.novaSenha ? novaSenhaRef : confirmacaoRef).current?.focus();
      return;
    }
    if (novaSenha !== confirmacao) {
      setErrosCampos({ confirmacao: t("passwordsMismatch") });
      confirmacaoRef.current?.focus();
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
    <AuthLayout titulo={t("createPassword")} dica={t("initialPasswordHint")} perfil={perfil}>
      <form noValidate onSubmit={enviar}>
        <div className="mt-[41px] space-y-10">
          <CampoSenha inputRef={novaSenhaRef} label={t("newPassword")} value={novaSenha} error={errosCampos.novaSenha} onChange={(valor) => { setNovaSenha(valor); setErrosCampos((atual) => ({ ...atual, novaSenha: undefined })); }} />
          <CampoSenha inputRef={confirmacaoRef} label={t("confirmPassword")} value={confirmacao} error={errosCampos.confirmacao} onChange={(valor) => { setConfirmacao(valor); setErrosCampos((atual) => ({ ...atual, confirmacao: undefined })); }} />
        </div>

        {erro && <p role="alert" className="mt-6 text-sm text-destructive">{erro}</p>}
        <Button type="submit" isDisabled={salvando} className="mt-[37px] h-[46px] w-full rounded-full bg-accent text-[15px] font-medium leading-[21px] text-accent-foreground hover:bg-accent-hover">
          {salvando ? t("saving") : t("savePassword")}
        </Button>
        <Button variant="ghost" isDisabled={salvando} onPress={sair} className="mt-3 w-full rounded-full text-sm text-subtle hover:text-body">
          {t("logout")}
        </Button>
      </form>
    </AuthLayout>
  );
}
