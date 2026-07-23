/**
 * API Client para EscolaxUsuarioxFuncao (vínculo genérico Escola × Usuário × Função)
 *
 * Usado pelas telas de Gestão de Dados que não têm um módulo dedicado
 * (Secretaria = FuncaoId 2, Coordenação = FuncaoId 1) — diferente de
 * professor.api.ts/aluno.api.ts, que criam um usuário novo (senha temporária +
 * e-mail de boas-vindas) além do vínculo. Aqui o usuário já precisa existir
 * na plataforma (ter feito /cadastro) — esta API só cria/gerencia o vínculo
 * dele com a função na escola.
 *
 * FuncaoId: 1=Coordenação 2=Secretaria 3=Professor 4=Responsável 5=Aluno 6=Direção
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export type FuncaoStatus = 'Ativo' | 'Inativo' | 'Finalizado';

export interface EscolaxUsuarioxFuncao {
  EscolaxUsuarioxFuncaoId: number;
  UsuarioCPF: string;
  UsuarioNome: string | null;
  EscolaGUID: string;
  FuncaoId: number;
  FuncaoNome: string | null;
  DataInicio: string | null;
  DataFim: string | null;
  Status: FuncaoStatus;
  CreatedAt: string;
  UpdatedAt: string;
  UltimoAcessoEm: string | null;
}

async function extrairDados(response: Response, mensagemErroPadrao: string): Promise<any> {
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || mensagemErroPadrao);
  }
  return resultado.data;
}

/** Lista vínculos, tipicamente filtrado por EscolaGUID + FuncaoId (ex.: Secretaria/Coordenação de uma escola). */
export async function listarVinculos(filtros: {
  EscolaGUID?: string;
  FuncaoId?: number;
  UsuarioCPF?: string;
}): Promise<EscolaxUsuarioxFuncao[]> {
  const params = new URLSearchParams();
  if (filtros.EscolaGUID) params.set('EscolaGUID', filtros.EscolaGUID);
  if (filtros.FuncaoId !== undefined) params.set('FuncaoId', String(filtros.FuncaoId));
  if (filtros.UsuarioCPF) params.set('UsuarioCPF', filtros.UsuarioCPF);

  const response = await fetch(`${API_URL}/escolaxusuarioxfuncao?${params.toString()}`, {
    headers: getHeaders(),
  });
  const dados = await extrairDados(response, 'Erro ao listar vínculos');
  return dados.escolaxusuarioxfuncaos;
}

/** Vincula um usuário já existente na plataforma (CPF) a uma função numa escola. */
export async function criarVinculo(dados: {
  UsuarioCPF: string;
  EscolaGUID: string;
  FuncaoId: number;
}): Promise<EscolaxUsuarioxFuncao> {
  const response = await fetch(`${API_URL}/escolaxusuarioxfuncao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ escolaxusuarioxfuncao: dados }),
  });
  const resultado = await extrairDados(response, 'Erro ao criar vínculo');
  return resultado.escolaxusuarioxfuncao;
}

/** Atualiza um vínculo (ex.: Status para 'Inativo' — usado como "remover" sem apagar histórico). */
export async function atualizarVinculo(
  escolaxUsuarioxFuncaoId: number,
  dados: Partial<Pick<EscolaxUsuarioxFuncao, 'Status' | 'DataFim'>>
): Promise<EscolaxUsuarioxFuncao> {
  const response = await fetch(`${API_URL}/escolaxusuarioxfuncao/${escolaxUsuarioxFuncaoId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ escolaxusuarioxfuncao: dados }),
  });
  const resultado = await extrairDados(response, 'Erro ao atualizar vínculo');
  return resultado.escolaxusuarioxfuncao;
}

export interface VinculoEmMassaItem {
  CPF: string;
  Nome?: string;
  Email?: string;
}

export interface VinculoBatchItemResult {
  cpf: string;
  sucesso: boolean;
  mensagem: string;
  dados?: EscolaxUsuarioxFuncao;
  contaCriada?: boolean;
  senhaTemporaria?: string;
  tipo?: 'criado' | 'duplicado' | 'erro';
}

export interface VinculoBatchCreateResponse {
  totalProcessados: number;
  criados: number;
  duplicados: number;
  erros: number;
  resultados: VinculoBatchItemResult[];
}

/**
 * Vincula em massa (via planilha) uma lista de usuários a uma função numa
 * escola. Se o CPF já existir na plataforma, só vincula; se não existir,
 * cria a conta (Nome é obrigatório nesse caso) com senha temporária e envia
 * e-mail de boas-vindas.
 */
export async function criarVinculosEmMassa(dados: {
  EscolaGUID: string;
  FuncaoId: number;
  itens: VinculoEmMassaItem[];
}): Promise<VinculoBatchCreateResponse> {
  const response = await fetch(`${API_URL}/escolaxusuarioxfuncao/em-massa`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados),
  });
  return extrairDados(response, 'Erro ao importar planilha');
}

/** Remove definitivamente o vínculo (registro). Prefira atualizarVinculo com Status='Inativo' se quiser manter histórico. */
export async function excluirVinculo(escolaxUsuarioxFuncaoId: number): Promise<void> {
  const response = await fetch(`${API_URL}/escolaxusuarioxfuncao/${escolaxUsuarioxFuncaoId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  await extrairDados(response, 'Erro ao excluir vínculo');
}
