/**
 * Anotações pessoais no calendário — espelha `frontend/lib/api/anotacao.api.ts`.
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export interface Anotacao {
  AnotacaoGUID: string;
  UsuarioGUID: string;
  EscolaGUID: string;
  AnotacaoData: string;
  AnotacaoTitulo: string;
  AnotacaoDescricao: string | null;
  AnotacaoIsFeito: boolean;
}

export async function listarAnotacoesPorPeriodo(
  escolaGUID: string,
  dataInicio: string,
  dataFim: string
): Promise<Anotacao[]> {
  const response = await fetch(
    `${API_URL}/anotacao${query({ EscolaGUID: escolaGUID, DataInicio: dataInicio, DataFim: dataFim })}`,
    { headers: getHeaders() }
  );
  return tratarResposta<Anotacao[]>(response, 'Erro ao listar anotações');
}

export async function criarAnotacao(
  escolaGUID: string,
  data: string,
  titulo: string,
  descricao?: string
): Promise<Anotacao> {
  const response = await fetch(`${API_URL}/anotacao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      EscolaGUID: escolaGUID,
      AnotacaoData: data,
      AnotacaoTitulo: titulo,
      AnotacaoDescricao: descricao || null,
    }),
  });
  return tratarResposta<Anotacao>(response, 'Erro ao criar anotação');
}
