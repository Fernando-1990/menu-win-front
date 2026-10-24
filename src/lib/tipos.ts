// Espelho dos DTOs da API (menu-win). Valores em dinheiro chegam como número em reais (ex.: 18.5).

export type Layout = "LISTA" | "GRADE" | "DESTAQUE" | "ESCURO";
export type TipoEntrega = "RETIRADA" | "DELIVERY" | "CONSUMO_LOCAL";
export type MetodoPagamento = "PIX" | "CARTAO_ONLINE" | "DINHEIRO_NA_ENTREGA" | "CARTAO_NA_ENTREGA" | "NO_CAIXA";
export type StatusPedido =
  | "AGUARDANDO_PAGAMENTO" | "RECEBIDO" | "EM_PREPARO" | "PRONTO" | "SAIU_PARA_ENTREGA" | "ENTREGUE" | "CANCELADO";
export type StatusPagamento = "PENDENTE" | "APROVADO" | "RECUSADO" | "EXPIRADO" | "ESTORNADO";
export type Papel = "DONO" | "GERENTE" | "COZINHA";

// ---------------------------------------------------------------- cardápio público

export interface Cardapio {
  loja: LojaInfo;
  categorias: CategoriaPublica[];
}

export interface LojaInfo {
  nome: string;
  logoUrl: string | null;
  capaUrl: string | null;
  corPrimaria: string;
  layout: Layout;
  aberta: boolean;
  aceitaRetirada: boolean;
  aceitaDelivery: boolean;
  aceitaConsumoLocal: boolean;
  aceitaPix: boolean;
  aceitaPagarNoCaixa: boolean;
  taxaEntrega: number;
  pedidoMinimo: number;
}

export interface CategoriaPublica {
  id: string;
  nome: string;
  produtos: ProdutoPublico[];
}

export interface ProdutoPublico {
  id: string;
  nome: string;
  descricao: string | null;
  fotoUrl: string | null;
  preco: number;
  precoPromocional: number | null;
  disponivel: boolean;
  grupos: GrupoPublico[];
}

/** Só opções disponíveis. Soma das quantidades escolhidas: entre minimo e maximo. */
export interface GrupoPublico {
  id: string;
  nome: string;
  minimo: number;
  maximo: number;
  opcoes: { id: string; nome: string; preco: number }[];
}

// ---------------------------------------------------------------- pedido do cliente

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep?: string;
}

export interface CriarPedido {
  tipoEntrega: TipoEntrega;
  cliente: { nome: string; telefone: string; email?: string };
  endereco?: Endereco;
  itens: { produtoId: string; quantidade: number; observacao?: string; adicionais: { opcaoId: string; quantidade: number }[] }[];
  metodoPagamento: MetodoPagamento;
  trocoPara?: string;
  observacao?: string;
  totalEsperado?: string;
}

export interface PedidoCriado {
  id: string;
  numero: number;
  status: StatusPedido;
  tipoEntrega: TipoEntrega;
  metodoPagamento: MetodoPagamento;
  subtotal: number;
  taxaEntrega: number;
  desconto: number;
  total: number;
  pix: { copiaECola: string; qrCodeBase64: string | null; expiraEm: string } | null;
}

export interface PedidoStatus {
  id: string;
  numero: number;
  status: StatusPedido;
  total: number;
  metodoPagamento: MetodoPagamento;
  statusPagamento: StatusPagamento;
  pixCopiaECola: string | null;
  pixExpiraEm: string | null;
  motivoCancelamento: string | null;
}

// ---------------------------------------------------------------- painel

export interface Sessao {
  usuarioId: string;
  nome: string;
  email: string;
  papel: Papel;
  lojaId: string;
  lojaNome: string;
  lojaSlug: string;
}

export interface PedidoCozinha {
  id: string;
  numero: number;
  status: StatusPedido;
  tipoEntrega: TipoEntrega;
  criadoEm: string;
  clienteNome: string | null;
  clienteTelefone: string | null;
  endereco: Endereco | null;
  observacao: string | null;
  total: number;
  metodoPagamento: MetodoPagamento | null;
  statusPagamento: StatusPagamento | null;
  trocoPara: number | null;
  pagamentoPendenteNoBalcao: boolean;
  motivoCancelamento: string | null;
  itens: { nome: string; quantidade: number; observacao: string | null; adicionais: string[] }[];
}

export interface CategoriaPainel {
  id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
}

export interface ProdutoPainel {
  id: string;
  categoriaId: string;
  nome: string;
  descricao: string | null;
  fotoUrl: string | null;
  preco: number;
  precoPromocional: number | null;
  ordem: number;
  disponivel: boolean;
  grupoIds: string[];
}

export interface GrupoPainel {
  id: string;
  nome: string;
  minimo: number;
  maximo: number;
  opcoes: { id: string; nome: string; preco: number; disponivel: boolean; ordem: number }[];
}

export interface Operacao {
  aceitaRetirada: boolean;
  aceitaDelivery: boolean;
  aceitaConsumoLocal: boolean;
  aceitaPagarNoCaixa: boolean;
  taxaEntregaPadrao: number;
  pedidoMinimo: number;
  tempoPreparoMin: number;
}
