// Cliente da API menu-win. Erros viram ApiErro com a mensagem do ProblemDetail ("detail") da API,
// que já vem pronta para mostrar ao usuário.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiErro extends Error {
  constructor(public readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

interface Opcoes {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  corpo?: unknown;
  token?: string | null;
  /** Reenvio com a mesma chave não repete a operação (a API devolve o resultado da primeira). */
  chaveIdempotencia?: string;
}

export async function api<T>(caminho: string, { metodo = "GET", corpo, token, chaveIdempotencia }: Opcoes = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (chaveIdempotencia) headers["Idempotency-Key"] = chaveIdempotencia;

  let resposta: Response;
  try {
    resposta = await fetch(API_URL + caminho, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      cache: "no-store",
    });
  } catch {
    throw new ApiErro(0, "Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }

  if (!resposta.ok) {
    let detalhe: string | undefined;
    try {
      detalhe = (await resposta.json()).detail;
    } catch {
      // corpo vazio ou não-JSON: usa a mensagem padrão
    }
    throw new ApiErro(resposta.status, detalhe ?? mensagemPadrao(resposta.status));
  }
  const texto = await resposta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

/**
 * UUID v4 para o Idempotency-Key. crypto.randomUUID só existe em contexto seguro (https/localhost);
 * testando pelo celular em http://192.168..., cai no getRandomValues.
 */
export function novaChave(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function mensagemPadrao(status: number): string {
  if (status === 401) return "Sua sessão expirou. Entre de novo.";
  if (status === 403) return "Você não tem permissão para isso.";
  if (status === 404) return "Não encontrado.";
  if (status === 429) return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  if (status >= 500) return "O servidor teve um problema. Tente de novo em instantes.";
  return "Não foi possível concluir. Confira os dados e tente de novo.";
}
