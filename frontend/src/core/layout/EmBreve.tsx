import { ArrowLeft, Construction } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import codeReview from "@/shared/assets/figma/icons/undraw_code-review_jdgp.svg";
import development from "@/shared/assets/figma/icons/undraw_development_s4gv.svg";
import underConstruction from "@/shared/assets/figma/icons/undraw_under-construction_hdrn.svg";

type EmBreveProps = {
  titulo: string;
  ilustracao?: "board" | "timeline";
};

export function EmBreve({ titulo, ilustracao }: EmBreveProps) {
  const { t } = useTranslation();
  const imagem = ilustracao === "board"
    ? codeReview
    : ilustracao === "timeline"
      ? development
      : underConstruction;

  return (
    <section className="relative flex min-h-[min(36rem,calc(100vh_-_7rem))] items-center overflow-hidden rounded-3xl border border-edge bg-surface px-6 py-10 shadow-sm sm:px-10 lg:px-14">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-accent-tint sm:-right-20" />
      <div className="relative z-10 grid w-full items-center gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-10">
        <div className="max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-tint px-3 py-1.5 text-xs font-medium text-accent-text">
            <Construction aria-hidden="true" className="size-4" />
            {t("inDevelopment")}
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">{t(titulo.toLowerCase())}</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{t("comingSoonMessage")}</p>
          <Link
            to="/overview"
            className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("returnToOverview")}
          </Link>
        </div>
        <div className="relative flex min-h-52 items-center justify-center md:min-h-80">
          <img src={imagem} alt="" aria-hidden="true" className="relative z-10 max-h-[22rem] w-full max-w-[34rem] object-contain dark:brightness-[.85]" />
        </div>
      </div>
    </section>
  );
}
