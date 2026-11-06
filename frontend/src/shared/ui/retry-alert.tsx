import { Button } from "@heroui/react";
import { useTranslation } from "react-i18next";

/** Mensagem de erro de uma consulta com o botão "Tentar de novo". */
export function RetryAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 text-[14px] leading-6 text-body">
      <p>{message}</p>
      <Button variant="outline" onPress={onRetry}>{t("retryQuery")}</Button>
    </div>
  );
}
