/**
 * Tipos TypeScript para o sistema de Grupos de Tarefa
 */

export interface GrupoTarefa {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  GrupoNome: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface UsuarioXGrupoTarefa {
  UsuarioXGrupoTarefaGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPF: string;
  DataEntrada: string;
  CreatedAt: string;
}

export interface MembroGrupo {
  UsuarioCPF: string;
  UsuarioNome: string;
  UsuarioEmail: string | null;
  IsLider: boolean;
  DataEntrada?: string;
}

export interface GrupoTarefaComMembros {
  GrupoTarefaGUID: string;
  TarefaGUID: string;
  TurmaGUID: string;
  UsuarioCPFLider: string;
  GrupoNome: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  Membros: MembroGrupo[];
  TotalMembros: number;
  MaxPessoas: number;
  MinPessoas: number;
}

export interface GrupoTarefaUpdateData {
  GrupoNome?: string;
}

export interface TransferirLiderancaData {
  NovoCPFLider: string;
}
