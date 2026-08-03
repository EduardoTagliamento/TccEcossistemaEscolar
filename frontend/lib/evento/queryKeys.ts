export const eventoKeys = {
  all: ['evento'] as const,
  lista: (filtro?: { EscolaGUID?: string; EventoStatus?: string; dataInicio?: string; dataFim?: string; limit?: number; offset?: number }) =>
    ['evento', 'lista', filtro ?? {}] as const,
  detalhe: (eventoGUID: string) => ['evento', 'detalhe', eventoGUID] as const,
  anexos: (eventoGUID: string) => ['evento', 'detalhe', eventoGUID, 'anexos'] as const,
};
