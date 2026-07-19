/**
 * API Client para Grupos de Projeto
 */

import { GrupoProjeto, GrupoProjetoCreateDTO, GrupoProjetoVisibilidade } from '@/types/projeto';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

async function tratarResposta(response: Response): Promise<any> {
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro na requisição');
  }
  return result;
}

export async function criarGrupo(data: GrupoProjetoCreateDTO): Promise<GrupoProjeto> {
  const response = await fetch(`${API_URL}/grupoprojeto`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const result = await tratarResposta(response);
  return result.data.grupo;
}

export async function listarGruposDoProjeto(projetoGUID: string): Promise<GrupoProjeto[]> {
  const response = await fetch(`${API_URL}/grupoprojeto/projeto/${projetoGUID}`, {
    headers: getHeaders()
  });
  const result = await tratarResposta(response);
  return result.data?.grupos || [];
}

export async function buscarGrupo(grupoGUID: string): Promise<GrupoProjeto> {
  const response = await fetch(`${API_URL}/grupoprojeto/${grupoGUID}`, {
    headers: getHeaders()
  });
  const result = await tratarResposta(response);
  return result.data.grupo;
}

export async function atualizarGrupo(
  grupoGUID: string,
  data: { GrupoProjetoNome?: string | null; GrupoProjetoProposta?: string; GrupoProjetoVisibilidade?: GrupoProjetoVisibilidade }
): Promise<void> {
  const response = await fetch(`${API_URL}/grupoprojeto/${grupoGUID}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  await tratarResposta(response);
}

export async function atualizarPontuacao(grupoGUID: string, pontuacao: number): Promise<void> {
  const response = await fetch(`${API_URL}/grupoprojeto/${grupoGUID}/pontuacao`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ GrupoProjetoPontuacao: pontuacao })
  });
  await tratarResposta(response);
}

export async function entrarGrupo(grupoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/grupoprojeto/${grupoGUID}/entrar`, {
    method: 'POST',
    headers: getHeaders()
  });
  await tratarResposta(response);
}

export async function sairGrupo(grupoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/grupoprojeto/${grupoGUID}/sair`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  await tratarResposta(response);
}

export async function adicionarMembro(grupoGUID: string, usuarioCPF: string): Promise<void> {
  const response = await fetch(`${API_URL}/grupoprojeto/${grupoGUID}/membros`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ UsuarioCPF: usuarioCPF })
  });
  await tratarResposta(response);
}

export async function expulsarMembro(grupoGUID: string, cpf: string): Promise<void> {
  const response = await fetch(`${API_URL}/grupoprojeto/${grupoGUID}/membros/${cpf}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  await tratarResposta(response);
}

export async function transferirLideranca(grupoGUID: string, novoLiderCPF: string): Promise<void> {
  const response = await fetch(`${API_URL}/grupoprojeto/${grupoGUID}/transferir-lider`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ NovoLiderCPF: novoLiderCPF })
  });
  await tratarResposta(response);
}
