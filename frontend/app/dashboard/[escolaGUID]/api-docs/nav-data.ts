export interface NavItem {
  id: string;
  label?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Agrupamento da sidebar — ids que não são chave de `ENDPOINTS` (intro,
 * auth, cli, webhooks, erros) são seções especiais tratadas em `page.tsx`. */
export const NAV_GROUPS: NavGroup[] = [
  { label: 'Começar', items: [{ id: 'intro', label: 'Introdução' }, { id: 'auth', label: 'Autenticação' }] },
  {
    label: 'Pessoas e escolas',
    items: [
      { id: 'usuario-criar' },
      { id: 'usuario-busca-cpf' },
      { id: 'escola-criar' },
      { id: 'escola-listar' },
      { id: 'escola-configuracao-atualizar' },
      { id: 'escolaxusuarioxfuncao-vincular' },
    ],
  },
  { label: 'Estrutura acadêmica', items: [{ id: 'turma-criar' }, { id: 'matricula-criar' }, { id: 'professor-alocar' }] },
  { label: 'Matérias e conteúdo', items: [{ id: 'materia-criar' }, { id: 'materia-listar' }, { id: 'conteudo-criar' }] },
  {
    label: 'Tarefas e provas',
    items: [{ id: 'tarefa-criar' }, { id: 'tarefa-marcar-feito' }, { id: 'prova-criar' }, { id: 'prova-recomendacao' }],
  },
  {
    label: 'Calendário e comunicação',
    items: [
      { id: 'calendario-dia' },
      { id: 'evento-criar' },
      { id: 'conversa-individual' },
      { id: 'notificacao-contador' },
      { id: 'aviso-criar' },
    ],
  },
  { label: 'Projetos e pendências', items: [{ id: 'projeto-criar' }, { id: 'pendencia-listar' }] },
  { label: 'Arquivos', items: [{ id: 'anexo-enviar' }] },
  { label: 'Assistente e auditoria', items: [{ id: 'chatbot-mensagem' }, { id: 'auditoria-listar' }] },
  { label: 'Chaves de API', items: [{ id: 'apikey-criar' }, { id: 'apikey-listar' }, { id: 'apikey-revogar' }] },
  { label: 'Roadmap', items: [{ id: 'cli', label: 'CLI' }, { id: 'webhooks', label: 'Webhooks' }] },
  { label: 'Avançado', items: [{ id: 'erros', label: 'Erros e limites' }] },
];
