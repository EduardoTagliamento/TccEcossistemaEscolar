/**
 * Conteúdo (materiais de aula: vídeo/áudio, texto ou arquivo paginado) —
 * espelha `frontend/lib/api/conteudo.api.ts` (só leitura no v1).
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export type ConteudoTipo = 'cronometrado' | 'texto' | 'paginado';

export interface ConteudoTurmaInfo {
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
  ConteudoDataPublicacao: string;
}

export interface Conteudo {
  ConteudoGUID: string;
  MateriaGUID: string;
  CategoriaGUID: string | null;
  ConteudoTitulo: string;
  ConteudoTipo: ConteudoTipo;
  ConteudoDescricao: string | null;
  ConteudoDataPublicacao: string;
  Turmas: ConteudoTurmaInfo[];
  Cronometrado?: { OrigemTipo: 'upload' | 'link'; ArquivoUrl: string | null; LinkUrl: string | null; DuracaoSegundos: number | null };
  Texto?: { ConteudoHtml: string };
  Paginado?: { Arquivos: { ConteudoPaginadoArquivoGUID: string; Ordem: number; ArquivoUrl: string }[] };
}

export async function listarConteudos(filtros?: {
  MateriaGUID?: string;
  CategoriaGUID?: string;
  ConteudoTipo?: ConteudoTipo;
}): Promise<Conteudo[]> {
  const response = await fetch(`${API_URL}/conteudo${query(filtros ?? {})}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ conteudos: Conteudo[] }>(response, 'Erro ao listar conteúdos');
  return resultado.conteudos ?? [];
}

export async function buscarConteudo(conteudoGUID: string): Promise<Conteudo> {
  const response = await fetch(`${API_URL}/conteudo/${conteudoGUID}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ conteudo: Conteudo }>(response, 'Erro ao buscar conteúdo');
  return resultado.conteudo;
}
