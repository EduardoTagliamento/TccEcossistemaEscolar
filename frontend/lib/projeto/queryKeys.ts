export const projetoKeys = {
  all: ['projeto'] as const,
  lista: (escolaGUID: string) => ['projeto', 'lista', escolaGUID] as const,
  detalhe: (projetoGUID: string) => ['projeto', 'detalhe', projetoGUID] as const,
};
