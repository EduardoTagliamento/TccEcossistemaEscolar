'use client';

/**
 * Documentação da API — referência de rotas reais do backend (`routes/*.routes.ts`).
 *
 * Portada do canvas de design "API Bauá - Documentação.dc.html"
 * (claude.ai/design, projectId f2def45e-d899-4afd-9ff4-0276e1245622,
 * "Bauá — Redesign Frontend (TCC)"). Conteúdo em `endpoints-data.ts` +
 * `nav-data.ts`; layout de duas colunas (sidebar de navegação + conteúdo)
 * com busca client-side, sem chamada nenhuma à API — é uma referência
 * estática, como o próprio canvas original.
 *
 * Vive sob `/dashboard/[escolaGUID]/api-docs` (não `/api-docs` solto) só
 * pra herdar a DashboardNavbar do layout do dashboard — avatar da conta,
 * sino de notificações etc. — exigindo sessão autenticada como qualquer
 * outra tela do dashboard. O conteúdo em si não é escopado a uma escola.
 */

import { useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ENDPOINTS, type EndpointDef } from './endpoints-data';
import { NAV_GROUPS } from './nav-data';
import styles from './ApiDocs.module.css';

type Lang = 'curl' | 'js' | 'py';

const LANGS: { id: Lang; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'js', label: 'JavaScript' },
  { id: 'py', label: 'Python' },
];

const METODO_COR: Record<string, string> = {
  GET: styles.colorGreen,
  POST: styles.colorBlue,
  PATCH: styles.colorGold,
  PUT: styles.colorGold,
  DELETE: styles.colorDanger,
};

function corMetodo(method: string): string {
  return METODO_COR[method] || styles.colorNeutral;
}

const INTRO_SNIPPETS: Record<Lang, string> = {
  curl: `curl "https://www.baua.com.br/api/materia?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30" \\
  -H "Authorization: Bearer $TOKEN"`,
  js: `const r = await fetch(
  "https://www.baua.com.br/api/materia?EscolaGUID=8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
  { headers: { Authorization: \`Bearer \${token}\` } }
);
console.log(await r.json());`,
  py: `import requests

r = requests.get(
    "https://www.baua.com.br/api/materia",
    params={"EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30"},
    headers={"Authorization": f"Bearer {token}"},
)
print(r.json())`,
};

const INTRO_CARDS = [
  {
    icon: 'zap' as const,
    bg: styles.colorGreen,
    title: 'REST previsível',
    desc: 'Verbos HTTP convencionais, JSON nos dois sentidos e o mesmo envelope { success, message, data } em toda chamada.',
  },
  {
    icon: 'lock' as const,
    bg: styles.colorBlue,
    title: 'Acesso por papel ou por escopo',
    desc: 'Uma pessoa autentica com JWT e acessa conforme seu papel (aluno, professor, direção...); uma integração externa usa uma chave de API presa a uma escola e a uma lista de escopos — nunca os dois modelos ao mesmo tempo.',
  },
  {
    icon: 'repeat' as const,
    bg: styles.colorGold,
    title: 'IA restrita ao material real',
    desc: 'A recomendação de estudo por prova só usa conteúdo publicado pelo professor e vídeos reais do YouTube — nunca inventa fonte.',
  },
  {
    icon: 'book-open' as const,
    bg: styles.colorNeutral,
    title: 'Multiescola',
    desc: 'Um mesmo UsuarioGUID pode ter vínculo com mais de uma escola e desempenhar papéis diferentes em cada uma.',
  },
];

const SESSAO_ROTAS = [
  { method: 'GET', path: '/api/auth/me', desc: 'Retorna os dados do usuário do token atual.' },
  { method: 'POST', path: '/api/auth/logout', desc: 'Placeholder — o JWT é stateless; o cliente só descarta o token localmente.' },
  { method: 'POST', path: '/api/auth/refresh', desc: 'Ainda não implementado — responde 501 hoje.', neutro: true },
];

