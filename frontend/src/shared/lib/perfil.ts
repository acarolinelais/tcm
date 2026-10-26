import type { TFunction } from "i18next";

/** Nome do perfil no idioma da tela: o catálogo traduz os perfis seedados; os demais mostram o nome salvo. */
export function rotuloPerfil(t: TFunction, codigo: string | null | undefined, nome: string | null | undefined): string {
  return codigo ? t(`catalog.profile.${codigo}`, { defaultValue: nome ?? "—" }) : nome ?? "—";
}
