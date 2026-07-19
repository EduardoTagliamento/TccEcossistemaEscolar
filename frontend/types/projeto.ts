/**
 * Tipos TypeScript para o módulo Projetos
 */

export type ProjetoPublicoAlvo = 'Escola' | 'Turmas';
export type ProjetoStatus = 'Aberto' | 'Encerrado';
export type GrupoProjetoVisibilidade = 'Aberto' | 'Fechado';
export type ConviteTipo = 'Convite' | 'Solicitacao';
export type ConviteStatus = 'Pendente' | 'Aceito' | 'Recusado';

export interface Projeto {
  ProjetoGUID: string;
  EscolaGUID: string;
  UsuarioCPFCriador: string;
  NomeCriador?: string;
  ProjetoTitulo: string;
  ProjetoDescricao: string;
  ProjetoMecanicaPontuacao: string | null;
  ProjetoPublicoAlvo: ProjetoPublicoAlvo;
  TurmasGUID?: string[];
  ProjetoGrupoMinPessoas: number;
  ProjetoGrupoMaxPessoas: number;
  ProjetoInscricaoPrazoData: string;
  ProjetoEntregaPrazoData: string | null;
  ProjetoStatus: ProjetoStatus;
  TotalGrupos?: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ProjetoCreateDTO {
  EscolaGUID: string;
  ProjetoTitulo: string;
  ProjetoDescricao: string;
  ProjetoMecanicaPontuacao?: string;
  ProjetoPublicoAlvo: ProjetoPublicoAlvo;
  TurmasGUID?: string[];
  ProjetoGrupoMinPessoas: number;
  ProjetoGrupoMaxPessoas: number;
  ProjetoInscricaoPrazoData: string;
  ProjetoEntregaPrazoData?: string;
}

export interface ProjetoUpdateDTO {
  ProjetoTitulo?: string;
  ProjetoDescricao?: string;
  ProjetoMecanicaPontuacao?: string | null;
  ProjetoGrupoMinPessoas?: number;
  ProjetoGrupoMaxPessoas?: number;
  ProjetoInscricaoPrazoData?: string;
  ProjetoEntregaPrazoData?: string | null;
}

export interface MembroGrupoProjeto {
  UsuarioCPF: string;
  UsuarioNome: string;
  DataEntrada: string;
  IsLider: boolean;
}

export interface GrupoProjeto {
  GrupoProjetoGUID: string;
  ProjetoGUID: string;
  UsuarioCPFLider: string;
  NomeLider: string;
  GrupoProjetoNome: string | null;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
  GrupoProjetoPontuacao: number | null;
  Membros: MembroGrupoProjeto[];
  TotalMembros: number;
  LimiteMaximo: number;
  PodeEntrar: boolean;
  CreatedAt: string;
}

export interface GrupoProjetoCreateDTO {
  ProjetoGUID: string;
  GrupoProjetoNome?: string;
  GrupoProjetoProposta: string;
  GrupoProjetoVisibilidade: GrupoProjetoVisibilidade;
}

export interface ConviteGrupoProjeto {
  ConviteGUID: string;
  GrupoProjetoGUID: string;
  GrupoProjetoNome: string | null;
  LiderCPF: string;
  LiderNome: string;
  UsuarioCPFConvidado: string;
  NomeConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  ProjetoTitulo: string;
  ProjetoInscricaoPrazoData: string;
  TotalMembros: number;
  MaxPessoas: number;
  CreatedAt: string;
}