const PAPEIS = [
  { papel: 'Aluno', desc: 'Vê as próprias matérias, tarefas e provas; entrega e conversa; não cria conteúdo pra outros.', cor: styles.colorNeutral },
  { papel: 'Professor', desc: 'Cria tarefas, provas e conteúdo nas próprias matérias e turmas.', cor: styles.colorGreen },
  { papel: 'Coordenação', desc: 'Enxerga múltiplas turmas e matérias da escola; participa da transferência de direção.', cor: styles.colorBlue },
  { papel: 'Direção', desc: 'Acesso mais amplo da escola: cadastro de matérias/escola, avisos gerais, exclusão de escola.', cor: styles.colorBlue },
  { papel: 'Secretaria', desc: 'Foco em cadastro e pendências administrativas.', cor: styles.colorNeutral },
];

const ESCOPOS_API_KEY = [
  { escopo: 'usuario:leitura', desc: 'Lista/busca pessoas com vínculo ativo na escola da chave.' },
  { escopo: 'turma:leitura', desc: 'Lista/busca turmas da escola da chave.' },
  { escopo: 'matricula:leitura', desc: 'Lista/busca matrículas da escola da chave.' },
  { escopo: 'tarefa:leitura', desc: 'Lista/busca tarefas da escola da chave.' },
  { escopo: 'prova:leitura', desc: 'Lista/busca provas agendadas da escola da chave.' },
  { escopo: 'aviso:leitura', desc: 'Lista avisos publicados pela escola da chave (sem marcar visualização — isso é só pra pessoa).' },
];

const CLI_INSTALL = [
  { gerente: 'npm', cmd: 'npm install -g @baua/cli' },
  { gerente: 'pnpm', cmd: 'pnpm add -g @baua/cli' },
  { gerente: 'Homebrew', cmd: 'brew install baua/tap/baua' },
];

const CLI_COMANDOS = [
  { cmd: 'baua login', desc: 'Autentica a máquina e guarda o token no keychain do sistema.', grupo: 'Sessão' },
  { cmd: 'baua escolas listar', desc: 'Mostra as escolas às quais o usuário tem acesso, com seus GUIDs.', grupo: 'Sessão' },
  { cmd: 'baua usar <EscolaGUID>', desc: 'Fixa a escola padrão do projeto em baua.config.json.', grupo: 'Sessão' },
  { cmd: 'baua usuarios importar <arquivo.csv>', desc: 'Cadastro em lote a partir de planilha.', grupo: 'Dados' },
  { cmd: 'baua tarefas criar --arquivo tarefa.json', desc: 'Publica uma tarefa a partir de um arquivo versionado.', grupo: 'Dados' },
  { cmd: 'baua avisos publicar --titulo "..." --escola', desc: 'Dispara um comunicado pra escola inteira ou pra turmas.', grupo: 'Dados' },
  { cmd: 'baua logs --seguir', desc: 'Acompanha em tempo real as requisições feitas com o token atual.', grupo: 'Desenvolvimento' },
];

const WEBHOOK_EVENTOS = [
  { nome: 'aluno.matriculado', desc: 'Uma nova matrícula foi confirmada na escola.' },
  { nome: 'tarefa.criada', desc: 'Um professor publicou uma tarefa.' },
  { nome: 'tarefa.entregue', desc: 'Um aluno enviou a entrega de uma tarefa digital.' },
  { nome: 'prova.agendada', desc: 'Uma avaliação foi marcada no calendário.' },
  { nome: 'aviso.publicado', desc: 'Um comunicado foi enviado aos destinatários.' },
];

const WEBHOOK_PAYLOAD = `{
  "evento": "tarefa.entregue",
  "criadoEm": "2026-08-11T23:41:07Z",
  "EscolaGUID": "8f21c4a0-3b7e-4f19-9c02-5ad6e1b47f30",
  "dados": {
    "TarefaGUID": "b93f7d10-2c88-4a55-91ee-0d7c3f6a1b24",
    "TarefaTitulo": "Lista de exercícios 3",
    "UsuarioGUID": "4a1c8e77-95d2-40b3-ae61-7c0f2b98d515",
    "entregueEm": "2026-08-11T23:40:52Z"
  }
}`;

