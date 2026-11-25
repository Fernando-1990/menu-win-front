import type { Horario, LojaInfo } from "./tipos";

/** 1 = segunda ... 7 = domingo, como na API (java.time.DayOfWeek). */
export const DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"] as const;

/** Data de hoje ("2026-11-24") no horário de Brasília, que é o fuso das lojas na API. */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/** "hoje às 06:00", "amanhã às 06:00" ou "sexta às 06:00". abreEm vem da API sem fuso, já em Brasília. */
export function quandoAbre(abreEm: string, agora: Date = new Date()): string {
  const [data, hora] = abreEm.split("T");
  const hhmm = hora.slice(0, 5);
  const dias = Math.round((Date.parse(data) - Date.parse(hojeEmBrasilia(agora))) / 86_400_000);
  if (dias <= 0) return `hoje às ${hhmm}`;
  if (dias === 1) return `amanhã às ${hhmm}`;
  const diaSemana = (new Date(`${data}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = segunda
  return `${DIAS[diaSemana]} às ${hhmm}`;
}

/** Texto curto para o topo do cardápio. */
export function situacaoDaLoja(loja: Pick<LojaInfo, "aberta" | "pausada" | "abreEm">, agora?: Date): string {
  if (loja.aberta) return "Aberto agora";
  if (loja.pausada) return "Pedidos pausados agora";
  return loja.abreEm ? `Fechado · abre ${quandoAbre(loja.abreEm, agora)}` : "Fechado agora";
}

/** Aviso para quem tenta pedir com a loja fechada. */
export function avisoLojaFechada(loja: Pick<LojaInfo, "pausada" | "abreEm">, agora?: Date): string {
  if (loja.pausada) return "A loja pausou os pedidos por alguns instantes. Você pode ver o cardápio; tente pedir daqui a pouco.";
  return loja.abreEm
    ? `A loja está fechada agora e abre ${quandoAbre(loja.abreEm, agora)}. Você pode ver o cardápio, mas ainda não dá para pedir.`
    : "A loja está fechada agora. Você pode ver o cardápio, mas ainda não dá para pedir.";
}

/** Ordena como a API (dia, depois hora de abrir) para comparar e mostrar. */
export function ordenar(horarios: Horario[]): Horario[] {
  return [...horarios].sort((a, b) => a.diaSemana - b.diaSemana || a.abre.localeCompare(b.abre));
}
