/**
 * API Client para Categorias de Conteúdo
 * Pessoais de cada professor, por matéria (ex: "Cinemática" em Física).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface CategoriaConteudo {
  CategoriaGUID: string;
  UsuarioCPF: string;
  MateriaGUID: string;
  TurmaGUID: string;
  CategoriaNome: string;
  Ordem: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export async function criarCategoria(materiaGUID: string, turmaGUID: string, categoriaNome: string): Promise<CategoriaConteudo> {
  const response = await fetch(`${API_URL}/categoria-conteudo`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ categoria: { MateriaGUID: materiaGUID, TurmaGUID: turmaGUID, CategoriaNome: categoriaNome } }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar categoria');
  }
  return result.data.categoria;
}

export async function listarCategorias(filters?: { MateriaGUID?: string; TurmaGUID?: string }): Promise<CategoriaConteudo[]> {
  const params = new URLSearchParams();
  if (filters?.MateriaGUID) params.append('MateriaGUID', filters.MateriaGUID);
  if (filters?.TurmaGUID) params.append('TurmaGUID', filters.TurmaGUID);

  const response = await fetch(`${API_URL}/categoria-conteudo?${params}`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar categorias');
  }
  return result.data?.categorias || [];
}

export async function reordenarCategorias(materiaGUID: string, turmaGUID: string, ordem: string[]): Promise<CategoriaConteudo[]> {
  const response = await fetch(`${API_URL}/categoria-conteudo/reordenar`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ MateriaGUID: materiaGUID, TurmaGUID: turmaGUID, ordem }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao reordenar categorias');
  }
  return result.data?.categorias || [];
}

export async function reordenarItens(
  materiaGUID: string,
  turmaGUID: string,
  categoriaDestinoGUID: string,
  itens: Array<{ ItemGUID: string; Tipo: string }>
): Promise<void> {
  const response = await fetch(`${API_URL}/categoria-conteudo/reordenar-itens`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ MateriaGUID: materiaGUID, TurmaGUID: turmaGUID, CategoriaGUID: categoriaDestinoGUID, itens }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao reordenar itens');
  }
}

export async function verificarPendenciaAgregada(ehProfessor: boolean): Promise<boolean> {
  const response = await fetch(`${API_URL}/categoria-conteudo/tem-pendencia-agregado?EhProfessor=${ehProfessor}`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao verificar pendência');
  }
  return Boolean(result.data?.pendencia);
}

// ==================== Board geral (categoria aplicada em massa) ====================
// Sem categoria própria de "geral" no banco — é o mesmo categoriaconteudo,
// só que uma linha por turma compartilhando o mesmo nome (ver seção 4 do
// PLANO_IMPLEMENTACAO_MATERIAS.md e a decisão do usuário de não criar tabela nova).

export type ItemTipoBoardGeral =
  | 'prova'
  | 'tarefa_digital'
  | 'tarefa_presencial'
  | 'conteudo_video'
  | 'conteudo_texto'
  | 'conteudo_imagem';

export interface ItemBoardGeral {
  ItemGUID: string;
  Tipo: ItemTipoBoardGeral;
  Titulo: string;
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
  ItemOrdem: number;
}

export interface CategoriaGeral {
  CategoriaNome: string;
  Ordem: number;
  Itens: ItemBoardGeral[];
}

export interface BoardGeral {
  Categorias: CategoriaGeral[];
  ItensSemCategoria: ItemBoardGeral[];
}

export async function buscarBoardGeral(materiaGUID: string): Promise<BoardGeral> {
  const response = await fetch(`${API_URL}/categoria-conteudo/geral/${materiaGUID}`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar board geral');
  }
  return result.data.board;
}

export async function criarCategoriaGeral(materiaGUID: string, categoriaNome: string): Promise<BoardGeral> {
  const response = await fetch(`${API_URL}/categoria-conteudo/geral`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ MateriaGUID: materiaGUID, CategoriaNome: categoriaNome }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar categoria geral');
  }
  return result.data.board;
}

export async function reordenarCategoriasGerais(materiaGUID: string, ordemNomes: string[]): Promise<BoardGeral> {
  const response = await fetch(`${API_URL}/categoria-conteudo/geral/reordenar`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ MateriaGUID: materiaGUID, ordem: ordemNomes }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao reordenar categorias gerais');
  }
  return result.data.board;
}

export async function moverItemBoardGeral(
  materiaGUID: string,
  item: { ItemGUID: string; Tipo: ItemTipoBoardGeral; TurmaGUID: string },
  categoriaNomeDestino: string | null
): Promise<BoardGeral> {
  const response = await fetch(`${API_URL}/categoria-conteudo/geral/mover-item`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      MateriaGUID: materiaGUID,
      ItemGUID: item.ItemGUID,
      Tipo: item.Tipo,
      TurmaGUID: item.TurmaGUID,
      CategoriaNome: categoriaNomeDestino,
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao mover item');
  }
  return result.data.board;
}

export async function atualizarCategoria(categoriaGUID: string, categoriaNome: string): Promise<CategoriaConteudo> {
  const response = await fetch(`${API_URL}/categoria-conteudo/${categoriaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ categoria: { CategoriaNome: categoriaNome } }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar categoria');
  }
  return result.data.categoria;
}

export async function excluirCategoria(categoriaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/categoria-conteudo/${categoriaGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir categoria');
  }
}
