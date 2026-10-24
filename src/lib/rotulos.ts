import type { MetodoPagamento, StatusPagamento, StatusPedido, TipoEntrega } from "./tipos";

export const STATUS_PEDIDO: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  RECEBIDO: "Recebido",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  SAIU_PARA_ENTREGA: "Saiu para entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

export const TIPO_ENTREGA: Record<TipoEntrega, string> = {
  RETIRADA: "Retirar no balcão",
  DELIVERY: "Entrega",
  CONSUMO_LOCAL: "Comer aqui",
};

export const METODO_PAGAMENTO: Record<MetodoPagamento, string> = {
  PIX: "Pix",
  CARTAO_ONLINE: "Cartão online",
  DINHEIRO_NA_ENTREGA: "Dinheiro",
  CARTAO_NA_ENTREGA: "Cartão",
  NO_CAIXA: "Pagar no caixa",
};

export const STATUS_PAGAMENTO: Record<StatusPagamento, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Pago",
  RECUSADO: "Recusado",
  EXPIRADO: "Expirado",
  ESTORNADO: "Estornado",
};
