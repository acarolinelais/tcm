import type { CorAvatar } from "@/core/auth/api";

const ESFERAS_HEROUI = "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars";

// Por cor: a esfera em degradê do HeroUI e o token de fundo enquanto ela não carrega. Classes escritas por inteiro,
// porque o Tailwind só gera as que aparecem no código (ADRs 0041 e 0043).
export const AVATAR_POR_COR: Record<CorAvatar, { imagem: string; fundo: string }> = {
  azul: { imagem: `${ESFERAS_HEROUI}/blue.jpg`, fundo: "bg-avatar-1" },
  indigo: { imagem: `${ESFERAS_HEROUI}/indigo.jpg`, fundo: "bg-avatar-2" },
  roxo: { imagem: `${ESFERAS_HEROUI}/purple.jpg`, fundo: "bg-avatar-3" },
  vermelho: { imagem: `${ESFERAS_HEROUI}/red.jpg`, fundo: "bg-avatar-4" },
  laranja: { imagem: `${ESFERAS_HEROUI}/orange.jpg`, fundo: "bg-avatar-5" },
  verde: { imagem: `${ESFERAS_HEROUI}/green.jpg`, fundo: "bg-avatar-6" },
  cinza: { imagem: `${ESFERAS_HEROUI}/black.jpg`, fundo: "bg-avatar-7" },
  "cinza-claro": { imagem: `${ESFERAS_HEROUI}/white.jpg`, fundo: "bg-avatar-8" },
};

// Chave de tradução do nome de cada cor, usada como nome acessível no seletor de Configurações.
export const NOME_COR_AVATAR = {
  azul: "avatarColorBlue",
  indigo: "avatarColorIndigo",
  roxo: "avatarColorPurple",
  vermelho: "avatarColorRed",
  laranja: "avatarColorOrange",
  verde: "avatarColorGreen",
  cinza: "avatarColorGray",
  "cinza-claro": "avatarColorLightGray",
} as const satisfies Record<CorAvatar, string>;
