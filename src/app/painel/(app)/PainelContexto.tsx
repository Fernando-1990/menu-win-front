"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Carregando } from "@/components/Mensagem";
import { api, ApiErro } from "@/lib/api";
import { apagarToken, lerDadosToken, lerToken } from "@/lib/sessao";
import type { Papel, Sessao } from "@/lib/tipos";
import { useNoCliente } from "@/lib/useNoCliente";

type Chamar = <T>(caminho: string, opcoes?: { metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; corpo?: unknown }) => Promise<T>;

interface EstadoPainel {
  token: string;
  papel: Papel;
  sessao: Sessao | null;
  /** api() com o token; 401 = sessão expirada: volta para o login. */
  chamar: Chamar;
  sair: () => void;
}

const Contexto = createContext<EstadoPainel | null>(null);

export function PainelProvider({ children }: { children: ReactNode }) {
  const noCliente = useNoCliente();
  const router = useRouter();
  const token = noCliente ? lerToken() : null;
  const [sessao, setSessao] = useState<Sessao | null>(null);

  const sair = useCallback(() => {
    apagarToken();
    router.replace("/painel/login");
  }, [router]);

  const chamar: Chamar = useCallback(
    async (caminho, opcoes = {}) => {
      try {
        return await api(caminho, { ...opcoes, token });
      } catch (e) {
        if (e instanceof ApiErro && e.status === 401) sair();
        throw e;
      }
    },
    [token, sair],
  );

  useEffect(() => {
    if (!noCliente) return;
    if (!token) {
      router.replace("/painel/login");
      return;
    }
    let vivo = true;
    chamar<Sessao>("/api/painel/me").then((s) => vivo && setSessao(s)).catch(() => {});
    return () => {
      vivo = false;
    };
  }, [noCliente, token, router, chamar]);

  if (!token) return <Carregando />;
  const papel = lerDadosToken(token)!.papel;

  return <Contexto.Provider value={{ token, papel, sessao, chamar, sair }}>{children}</Contexto.Provider>;
}

export function usePainel(): EstadoPainel {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("usePainel fora do PainelProvider");
  return ctx;
}
