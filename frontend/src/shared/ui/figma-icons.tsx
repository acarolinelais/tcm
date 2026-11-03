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

/** Ícone de idioma do seletor (Figma TCM 2191:208), 19px. Inline para a cor seguir o tema por `currentColor`. */
export function LanguageIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("shrink-0", className)}>
      <path d="M19 5.54167V7.125C19 7.562 18.6453 7.91667 18.2083 7.91667C17.7713 7.91667 17.4167 7.562 17.4167 7.125V5.54167C17.4167 4.66846 16.7065 3.95833 15.8333 3.95833H14.227L15.2166 4.99304C15.5198 5.30813 15.5103 5.80925 15.1945 6.11246C15.0409 6.2605 14.8438 6.33333 14.6458 6.33333C14.4384 6.33333 14.231 6.25179 14.075 6.09029L12.3239 4.26867C11.7214 3.66621 11.7214 2.66713 12.3342 2.05358L14.075 0.243042C14.3783 -0.0720417 14.8802 -0.0815417 15.1945 0.220875C15.5095 0.524083 15.5198 1.02521 15.2166 1.34029L14.2215 2.375H15.8333C17.5798 2.375 19 3.79525 19 5.54167ZM4.92496 12.9097C4.62175 12.5946 4.12063 12.5859 3.80554 12.8883C3.49046 13.1915 3.48017 13.6927 3.78338 14.0078L4.77296 15.0425H3.16667C2.29346 15.0425 1.58333 14.3323 1.58333 13.4591V11.8758C1.58333 11.438 1.22867 11.0841 0.791667 11.0841C0.354667 11.0841 0 11.438 0 11.8758V13.4591C0 15.2055 1.42025 16.6258 3.16667 16.6258H4.77771L3.78338 17.6605C3.48017 17.9756 3.48967 18.4767 3.80554 18.7799C3.95913 18.928 4.15625 19.0008 4.35417 19.0008C4.56158 19.0008 4.769 18.9193 4.92496 18.7578L6.66583 16.9464C7.27779 16.3337 7.27779 15.3346 6.67613 14.7313L4.92496 12.9097ZM9.5 6.33333C9.5 8.08213 8.08213 9.5 6.33333 9.5H3.16667C1.41787 9.5 0 8.08213 0 6.33333V3.16667C0 1.41787 1.41787 0 3.16667 0H6.33333C8.08213 0 9.5 1.41787 9.5 3.16667V6.33333ZM7.52083 2.86267C7.52083 2.5935 7.30233 2.375 7.03317 2.375H5.24638V2.071C5.24638 1.80183 5.02788 1.58333 4.75871 1.58333H4.74208C4.47292 1.58333 4.25442 1.80183 4.25442 2.071V2.375H2.46683C2.19767 2.375 1.97917 2.5935 1.97917 2.86267V2.87929C1.97917 3.14846 2.19767 3.36696 2.46683 3.36696H5.7855C5.69763 4.12933 5.40233 5.06983 4.75396 5.79817C4.53546 5.55275 4.35258 5.28517 4.20613 5.0065C4.12221 4.84658 3.95438 4.74921 3.77467 4.74921C3.40733 4.74921 3.16588 5.13871 3.33688 5.46408C3.515 5.8045 3.7335 6.13146 3.99396 6.42992C3.56725 6.68958 3.05267 6.87246 2.42883 6.93263C2.1755 6.95717 1.97917 7.16458 1.97917 7.41871V7.43533C1.97917 7.72429 2.22933 7.94833 2.51671 7.92142C3.42396 7.83671 4.16258 7.53746 4.75871 7.11233C5.35167 7.53429 6.08158 7.83512 6.98171 7.92142C7.26988 7.94912 7.52004 7.72508 7.52004 7.43612V7.4195C7.52004 7.16933 7.33004 6.95796 7.08067 6.93421C6.45367 6.87483 5.93908 6.68879 5.51 6.42833C6.29375 5.52979 6.68563 4.37713 6.78221 3.36775H7.03238C7.30154 3.36775 7.52004 3.14925 7.52004 2.88008V2.86346L7.52083 2.86267ZM19 12.6667V15.8333C19 17.5821 17.5821 19 15.8333 19H12.6667C10.9179 19 9.5 17.5821 9.5 15.8333V12.6667C9.5 10.9179 10.9179 9.5 12.6667 9.5H15.8333C17.5821 9.5 19 10.9179 19 12.6667ZM16.4698 16.739L15.3908 12.0302C15.3061 11.6628 15.0718 11.3288 14.7242 11.1831C13.9967 10.8783 13.2557 11.3058 13.0965 11.9914L11.9779 16.7358C11.8956 17.0834 12.16 17.4167 12.517 17.4167C12.7735 17.4167 12.9968 17.2401 13.0562 16.99L13.2731 16.0708H15.1802L15.39 16.9868C15.4478 17.2385 15.6718 17.4167 15.9299 17.4167H15.9315C16.287 17.4167 16.5506 17.0858 16.4714 16.739H16.4698ZM14.2389 12.1917C14.2088 12.1917 14.1827 12.2123 14.1764 12.2415L13.5343 14.9625H14.9253L14.3022 12.2415C14.2951 12.2123 14.269 12.1917 14.2389 12.1917Z" fill="currentColor" />
    </svg>
  );
}

/** Olho do campo de senha (Figma TCM 2191:99), 13×11px, traço de 1.0297px na cor do texto. */
export function PasswordEyeIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 13 11" fill="none" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("shrink-0", className)}>
      <path d="M0.514851 6.5C0.514851 3.1945 3.1945 0.514851 6.5 0.514851C9.80553 0.514851 12.4851 3.1945 12.4851 6.5M9.82508 6.5C9.82508 8.33638 8.33638 9.82508 6.5 9.82508C4.66361 9.82508 3.17492 8.33638 3.17492 6.5C3.17492 4.66362 4.66361 3.17492 6.5 3.17492C8.33638 3.17492 9.82508 4.66362 9.82508 6.5Z" stroke="currentColor" strokeWidth={1.0297} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Três linhas decrescentes do botão Filter (Figma TCM 2550:4207): 15×10px, preenchido. */
export function FilterIcon({ className, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" width="15" height="10" viewBox="0 0 15 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props} className={cn("m-0 h-[10px] w-[15px] shrink-0", className)}>
      <path fillRule="evenodd" clipRule="evenodd" d="M0 0.805556C0 0.360663 0.360663 0 0.805556 0H13.6944C14.1394 0 14.5 0.360663 14.5 0.805556C14.5 1.25045 14.1394 1.61111 13.6944 1.61111H0.805556C0.360663 1.61111 0 1.25045 0 0.805556ZM2.41667 4.83333C2.41667 4.38843 2.77733 4.02778 3.22222 4.02778H11.2778C11.7227 4.02778 12.0833 4.38843 12.0833 4.83333C12.0833 5.27824 11.7227 5.63889 11.2778 5.63889H3.22222C2.77733 5.63889 2.41667 5.27824 2.41667 4.83333ZM4.83333 8.86111C4.83333 8.4162 5.194 8.05556 5.63889 8.05556H8.86111C9.30602 8.05556 9.66667 8.4162 9.66667 8.86111C9.66667 9.30602 9.30602 9.66667 8.86111 9.66667H5.63889C5.194 9.66667 4.83333 9.30602 4.83333 8.86111Z" />
    </svg>
  );
}
