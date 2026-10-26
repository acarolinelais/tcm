import type { SVGProps } from "react";

import { cn } from "@/shared/lib/utils";

// Ícones das listagens exportados do Figma (TCM, nodes 2070:1476, 2310:157 e 2311:213; spec 022).
// Use no tamanho nativo do viewBox: o traço de 1px do Figma engrossa se o ícone for ampliado.
// A cor vem de `currentColor`. Todos são decorativos: o nome acessível fica no botão que os contém.
// O tamanho também vai em classe: o Button do HeroUI força `size-4` nos SVGs, e utilitário vence a camada de componentes.
type IconProps = SVGProps<SVGSVGElement>;

/** Seta do cabeçalho de coluna (filtro) e do seletor de projeto: 14px, traço 1px. */
export function ChevronDownIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[14px] w-[14px] shrink-0", className)}>
      <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Seta pequena ao lado da etiqueta de um campo editável na linha: 7×4px, traço 1px. */
export function EditableChevronIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" width="8" height="5" viewBox="-0.5 -0.5 8 5" fill="none" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[5px] w-[8px] shrink-0", className)}>
      <path d="M0 0l3.5 3.5L7 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Transferir ao backup: duas setas opostas, 7×7px, traço 1px. */
export function TransferIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" width="8" height="8" viewBox="-0.5 -0.5 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[8px] w-[8px] shrink-0", className)}>
      <path d="M7 2.625H0l2.406-2.625M0 4.375h7L4.594 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Visualizar: olho de 9×7px, traço 0.75px. */
export function EyeIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" width="10" height="8" viewBox="-0.375 -0.375 9.5 7.75" fill="none" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[8px] w-[10px] shrink-0", className)}>
      <path d="M.558 4.942C.186 4.458 0 4.118 0 3.5s.186-.958.558-1.442C1.282 1.118 2.496 0 4.375 0s3.093 1.118 3.817 2.058c.372.484.558.824.558 1.442s-.186.958-.558 1.442C7.468 5.882 6.254 7 4.375 7S1.282 5.882.558 4.942Z" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="4.375" cy="3.5" r="1.3125" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  );
}

// Centros dos seis pontos do calendário (Figma: raio 0.7035).
const PONTOS_CALENDARIO = [[4.04, 7.91], [7.56, 7.91], [11.08, 7.91], [4.04, 10.73], [7.56, 10.73], [11.08, 10.73]];

/** Calendário do botão de semana: 15×15px, preenchido. */
export function CalendarIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 15.125 14.773" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[15px] w-[15px] shrink-0", className)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M4.04506 0C4.33645 0 4.57267 0.236224 4.57267 0.527616L4.57267 1.06418C5.03838 1.05523 5.55146 1.05523 6.11575 1.05523L9.00915 1.05523C9.57349 1.05523 10.0866 1.05523 10.5523 1.06418L10.5523 0.527616C10.5523 0.236224 10.7886 0 11.0799 0C11.3713 0 11.6076 0.236224 11.6076 0.527616L11.6076 1.10946C11.7904 1.12341 11.9636 1.14093 12.1274 1.16296C12.9522 1.27385 13.6198 1.50749 14.1463 2.03395C14.6727 2.56042 14.9064 3.22799 15.0173 4.05278C15.125 4.8542 15.125 5.87821 15.125 7.17101L15.125 8.65741C15.125 9.95021 15.125 10.9743 15.0173 11.7757C14.9064 12.6005 14.6727 13.2681 14.1463 13.7946C13.6198 14.321 12.9522 14.5546 12.1274 14.6656C11.326 14.7733 10.302 14.7733 9.00922 14.7733L6.11584 14.7733C4.82301 14.7733 3.79896 14.7733 2.99755 14.6656C2.17277 14.5546 1.50519 14.321 0.978721 13.7946C0.452259 13.2681 0.218616 12.6005 0.107732 11.7757C-2.08293e-05 10.9743 -1.37509e-05 9.95028 3.18822e-07 8.65741L3.18822e-07 7.17108C-1.37509e-05 5.87821 -2.08293e-05 4.8542 0.107732 4.05278C0.218616 3.22799 0.452259 2.56042 0.978721 2.03395C1.50519 1.50749 2.17277 1.27385 2.99755 1.16296C3.16141 1.14093 3.33458 1.12341 3.51744 1.10946L3.51744 0.527616C3.51744 0.236224 3.75367 0 4.04506 0ZM3.13816 2.20878C2.43038 2.30394 2.02261 2.48239 1.72488 2.78012C1.42716 3.07784 1.24871 3.48562 1.15355 4.19339C1.13744 4.31325 1.12396 4.43944 1.11269 4.57267L14.0123 4.57267C14.001 4.43944 13.9875 4.31326 13.9714 4.19339C13.8763 3.48562 13.6978 3.07784 13.4001 2.78012C13.1024 2.48239 12.6946 2.30394 11.9869 2.20878C11.2639 2.11158 10.3109 2.11047 8.96948 2.11047L6.15552 2.11047C4.8141 2.11047 3.8611 2.11158 3.13816 2.20878ZM1.05523 7.21076C1.05523 6.60998 1.05546 6.08707 1.06444 5.62791L14.0606 5.62791C14.0696 6.08707 14.0698 6.60998 14.0698 7.21076L14.0698 8.61773C14.0698 9.95914 14.0686 10.9122 13.9714 11.6351C13.8763 12.3428 13.6978 12.7507 13.4001 13.0484C13.1024 13.3461 12.6946 13.5246 11.9869 13.6197C11.2639 13.7169 10.3109 13.718 8.96948 13.718L6.15552 13.718C4.8141 13.718 3.8611 13.7169 3.13816 13.6197C2.43038 13.5246 2.02261 13.3461 1.72488 13.0484C1.42716 12.7507 1.24871 12.3428 1.15355 11.6351C1.05635 10.9122 1.05523 9.95914 1.05523 8.61773L1.05523 7.21076Z" />
      {PONTOS_CALENDARIO.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.7035" />)}
    </svg>
  );
}

