export const horarioTurmaKeys = {
  all: ['horarioturma'] as const,
  cronograma: (turmaGUID: string) => ['horarioturma', 'cronograma', turmaGUID] as const,
};
