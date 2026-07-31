export const pendenciaKeys = {
  all: ['pendencia'] as const,
  lista: (filtro?: { EscolaGUID?: string; PendenciaFeito?: boolean; atrasadas?: boolean; limit?: number; offset?: number }) =>
    ['pendencia', 'lista', filtro ?? {}] as const,
  detalhe: (pendenciaGUID: string) => ['pendencia', 'detalhe', pendenciaGUID] as const,
  anexos: (pendenciaGUID: string) => ['pendencia', 'detalhe', pendenciaGUID, 'anexos'] as const,
  contador: (escolaGUID?: string) => ['pendencia', 'contador', escolaGUID ?? ''] as const,
};
