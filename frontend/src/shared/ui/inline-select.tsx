import type { ReactNode } from "react";
import { ListBox, Select } from "@heroui/react";

import { cn } from "@/shared/lib/utils";
import { EditableChevronIcon } from "@/shared/ui/figma-icons";

export interface InlineSelectOption {
  value: string;
  label: string;
}

interface InlineSelectProps {
  "aria-label": string;
  value: string;
  options: InlineSelectOption[];
  onChange: (value: string) => void;
  /** O que aparece no gatilho: a etiqueta do valor atual, ou o texto. */
  children: ReactNode;
  isDisabled?: boolean;
  className?: string;
}

/**
 * Edição na linha (spec 022, RN-06): o próprio valor é o gatilho e a seta cinza `#D0D0D0` do Figma fica no fim da célula.
 * Grava ao escolher; quem não pode editar vê só o valor, sem este componente.
 */
export function InlineSelect({ value, options, onChange, children, isDisabled, className, ...props }: InlineSelectProps) {
  return (
    <Select aria-label={props["aria-label"]} value={value || null} onChange={(valor) => { if (valor !== null && String(valor) !== value) onChange(String(valor)); }} isDisabled={isDisabled} className="w-full">
      <Select.Trigger className={cn("h-7 min-h-0 w-full items-center justify-between gap-2 rounded-full border-0 bg-transparent px-0 py-0 pe-0 text-[14px] leading-5 text-[#454442] shadow-none hover:bg-transparent data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus", className)}>
        {children}
        <Select.Indicator className="static my-0 self-center"><EditableChevronIcon className="text-[#D0D0D0]" /></Select.Indicator>
      </Select.Trigger>
      <Select.Popover className="min-w-36">
        <ListBox>
          {options.map((opcao) => (
            <ListBox.Item key={opcao.value} id={opcao.value} textValue={opcao.label} className="text-[13px]">
              {opcao.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
