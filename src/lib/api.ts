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
}

export async function api<T>(caminho: string, { metodo = "GET", corpo, token }: Opcoes = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

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

function mensagemPadrao(status: number): string {
  if (status === 401) return "Sua sessão expirou. Entre de novo.";
  if (status === 403) return "Você não tem permissão para isso.";
  if (status === 404) return "Não encontrado.";
  if (status >= 500) return "O servidor teve um problema. Tente de novo em instantes.";
  return "Não foi possível concluir. Confira os dados e tente de novo.";
}
