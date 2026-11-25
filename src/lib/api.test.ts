import { afterEach, describe, expect, it, vi } from "vitest";
import { novaChave } from "./api";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("novaChave (Idempotency-Key)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("gera UUID v4 diferente a cada chamada", () => {
    const a = novaChave();
    expect(a).toMatch(UUID_V4);
    expect(novaChave()).not.toBe(a);
  });

  it("funciona sem crypto.randomUUID (http fora de localhost)", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: real.getRandomValues.bind(real) });
    expect(typeof crypto.randomUUID).toBe("undefined");   // garante que o teste passa pelo caminho alternativo
    const chaves = new Set(Array.from({ length: 50 }, novaChave));
    expect(chaves.size).toBe(50);
    chaves.forEach((c) => expect(c).toMatch(UUID_V4));
  });
});
