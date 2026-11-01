import { type ReactNode, useId, useRef, useState } from "react";
import { Button, Label, ListBox, Popover, SearchField, Tag, TagGroup } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { ChevronDownIcon } from "@/shared/ui/figma-icons";

interface Option {
  value: string;
  label: string;
  /** Texto secundário exibido depois do rótulo, só na lista de opções. A busca também olha a descrição; as etiquetas usam só o `label`. */
  description?: string | null;
  /** Decorativo, antes do rótulo na lista (ex.: o avatar da pessoa). */
  icone?: ReactNode;
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

/**
 * Seleção múltipla com busca (HeroUI, spec 031): o botão abre a lista com o campo de busca, e os escolhidos
 * ficam como etiquetas removíveis abaixo dele. Mesmo caminho do `DataTableMultiFilter`.
 */
export function MultiSelectCombobox({ label, placeholder, options, value, onValueChange, emptyLabel, removeLabel }: MultiSelectComboboxProps) {
  const { t } = useTranslation();
  const labelId = useId();
  const gatilho = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLocaleLowerCase();
  // A busca olha o rótulo e a descrição (ex.: TC ID e título do caso, spec 054).
  const visiveis = options.filter((opcao) => `${opcao.label} ${opcao.description ?? ""}`.toLocaleLowerCase().includes(termo));
  // Um escolhido que saiu das opções (ex.: modelo inativado) continua com etiqueta, para poder ser removido.
  const escolhidos = value.map((item) => options.find((opcao) => opcao.value === item) ?? { value: item, label: item });

  return (
    <div className="flex flex-col gap-2">
      <Label id={labelId} className="text-[14px] font-medium text-body">{label}</Label>
      <Popover isOpen={aberto} onOpenChange={(open) => { setAberto(open); if (!open) setBusca(""); }}>
        <Button
          ref={gatilho}
          variant="outline"
          aria-labelledby={labelId}
          className="h-10 w-full justify-between gap-2 px-3 text-[14px] font-normal"
        >
          {/* O botão sempre convida a escolher; o que já foi escolhido aparece nas etiquetas abaixo. */}
          <span className="truncate text-muted">{placeholder}</span>
          <ChevronDownIcon className={cn("shrink-0 transition-transform duration-200 motion-reduce:transition-none", aberto && "rotate-180")} />
        </Button>
        <Popover.Content placement="bottom start" className="w-[min(var(--trigger-width),calc(100vw-1rem))] p-1.5">
          <Popover.Dialog aria-labelledby={labelId} className="grid gap-1 outline-none">
            {/* Sem largura mínima: a lista tem a largura do botão, que pode ser estreito (spec 054). */}
            <SearchField aria-label={t("searchOptions")} value={busca} onChange={setBusca} autoFocus className="w-full min-w-0">
              <SearchField.Group className="h-9 w-full min-w-0">
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={t("searchOptions")} className="min-w-0 text-[13px]" />
              </SearchField.Group>
            </SearchField>
            {visiveis.length ? (
              <ListBox
                aria-labelledby={labelId}
                selectionMode="multiple"
                // Esc fecha a lista; o padrão do React Aria limparia toda a seleção.
                escapeKeyBehavior="none"
                selectedKeys={new Set(value)}
                // "Todos" (Ctrl+A) vale só para as opções visíveis: as que a busca esconde ficam como estavam.
                onSelectionChange={(chaves) => onValueChange(chaves === "all" ? [...new Set([...value, ...visiveis.map((opcao) => opcao.value)])] : [...chaves].map(String))}
                className="max-h-56 overflow-y-auto"
              >
                {visiveis.map((opcao) => (
                  <ListBox.Item key={opcao.value} id={opcao.value} textValue={opcao.description ? `${opcao.label} ${opcao.description}` : opcao.label} className="text-[13px]">
                    {/* Sem truncar: nome e descrição longos quebram a linha. O "·" é decorativo. */}
                    {opcao.icone && <span aria-hidden="true" className="shrink-0">{opcao.icone}</span>}
                    <span className="min-w-0 flex-1 break-words">
                      {opcao.label}
                      {opcao.description && <>
                        <span aria-hidden="true" className="text-muted"> ·</span>{" "}
                        <span className="text-muted">{opcao.description}</span>
                      </>}
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            ) : null}
            {/* Sempre montada: uma região viva que já nasce com texto não é anunciada pelos leitores de tela. */}
            <p role="status" className={visiveis.length ? "sr-only" : "px-3 py-5 text-center text-[13px] text-muted"}>{visiveis.length ? "" : emptyLabel}</p>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
      {escolhidos.length ? (
        <TagGroup
          aria-labelledby={labelId}
          onRemove={(chaves) => {
            const restantes = value.filter((item) => !chaves.has(item));
            onValueChange(restantes);
            // Sem etiquetas a lista some com o foco dentro: ele volta ao botão.
            if (!restantes.length) gatilho.current?.focus();
          }}
        >
          <TagGroup.List className="flex flex-wrap gap-1.5">
            {escolhidos.map((opcao) => (
              <Tag key={opcao.value} id={opcao.value} textValue={opcao.label}>
                {opcao.label}
                {/* Só o próprio rótulo: o React Aria somaria o nome da etiqueta, que o `removeLabel` já traz. */}
                <Tag.RemoveButton id={`${labelId}-remover-${opcao.value}`} aria-label={removeLabel(opcao.label)} aria-labelledby={`${labelId}-remover-${opcao.value}`} />
              </Tag>
            ))}
          </TagGroup.List>
        </TagGroup>
      ) : null}
    </div>
  );
}
