// Token do painel no localStorage (validade de 8h, definida pela API).
// Risco conhecido: um script injetado (XSS) leria o token. Para o MVP é aceitável porque o React escapa
// todo conteúdo e não renderizamos HTML vindo de usuário. Produção: considerar BFF com cookie httpOnly.

import type { Papel } from "./tipos";

const CHAVE = "menuwin.token";

export interface DadosToken {
  sub: string;
  lojaId: string;
  papel: Papel;
  exp: number;
}

/** Só lê o conteúdo do JWT para a interface (papel, validade). Quem valida a assinatura é a API. */
export function lerDadosToken(token: string): DadosToken | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""),
    );
    return JSON.parse(json) as DadosToken;
  } catch {
    return null;
  }
}

export function lerToken(): string | null {
  try {
    const token = localStorage.getItem(CHAVE);
    if (!token) return null;
    const dados = lerDadosToken(token);
    if (!dados || dados.exp * 1000 <= Date.now()) {
      localStorage.removeItem(CHAVE);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function salvarToken(token: string): void {
  try {
    localStorage.setItem(CHAVE, token);
  } catch {
    // modo privado sem storage: a sessão dura só esta aba
  }
}

export function apagarToken(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}