/** Caixa de entrada do estado vazio de Projects: 36×26px, preenchido. */
export function InboxIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" width="36" height="26" viewBox="0 0 35.594 25.756" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[26px] w-[36px] shrink-0", className)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M4.73779 25.756L30.856 25.756C34.0094 25.756 35.5938 24.1868 35.5938 21.0786L35.5938 12.1462C35.5938 10.7882 35.3975 10.1092 34.7338 9.27942L29.513 2.8366C27.7476 0.663924 26.9631 0 24.2924 0L11.3013 0C8.63063 0 7.846 0.663924 6.08064 2.8366L0.860018 9.27942C0.196158 10.1092 0 10.7882 0 12.1462L0 21.0786C0 24.2018 1.59939 25.756 4.73779 25.756ZM17.7893 16.1145C15.6618 16.1145 14.2888 14.2586 14.2888 12.5083L14.2888 12.4631C14.2888 11.8293 13.9116 11.2409 13.1421 11.2409L3.18366 11.2409C2.68576 11.2409 2.58012 10.8034 2.83666 10.4865L8.43447 3.42507C9.18884 2.4896 10.0338 2.11242 11.1353 2.11242L24.4584 2.11242C25.5598 2.11242 26.4048 2.4896 27.1593 3.42507L32.757 10.4865C33.0135 10.8034 32.9078 11.2409 32.41 11.2409L22.4516 11.2409C21.6821 11.2409 21.3049 11.8293 21.3049 12.4631L21.3049 12.5083C21.3049 14.2586 19.9318 16.1145 17.7893 16.1145ZM4.78305 23.3268C3.27417 23.3268 2.42922 22.5271 2.42922 20.9579L2.42922 13.4438L11.9953 13.4438C12.3725 16.2653 14.7263 18.3476 17.7893 18.3476C20.8522 18.3476 23.2211 16.2503 23.5832 13.4438L33.1643 13.4438L33.1643 20.9579C33.1643 22.5271 32.3043 23.3268 30.8106 23.3268L4.78305 23.3268Z" />
    </svg>
  );
}

/** Seta de "Anterior" e "Próxima" da paginação: 6×9px, preenchida. `direcao` gira o mesmo desenho. */
export function PageChevronIcon({ direcao, className, ...props }: IconProps & { direcao: "anterior" | "proxima" }) {
  return (
    <svg aria-hidden="true" width="6" height="9" viewBox="0 0 6 9" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[9px] w-[6px] shrink-0", className)}>
      <path transform={direcao === "anterior" ? "rotate(90 3 4.5) translate(-1.5 1.5)" : "rotate(-90 3 4.5) translate(-1.5 1.5)"} d="M4.5 3.818L8 0l1 1.091L4.5 6 0 1.091 1 0l3.5 3.818Z" />
    </svg>
  );
}

/** Seta do botão de semana: 13×13px, preenchida. */
export function SmallChevronIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" width="13" height="13" viewBox="0 0 13 13" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[13px] w-[13px] shrink-0", className)}>
      <path d="M6.5 7.134l2.681-2.681.766.766L6.5 8.667 3.053 5.219l.766-.766L6.5 7.134Z" />
    </svg>
  );
}
