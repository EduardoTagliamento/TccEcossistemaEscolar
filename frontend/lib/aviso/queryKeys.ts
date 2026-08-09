export const avisoKeys = {
  all: ['aviso'] as const,
  lista: (escolaGUID: string) => ['aviso', 'lista', escolaGUID] as const,
  detalhe: (guid: string) => ['aviso', 'detalhe', guid] as const,
  naoVisualizado: (escolaGUID: string) => ['aviso', 'naoVisualizado', escolaGUID] as const,
};
