/**
 * API Client para Upload de arquivos.
 * Hoje cobre: anexo de mensagem de chat (imagem/arquivo).
 * Segue o mesmo padrão multipart/form-data já usado para logo de escola
 * (ver frontend/app/criar-escola/page.tsx) — FormData + fetch, sem
 * Content-Type manual (o browser define o boundary do multipart sozinho).
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
