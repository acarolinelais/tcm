import { useId } from "react";
import type { ReactNode } from "react";
import { AlertDialog, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

export interface AlertConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  isPending?: boolean;
  /** Campos extras sob a descrição, como a justificativa da exclusão (spec 026). */
  children?: ReactNode;
  isConfirmDisabled?: boolean;
}

/** Confirmação com o AlertDialog do HeroUI; mesma API do `ConfirmDialog` do shadcn (spec 022). */
export function AlertConfirm({ open, onOpenChange, title, description, confirmLabel, cancelLabel, variant = "default", onConfirm, isPending = false, children, isConfirmDisabled = false }: AlertConfirmProps) {
  const { t } = useTranslation();
  const idDescricao = useId();
  return (
    <AlertDialog isOpen={open} onOpenChange={(aberto) => { if (!isPending || aberto) onOpenChange(aberto); }}>
      <AlertDialog.Backdrop isDismissable={!isPending} isKeyboardDismissDisabled={isPending}>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog aria-describedby={idDescricao}>
            <AlertDialog.Header>
              <AlertDialog.Icon status={variant === "destructive" ? "danger" : "accent"} />
              <AlertDialog.Heading className="text-[18px] font-medium text-body">{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p id={idDescricao} className="text-[14px] leading-6 text-muted">{description}</p>
              {children ? <div className="mt-4">{children}</div> : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" isDisabled={isPending} onPress={() => onOpenChange(false)}>{cancelLabel ?? t("cancel")}</Button>
              <Button variant={variant === "destructive" ? "danger" : "primary"} isDisabled={isPending || isConfirmDisabled} onPress={onConfirm}>
                {isPending ? t("pleaseWait") : confirmLabel ?? t("confirm")}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
