import type { FormEvent, ReactNode } from "react";
import { Button, Drawer } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface SideDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Linha abaixo do título (ex.: "4 membros"). */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Ações do rodapé (ex.: `DrawerFormActions`). */
  footer?: ReactNode;
  /** Com `onSubmit`, corpo e rodapé ficam dentro de um formulário: o botão `type="submit"` do rodapé o envia. */
  onSubmit?: () => void;
}

/** Painel à direita para criar e editar (spec 022): título, corpo rolável e rodapé de ações. Esc e o fundo fecham. */
export function SideDrawer({ isOpen, onOpenChange, title, subtitle, children, footer, onSubmit }: SideDrawerProps) {
  const conteudo = <>
    <Drawer.Body className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto p-0">{children}</Drawer.Body>
    {footer ? <Drawer.Footer className="flex justify-end gap-2 border-t border-separator px-7 py-5">{footer}</Drawer.Footer> : null}
  </>;
  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Backdrop isDismissable>
        {/* Content é o contêiner de tela inteira que encosta o painel à direita; a largura vai no Dialog. */}
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full w-[min(28rem,100vw)] flex-col p-0">
            <Drawer.CloseTrigger />
            <Drawer.Header className="border-b border-separator px-7 py-6 pr-16">
              <Drawer.Heading className="text-[18px] font-medium leading-6 text-[#454442]">{title}</Drawer.Heading>
              {subtitle ? <p className="mt-1 text-[12px] text-muted">{subtitle}</p> : null}
            </Drawer.Header>
            {onSubmit
              ? <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(); }}>{conteudo}</form>
              : conteudo}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

/** Rodapé padrão de um painel com formulário: Cancelar e o botão de enviar. */
export function DrawerFormActions({ onCancel, submitLabel, isPending = false, isSubmitDisabled = false }: {
  onCancel: () => void;
  submitLabel: string;
  isPending?: boolean;
  isSubmitDisabled?: boolean;
}) {
  const { t } = useTranslation();
  return <>
    <Button variant="tertiary" onPress={onCancel}>{t("cancel")}</Button>
    <Button type="submit" variant="primary" isDisabled={isPending || isSubmitDisabled}>{isPending ? t("pleaseWait") : submitLabel}</Button>
  </>;
}
