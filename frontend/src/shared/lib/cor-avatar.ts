import type { CorAvatar } from "@/core/auth/api";

// Classes fixas por cor: o Tailwind só gera classes escritas por inteiro no código (ADRs 0041 e 0043).
export const CLASSES_COR_AVATAR: Record<CorAvatar, string> = {
  azul: "bg-avatar-1 text-avatar-1-foreground",
  indigo: "bg-avatar-2 text-avatar-2-foreground",
  roxo: "bg-avatar-3 text-avatar-3-foreground",
  rosa: "bg-avatar-4 text-avatar-4-foreground",
  vermelho: "bg-avatar-5 text-avatar-5-foreground",
  laranja: "bg-avatar-6 text-avatar-6-foreground",
  verde: "bg-avatar-7 text-avatar-7-foreground",
  cinza: "bg-avatar-8 text-avatar-8-foreground",
};

// Chave de tradução do nome de cada cor, usada como nome acessível no seletor de Configurações.
export const NOME_COR_AVATAR = {
  azul: "avatarColorBlue",
  indigo: "avatarColorIndigo",
  roxo: "avatarColorPurple",
  rosa: "avatarColorPink",
  vermelho: "avatarColorRed",
  laranja: "avatarColorOrange",
  verde: "avatarColorGreen",
  cinza: "avatarColorGray",
} as const satisfies Record<CorAvatar, string>;
