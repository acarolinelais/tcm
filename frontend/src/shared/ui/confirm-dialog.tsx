import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export interface ConfirmDialogProps {
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

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  isPending = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogPrimitive.Description className="text-sm leading-6 text-muted-foreground">
            {description}
          </DialogPrimitive.Description>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Aguarde..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
