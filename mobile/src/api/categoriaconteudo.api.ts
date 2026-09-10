/**
 * Categorias de conteúdo por matéria/turma — espelha
 * `frontend/lib/api/categoriaconteudo.api.ts` (só leitura no v1).
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export interface CategoriaConteudo {
  CategoriaGUID: string;
  UsuarioGUID: string;
  MateriaGUID: string;
  TurmaGUID: string;
  CategoriaNome: string;
  Ordem: number;
}

export async function listarCategorias(filtros?: { MateriaGUID?: string; TurmaGUID?: string }): Promise<CategoriaConteudo[]> {
  const response = await fetch(`${API_URL}/categoria-conteudo${query(filtros ?? {})}`, {
    headers: getHeaders(),
  });
  const resultado = await tratarResposta<{ categorias: CategoriaConteudo[] }>(response, 'Erro ao listar categorias');
  return resultado.categorias ?? [];
}
