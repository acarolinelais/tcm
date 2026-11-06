import type { ReactNode, Ref } from "react";
import { Description, FieldError, Input, Label, ListBox, Select, TextArea, TextField } from "@heroui/react";
import { useTranslation } from "react-i18next";

// Campos dos painéis da spec 022 sobre o HeroUI. O erro vem da tela (validação própria ou ProblemDetails).

interface CampoBase {
  label: string;
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
}

export function TextInputField({ label, error, description, isRequired, isDisabled, value, onChange, maxLength, isReadOnly, autoFocus, type, name, autoComplete, placeholder, ref }: CampoBase & {
  /** Dica sob o campo; o erro, quando houver, toma o lugar dela. */
  description?: string;
  value: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  isReadOnly?: boolean;
  autoFocus?: boolean;
  type?: "text" | "email" | "password";
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  /** O `field.ref` do react-hook-form: com ele, o envio inválido foca o primeiro campo com erro. */
  ref?: Ref<HTMLInputElement>;
}) {
  return (
    <TextField value={value} onChange={onChange} isInvalid={Boolean(error)} isRequired={isRequired} isDisabled={isDisabled} isReadOnly={isReadOnly} validationBehavior="aria" type={type} name={name} autoComplete={autoComplete} className="flex flex-col gap-2">
      <Label className="text-[14px] font-medium text-body">{label}</Label>
      <Input ref={ref} maxLength={maxLength} autoFocus={autoFocus} placeholder={placeholder} className="h-10 text-[14px]" />
      {error ? <FieldError className="text-[12px]"><span role="alert">{error}</span></FieldError> : description ? <Description className="text-[12px] text-muted">{description}</Description> : null}
    </TextField>
  );
}

/** Texto longo: a dica e, com `maxLength`, o contador ficam sob o campo; o erro, quando houver, toma o lugar da dica. */
export function TextAreaField({ label, error, description, isRequired, isDisabled, value, onChange, maxLength, autoFocus }: CampoBase & {
  description?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <TextField value={value} onChange={onChange} isInvalid={Boolean(error)} isRequired={isRequired} isDisabled={isDisabled} validationBehavior="aria" className="flex flex-col gap-2">
      <Label className="text-[14px] font-medium text-body">{label}</Label>
      <TextArea maxLength={maxLength} autoFocus={autoFocus} rows={4} className="min-h-24 resize-y rounded-2xl text-[14px]" />
      <div className="flex items-start justify-between gap-3">
        {error ? <FieldError className="text-[12px]"><span role="alert">{error}</span></FieldError> : description ? <Description className="text-[12px] text-muted">{description}</Description> : <span />}
        {/* Algarismos de largura fixa: o contador não "pula" enquanto a pessoa digita. */}
        {maxLength ? <span className="shrink-0 text-[12px] tabular-nums text-muted">{t("charCount", { count: value.length, max: maxLength })}</span> : null}
      </div>
    </TextField>
  );
}

export interface SelectOption {
  value: string;
  label: ReactNode;
  /** Texto para busca por digitação e leitores de tela; pode faltar quando o `label` já é texto. */
  textValue?: string;
  /** Aparece na lista, mas não pode ser escolhida (ex.: o perfil atual fora do escopo, spec 031 RN-06). */
  isDisabled?: boolean;
}

/** Id da opção "nenhum" (`emptyOption`). Não sai do componente: escolhê-la devolve "". */
const OPCAO_NENHUMA = "__nenhum__";

export function SelectField({ label, error, description, isRequired, isDisabled, value, onChange, options, placeholder, emptyOption }: CampoBase & {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Dica sob o campo; o erro, quando houver, toma o lugar dela. */
  description?: string;
  /** Primeira opção da lista que vale "" (ex.: "Sem responsável"); com ela, o valor vazio aparece marcado. */
  emptyOption?: string;
}) {
  const opcoes = emptyOption ? [{ value: OPCAO_NENHUMA, label: emptyOption }, ...options] : options;
  return (
    <Select
      value={value || (emptyOption ? OPCAO_NENHUMA : null)}
      onChange={(valor) => onChange(valor === null || valor === OPCAO_NENHUMA ? "" : String(valor))}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      isDisabled={isDisabled}
      placeholder={placeholder}
      validationBehavior="aria"
      className="flex flex-col gap-2"
    >
      <Label className="text-[14px] font-medium text-body">{label}</Label>
      <Select.Trigger className="h-10 text-[14px]">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {error ? <FieldError className="text-[12px]"><span role="alert">{error}</span></FieldError> : description ? <Description className="text-[12px] text-muted">{description}</Description> : null}
      <Select.Popover>
        <ListBox>
          {opcoes.map((opcao) => (
            <ListBox.Item key={opcao.value} id={opcao.value} textValue={opcao.textValue ?? (typeof opcao.label === "string" ? opcao.label : opcao.value)} isDisabled={opcao.isDisabled} className="text-[13px]">
              {opcao.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

