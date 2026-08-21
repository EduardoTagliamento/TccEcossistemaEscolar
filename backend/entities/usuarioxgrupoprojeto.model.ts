export interface UsuarioXGrupoProjeto {
  GrupoProjetoGUID: string;
  UsuarioGUID: string;
  DataEntrada: Date;
  MembroPermissoes: Record<string, boolean> | null;
}

export interface UsuarioXGrupoProjetoCreateDTO {
  GrupoProjetoGUID: string;
  UsuarioGUID: string;
}
