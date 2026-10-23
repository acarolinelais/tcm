import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

interface TableRowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function TableRowActions({ label, actions }: { label: string; actions: TableRowAction[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const updatePosition = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const menuHeight = Math.min(actions.length * 40 + 8, 240);
      const top = bounds.bottom + menuHeight > window.innerHeight
        ? Math.max(8, bounds.top - menuHeight - 6)
        : bounds.bottom + 6;
      setPosition({ top, right: Math.max(8, window.innerWidth - bounds.right) });
    };
    updatePosition();
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [actions.length, open]);

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Ações para ${label}`}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
      className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MoreHorizontal aria-hidden="true" className="size-5" />
    </button>
    {open && createPortal(
      <div ref={menuRef} role="menu" aria-label={`Ações para ${label}`} style={{ position: "fixed", top: position.top, right: position.right }} className="z-50 min-w-48 rounded-xl border border-border bg-card p-1 shadow-lg">
        {actions.map(({ label: actionLabel, icon: Icon, onSelect, destructive, disabled }) => <button
          key={actionLabel}
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => { setOpen(false); onSelect(); }}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50 ${destructive ? "text-destructive" : "text-foreground"}`}
        >
          <Icon aria-hidden="true" className={`size-4 ${destructive ? "" : "text-muted-foreground"}`} />
          {actionLabel}
        </button>)}
      </div>,
      document.body,
    )}
  </>;
}
