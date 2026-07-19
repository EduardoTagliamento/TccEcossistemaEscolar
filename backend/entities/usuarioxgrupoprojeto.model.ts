export interface UsuarioXGrupoProjeto {
  GrupoProjetoGUID: string;
  UsuarioCPF: string;
  DataEntrada: Date;
}

export interface UsuarioXGrupoProjetoCreateDTO {
  GrupoProjetoGUID: string;
  UsuarioCPF: string;
}
