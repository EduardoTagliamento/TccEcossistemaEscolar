/**
 * API Client para Convites de Grupo de Projeto
 */

import { ConviteGrupoProjeto } from '@/types/projeto';

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

export async function enviarConvite(grupoGUID: string, usuarioCPFConvidado: string): Promise<ConviteGrupoProjeto> {
  const response = await fetch(`${API_URL}/convitegrupoprojeto/${grupoGUID}/convites`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ UsuarioCPFConvidado: usuarioCPFConvidado })
  });
  const result = await tratarResposta(response);
  return result.data.convite;
}

export async function solicitarEntrada(grupoGUID: string): Promise<ConviteGrupoProjeto> {
  const response = await fetch(`${API_URL}/convitegrupoprojeto/${grupoGUID}/solicitacoes`, {
    method: 'POST',
    headers: getHeaders()
  });
  const result = await tratarResposta(response);
  return result.data.solicitacao;
}

export async function listarPendentes(): Promise<ConviteGrupoProjeto[]> {
  const response = await fetch(`${API_URL}/convitegrupoprojeto/pendentes`, {
    headers: getHeaders()
  });
  const result = await tratarResposta(response);
  return result.data?.convites || [];
}

export async function aceitarConvite(conviteGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/convitegrupoprojeto/${conviteGUID}/aceitar`, {
    method: 'PATCH',
    headers: getHeaders()
  });
  await tratarResposta(response);
}

export async function recusarConvite(conviteGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/convitegrupoprojeto/${conviteGUID}/recusar`, {
    method: 'PATCH',
    headers: getHeaders()
  });
  await tratarResposta(response);
}
