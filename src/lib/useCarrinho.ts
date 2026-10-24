"use client";

// Carrinho por loja no localStorage. useSyncExternalStore: no servidor o carrinho é vazio e no navegador
// é o salvo, sem erro de hidratação; outras abas da mesma loja ficam sincronizadas.

import { useCallback, useSyncExternalStore } from "react";
import { adicionar, mudarQuantidade, type ItemCarrinho } from "./carrinho";

const VAZIO: ItemCarrinho[] = [];
const cache = new Map<string, ItemCarrinho[]>();
const ouvintes = new Set<() => void>();

const chave = (slug: string) => `menuwin.carrinho.${slug}`;

function ler(slug: string): ItemCarrinho[] {
  if (!cache.has(slug)) {
    try {
      cache.set(slug, JSON.parse(localStorage.getItem(chave(slug)) ?? "[]"));
    } catch {
      cache.set(slug, VAZIO);
    }
  }
  return cache.get(slug)!;
}

function gravar(slug: string, itens: ItemCarrinho[]) {
  cache.set(slug, itens);
  try {
    localStorage.setItem(chave(slug), JSON.stringify(itens));
  } catch {
    // sem storage: o carrinho vive só nesta aba
  }
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  const outraAba = (e: StorageEvent) => {
    if (e.key?.startsWith("menuwin.carrinho.")) {
      cache.clear();
      avisar();
    }
  };
  window.addEventListener("storage", outraAba);
  return () => {
    ouvintes.delete(avisar);
    window.removeEventListener("storage", outraAba);
  };
}

export function useCarrinho(slug: string) {
  const itens = useSyncExternalStore(assinar, () => ler(slug), () => VAZIO);
  return {
    itens,
    adicionar: useCallback((item: ItemCarrinho) => gravar(slug, adicionar(ler(slug), item)), [slug]),
    mudarQuantidade: useCallback((c: string, q: number) => gravar(slug, mudarQuantidade(ler(slug), c, q)), [slug]),
    limpar: useCallback(() => gravar(slug, VAZIO), [slug]),
  };
}
