export const usuarioKeys = {
  all: ['usuario'] as const,
  porCPF: (cpf: string) => ['usuario', 'detalhe', cpf] as const,
};
