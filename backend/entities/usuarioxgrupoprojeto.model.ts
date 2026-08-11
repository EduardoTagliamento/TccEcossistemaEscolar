export interface UsuarioXGrupoProjeto {
  GrupoProjetoGUID: string;
  UsuarioGUID: string;
  DataEntrada: Date;
}

export interface UsuarioXGrupoProjetoCreateDTO {
  GrupoProjetoGUID: string;
  UsuarioGUID: string;
}
