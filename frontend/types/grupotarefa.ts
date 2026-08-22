/**
 * Tipos TypeScript para o sistema de Grupos de Tarefa
 */

export interface GrupoTarefa {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioGUIDLider: string;
  GrupoNome: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface UsuarioXGrupoTarefa {
  UsuarioXGrupoTarefaGUID: string;
  GrupoTarefaGUID: string;
  UsuarioGUID: string;
  DataEntrada: string;
  CreatedAt: string;
}

export interface PermissoesGrupoTarefa {
  PodeExpulsarMembros: boolean;
  PodeAtualizarGrupo: boolean;
}

export interface MembroGrupo {
  UsuarioGUID: string;
  UsuarioNome: string;
  UsuarioEmail: string | null;
  IsLider: boolean;
  DataEntrada?: string;
  Permissoes?: PermissoesGrupoTarefa;
}

export interface GrupoTarefaComMembros {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioGUIDLider: string;
  GrupoNome: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  Membros: MembroGrupo[];
  TotalMembros: number;
  MaxPessoas: number;
  MinPessoas: number;
  MinhasPermissoes?: PermissoesGrupoTarefa | null;
}

export interface GrupoTarefaUpdateData {
  GrupoNome?: string;
}

export interface TransferirLiderancaData {
  NovoLiderGUID: string;
}
