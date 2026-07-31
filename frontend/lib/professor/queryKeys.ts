export const professorKeys = {
  all: ['professor'] as const,
  lista: (escolaGUID: string) => ['professor', 'lista', escolaGUID] as const,
  alocacoes: (cpf: string, escolaGUID: string) => ['professor', 'alocacoes', cpf, escolaGUID] as const,
};
