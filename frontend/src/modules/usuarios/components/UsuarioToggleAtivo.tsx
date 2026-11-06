import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

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
          disabled={inativar.isPending}
          onClick={() => setConfirmacaoAberta(true)}
        >
          {t("inactivate")}
        </Button>
        <ConfirmDialog
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
      disabled={ativar.isPending}
      onClick={() => ativar.mutate(usuario.id)}
    >
      {t("activate")}
    </Button>
  );
}
