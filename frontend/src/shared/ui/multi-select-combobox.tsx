import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, X } from "lucide-react";
import { useId, useMemo } from "react";

interface Option {
  value: string;
  label: string;
  /** Texto secundário exibido depois do rótulo, só na lista de opções. Busca e etiquetas usam o `label`. */
  description?: string | null;
}

interface MultiSelectComboboxProps {
  label: string;
  placeholder: string;
  options: Option[];
  value: string[];
  onValueChange: (value: string[]) => void;
  emptyLabel: string;
  removeLabel: (label: string) => string;
}

export function MultiSelectCombobox({ label, placeholder, options, value, onValueChange, emptyLabel, removeLabel }: MultiSelectComboboxProps) {
  const inputId = useId();
  const items = useMemo(
    () => Combobox.createItems(options, { getValue: (option) => option.value, getLabel: (option) => option.label }),
    [options],
  );
  const labelByValue = useMemo(() => new Map(options.map((option) => [option.value, option.label])), [options]);

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
      <Combobox.Root
        items={items}
        multiple
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue as string[])}
        onOpenChange={(open, eventDetails) => {
          if (!open && eventDetails.reason === "item-press") eventDetails.cancel();
        }}
      >
        {/* relative: o Base UI insere um "Dismiss" visualmente oculto com position absolute; sem um
            ancestral posicionado ele vaza do painel com rolagem e estica a página. */}
        <Combobox.InputGroup className="relative flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-1.5 text-sm outline-none transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
          <Combobox.Value>
            {(selectedValues: string[]) => <Combobox.Chips aria-label={selectedValues.length ? label : undefined} className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {selectedValues.map((selectedValue) => {
                const selectedLabel = labelByValue.get(selectedValue) ?? selectedValue;
                return <Combobox.Chip key={selectedValue} aria-label={selectedLabel} aria-description="Use Backspace ou Delete para remover" className="inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                  <span className="truncate">{selectedLabel}</span>
                  <Combobox.ChipRemove aria-label={removeLabel(selectedLabel)} className="inline-flex size-4 shrink-0 items-center justify-center rounded hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X aria-hidden="true" className="size-3" /></Combobox.ChipRemove>
                </Combobox.Chip>;
              })}
              <Combobox.Input
                id={inputId}
                placeholder={selectedValues.length ? "" : placeholder}
                aria-description={selectedValues.length ? `${selectedValues.length} selecionados. Use as setas para navegar e Backspace para remover.` : undefined}
                className="h-7 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </Combobox.Chips>}
          </Combobox.Value>
          <Combobox.Trigger aria-label={label} className="group inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 ease-in-out group-data-[popup-open]:rotate-180 motion-reduce:transition-none" />
          </Combobox.Trigger>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner align="start" sideOffset={4} className="z-[70] w-[var(--anchor-width)] outline-none">
            <Combobox.Popup aria-label={label} className="base-popup overflow-hidden rounded-xl border border-border bg-card p-1 text-card-foreground shadow-lg">
              <Combobox.Empty><div className="px-3 py-5 text-center text-sm text-muted-foreground">{emptyLabel}</div></Combobox.Empty>
              <Combobox.List className="max-h-[min(14rem,calc(var(--available-height)-1rem))] overflow-y-auto overscroll-contain">
                {(option: Option) => <Combobox.Item key={option.value} value={option.value} className="group flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-secondary data-[selected]:font-medium">
                  <Combobox.ItemIndicator className="inline-flex size-4 shrink-0 items-center justify-center text-primary"><Check aria-hidden="true" className="size-4" /></Combobox.ItemIndicator>
                  {/* Sem truncar: nome e descrição longos quebram a linha para continuarem legíveis. O "·" é
                      decorativo, então o leitor de tela anuncia "nome descrição". */}
                  <span className="min-w-0 break-words">
                    {option.label}
                    {option.description && <>
                      <span aria-hidden="true" className="text-muted-foreground"> ·</span>{" "}
                      <span className="font-normal text-muted-foreground group-data-[highlighted]:text-foreground/80">{option.description}</span>
                    </>}
                  </span>
                </Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
