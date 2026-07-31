export const calendarioKeys = {
  all: ['calendario'] as const,
  lista: (filtros: { EscolaGUID: string; DataInicio: string; DataFim: string; TipoAviso?: 'tarefa' | 'prova' }) =>
    ['calendario', 'lista', filtros] as const,
};
