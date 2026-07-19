/**
 * API Client para Upload de arquivos.
 * Hoje cobre: anexo de mensagem de chat (imagem/arquivo) e foto de perfil
 * de usuário. Segue o mesmo padrão multipart/form-data já usado para logo
 * de escola (ver frontend/app/criar-escola/page.tsx) — FormData + fetch,
 * sem Content-Type manual (o browser define o boundary do multipart sozinho).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

export interface AnexoMensagemResultado {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  mensagemTipo: 'Imagem' | 'Arquivo';
}

/**
 * Envia um anexo (imagem ou documento) para a conversa informada.
 * Não cria a mensagem em si — devolve a URL pública no R2, que deve ser
 * usada como `MensagemConteudo` ao emitir `send_mensagem` via WebSocket
 * (ver frontend/lib/socket/SocketContext.tsx), junto com `MensagemTipo`
 * igual ao `mensagemTipo` retornado aqui.
 */
export async function uploadMensagemAnexo(
  conversaGUID: string,
  arquivo: File
): Promise<AnexoMensagemResultado> {
  const formData = new FormData();
  formData.append('arquivo', arquivo);

  const response = await fetch(`${API_URL}/upload/mensagem/${conversaGUID}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao enviar anexo');
  }
  return resultado.data as AnexoMensagemResultado;
}

export interface FotoUsuarioResultado {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

/** POST /api/upload/foto-usuario/:UsuarioCPF — max 1MB, PNG/JPG/JPEG (mesmo limite do logo de escola). */
export async function uploadFotoUsuario(usuarioCPF: string, arquivo: File): Promise<FotoUsuarioResultado> {
  const formData = new FormData();
  formData.append('foto', arquivo);

  const response = await fetch(`${API_URL}/upload/foto-usuario/${usuarioCPF}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao enviar foto de perfil');
  }
  return resultado.data.foto as FotoUsuarioResultado;
}

/** DELETE /api/upload/foto-usuario/:UsuarioCPF */
export async function removerFotoUsuario(usuarioCPF: string): Promise<void> {
  const response = await fetch(`${API_URL}/upload/foto-usuario/${usuarioCPF}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao remover foto de perfil');
  }
}
