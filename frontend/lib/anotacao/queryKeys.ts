export const anotacaoKeys = {
  all: ['anotacao'] as const,
  porPeriodo: (escolaGUID: string, dataInicio: string, dataFim: string) =>
    ['anotacao', 'porPeriodo', escolaGUID, dataInicio, dataFim] as const,
  lista: (escolaGUID: string, isFeito?: boolean) => ['anotacao', 'lista', escolaGUID, isFeito ?? null] as const,
  estatisticas: (escolaGUID: string) => ['anotacao', 'estatisticas', escolaGUID] as const,
};
