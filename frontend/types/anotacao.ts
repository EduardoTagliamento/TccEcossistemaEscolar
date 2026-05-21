export interface Anotacao {
  AnotacaoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnotacaoData: string;              // ISO string
  AnotacaoTitulo: string;
  AnotacaoDescricao: string | null;
  AnotacaoIsFeito: boolean;
  AnotacaoCreatedAt: string;
  AnotacaoUpdatedAt: string;
}

export interface AnotacaoFormData {
  AnotacaoTitulo: string;
  AnotacaoDescricao: string;
  AnotacaoData: string;              // ISO string em GMT-3
}
