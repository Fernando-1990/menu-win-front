"use client";

import { useParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiErro } from "@/lib/api";
import type { Cardapio } from "@/lib/tipos";

interface EstadoLoja {
  slug: string;
  cardapio: Cardapio | null;
  erro: string | null;
  naoEncontrada: boolean;
  recarregar: () => void;
}

const Contexto = createContext<EstadoLoja | null>(null);

/** Carrega o cardápio uma vez para todas as telas da loja (cardápio, checkout, pedido). */
export function LojaProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const [cardapio, setCardapio] = useState<Cardapio | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    api<Cardapio>(`/api/public/lojas/${encodeURIComponent(slug)}/cardapio`)
      .then((c) => {
        if (!vivo) return;
        setCardapio(c);
        setErro(null);
      })
      .catch((e: ApiErro) => {
        if (!vivo) return;
        setNaoEncontrada(e.status === 404);
        setErro(e.message);
      });
    return () => {
      vivo = false;
    };
  }, [slug, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return (
    <Contexto.Provider value={{ slug, cardapio, erro, naoEncontrada, recarregar }}>
      {/* a cor da loja vira a cor "marca" de todos os componentes abaixo */}
      <div
        className="flex flex-1 flex-col"
        style={cardapio ? ({ "--cor": cardapio.loja.corPrimaria } as React.CSSProperties) : undefined}
      >
        {children}
      </div>
    </Contexto.Provider>
  );
}

export function useLoja(): EstadoLoja {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useLoja fora do LojaProvider");
  return ctx;
}
