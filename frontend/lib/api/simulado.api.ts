/**
 * API Client pro Simulado (SPEC_SIMULADOS_BANCO_QUESTOES.md) — não tem entidade própria no
 * backend: "fazer no site" é 100% client-side (lista de GUIDs + PraticaQuestoes), e os dois
 * endpoints daqui só existem pro que precisa mesmo de backend (PDF e atribuição pra turma).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

class ApiError extends Error {
  details?: Record<string, unknown>;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}

/** Baixa o PDF do simulado (questões na ordem dada + gabarito no final) e dispara o download no
 * navegador — sem retorno, o efeito é o próprio download. */
export async function gerarPdfSimulado(questaoBancoGUIDs: string[]): Promise<void> {
  const response = await fetch(`${API_URL}/questaobanco/simulado/pdf`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ QuestaoBancoGUIDs: questaoBancoGUIDs }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new ApiError(result.message || 'Erro ao gerar PDF do simulado', result.details);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'simulado.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CriarSimuladoComoTarefaDados {
  matXprofXturxescGUID: string;
  QuestaoBancoGUIDs: string[];
  TarefaTitulo: string;
  /** ISO (YYYY-MM-DD) ou datetime — mesmo formato aceito pelo resto de TarefaAcademica. */
  TarefaPrazoData: string;
}

/** Retorna só o GUID da tarefa criada — o chamador redireciona pra tela normal da tarefa. */
export async function criarSimuladoComoTarefa(dados: CriarSimuladoComoTarefaDados): Promise<{ TarefaGUID: string }> {
  const response = await fetch(`${API_URL}/tarefa/simulado-de-banco`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new ApiError(result.message || 'Erro ao criar simulado pra turma', result.details);
  }

  return result.data.tarefa;
}
