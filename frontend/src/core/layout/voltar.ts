// Destino e rótulo do botão de voltar da navbar (Figma TCM, node 2090:199).

const ROTULOS: [RegExp, string][] = [
  [/^\/overview$/, "overview"],
  [/^\/board$/, "board"],
  [/^\/timeline$/, "timeline"],
  [/^\/projetos$/, "myProjects"],
  [/^\/projetos\/[^/]+$/, "project"],
  [/^\/admin\/modelos-dispositivo$/, "deviceModels"],
  [/^\/(admin\/)?usuarios$/, "users"],
  [/^\/admin\/setores$/, "sectors"],
  [/^\/(admin\/)?times$/, "teams"],
  [/^\/(admin\/)?times\/[^/]+$/, "team"],
  [/^\/(admin\/)?perfis$/, "profiles"],
  [/^\/documentation$/, "documentation"],
  [/^\/configuracoes$/, "settings"],
];

/** Chave i18n do nome da tela de um caminho. */
export function rotuloDaRota(caminho: string): string {
  return ROTULOS.find(([padrao]) => padrao.test(caminho))?.[1] ?? "overview";
}

// Páginas que não estão na sidebar e a página principal a que pertencem. Nas páginas da sidebar não há voltar.
const PAIS: [RegExp, (caminho: string) => string][] = [
  [/^\/projetos\/[^/]+$/, () => "/projetos"],
  [/^\/documentation\/[^/]+$/, () => "/documentation"],
  [/^\/(admin\/)?times\/[^/]+$/, (caminho) => caminho.slice(0, caminho.lastIndexOf("/"))],
];

/** Página principal de destino do voltar, ou `null` quando o caminho já é uma página da sidebar. */
export function rotaPai(caminho: string): string | null {
  const regra = PAIS.find(([padrao]) => padrao.test(caminho));
  return regra ? regra[1](caminho) : null;
}
