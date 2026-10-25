import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatarDiaIso, lerDiaIso } from "@/shared/lib/utils";
import { usePresenca } from "@/shared/lib/use-presenca";
import { Calendar } from "@/shared/ui/calendar";

export interface TableFilterOption {
  value: string;
  label: string;
  searchText?: string;
}

export function TableColumnFilter({
  label,
  accessibleLabel,
  value,
  onChange,
  options,
  multiple = false,
  selectedValues = [],
  onSelectedValuesChange,
  placeholder,
  type = "text",
  searchable = false,
}: {
  label: string;
  accessibleLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options?: TableFilterOption[];
  multiple?: boolean;
  selectedValues?: string[];
  onSelectedValuesChange?: (values: string[]) => void;
  placeholder?: string;
  /** "date": o valor é um dia no formato AAAA-MM-DD, escolhido num Calendar. */
  type?: "text" | "date";
  searchable?: boolean;
}) {
  const { t } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(value);
  const [buscaOpcao, setBuscaOpcao] = useState("");
  const [posicao, setPosicao] = useState({ top: 0, right: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { montado, saindo } = usePresenca(aberto);

  function fecharEDevolverFoco() {
    setAberto(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!aberto) return;

    function fecharSeFora(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setAberto(false);
      }
    }

    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        fecharEDevolverFoco();
      }
    }

    document.addEventListener("pointerdown", fecharSeFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharSeFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto || !montado || type === "date") return;
    const primeiroControle = menuRef.current?.querySelector<HTMLElement>("input, button");
    primeiroControle?.focus();
  }, [aberto, montado, type]);

  function alternarMenu() {
    if (aberto) {
      fecharEDevolverFoco();
      return;
    }
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) {
      const alturaMenu = options ? Math.min(300, options.length * 38 + (multiple ? 60 : 8)) : type === "date" ? 340 : 132;
      const top = bounds.bottom + alturaMenu > window.innerHeight
        ? Math.max(8, bounds.top - alturaMenu - 6)
        : bounds.bottom + 6;
      setPosicao({ top, right: Math.max(8, window.innerWidth - bounds.right) });
    }
    setRascunho(value);
    setBuscaOpcao("");
    setAberto(true);
  }

  function aplicarTexto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange(rascunho.trim());
    fecharEDevolverFoco();
  }

  const ativo = multiple ? selectedValues.length > 0 : Boolean(value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("filterBy", { label: accessibleLabel ?? label })}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={`group inline-flex min-h-9 items-center gap-1.5 rounded-md px-1 text-left text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${ativo ? "text-primary" : "text-foreground hover:text-primary"}`}
        onClick={alternarMenu}
      >
        {label}
        {ativo ? <Filter aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 ease-in-out group-aria-expanded:rotate-180 motion-reduce:transition-none" />}
      </button>
      {montado && createPortal(
        <div
          ref={menuRef}
          data-saindo={saindo}
          aria-hidden={saindo || undefined}
          inert={saindo}
          role="dialog"
          aria-label={t("filter", { label: accessibleLabel ?? label })}
          style={{ position: "fixed", top: posicao.top, right: posicao.right }}
          onBlur={(event) => {
            const proximoAlvo = event.relatedTarget;
            if (proximoAlvo instanceof Node && (menuRef.current?.contains(proximoAlvo) || triggerRef.current?.contains(proximoAlvo))) return;
            setAberto(false);
          }}
          className="popover-enter z-50 max-h-[calc(100dvh-1rem)] w-[min(18rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          {options ? (
            <div>
              {searchable && <label className="mb-1 flex h-9 items-center gap-2 rounded-lg border border-border px-2.5"><Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><input aria-label={t("searchOptions", { defaultValue: "Search options" })} value={buscaOpcao} onChange={(event) => setBuscaOpcao(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>}
              <div role="menu" aria-label={t("filter", { label: accessibleLabel ?? label })} className="max-h-56 overflow-y-auto" onKeyDown={(event) => {
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                if (!(event.target as HTMLElement).closest("[role^='menuitem']")) return;
                const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role^='menuitem']"));
                const currentIndex = items.indexOf(document.activeElement as HTMLElement);
                if (currentIndex < 0 || !items.length) return;
                event.preventDefault();
                const nextIndex = event.key === "Home" ? 0
                  : event.key === "End" ? items.length - 1
                    : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
                items[nextIndex]?.focus();
              }}>
              {options.filter((option) => !searchable || `${option.label} ${option.searchText ?? ""}`.toLocaleLowerCase().includes(buscaOpcao.toLocaleLowerCase())).map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  role={multiple ? "menuitemcheckbox" : "menuitemradio"}
                  aria-checked={multiple ? selectedValues.includes(option.value) : value === option.value}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary active:bg-secondary ${(multiple ? selectedValues.includes(option.value) : value === option.value) ? "font-medium text-primary" : "text-foreground"}`}
                  onClick={() => {
                    if (multiple) {
                      const next = selectedValues.includes(option.value)
                        ? selectedValues.filter((item) => item !== option.value)
                        : [...selectedValues, option.value];
                      onSelectedValuesChange?.(next);
                    } else {
                      onChange(option.value);
                      fecharEDevolverFoco();
                    }
                  }}
                >
                  {multiple && <span aria-hidden="true" className="mr-2 inline-flex size-4 items-center justify-center rounded border border-current text-[10px]">{selectedValues.includes(option.value) ? "✓" : ""}</span>}{option.label}
                </button>
              ))}
              </div>
              {multiple && <div className="sticky bottom-0 flex justify-end border-t border-border bg-card px-2 py-1.5"><button type="button" className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary" onClick={() => onSelectedValuesChange?.([])}>{t("clearFilters")}</button></div>}
            </div>
          ) : type === "date" ? (
            <div>
              <Calendar
                mode="single"
                selected={value ? lerDiaIso(value) : undefined}
                defaultMonth={value ? lerDiaIso(value) : undefined}
                onSelect={(dia) => {
                  onChange(dia ? formatarDiaIso(dia) : "");
                  fecharEDevolverFoco();
                }}
                autoFocus
              />
              <div className="flex justify-end border-t border-border px-1 pt-1.5">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary active:bg-secondary"
                  onClick={() => {
                    onChange("");
                    fecharEDevolverFoco();
                  }}
                >
                  {t("clearFilters")}
                </button>
              </div>
            </div>
          ) : (
            <form className="w-64 space-y-2" onSubmit={aplicarTexto}>
              <label className="flex h-9 items-center gap-2 rounded-lg border border-border px-2.5">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  aria-label={label}
                  value={rascunho}
                  onChange={(event) => setRascunho(event.target.value)}
                  placeholder={placeholder ?? t("filterPlaceholder", { label })}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {rascunho && (
                  <button type="button" aria-label={t("clearText")} onClick={() => setRascunho("")}>
                    <X aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary active:bg-secondary"
                  onClick={() => {
                    setRascunho("");
                    onChange("");
                    fecharEDevolverFoco();
                  }}
                >
                  {t("clearFilters")}
                </button>
                <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                  {t("apply")}
                </button>
              </div>
            </form>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
