/**
 * API client do fluxo público e temporário de ativação de conta pra feira
 * técnica do Colégio Univap — ver docs/SPEC_FEIRA_TECNICA_UNIVAP_2026.md.
 * Sem autenticação (rota pública) — não usa token.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface TurmaFeira {
  TurmaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  CursoNome: string | null;
}

export interface PessoaFeira {
  UsuarioGUID: string;
  UsuarioNome: string;
  jaAtivada: boolean;
}

export interface AtivarDTO {
  UsuarioGUID: string;
  telefone: string;
  email?: string;
  matricula?: string;
}

export interface AtivarResultado {
  UsuarioNome: string;
  credenciaisEnviadasPorWhatsapp: boolean;
  credenciaisEnviadasPorEmail: boolean;
}

async function tratarResposta<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || 'Erro ao comunicar com o servidor');
  }
  return body.data;
}

export async function listarTurmas(ano: '1' | '2' | '3'): Promise<TurmaFeira[]> {
  const response = await fetch(`${API_URL}/feira-univap/turmas?ano=${ano}`);
  const data = await tratarResposta<{ turmas: TurmaFeira[] }>(response);
  return data.turmas;
}

export async function listarPessoas(turmaGUID: string): Promise<PessoaFeira[]> {
  const response = await fetch(`${API_URL}/feira-univap/pessoas?turmaGUID=${turmaGUID}`);
  const data = await tratarResposta<{ pessoas: PessoaFeira[] }>(response);
  return data.pessoas;
}

export async function ativar(dados: AtivarDTO): Promise<AtivarResultado> {
  const response = await fetch(`${API_URL}/feira-univap/ativar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  return tratarResposta<AtivarResultado>(response);
}
