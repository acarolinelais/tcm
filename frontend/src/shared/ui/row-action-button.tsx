import type { ReactNode } from "react";
import { Button, Tooltip } from "@heroui/react";

import { cn } from "@/shared/lib/utils";

export interface RowAction {
  /** Verbo da ação ("Transferir ao backup"); vira o tooltip e, com o identificador, o nome acessível. */
  label: string;
  icon: ReactNode;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * Botão redondo de ação por linha (Figma TCM 2070:1476): círculo de 19px `#EFEFF0` com ícone de traço 1px.
 * O alvo de toque tem 24px; o círculo fica dentro dele.
 */
export function RowActionButton({ action, identificador }: { action: RowAction; identificador: string }) {
  return (
    <Tooltip delay={400} closeDelay={0}>
      <Button
        isIconOnly
        variant="ghost"
        aria-label={`${action.label} ${identificador}`}
        isDisabled={action.disabled}
        onPress={action.onPress}
        className="group/acao size-6 min-w-0 rounded-full bg-transparent p-0 text-[#454442] hover:bg-transparent data-[pressed]:scale-95 data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-[19px] items-center justify-center rounded-full bg-[#EFEFF0] transition-colors group-hover/acao:bg-[#E4E4E7]",
            action.destructive && "text-danger group-hover/acao:bg-danger/10",
          )}
        >
          {action.icon}
        </span>
      </Button>
      <Tooltip.Content className="text-[12px]">{action.label}</Tooltip.Content>
    </Tooltip>
  );
}

/** Ações da linha lado a lado, sempre visíveis (spec 022, RN-08). As destrutivas vão por último. */
export function RowActions({ actions, identificador }: { actions: RowAction[]; identificador: string }) {
  const ordenadas = [...actions.filter((a) => !a.destructive), ...actions.filter((a) => a.destructive)];
  return (
    <div className="flex items-center gap-1">
      {ordenadas.map((action) => <RowActionButton key={action.label} action={action} identificador={identificador} />)}
    </div>
  );
}
