import { useState } from "react";
import { Button } from "@heroui/react";
import { AlertConfirm } from "@/shared/ui/alert-confirm";

import { useAtivarUsuario, useInativarUsuario } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";
import { useTranslation } from "react-i18next";

export function UsuarioToggleAtivo({ usuario }: { usuario: Usuario }) {
  const { t } = useTranslation();
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const ativar = useAtivarUsuario();
  const inativar = useInativarUsuario();

  if (usuario.ativo) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          isDisabled={inativar.isPending}
          onPress={() => setConfirmacaoAberta(true)}
        >
          {t("inactivate")}
        </Button>
        <AlertConfirm
          open={confirmacaoAberta}
          onOpenChange={setConfirmacaoAberta}
          title={t("deactivateUserQuestion")}
          description={t("deactivateUserDescription", { name: usuario.nome })}
          confirmLabel={t("deactivateUser")}
          variant="destructive"
          isPending={inativar.isPending}
          onConfirm={() => {
            inativar.mutate(usuario.id);
            setConfirmacaoAberta(false);
          }}
        />
      </>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      isDisabled={ativar.isPending}
      onPress={() => ativar.mutate(usuario.id)}
    >
      {t("activate")}
    </Button>
  );
}