const ERROS = [
  { status: '400', mensagem: 'requisição inválida', desc: 'O corpo tem campos ausentes ou em formato inesperado — a mensagem indica qual.', cor: styles.colorGold },
  { status: '401', mensagem: 'Token mal formatado', desc: 'O cabeçalho Authorization não veio no formato "Bearer <token>".', cor: styles.colorDanger },
  { status: '401', mensagem: 'Token inválido', desc: 'O token está expirado, foi adulterado ou não confere.', cor: styles.colorDanger },
  { status: '403', mensagem: 'sem permissão', desc: 'O token é válido, mas o papel de quem logou não permite esta operação.', cor: styles.colorDanger },
  { status: '404', mensagem: 'não encontrado', desc: 'O GUID informado não existe (ou não pertence à escola do token).', cor: styles.colorNeutral },
  { status: '409', mensagem: 'conflito', desc: 'Ex.: CPF já matriculado nesta escola.', cor: styles.colorGold },
  { status: '500', mensagem: 'erro interno', desc: 'Falha do lado do servidor. Tente novamente; se persistir, acione o suporte.', cor: styles.colorDanger },
];

function CodeBlock({ label, snippets, lang, onSetLang, showTabs }: {
  label: string;
  snippets: Record<Lang, string>;
  lang: Lang;
  onSetLang: (l: Lang) => void;
  showTabs?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const texto = snippets[lang];

  const copiar = () => {
    try {
      if (navigator.clipboard) void navigator.clipboard.writeText(texto);
    } catch {
      // ambiente sem permissão de clipboard — falha silenciosa
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeBlockHead}>
        <span className={styles.codeBlockLabel}>{label}</span>
        <button type="button" className={styles.copyBtn} onClick={copiar}>
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {showTabs && (
        <div className={styles.langTabs}>
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`${styles.langTab} ${lang === l.id ? styles.langTabActive : ''}`}
              onClick={() => onSetLang(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
      <pre className={`${styles.codeBlockBody} ${styles.nosb}`}>{texto}</pre>
    </div>
  );
}

function ParamsCard({ titulo, params }: { titulo: string; params: EndpointDef['params'] }) {
  return (
    <div className={`${styles.card} ${styles.cardPad24}`}>
      <h2 className={styles.cardHeading} style={{ fontSize: 16, marginBottom: 14 }}>
        {titulo}
      </h2>
      {params.length === 0 ? (
        <p className={styles.emptyNote}>Este endpoint não recebe parâmetros além dos cabeçalhos de autenticação.</p>
      ) : (
        params.map((p) => (
          <div key={p.nome} className={styles.paramRow}>
            <span className={styles.paramHead}>
              <code className={styles.paramName}>{p.nome}</code>
              <span className={styles.paramType}>{p.tipo}</span>
              {p.obrigatorio && <span className={styles.paramRequired}>obrigatório</span>}
            </span>
            <span className={styles.paramDesc}>{p.desc}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  const [secao, setSecao] = useState('intro');
  const [lang, setLang] = useState<Lang>('curl');
  const [busca, setBusca] = useState('');

  const navGroups = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return NAV_GROUPS.map((g) => {
      const items = g.items
        .map((it) => {
          const ep = ENDPOINTS[it.id];
          const label = it.label || (ep ? ep.path.replace('/api', '') : it.id);
          const method = ep ? ep.method : '';
          const searchable = `${label} ${ep ? `${ep.titulo} ${ep.path} ${method}` : it.label || ''}`.toLowerCase();
          if (q && !searchable.includes(q)) return null;
          return { id: it.id, label, method };
        })
        .filter((x): x is { id: string; label: string; method: string } => !!x);
      return items.length ? { label: g.label, items } : null;
    }).filter((g): g is { label: string; items: { id: string; label: string; method: string }[] } => !!g);
  }, [busca]);

  const ep = ENDPOINTS[secao];
  const isEndpoint = !!ep;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <Icon name="code" size={22} color="var(--green-700)" />
          <span className={styles.apiTag}>API</span>
        </div>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <Icon name="search" size={16} />
          </span>
          <input
            className={styles.searchInput}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar endpoint ou seção..."
          />
        </div>
        <span className={styles.headerBadge}>
          <span className={styles.headerBadgeDot} />
          Documenta a API em produção
        </span>
      </header>

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${styles.nosb}`}>
          {navGroups.map((g) => (
            <div key={g.label} className={styles.navGroup}>
              <div className={styles.navGroupLabel}>{g.label}</div>
              <div className={styles.navList}>
                {g.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className={`${styles.navItem} ${secao === it.id ? styles.navItemActive : ''}`}
                    onClick={() => {
                      setSecao(it.id);
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    {it.method && (
                      <span className={`${styles.navMethodBadge} ${corMetodo(it.method)}`}>{it.method}</span>
                    )}
                    <span className={styles.navItemLabel}>{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {navGroups.length === 0 && <div className={styles.navEmpty}>Nada encontrado para essa busca.</div>}
        </aside>

        <main className={`${styles.main} ${styles.nosb}`}>
          {secao === 'intro' && (
            <div className={styles.stack}>
              <section className={styles.hero}>
                <span className={styles.heroGrid} />
                <div className={styles.heroInner}>
                  <span className={styles.heroEyebrow}>Referência da API</span>
                  <h1 className={styles.heroTitle}>A API interna do Ecossistema Escolar</h1>
                  <p className={styles.heroDesc}>
                    A mesma API REST que move o app web do Bauá: matrículas, turmas, matérias, tarefas, provas, avisos,
                    projetos e conversas. Esta página documenta as rotas como elas existem hoje no backend — sem
                    promessas, sem endpoint que não roda.
                  </p>
                  <div className={styles.heroActions}>
                    <button type="button" className={styles.heroBtnPrimary} onClick={() => setSecao('auth')}>
                      Começar pela autenticação
                    </button>
                    <button type="button" className={styles.heroBtnGhost} onClick={() => setSecao('usuario-criar')}>
                      Ver endpoints
                    </button>
                  </div>
                </div>
              </section>

              <div className={styles.cardGrid}>
                {INTRO_CARDS.map((c) => (
                  <div key={c.title} className={styles.card}>
                    <span className={`${styles.cardIcon} ${c.bg}`}>
                      <Icon name={c.icon} size={18} />
                    </span>
                    <span className={styles.cardTitle}>{c.title}</span>
                    <span className={styles.cardDesc}>{c.desc}</span>
                  </div>
                ))}
              </div>

              <div className={`${styles.card} ${styles.cardPad24}`}>
                <h2 className={styles.cardHeading}>URL base</h2>
                <p className={styles.cardIntro}>
                  Todas as rotas ficam sob <code className={styles.inlineCode}>/api</code>. Não há prefixo de versão nem
                  escola no caminho — a maioria das rotas de listagem recebe{' '}
                  <code className={styles.inlineCode}>EscolaGUID</code> como parâmetro de consulta, e a própria escola é
                  um recurso em <code className={styles.inlineCode}>/api/escola/:EscolaGUID</code>.
                </p>
                <div className={styles.envRow}>
                  <span className={styles.envLabel}>Produção</span>
                  <code className={styles.envUrl}>https://www.baua.com.br/api</code>
                </div>
              </div>

              <div className={`${styles.card} ${styles.cardPad24}`}>
                <h2 className={styles.cardHeading} style={{ marginBottom: 14 }}>
                  Primeira chamada
                </h2>
                <CodeBlock label={LANGS.find((l) => l.id === lang)!.label} snippets={INTRO_SNIPPETS} lang={lang} onSetLang={setLang} showTabs />
              </div>
            </div>
          )}

          {secao === 'auth' && (
            <div className={styles.stack} style={{ maxWidth: 820 }}>
              <div>
                <h1 className={styles.pageTitle}>Autenticação</h1>
                <p className={styles.pageDesc}>
                  Para uma <strong>pessoa</strong> (aluno, professor, coordenação, direção, secretaria), o login é feito
                  por <code className={styles.inlineCode}>POST /api/auth/login</code>, com CPF, e-mail ou telefone
                  cadastrado. A resposta traz um <strong>JWT</strong> que representa a própria sessão do usuário — o
                  token carrega o papel de quem logou, e o servidor usa esse papel pra decidir o que cada chamada pode
                  ver ou alterar. Para uma <strong>aplicação externa</strong> (um parceiro, uma integração), existe um
                  segundo mecanismo — chave de API — coberto na seção Chaves de API logo abaixo. Os dois usam o mesmo
                  cabeçalho <code className={styles.inlineCode}>Authorization: Bearer</code>; o servidor distingue um do
                  outro pelo formato do valor.
                </p>
              </div>

              <div className={styles.codeBlock}>
                <div className={styles.codeBlockHead}>
                  <span className={styles.codeBlockLabel}>Cabeçalho obrigatório nas rotas autenticadas</span>
                </div>
                <pre className={`${styles.codeBlockBody} ${styles.nosb}`}>{`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json`}</pre>
              </div>

              <div className={styles.callout}>
                <span className={styles.calloutIcon}>
                  <Icon name="alert-triangle" size={16} />
                </span>
                <div>
                  <div className={styles.calloutTitle}>O token é a identidade de uma pessoa real</div>
                  <p className={styles.calloutText}>
                    Ele não é uma credencial de serviço com escopo configurável — é a sessão de um aluno, professor ou
                    responsável, muitas vezes menor de idade. Trate-o como trataria a senha dessa pessoa: nunca em log,
                    nunca em URL, nunca em repositório versionado.
                  </p>
                </div>
              </div>

              <section>
                <h2 className={styles.sectionTitle}>Outras rotas de sessão</h2>
                <div className={styles.rowList}>
                  {SESSAO_ROTAS.map((r) => (
                    <div key={r.path} className={styles.row}>
                      <span className={`${styles.rowMethodBadge} ${r.neutro ? styles.colorNeutral : corMetodo(r.method)}`}>
                        {r.method}
                      </span>
                      <code className={styles.rowPath}>{r.path}</code>
                      <span className={styles.rowDesc}>{r.desc}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className={styles.sectionTitle}>Papéis e o que cada um acessa</h2>
                <div className={styles.rowList}>
                  {PAPEIS.map((p) => (
                    <div key={p.papel} className={styles.row}>
                      <span className={`${styles.rolePill} ${p.cor}`}>{p.papel}</span>
                      <span className={styles.rowDesc}>{p.desc}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section id="chaves-de-api">
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, flexWrap: 'wrap' }}>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                    Chaves de API (integrações externas)
                  </h2>
                  <span className={styles.tagPill}>Real</span>
                </div>
                <p className={styles.cardIntro}>
                  Uma chave de API representa uma <strong>aplicação</strong>, não uma pessoa — pensada pra um parceiro
                  externo (uma secretaria de educação, um sistema terceiro) consumir a API sem login humano. Diferenças
                  em relação ao JWT: a chave vem no formato{' '}
                  <code className={styles.inlineCode}>baua_live_&lt;32 caracteres&gt;</code>, está sempre presa a{' '}
                  <strong>uma única escola</strong>, e o que ela pode ler é definido por uma lista de{' '}
                  <strong>escopos</strong> — não por um papel (Coordenação/Direção/etc.). Só a Direção da escola emite
                  ou revoga chaves, pelo próprio painel do Bauá — não existe cadastro público de chave.
                </p>
                <div className={styles.rowList} style={{ marginBottom: 14 }}>
                  {ESCOPOS_API_KEY.map((e) => (
                    <div key={e.escopo} className={styles.row}>
                      <code className={styles.rowPath} style={{ minWidth: 150 }}>
                        {e.escopo}
                      </code>
                      <span className={styles.rowDesc}>{e.desc}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.callout}>
                  <span className={styles.calloutIcon}>
                    <Icon name="alert-triangle" size={16} />
                  </span>
                  <div>
                    <div className={styles.calloutTitle}>Cobertura ainda parcial</div>
                    <p className={styles.calloutText}>
                      Nem todo endpoint documentado aceita chave de API hoje — só os marcados com o selo{' '}
                      <span className={styles.apiKeyPill}>chave de API</span> na página do endpoint. O restante segue
                      exigindo sessão humana (JWT).
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {isEndpoint && ep && (
            <div className={styles.stack}>
              <div className={styles.epHead}>
                <div className={styles.epMeta}>
                  <span className={`${styles.epMethodBadge} ${corMetodo(ep.method)}`}>{ep.method}</span>
                  <code className={styles.epPath}>{ep.path}</code>
                </div>
                <h1 className={styles.pageTitle}>{ep.titulo}</h1>
                <p className={styles.pageDesc}>{ep.desc}</p>
                <div className={styles.tagRow}>
                  {ep.tags.map((tg) => (
                    <span key={tg} className={styles.tagPill}>
                      {tg}
                    </span>
                  ))}
                  {ep.escopoApiKey && <span className={styles.apiKeyPill}>chave de API · {ep.escopoApiKey}</span>}
                </div>
              </div>

              <div className={styles.epGrid}>
                <ParamsCard titulo={ep.paramsTitulo} params={ep.params} />
                <div className={styles.stack} style={{ gap: 14 }}>
                  <CodeBlock
                    label={`Requisição · ${LANGS.find((l) => l.id === lang)!.label}`}
                    snippets={ep.snippets}
                    lang={lang}
                    onSetLang={setLang}
                    showTabs
                  />
                  <div className={styles.responseBlock}>
                    <div className={styles.responseHead}>
                      <span className={styles.statusPill}>{ep.statusOk}</span>
                      <span className={styles.responseLabel}>Resposta</span>
                    </div>
                    <pre className={`${styles.responseBody} ${styles.nosb}`}>{ep.resposta}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {secao === 'cli' && (
            <div className={styles.stack} style={{ maxWidth: 880 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
                  <h1 className={styles.pageTitle} style={{ margin: 0 }}>
                    CLI
                  </h1>
                  <span className={styles.roadmapPill}>Roadmap · ainda não disponível</span>
                </div>
                <p className={styles.pageDesc}>
                  Não existe hoje uma CLI oficial do Bauá — o que segue é a proposta de design pra essa ferramenta,
                  mantida aqui como referência de planejamento. O <code className={styles.inlineCode}>baua</code>{' '}
                  levaria a API para o terminal, pra tarefas de secretaria que não valem uma integração inteira —
                  importar uma planilha de matrículas, publicar um comunicado — e pra desenvolver contra a API sem
                  escrever cliente HTTP.
                </p>
              </div>

              <div className={`${styles.card} ${styles.cardPad24}`}>
                <h2 className={styles.cardHeading} style={{ fontSize: 17, marginBottom: 13 }}>
                  Instalação (proposta)
                </h2>
                {CLI_INSTALL.map((i) => (
                  <div key={i.gerente} className={styles.envRow} style={{ marginBottom: 8 }}>
                    <span className={styles.envLabel} style={{ minWidth: 76, textAlign: 'center' }}>
                      {i.gerente}
                    </span>
                    <code className={styles.envUrl}>{i.cmd}</code>
                  </div>
                ))}
              </div>

              <div className={`${styles.card} ${styles.cardPad24}`}>
                <h2 className={styles.cardHeading} style={{ fontSize: 17, marginBottom: 13 }}>
                  Comandos propostos
                </h2>
                {CLI_COMANDOS.map((c) => (
                  <div key={c.cmd} className={styles.paramRow}>
                    <span className={styles.paramHead}>
                      <code className={styles.paramName}>{c.cmd}</code>
                      <span className={`${styles.navMethodBadge} ${styles.colorNeutral}`} style={{ minWidth: 0 }}>
                        {c.grupo}
                      </span>
                    </span>
                    <span className={styles.paramDesc}>{c.desc}</span>
                  </div>
                ))}
              </div>

              <div className={styles.callout}>
                <span className={styles.calloutIcon}>
                  <Icon name="alert-triangle" size={16} />
                </span>
                <div>
                  <div className={styles.calloutTitle}>Nada disso está implementado</div>
                  <p className={styles.calloutText}>
                    Os comandos acima são a proposta de escopo da ferramenta, não uma referência de comportamento real.
                    Se for priorizada, esta seção vira documentação de verdade quando o pacote existir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {secao === 'webhooks' && (
            <div className={styles.stack} style={{ maxWidth: 860 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, flexWrap: 'wrap' }}>
                  <h1 className={styles.pageTitle} style={{ margin: 0 }}>
                    Webhooks
                  </h1>
                  <span className={styles.roadmapPill}>Roadmap · ainda não disponível</span>
                </div>
                <p className={styles.pageDesc}>
                  Hoje o Bauá só recebe um webhook (de entrada, do WhatsApp/Evolution API, pro chatbot) — não existe
                  entrega de eventos assinados para integrações de terceiros. O que segue é a proposta pra essa
                  entrega, mantida como referência de planejamento.
                </p>
              </div>

              <div className={`${styles.card} ${styles.cardPad24}`}>
                <h2 className={styles.cardHeading} style={{ fontSize: 17, marginBottom: 13 }}>
                  Eventos propostos
                </h2>
                {WEBHOOK_EVENTOS.map((e) => (
                  <div key={e.nome} className={styles.row} style={{ marginBottom: 8, background: 'var(--surface-50)' }}>
                    <code className={styles.rowPath}>{e.nome}</code>
                    <span className={styles.rowDesc}>{e.desc}</span>
                  </div>
                ))}
              </div>

              <div className={styles.codeBlock}>
                <div className={styles.codeBlockHead}>
                  <span className={styles.codeBlockLabel}>Payload proposto · exemplo</span>
                </div>
                <pre className={`${styles.codeBlockBody} ${styles.nosb}`}>{WEBHOOK_PAYLOAD}</pre>
              </div>
            </div>
          )}

          {secao === 'erros' && (
            <div className={styles.stack} style={{ maxWidth: 860 }}>
              <div>
                <h1 className={styles.pageTitle}>Erros e limites</h1>
                <p className={styles.pageDesc}>
                  Erros seguem o mesmo envelope em toda a API:{' '}
                  <code className={styles.inlineCode}>{'{ success: false, message, details, timestamp }'}</code>.{' '}
                  <code className={styles.inlineCode}>message</code> é legível e pode mudar; trate o status HTTP como o
                  sinal estável.
                </p>
              </div>
              <div className={styles.errorsCard}>
                {ERROS.map((e, i) => (
                  <div key={`${e.status}-${i}`} className={styles.errorRow}>
                    <span className={`${styles.errorBadge} ${e.cor}`}>{e.status}</span>
                    <code className={styles.errorMsg}>{e.mensagem}</code>
                    <span className={styles.errorDesc}>{e.desc}</span>
                  </div>
                ))}
              </div>
              <div className={`${styles.card} ${styles.cardPad24}`}>
                <h2 className={styles.cardHeading} style={{ fontSize: 17, marginBottom: 8 }}>
                  Limite de requisições
                </h2>
                <p className={styles.cardIntro}>
                  Não é um limite único global — cada grupo de rotas tem sua própria janela: <strong>login e cadastro</strong>{' '}
                  · 20 requisições / 15 min · <strong>provas agendadas</strong> · 120 / min · <strong>upload</strong> · 40
                  / 15 min. Cada resposta traz o estado da janela nos cabeçalhos abaixo (formato IETF, sem prefixo
                  legado).
                </p>
                <div className={styles.codeBlock}>
                  <pre className={`${styles.codeBlockBody} ${styles.nosb}`} style={{ padding: 15 }}>{`RateLimit-Limit: 120
RateLimit-Remaining: 94
RateLimit-Reset: 41`}</pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
