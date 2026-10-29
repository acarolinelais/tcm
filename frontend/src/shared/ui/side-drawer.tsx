import type { FormEvent, ReactNode } from "react";
import { Button, Drawer } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";

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
  /**
   * `card` (spec 028, Figma): painel de leitura que encosta na borda direita entre a barra de busca e o fim da tela,
   * sem escurecer a página, com os cantos da esquerda arredondados e sem divisórias.
   * O padrão `panel` segue nos painéis de formulário.
   */
  variant?: "panel" | "card";
  /** Salvando: Esc, o fundo e o X não fecham, para um erro da API achar o painel aberto (spec 031). */
  isPending?: boolean;
}

/** Painel à direita para criar e editar (spec 022): título, corpo rolável e rodapé de ações. Esc e o fundo fecham. */
export function SideDrawer({ isOpen, onOpenChange, title, subtitle, children, footer, onSubmit, variant = "panel", isPending = false }: SideDrawerProps) {
  const card = variant === "card";
  const conteudo = <>
    <Drawer.Body className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto p-0">{children}</Drawer.Body>
    {footer ? <Drawer.Footer className={cn("flex justify-end gap-2 px-7 py-5", !card && "border-t border-separator")}>{footer}</Drawer.Footer> : null}
  </>;
  return (
    <Drawer isOpen={isOpen} onOpenChange={(open) => { if (open || !isPending) onOpenChange(open); }}>
      {/* No card (Figma) a página atrás não escurece; o fundo transparente ainda fecha o painel ao clicar fora. */}
      <Drawer.Backdrop isDismissable={!isPending} isKeyboardDismissDisabled={isPending} variant={card ? "transparent" : undefined}>
        {/* Content é o contêiner de tela inteira que encosta o painel à direita; a largura vai no Dialog. */}
        {/* Card: começa abaixo da barra de busca, termina antes do rodapé da tela e encosta na borda direita. */}
        <Drawer.Content placement="right" className={cn(card && "pb-10 pt-16")}>
          {/* O card é mais largo: os passos do Procedure e os links de PR são textos longos (spec 030). */}
          <Drawer.Dialog className={cn("flex h-full flex-col p-0", card ? "w-[min(36rem,100vw)] rounded-l-[24px] shadow-overlay" : "w-[min(28rem,100vw)]")}>
            <Drawer.CloseTrigger />
            <Drawer.Header className={cn("px-7 py-6 pr-16", !card && "border-b border-separator")}>
              <Drawer.Heading className={cn("leading-6 text-body", card ? "text-[22px] font-normal leading-7" : "text-[18px] font-medium")}>{title}</Drawer.Heading>
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
export function DrawerFormActions({ onCancel, submitLabel, isPending = false, isSubmitDisabled = false, pendingLabel }: {
  onCancel: () => void;
  submitLabel: string;
  /** Texto do botão enquanto envia; o padrão é "Aguarde…". */
  pendingLabel?: string;
  isPending?: boolean;
  isSubmitDisabled?: boolean;
}) {
  const { t } = useTranslation();
  return <>
    {/* Enquanto salva, Cancelar não fecha: um erro da API precisa achar o painel aberto com os valores. */}
    <Button variant="tertiary" isDisabled={isPending} onPress={onCancel}>{t("cancel")}</Button>
    <Button type="submit" variant="primary" isDisabled={isPending || isSubmitDisabled}>{isPending ? pendingLabel ?? t("pleaseWait") : submitLabel}</Button>
  </>;
}
