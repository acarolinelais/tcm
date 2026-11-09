import { useState } from "react";
import { Button } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { TextInputField } from "@/shared/ui/form-field";
import { linkClassName } from "@/shared/ui/link";
import { RetryAlert } from "@/shared/ui/retry-alert";
import { RowActionButton } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { ehNaoEncontrado, useAdicionarPullRequest, usePullRequestsCasoTeste, useRemoverPullRequest } from "../../hooks/useProjetos";
import { createLinkPullRequestSchema, MAX_URL_PULL_REQUEST, type LinkPullRequest, type LinkPullRequestFormValues } from "../../model/projeto";

/**
 * Histórico de links de PR do caso (spec 030), na ordem da API (mais recente primeiro). Qualquer perfil adiciona;
 * o botão de remover só aparece quando a API diz que a pessoa pode remover (gestão).
 */
export function PullRequestsCasoTeste({ casoId, perfil }: { casoId: string; perfil?: PerfilAtual }) {
  const { t } = useTranslation();
  const links = usePullRequestsCasoTeste(casoId, perfil);
  const adicionar = useAdicionarPullRequest(casoId);
  const remover = useRemoverPullRequest(casoId);
  const [paraRemover, setParaRemover] = useState<LinkPullRequest | null>(null);
  const { control, handleSubmit, reset, setError } = useForm<LinkPullRequestFormValues>({
    resolver: zodResolver(createLinkPullRequestSchema(t)),
    defaultValues: { url: "" },
  });

  const onSubmit = handleSubmit(async ({ url }) => {
    try {
      await adicionar.mutateAsync(url);
      reset();
      toast.success(t("pullRequestAdded"));
    } catch (erro) {
      // 409: o link já está no caso; o 422 só chega se a tela e a API divergirem, e também é sobre o campo.
      const status = erro instanceof ApiError ? erro.problem.status : undefined;
      if (status === 409) setError("url", { message: t("pullRequestDuplicate") });
      else if (status === 422) setError("url", { message: t("pullRequestUrlInvalid") });
      else toast.error(t("pullRequestAddError"));
    }
  });

  function confirmarRemocao() {
    if (!paraRemover) return;
    remover.mutate(paraRemover.id, {
      onSuccess: () => toast.success(t("pullRequestRemoved")),
      onError: (erro) => toast.error(t(ehNaoEncontrado(erro) ? "pullRequestNotFound" : "pullRequestRemoveError")),
      onSettled: () => setParaRemover(null),
    });
  }

  return (
    <section aria-labelledby={`pull-requests-${casoId}`} className="mt-8">
      <h3 id={`pull-requests-${casoId}`} className="text-[18px] font-medium leading-6 text-body">{t("pullRequests")}</h3>
      <form noValidate onSubmit={(evento) => void onSubmit(evento)} className="mt-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Controller
            control={control}
            name="url"
            render={({ field, fieldState }) => (
              <TextInputField label={t("pullRequestUrl")} value={field.value} onChange={field.onChange} error={fieldState.error?.message} maxLength={MAX_URL_PULL_REQUEST} />
            )}
          />
        </div>
        {/* Alinha com o campo, abaixo do rótulo (14px de texto + 8px de espaço). */}
        <Button type="submit" variant="outline" className="mt-[30px] h-10" isPending={adicionar.isPending}>{t("add")}</Button>
      </form>

      <div className="mt-4">
        {links.data ? (
          links.data.itens.length ? (
            <ul className="space-y-3">
              {links.data.itens.map((link) => (
                <li key={link.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className={cn("break-all text-[14px] leading-5", linkClassName)}>{link.url}</a>
                    <p className="mt-0.5 text-[12px] leading-4 text-muted">
                      {t("pullRequestAddedBy", { name: link.created_by_nome, date: link.created_at ? formatDate(link.created_at, { dateStyle: "short", timeStyle: "short" }) : "—" })}
                    </p>
                  </div>
                  {links.data.pode_remover ? (
                    <RowActionButton identificador={link.url} action={{ label: t("removePullRequest"), icon: <Trash2 {...rowActionIconProps} />, onPress: () => setParaRemover(link), destructive: true }} />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] leading-5 text-muted">{t("noPullRequests")}</p>
        ) : links.isError ? (
          <RetryAlert message={t("pullRequestsLoadError")} onRetry={() => void links.refetch()} />
        ) : <p role="status" className="text-[14px] leading-5 text-muted">{t("loading")}</p>}
      </div>

      <AlertConfirm
        open={Boolean(paraRemover)}
        onOpenChange={(aberto) => { if (!aberto) setParaRemover(null); }}
        title={t("removePullRequestTitle")}
        description={t("removePullRequestDescription", { url: paraRemover?.url ?? "" })}
        confirmLabel={t("remove")}
        variant="destructive"
        isPending={remover.isPending}
        onConfirm={confirmarRemocao}
      />
    </section>
  );
}
