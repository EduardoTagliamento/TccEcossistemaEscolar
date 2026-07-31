export const grupoProjetoKeys = {
  all: ['grupoprojeto'] as const,
  porProjeto: (projetoGUID: string) => ['grupoprojeto', 'projeto', projetoGUID] as const,
  detalhe: (grupoGUID: string) => ['grupoprojeto', 'grupo', grupoGUID] as const,
};
