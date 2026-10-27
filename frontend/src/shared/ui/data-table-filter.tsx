import { useState, type FormEvent } from "react";
import { Button, Calendar, ListBox, Popover, SearchField } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { ChevronLeft, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { ChevronDownIcon } from "@/shared/ui/figma-icons";

export interface DataTableFilterOption {
  value: string;
  label: string;
  searchText?: string;
}

interface DataTableFilterProps {
  label: string;
  accessibleLabel?: string;
  value: string;
  onChange: (value: string) => void;
  /** Conjunto fechado (status, pessoa). Sem `options`, o filtro é de texto livre. */
  options?: DataTableFilterOption[];
  searchable?: boolean;
  placeholder?: string;
  /** "date": o valor é um dia `AAAA-MM-DD`, escolhido no calendário. */
  type?: "text" | "date";
}

const botaoRodape = "h-7 min-h-0 rounded-lg px-3 text-[12px]";
// Chave da opção "Todos" (valor vazio): o ListBox não aceita id vazio.
const TODOS = "__todos__";

/** Filtro no cabeçalho da coluna (spec 022): rótulo e seta do Figma; filtro ativo troca a seta pelo funil azul. */
export function DataTableFilter({ label, accessibleLabel, value, onChange, options, searchable = false, placeholder, type = "text" }: DataTableFilterProps) {
  const { t } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(value);
  const [busca, setBusca] = useState("");
  const nome = accessibleLabel ?? label;
  const ativo = Boolean(value);

  function abrir(proximo: boolean) {
    if (proximo) {
      setRascunho(value);
      setBusca("");
    }
    setAberto(proximo);
  }

  function aplicar(valor: string) {
    onChange(valor);
    setAberto(false);
  }

  function aplicarTexto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    aplicar(rascunho.trim());
  }

  const opcoesVisiveis = (options ?? []).filter((opcao) => !searchable || `${opcao.label} ${opcao.searchText ?? ""}`.toLocaleLowerCase().includes(busca.toLocaleLowerCase()));

  return (
    <Popover isOpen={aberto} onOpenChange={abrir}>
      <Button
        variant="ghost"
        aria-label={t("filterBy", { label: nome })}
        className={cn(
          "h-8 min-h-0 w-full justify-between gap-2 rounded-lg px-0 text-[14px] font-medium leading-5 hover:bg-transparent data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus",
          ativo ? "text-accent" : "text-muted hover:text-[#454442]",
        )}
      >
        <span className="truncate">{label}</span>
        {ativo
          ? <Filter aria-hidden="true" absoluteStrokeWidth strokeWidth={1} className="size-3.5 shrink-0" />
          : <ChevronDownIcon className={cn("shrink-0 transition-transform duration-200 motion-reduce:transition-none", aberto && "rotate-180")} />}
      </Button>
      <Popover.Content placement="bottom end" className="w-[min(18rem,calc(100vw-1rem))] p-1.5">
        <Popover.Dialog aria-label={t("filter", { label: nome })} className="outline-none">
          {options ? (
            <div className="grid gap-1">
              {searchable && (
                <SearchField aria-label={t("searchOptions")} value={busca} onChange={setBusca} autoFocus>
                  <SearchField.Group className="h-9">
                    <SearchField.SearchIcon />
                    <SearchField.Input className="text-[13px]" />
                  </SearchField.Group>
                </SearchField>
              )}
              <ListBox
                aria-label={t("filter", { label: nome })}
                selectionMode="single"
                selectedKeys={new Set([value || TODOS])}
                onSelectionChange={(chaves) => {
                  // Clicar na opção já marcada a desmarcaria: nesse caso só fecha, sem mudar o filtro.
                  const [chave] = chaves === "all" ? [] : [...chaves];
                  if (chave === undefined) setAberto(false);
                  else aplicar(chave === TODOS ? "" : String(chave));
                }}
                autoFocus={searchable ? undefined : "first"}
                className="max-h-56 overflow-y-auto"
              >
                {opcoesVisiveis.map((opcao) => (
                  <ListBox.Item key={opcao.value || TODOS} id={opcao.value || TODOS} textValue={opcao.label} className="text-[13px]">
                    {opcao.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </div>
          ) : type === "date" ? (
            <div className="grid gap-1.5">
              <Calendar aria-label={nome} value={value ? parseDate(value) : null} onChange={(dia) => aplicar(dia.toString())} autoFocus>
                <Calendar.Header>
                  <Calendar.NavButton slot="previous" />
                  <Calendar.Heading />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>{(dia) => <Calendar.HeaderCell>{dia}</Calendar.HeaderCell>}</Calendar.GridHeader>
                  <Calendar.GridBody>{(data) => <Calendar.Cell date={data} />}</Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
              <div className="flex justify-end border-t border-separator pt-1.5">
                <Button variant="ghost" className={botaoRodape} onPress={() => aplicar("")}>{t("clearFilters")}</Button>
              </div>
            </div>
          ) : (
            <form className="grid gap-2" onSubmit={aplicarTexto}>
              <SearchField aria-label={label} value={rascunho} onChange={setRascunho} autoFocus>
                <SearchField.Group className="h-9">
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder={placeholder ?? t("filterPlaceholder", { label })} className="text-[13px]" />
                  <SearchField.ClearButton aria-label={t("clearText")} />
                </SearchField.Group>
              </SearchField>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" className={botaoRodape} onPress={() => aplicar("")}>{t("clearFilters")}</Button>
                <Button type="submit" variant="primary" className={botaoRodape}>{t("apply")}</Button>
              </div>
            </form>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

interface DataTableMultiFilterProps {
  label: string;
  accessibleLabel?: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
  /** Sem "Todos": nada marcado é o filtro desligado, e o "Limpar" do cabeçalho volta a esse estado. */
  options: DataTableFilterOption[];
  searchable?: boolean;
}

/**
 * Filtro de seleção múltipla no cabeçalho: cada opção marcada se aplica na hora e o popover segue aberto para marcar
 * outras. O cabeçalho do popover traz "‹ Rótulo", que fecha, e "Limpar", que desmarca tudo.
 */
export function DataTableMultiFilter({ label, accessibleLabel, values, onChange, options, searchable = false }: DataTableMultiFilterProps) {
  const { t } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const nome = accessibleLabel ?? label;
  const ativo = values.length > 0;
  const opcoesVisiveis = options.filter((opcao) => !searchable || `${opcao.label} ${opcao.searchText ?? ""}`.toLocaleLowerCase().includes(busca.toLocaleLowerCase()));
  const visiveis = new Set(opcoesVisiveis.map((opcao) => opcao.value));

  return (
    <Popover isOpen={aberto} onOpenChange={(proximo) => { if (proximo) setBusca(""); setAberto(proximo); }}>
      <Button
        variant="ghost"
        aria-label={t("filterBy", { label: nome })}
        className={cn(
          "h-8 min-h-0 w-full justify-between gap-2 rounded-lg px-0 text-[14px] font-medium leading-5 hover:bg-transparent data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus",
          ativo ? "text-accent" : "text-muted hover:text-[#454442]",
        )}
      >
        <span className="truncate">{label}</span>
        {ativo
          ? <Filter aria-hidden="true" absoluteStrokeWidth strokeWidth={1} className="size-3.5 shrink-0" />
          : <ChevronDownIcon className={cn("shrink-0 transition-transform duration-200 motion-reduce:transition-none", aberto && "rotate-180")} />}
      </Button>
      <Popover.Content placement="bottom end" className="w-[min(16rem,calc(100vw-1rem))] rounded-2xl p-3">
        <Popover.Dialog aria-label={t("filter", { label: nome })} className="grid gap-2 outline-none">
          {/* No ListBox, Esc limparia a seleção inteira: aqui ele só fecha, e o filtro escolhido continua. */}
          <div
            className="contents"
            onKeyDownCapture={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setAberto(false); } }}
          >
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" aria-label={t("closeFilter")} onPress={() => setAberto(false)} className="h-7 min-h-0 gap-1 rounded-lg px-1 text-[14px] font-medium text-[#454442]">
              <ChevronLeft aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />{label}
            </Button>
            <Button variant="ghost" isDisabled={!ativo} onPress={() => onChange([])} className="h-7 min-h-0 rounded-lg px-1.5 text-[14px] text-accent">
              {t("clear")}
            </Button>
          </div>
          {searchable && (
            <SearchField aria-label={t("searchOptions")} value={busca} onChange={setBusca} autoFocus className="w-full min-w-0">
              <SearchField.Group className="h-9 w-full min-w-0 rounded-xl bg-[#F3F5F7]">
                <SearchField.SearchIcon />
                <SearchField.Input className="text-[13px]" />
              </SearchField.Group>
            </SearchField>
          )}
          <ListBox
            aria-label={t("filter", { label: nome })}
            selectionMode="multiple"
            selectedKeys={new Set(values)}
            onSelectionChange={(chaves) => {
              // A busca esconde opções, mas não as desmarca: as marcadas fora da lista visível continuam no filtro
              // (o Set evita repetir as que a própria seleção já carrega).
              const marcadas = chaves === "all" ? opcoesVisiveis.map((opcao) => opcao.value) : [...chaves].map(String);
              onChange([...new Set([...values.filter((valor) => !visiveis.has(valor)), ...marcadas])]);
            }}
            autoFocus={searchable ? undefined : "first"}
            className="max-h-56 overflow-y-auto"
          >
            {opcoesVisiveis.map((opcao) => (
              <ListBox.Item key={opcao.value} id={opcao.value} textValue={opcao.label} className="text-[13px]">
                {opcao.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
