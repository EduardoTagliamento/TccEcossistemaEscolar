/**
 * API Client do módulo "Matérias" (sala de aula) — telas de navegação
 * (matéria/turma/categoria), customização visual, progresso de conteúdo,
 * nota de tarefa e os widgets de dashboard. Ver docs/PLANO_IMPLEMENTACAO_MATERIAS.md.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function extrairDados(response: Response, mensagemErroPadrao: string): Promise<any> {
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || mensagemErroPadrao);
  }
  return resultado.data;
}

// ==================== Grids de navegação ====================

export interface MateriaDoAluno {
  MateriaGUID: string;
  MateriaNome: string;
  TurmaGUID: string;
  ProfessorCPF: string;
  ProfessorNome: string;
  ImagemUrl: string | null;
  CorFundo: string;
  MensagemBoasVindas: string | null;
}

export async function listarMateriasDoAluno(usuarioCPF: string, escolaGUID: string): Promise<MateriaDoAluno[]> {
  const response = await fetch(`${API_URL}/materia/aluno/${usuarioCPF}?EscolaGUID=${escolaGUID}`, {
    headers: getHeaders(),
  });
  const dados = await extrairDados(response, 'Erro ao listar matérias');
  return dados.materias;
}

export interface MateriaComCapa {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  ImagemUrl: string | null;
  CorFundo: string;
}

export async function listarMateriasComCapaProfessor(escolaGUID: string): Promise<MateriaComCapa[]> {
  const response = await fetch(`${API_URL}/professor/materias-com-capa?EscolaGUID=${escolaGUID}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!resultado.success) throw new Error(resultado.message || 'Erro ao listar matérias');
  return resultado.data;
}

export interface TurmaComCapa {
  MatProfTurGUID: string;
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
  ImagemUrl: string | null;
  CorFundo: string | null;
}

export async function listarTurmasComCapaProfessor(materiaGUID: string): Promise<TurmaComCapa[]> {
  const response = await fetch(`${API_URL}/professor/turmas-com-capa?MateriaGUID=${materiaGUID}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!resultado.success) throw new Error(resultado.message || 'Erro ao listar turmas');
  return resultado.data;
}

// ==================== Customização (capa/cor/mensagem) ====================

export interface MateriaCustomizacao {
  MateriaGUID: string;
  UsuarioCPF: string;
  ImagemUrl: string | null;
  CorFundo: string;
  MensagemBoasVindas: string | null;
}

export async function salvarCustomizacaoMateria(
  materiaGUID: string,
  dados: { imagem?: File; cor?: string; mensagem?: string }
): Promise<MateriaCustomizacao> {
  const formData = new FormData();
  if (dados.imagem) formData.append('imagem', dados.imagem);
  if (dados.cor) formData.append('cor', dados.cor);
  if (dados.mensagem !== undefined) formData.append('mensagem', dados.mensagem);

  const token = getToken();
  const response = await fetch(`${API_URL}/materia/${materiaGUID}/customizacao`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return extrairDados(response, 'Erro ao salvar customização');
}

export async function atualizarCapaTurma(
  turmaGUID: string,
  dados: { imagem?: File; cor?: string }
): Promise<void> {
  const formData = new FormData();
  if (dados.imagem) formData.append('imagem', dados.imagem);
  if (dados.cor) formData.append('cor', dados.cor);

  const token = getToken();
  const response = await fetch(`${API_URL}/turma/${turmaGUID}/capa`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  await extrairDados(response, 'Erro ao atualizar capa da turma');
}

// ==================== Categorias completas (tela de categoria) ====================

export type ItemTipo =
  | 'prova'
  | 'tarefa_digital'
  | 'tarefa_presencial'
  | 'conteudo_video'
  | 'conteudo_texto'
  | 'conteudo_imagem';

export interface ItemCategoria {
  ItemGUID: string;
  Tipo: ItemTipo;
  Titulo: string;
  Percentual: number | null;
  Estado: 'sem_progresso' | 'parcial' | 'concluido' | 'atrasado' | 'aguardando_avaliacao' | 'avaliado';
  Nota: number | null;
  RefTurmaGUID?: string;
}

export interface CategoriaCompleta {
  CategoriaGUID: string;
  CategoriaNome: string;
  Ordem: number;
  Itens: ItemCategoria[];
}

export async function buscarCategoriasCompletas(materiaGUID: string, turmaGUID: string): Promise<CategoriaCompleta[]> {
  const response = await fetch(`${API_URL}/categoria-conteudo/completas/${materiaGUID}/${turmaGUID}`, {
    headers: getHeaders(),
  });
  const dados = await extrairDados(response, 'Erro ao buscar categorias');
  return dados.categorias;
}

export async function temPendencia(materiaGUID: string, turmaGUID: string, ehProfessor: boolean): Promise<boolean> {
  const response = await fetch(
    `${API_URL}/categoria-conteudo/tem-pendencia/${materiaGUID}/${turmaGUID}?EhProfessor=${ehProfessor}`,
    { headers: getHeaders() }
  );
  const dados = await extrairDados(response, 'Erro ao verificar pendência');
  return dados.pendencia;
}

// ==================== Progresso de conteúdo ====================

export async function registrarProgressoVideo(
  conteudoGUID: string,
  segundosAssistidos: number,
  duracaoTotalSegundos: number
): Promise<void> {
  const response = await fetch(`${API_URL}/conteudo/${conteudoGUID}/progresso/video`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ SegundosAssistidos: segundosAssistidos, DuracaoTotalSegundos: duracaoTotalSegundos }),
  });
  await extrairDados(response, 'Erro ao registrar progresso');
}

export async function registrarProgressoTexto(conteudoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/conteudo/${conteudoGUID}/progresso/texto`, {
    method: 'POST',
    headers: getHeaders(),
  });
  await extrairDados(response, 'Erro ao registrar leitura');
}

export async function registrarProgressoPagina(conteudoPaginadoArquivoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/conteudo/pagina/${conteudoPaginadoArquivoGUID}/progresso`, {
    method: 'POST',
    headers: getHeaders(),
  });
  await extrairDados(response, 'Erro ao registrar página vista');
}

export async function registrarVisualizacaoProva(provaAgendadaTurmaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/prova/turma/${provaAgendadaTurmaGUID}/visualizar`, {
    method: 'POST',
    headers: getHeaders(),
  });
  await extrairDados(response, 'Erro ao registrar visualização da prova');
}

// ==================== Nota de tarefa ====================

export async function avaliarTarefa(tarefaMatriculaGUID: string, nota: number): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/matricula/${tarefaMatriculaGUID}/avaliar`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ Nota: nota }),
  });
  await extrairDados(response, 'Erro ao avaliar tarefa');
}

// ==================== Dashboard ====================

export interface TarefaPendenteAluno {
  TarefaGUID: string;
  TarefaTitulo: string;
  TarefaPrazoData: string;
  MateriaNome: string;
  TurmaNome: string;
}

export async function listarPendentesAluno(): Promise<TarefaPendenteAluno[]> {
  const response = await fetch(`${API_URL}/tarefa/pendentes-aluno`, { headers: getHeaders() });
  const dados = await extrairDados(response, 'Erro ao listar pendentes');
  return dados.pendentes;
}

export interface TarefaPendenteAvaliacao {
  TarefaMatriculaGUID: string;
  TarefaGUID: string;
  TarefaTitulo: string;
  MateriaNome: string;
  TurmaNome: string;
  AlunoNome: string;
}

export async function listarPendentesAvaliacaoProfessor(): Promise<TarefaPendenteAvaliacao[]> {
  const response = await fetch(`${API_URL}/tarefa/pendentes-avaliacao-professor`, { headers: getHeaders() });
  const dados = await extrairDados(response, 'Erro ao listar pendentes de avaliação');
  return dados.pendentes;
}
