/**
 * Avisos (comunicados de Direção/Coordenação/Secretaria) — espelha
 * `frontend/lib/api/aviso.api.ts` (só leitura no v1).
 */
import { API_URL, getHeaders, tratarResposta } from './client';

export type AvisoAbrangencia = 'Escola' | 'Turmas';

export interface Aviso {
  AvisoGUID: string;
  EscolaGUID: string;
  UsuarioGUIDAutor: string;
  AvisoTitulo: string;
  AvisoConteudo: string;
  AvisoAbrangencia: AvisoAbrangencia;
  AvisoCreatedAt: string;
  TurmaGUIDs: string[];
}

export async function listarAvisos(escolaGUID: string): Promise<Aviso[]> {
  const response = await fetch(`${API_URL}/aviso?EscolaGUID=${encodeURIComponent(escolaGUID)}`, {
    headers: getHeaders(),
  });
  const resultado = await tratarResposta<Aviso[]>(response, 'Erro ao listar avisos');
  return resultado ?? [];
}

export async function buscarAviso(guid: string): Promise<Aviso> {
  const response = await fetch(`${API_URL}/aviso/${guid}`, { headers: getHeaders() });
  return tratarResposta<Aviso>(response, 'Erro ao buscar aviso');
}
