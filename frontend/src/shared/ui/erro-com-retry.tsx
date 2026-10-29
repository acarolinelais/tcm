import { Button } from "@heroui/react";

/** Erro da consulta com o botão de tentar de novo (tabelas e painéis de leitura). */
export function ErroComRetry({ mensagem, retry }: { mensagem: string; retry: { label: string; onRetry: () => void } }) {
  return <div className="grid justify-items-center gap-3">
    <p role="alert" className="text-danger">{mensagem}</p>
    <Button variant="outline" size="sm" onPress={retry.onRetry}>{retry.label}</Button>
  </div>;
}
