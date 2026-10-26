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
}

/** Confirmação com o AlertDialog do HeroUI; mesma API do `ConfirmDialog` do shadcn (spec 022). */
export function AlertConfirm({ open, onOpenChange, title, description, confirmLabel, cancelLabel, variant = "default", onConfirm, isPending = false }: AlertConfirmProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog isOpen={open} onOpenChange={(aberto) => { if (!isPending || aberto) onOpenChange(aberto); }}>
      <AlertDialog.Backdrop isDismissable={!isPending} isKeyboardDismissDisabled={isPending}>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status={variant === "destructive" ? "danger" : "accent"} />
              <AlertDialog.Heading className="text-[18px] font-medium text-[#454442]">{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-[14px] leading-6 text-muted">{description}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" isDisabled={isPending} onPress={() => onOpenChange(false)}>{cancelLabel ?? t("cancel")}</Button>
              <Button variant={variant === "destructive" ? "danger" : "primary"} isDisabled={isPending} onPress={onConfirm}>
                {isPending ? t("pleaseWait") : confirmLabel ?? t("confirm")}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
