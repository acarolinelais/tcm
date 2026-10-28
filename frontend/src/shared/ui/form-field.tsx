import type { ReactNode } from "react";
import { Description, FieldError, Input, Label, ListBox, Select, TextArea, TextField } from "@heroui/react";
import { useTranslation } from "react-i18next";

// Campos dos painéis da spec 022 sobre o HeroUI. O erro vem da tela (validação própria ou ProblemDetails).

interface CampoBase {
  label: string;
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
}

export function TextInputField({ label, error, description, isRequired, isDisabled, value, onChange, maxLength, isReadOnly, autoFocus }: CampoBase & {
  /** Dica sob o campo; o erro, quando houver, toma o lugar dela. */
  description?: string;
  value: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  isReadOnly?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <TextField value={value} onChange={onChange} isInvalid={Boolean(error)} isRequired={isRequired} isDisabled={isDisabled} isReadOnly={isReadOnly} validationBehavior="aria" className="flex flex-col gap-2">
      <Label className="text-[14px] font-medium text-[#454442]">{label}</Label>
      <Input maxLength={maxLength} autoFocus={autoFocus} className="h-10 text-[14px]" />
      {error ? <FieldError className="text-[12px]">{error}</FieldError> : description ? <Description className="text-[12px] text-muted">{description}</Description> : null}
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
      <Label className="text-[14px] font-medium text-[#454442]">{label}</Label>
      <TextArea maxLength={maxLength} autoFocus={autoFocus} rows={4} className="min-h-24 resize-y text-[14px]" />
      <div className="flex items-start justify-between gap-3">
        {error ? <FieldError className="text-[12px]">{error}</FieldError> : description ? <Description className="text-[12px] text-muted">{description}</Description> : <span />}
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
}

export function SelectField({ label, error, isRequired, isDisabled, value, onChange, options, placeholder }: CampoBase & {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  return (
    <Select
      value={value || null}
      onChange={(valor) => onChange(valor === null ? "" : String(valor))}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      isDisabled={isDisabled}
      placeholder={placeholder}
      validationBehavior="aria"
      className="flex flex-col gap-2"
    >
      <Label className="text-[14px] font-medium text-[#454442]">{label}</Label>
      <Select.Trigger className="h-10 text-[14px]">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      {error ? <FieldError className="text-[12px]">{error}</FieldError> : null}
      <Select.Popover>
        <ListBox>
          {options.map((opcao) => (
            <ListBox.Item key={opcao.value} id={opcao.value} textValue={opcao.textValue ?? (typeof opcao.label === "string" ? opcao.label : opcao.value)} className="text-[13px]">
              {opcao.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
