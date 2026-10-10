'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import * as MateriaGlobalAPI from '@/lib/api/materiaglobal.api';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import * as MateriasModuloAPI from '@/lib/api/materiasmodulo.api';
import * as SimuladoAPI from '@/lib/api/simulado.api';
import { embaralhar } from '@/lib/embaralhar';
import PraticaQuestoes from '@/components/banco-questoes/PraticaQuestoes';
import ModalTinderQuestoes from '@/components/banco-questoes/ModalTinderQuestoes';
import styles from './page.module.css';

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: Array<{ FuncaoId: number; Status: 'Ativo' | 'Inativo' | 'Finalizado' }>;
}

interface ComposicaoItem {
  submateria: MateriaGlobalAPI.SubMateriaGlobal;
  quantidade: number;
  disponivel: number;
}

type Etapa = 'composicao' | 'tinder' | 'montando' | 'destino' | 'praticando';

const LIMITE_TOTAL_QUESTOES = 50;

/**
 * Wizard de criação de simulado — SPEC_SIMULADOS_BANCO_QUESTOES.md.
 * Não existe entidade "simulado" no backend: pra uso pessoal, a lista final de questões vive só
 * no estado desta página (randomizada = sorteio client-side, não-randomizada = aceitas no modal
 * Tinder) e alimenta `PraticaQuestoes` ou o endpoint de PDF. Pra atribuir a uma turma, a lista
 * final vira uma `TarefaAcademica` tipo 'lista' (endpoint novo em `simulado.api.ts`).
 */
