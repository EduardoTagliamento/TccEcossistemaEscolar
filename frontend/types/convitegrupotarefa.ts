/**
 * Tipos TypeScript para o sistema de Convites de Grupo de Tarefa
 */

export type ConviteTipo = 'Convite' | 'Solicitacao';
export type ConviteStatus = 'Pendente' | 'Aceito' | 'Recusado' | 'Expirado';

export interface ConviteGrupoTarefa {
  ConviteGUID: string;
  GrupoTarefaGUID: string;
  UsuarioCPFConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ConvitePendente extends ConviteGrupoTarefa {
  GrupoNome: string | null;
  LiderNome: string;
  LiderCPF: string;
  TarefaTitulo: string;
  TarefaPrazoData: string;
  TotalMembros: number;
  MaxPessoas: number;
}

export interface EnviarConviteData {
  UsuarioCPFConvidado: string;
}

export interface SolicitarEntradaData {
  // Corpo vazio - CPF vem do token
}
