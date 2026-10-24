// Contas sempre em centavos inteiros: 0.1 + 0.2 em reais daria 0.30000000000000004.

export function centavos(reais: number): number {
  return Math.round(reais * 100);
}

/** Formato que a API aceita em BigDecimal: "19.00". */
export function paraApi(cents: number): string {
  return (cents / 100).toFixed(2);
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatar(cents: number): string {
  return BRL.format(cents / 100);
}

/** "12,50" ou "12.50" → 1250. Vazio ou inválido → null. */
export function lerReais(texto: string): number | null {
  const limpo = texto.trim().replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return centavos(Number(limpo));
}
