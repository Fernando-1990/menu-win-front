import { describe, expect, it } from "vitest";
import { avisoLojaFechada, hojeEmBrasilia, quandoAbre, situacaoDaLoja } from "./horario";

// 2026-11-24 é uma terça. 02:30 UTC ainda é dia 23 (segunda) em Brasília (UTC-3).
const tercaDeManha = new Date("2026-11-24T12:00:00Z");

describe("horário da loja", () => {
  it("usa a data de Brasília, não a do aparelho", () => {
    expect(hojeEmBrasilia(new Date("2026-11-24T02:30:00Z"))).toBe("2026-11-23");
    expect(hojeEmBrasilia(tercaDeManha)).toBe("2026-11-24");
  });

  it("diz hoje, amanhã ou o dia da semana", () => {
    expect(quandoAbre("2026-11-24T18:00:00", tercaDeManha)).toBe("hoje às 18:00");
    expect(quandoAbre("2026-11-25T06:00:00", tercaDeManha)).toBe("amanhã às 06:00");
    expect(quandoAbre("2026-11-27T06:30:00", tercaDeManha)).toBe("sexta às 06:30");
    expect(quandoAbre("2026-11-30T06:00:00", tercaDeManha)).toBe("segunda às 06:00");
  });

  it("diferencia aberta, pausada e fora do horário", () => {
    expect(situacaoDaLoja({ aberta: true, pausada: false, abreEm: null })).toBe("Aberto agora");
    expect(situacaoDaLoja({ aberta: false, pausada: true, abreEm: null })).toBe("Pedidos pausados agora");
    expect(situacaoDaLoja({ aberta: false, pausada: false, abreEm: "2026-11-25T06:00:00" }, tercaDeManha))
      .toBe("Fechado · abre amanhã às 06:00");
    expect(avisoLojaFechada({ pausada: true, abreEm: null })).toContain("pausou");
  });
});