export default function SimuladoPage() {
  const params = useParams();
  const router = useRouter();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const { usuario, token } = useAuth();

  const [etapa, setEtapa] = useState<Etapa>('composicao');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [ehProfessor, setEhProfessor] = useState(false);

  const [materias, setMaterias] = useState<MateriaGlobalAPI.MateriaGlobal[]>([]);
  const [materiaEscolhidaGUID, setMateriaEscolhidaGUID] = useState('');
  const [composicao, setComposicao] = useState<ComposicaoItem[]>([]);
  const [carregandoSubmaterias, setCarregandoSubmaterias] = useState(false);
  const [randomizada, setRandomizada] = useState(true);

  // Só professor: atribuir a uma turma em vez de praticar/baixar PDF sozinho.
  const [modoProfessor, setModoProfessor] = useState<'pessoal' | 'turma'>('pessoal');
  const [turmas, setTurmas] = useState<MateriasModuloAPI.TurmaComCapa[]>([]);
  const [turmaEscolhidaGUID, setTurmaEscolhidaGUID] = useState('');
  const [tituloTarefa, setTituloTarefa] = useState('Simulado');
  const [prazoTarefa, setPrazoTarefa] = useState('');

  // Fila do modo Tinder (não-randomizada) — uma submatéria por vez.
  const [filaTinder, setFilaTinder] = useState<ComposicaoItem[]>([]);
  const [poolTinderAtual, setPoolTinderAtual] = useState<QuestaoBancoAPI.QuestaoBanco[]>([]);
  const [carregandoPoolTinder, setCarregandoPoolTinder] = useState(false);

  const [questoesFinal, setQuestoesFinal] = useState<QuestaoBancoAPI.QuestaoBanco[]>([]);
  const [enviandoTarefa, setEnviandoTarefa] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    if (escolaGUID && usuario) void carregarPapel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID, usuario]);

  const carregarPapel = async () => {
    if (!usuario) return;
    try {
      setCarregando(true);
      const response = await fetch(`/api/usuario/${usuario.UsuarioGUID}/escolas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const escolas: EscolaComFuncoes[] = data?.data?.escolas || [];
      const escolaSelecionada = escolas.find((item) => item.escola.EscolaGUID === escolaGUID);
      const funcoesAtivas = (escolaSelecionada?.funcoes || [])
        .filter((funcao) => funcao.Status === 'Ativo')
        .map((funcao) => funcao.FuncaoId);
      setEhProfessor(funcoesAtivas.includes(3));

      const lista = await MateriaGlobalAPI.listarMateriasGlobais('Confirmado');
      setMaterias(lista);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar matérias.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!materiaEscolhidaGUID) {
      setComposicao([]);
      setTurmas([]);
      return;
    }
    void carregarSubmaterias(materiaEscolhidaGUID);
    if (ehProfessor) void carregarTurmas(materiaEscolhidaGUID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaEscolhidaGUID]);

  const carregarSubmaterias = async (materiaGUID: string) => {
    try {
      setCarregandoSubmaterias(true);
      const [submaterias, contagem] = await Promise.all([
        MateriaGlobalAPI.listarSubMaterias(materiaGUID),
        QuestaoBancoAPI.contarQuestoesValidadas(),
      ]);
      const contagemPorSubMateria = new Map(contagem.PorSubMateria.map((c) => [c.SubMateriaGlobalGUID, c.Quantidade]));
      setComposicao(
        submaterias.map((s) => ({
          submateria: s,
          quantidade: 0,
          disponivel: contagemPorSubMateria.get(s.SubMateriaGlobalGUID) ?? 0,
        }))
      );
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar submatérias.');
    } finally {
      setCarregandoSubmaterias(false);
    }
  };

  const carregarTurmas = async (materiaGUID: string) => {
    try {
      const lista = await MateriasModuloAPI.listarTurmasComCapaProfessor(materiaGUID);
      setTurmas(lista);
    } catch {
      setTurmas([]);
    }
  };

  const atualizarQuantidade = (subMateriaGUID: string, valor: number) => {
    setComposicao((prev) =>
      prev.map((item) =>
        item.submateria.SubMateriaGlobalGUID === subMateriaGUID
          ? { ...item, quantidade: Math.max(0, Math.min(valor, item.disponivel)) }
          : item
      )
    );
  };

  const totalQuestoes = composicao.reduce((soma, item) => soma + item.quantidade, 0);
  const itensEscolhidos = composicao.filter((item) => item.quantidade > 0);
  const materiaEscolhida = materias.find((m) => m.MateriaGlobalGUID === materiaEscolhidaGUID) || null;

  const nomesSubMateria: Record<string, string> = Object.fromEntries(
    composicao.map((item) => [item.submateria.SubMateriaGlobalGUID, item.submateria.Nome])
  );

  const podeContinuarComposicao =
    totalQuestoes > 0 &&
    totalQuestoes <= LIMITE_TOTAL_QUESTOES &&
    (!ehProfessor || modoProfessor === 'pessoal' || (!!turmaEscolhidaGUID && !!prazoTarefa));

  const handleContinuarComposicao = async () => {
    setErro('');
    if (randomizada) {
      await montarListaRandomizada();
    } else {
      setFilaTinder(itensEscolhidos);
      setEtapa('tinder');
    }
  };

  const montarListaRandomizada = async () => {
    try {
      setEtapa('montando');
      const partes = await Promise.all(
        itensEscolhidos.map(async (item) => {
          const pool = await QuestaoBancoAPI.listarQuestoes({
            MateriaGlobalGUID: materiaEscolhidaGUID,
            SubMateriaGlobalGUID: item.submateria.SubMateriaGlobalGUID,
          });
          return embaralhar(pool).slice(0, item.quantidade);
        })
      );
      setQuestoesFinal(partes.flat());
      setEtapa('destino');
    } catch (e: any) {
      setErro(e.message || 'Erro ao montar o simulado.');
      setEtapa('composicao');
    }
  };

  // Modo Tinder: carrega o pool da submatéria atual da fila sempre que ela muda.
  useEffect(() => {
    if (etapa !== 'tinder' || filaTinder.length === 0) return;
    const atual = filaTinder[0];
    setCarregandoPoolTinder(true);
    QuestaoBancoAPI.listarQuestoes({
      MateriaGlobalGUID: materiaEscolhidaGUID,
      SubMateriaGlobalGUID: atual.submateria.SubMateriaGlobalGUID,
    })
      .then((pool) => setPoolTinderAtual(embaralhar(pool)))
      .catch((e) => setErro(e.message || 'Erro ao carregar questões.'))
      .finally(() => setCarregandoPoolTinder(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, filaTinder]);

  const handleConcluirTinderSubMateria = (aceitas: QuestaoBancoAPI.QuestaoBanco[]) => {
    setQuestoesFinal((prev) => [...prev, ...aceitas]);
    const restante = filaTinder.slice(1);
    if (restante.length === 0) {
      setEtapa('destino');
    } else {
      setFilaTinder(restante);
    }
  };

  const handleFazerAgora = () => setEtapa('praticando');

  const handleGerarPdf = async () => {
    try {
      setGerandoPdf(true);
      await SimuladoAPI.gerarPdfSimulado(questoesFinal.map((q) => q.QuestaoBancoGUID));
    } catch (e: any) {
      setErro(e.message || 'Erro ao gerar o PDF.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleAtribuirTurma = async () => {
    try {
      setEnviandoTarefa(true);
      const turma = turmas.find((t) => t.TurmaGUID === turmaEscolhidaGUID);
      if (!turma) return;
      const tarefa = await SimuladoAPI.criarSimuladoComoTarefa({
        matXprofXturxescGUID: turma.MatProfTurGUID,
        QuestaoBancoGUIDs: questoesFinal.map((q) => q.QuestaoBancoGUID),
        TarefaTitulo: tituloTarefa,
        TarefaPrazoData: prazoTarefa,
      });
      router.push(`/dashboard/${escolaGUID}/tarefas/${tarefa.TarefaGUID}`);
    } catch (e: any) {
      setErro(e.message || 'Erro ao criar o simulado pra turma.');
    } finally {
      setEnviandoTarefa(false);
    }
  };

  if (carregando) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Loader />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (etapa === 'tinder' && filaTinder.length > 0) {
    return (
      <div className={styles.container}>
        {carregandoPoolTinder ? (
          <div className={styles.loadingContainer}>
            <Loader />
            <p>Carregando questões...</p>
          </div>
        ) : (
          <ModalTinderQuestoes
            submateriaNome={filaTinder[0].submateria.Nome}
            quantidade={filaTinder[0].quantidade}
            pool={poolTinderAtual}
            onConcluir={handleConcluirTinderSubMateria}
          />
        )}
      </div>
    );
  }

  if (etapa === 'montando') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Loader />
          <p>Montando seu simulado...</p>
        </div>
      </div>
    );
  }

  if (etapa === 'praticando') {
    return (
      <div className={styles.container}>
        <PraticaQuestoes
          questoes={questoesFinal}
          nomesSubMateria={nomesSubMateria}
          textoBotaoFinal="Voltar ao Banco de Questões"
          onTerminar={() => router.push(`/dashboard/${escolaGUID}/banco-questoes`)}
        />
      </div>
    );
  }

  if (etapa === 'destino') {
    const atribuindoTurma = ehProfessor && modoProfessor === 'turma';
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.titulo}><Icon name="award" size={20} /> Simulado pronto</h1>
          <p className={styles.subtitulo}>{questoesFinal.length} questões selecionadas.</p>
        </header>

        {erro && <p className={styles.erro}>{erro}</p>}

        {atribuindoTurma ? (
          <button type="button" className={styles.botaoPrimario} onClick={handleAtribuirTurma} disabled={enviandoTarefa}>
            {enviandoTarefa ? 'Enviando...' : 'Atribuir à turma'}
          </button>
        ) : (
          <div className={styles.destinoAcoes}>
            <button type="button" className={styles.botaoPrimario} onClick={handleFazerAgora}>
              <Icon name="zap" size={18} /> Fazer agora
            </button>
            <button type="button" className={styles.botaoSecundario} onClick={handleGerarPdf} disabled={gerandoPdf}>
              <Icon name="download" size={18} /> {gerandoPdf ? 'Gerando PDF...' : 'Gerar PDF'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.titulo}><Icon name="award" size={20} /> Criar simulado</h1>
        <p className={styles.subtitulo}>Escolha a matéria e quantas questões quer de cada submatéria.</p>
      </header>

      {erro && <p className={styles.erro}>{erro}</p>}

      <label className={styles.campo}>
        <span className={styles.rotulo}>Matéria</span>
        <select className={styles.select} value={materiaEscolhidaGUID} onChange={(e) => setMateriaEscolhidaGUID(e.target.value)}>
          <option value="">Selecione a matéria</option>
          {materias.map((m) => (
            <option key={m.MateriaGlobalGUID} value={m.MateriaGlobalGUID}>{m.Nome}</option>
          ))}
        </select>
      </label>

      {carregandoSubmaterias && <Loader />}

      {!carregandoSubmaterias && materiaEscolhida && (
        <>
          <div className={styles.listaSubmaterias}>
            {composicao.map((item) => (
              <div key={item.submateria.SubMateriaGlobalGUID} className={styles.linhaSubmateria}>
                <span className={styles.nomeSubmateria}>
                  {item.submateria.Nome}
                  <span className={styles.disponivelSubmateria}>({item.disponivel} disponíveis)</span>
                </span>
                <input
                  type="number"
                  min={0}
                  max={item.disponivel}
                  className={styles.inputQuantidade}
                  value={item.quantidade}
                  disabled={item.disponivel === 0}
                  onChange={(e) => atualizarQuantidade(item.submateria.SubMateriaGlobalGUID, Number(e.target.value))}
                />
              </div>
            ))}
            {composicao.length === 0 && <p className={styles.mensagemVazia}>Nenhuma submatéria cadastrada.</p>}
          </div>

          <label className={styles.toggleLinha}>
            <input type="checkbox" checked={randomizada} onChange={(e) => setRandomizada(e.target.checked)} />
            Randomizada (sorteia as questões automaticamente)
          </label>
          {!randomizada && (
            <p className={styles.dica}>
              Sem randomizar, você escolhe questão por questão num modal estilo Tinder — aceita ou rejeita até
              completar a quantidade pedida de cada submatéria.
            </p>
          )}

          {ehProfessor && (
            <>
              <div className={styles.toggleGrupo}>
                <button
                  type="button"
                  className={modoProfessor === 'pessoal' ? styles.toggleBotaoAtivo : styles.toggleBotao}
                  onClick={() => setModoProfessor('pessoal')}
                >
                  Fazer eu mesmo
                </button>
                <button
                  type="button"
                  className={modoProfessor === 'turma' ? styles.toggleBotaoAtivo : styles.toggleBotao}
                  onClick={() => setModoProfessor('turma')}
                >
                  Atribuir a uma turma
                </button>
              </div>

              {modoProfessor === 'turma' && (
                <>
                  <label className={styles.campo}>
                    <span className={styles.rotulo}>Título da tarefa</span>
                    <input
                      className={styles.inputTexto}
                      value={tituloTarefa}
                      onChange={(e) => setTituloTarefa(e.target.value)}
                    />
                  </label>
                  <label className={styles.campo}>
                    <span className={styles.rotulo}>Turma</span>
                    <select className={styles.select} value={turmaEscolhidaGUID} onChange={(e) => setTurmaEscolhidaGUID(e.target.value)}>
                      <option value="">Selecione a turma</option>
                      {turmas.map((t) => (
                        <option key={t.TurmaGUID} value={t.TurmaGUID}>{t.TurmaSerie} {t.TurmaNome}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.campo}>
                    <span className={styles.rotulo}>Prazo</span>
                    <input
                      type="date"
                      className={styles.inputTexto}
                      value={prazoTarefa}
                      onChange={(e) => setPrazoTarefa(e.target.value)}
                    />
                  </label>
                </>
              )}
            </>
          )}

          <button
            type="button"
            className={styles.botaoPrimario}
            onClick={() => void handleContinuarComposicao()}
            disabled={!podeContinuarComposicao}
          >
            Continuar {totalQuestoes > 0 ? `(${totalQuestoes} questões)` : ''}
          </button>
          {totalQuestoes > LIMITE_TOTAL_QUESTOES && (
            <p className={styles.erro}>Máximo de {LIMITE_TOTAL_QUESTOES} questões por simulado.</p>
          )}
        </>
      )}
    </div>
  );
}
