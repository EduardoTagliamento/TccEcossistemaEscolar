export const categoriaConteudoKeys = {
  all: ['categoriaconteudo'] as const,
  lista: (filtro?: { MateriaGUID?: string; TurmaGUID?: string }) => ['categoriaconteudo', 'lista', filtro ?? {}] as const,
  boardGeral: (materiaGUID: string) => ['categoriaconteudo', 'boardGeral', materiaGUID] as const,
  pendenciaAgregada: (ehProfessor: boolean) => ['categoriaconteudo', 'pendenciaAgregada', ehProfessor] as const,
};
