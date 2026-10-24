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
}

export function TableColumnFilter({
  label,
  value,
  onChange,
  options,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: TableFilterOption[];
  placeholder?: string;
  /** "date": o valor é um dia no formato AAAA-MM-DD, escolhido num Calendar. */
  type?: "text" | "date";
}) {
  const { t } = useTranslation();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(value);
  const [posicao, setPosicao] = useState({ top: 0, right: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { montado, saindo } = usePresenca(aberto);

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
        setAberto(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", fecharSeFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharSeFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [aberto]);

  function alternarMenu() {
    if (aberto) {
      setAberto(false);
      return;
    }
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) {
      const alturaMenu = options ? Math.min(300, options.length * 38 + 8) : type === "date" ? 340 : 132;
      const top = bounds.bottom + alturaMenu > window.innerHeight
        ? Math.max(8, bounds.top - alturaMenu - 6)
        : bounds.bottom + 6;
      setPosicao({ top, right: Math.max(8, window.innerWidth - bounds.right) });
    }
    setRascunho(value);
    setAberto(true);
  }

  function aplicarTexto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange(rascunho.trim());
    setAberto(false);
  }

  const ativo = Boolean(value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("filterBy", { label })}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={`group inline-flex items-center gap-1.5 text-left text-sm font-semibold uppercase tracking-wide transition-colors ${ativo ? "text-primary" : "text-foreground hover:text-primary"}`}
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
          role={type === "date" ? "dialog" : "menu"}
          aria-label={t("filter", { label })}
          style={{ position: "fixed", top: posicao.top, right: posicao.right }}
          className="popover-enter z-50 min-w-48 rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          {options ? (
            <div className="max-h-72 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value || "all"}
                  type="button"
                  role="menuitemradio"
                  aria-checked={value === option.value}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary active:bg-secondary ${value === option.value ? "font-medium text-primary" : "text-foreground"}`}
                  onClick={() => {
                    onChange(option.value);
                    setAberto(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : type === "date" ? (
            <div>
              <Calendar
                mode="single"
                selected={value ? lerDiaIso(value) : undefined}
                defaultMonth={value ? lerDiaIso(value) : undefined}
                onSelect={(dia) => {
                  onChange(dia ? formatarDiaIso(dia) : "");
                  setAberto(false);
                }}
                autoFocus
              />
              <div className="flex justify-end border-t border-border px-1 pt-1.5">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary active:bg-secondary"
                  onClick={() => {
                    onChange("");
                    setAberto(false);
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
                    setAberto(false);
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
