/** Iniciais do avatar: 1ª letra do primeiro e do último nome; um nome só dá uma letra; vazio dá "". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  // Array.from separa por code point, para não partir um caractere fora do BMP (ex.: emoji) ao meio.
  const letra = (parte: string) => Array.from(parte)[0].toLocaleUpperCase();
  return letra(partes[0]) + (partes.length > 1 ? letra(partes[partes.length - 1]) : "");
}
