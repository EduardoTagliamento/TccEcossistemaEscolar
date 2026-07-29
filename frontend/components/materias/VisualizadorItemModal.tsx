'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import * as ConteudoAPI from '@/lib/api/conteudo.api';
import * as MateriasModuloAPI from '@/lib/api/materiasmodulo.api';
import * as AnexoAPI from '@/lib/api/anexo.api';
import type { ItemCategoria } from '@/lib/api/materiasmodulo.api';
import * as TarefaAcademicaAPI from '@/lib/api/tarefaacademica.api';
import { carregarYoutubeIframeAPI, YOUTUBE_PLAYER_STATE } from '@/lib/youtube/youtubeIframeApi';
import { exportarParaExcel } from '@/lib/exportarExcel';
import styles from './VisualizadorItemModal.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function extrairYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? match[1] : null;
}

type AbaAvaliacao = 'pendentes' | 'avaliados' | 'atrasados' | 'sem_postagem';

// Atrasado é checado ANTES de avaliado: o scheduler zera automaticamente
// quem perde o prazo sem entregar (TarefaFeito continua false, só ganha
// TarefaNota=0) — sem essa ordem, esses caem em "avaliados" e ficam
// indistinguíveis de uma correção manual do professor.
function categorizarAluno(m: any): AbaAvaliacao {
  const atrasada = !m.TarefaFeito && new Date(m.TarefaPrazoData) < new Date();
  if (atrasada) return 'atrasados';
  if (m.TarefaNota !== null && m.TarefaNota !== undefined) return 'avaliados';
  if (m.TarefaFeito) return 'pendentes';
  return 'sem_postagem';
}

interface VisualizadorItemModalProps {
  item: ItemCategoria;
  ehProfessor: boolean;
  escolaGUID: string;
  turmaGUID: string;
  onFechar: () => void;
  onProgressoAtualizado: () => void;
  /** Ícone de lápis (só professor) — fecha este visualizador e abre o modal de edição. */
  onEditar?: () => void;
}

export default function VisualizadorItemModal({ item, ehProfessor, escolaGUID, turmaGUID, onFechar, onProgressoAtualizado, onEditar }: VisualizadorItemModalProps) {
  const [carregando, setCarregando] = useState(true);
  const [conteudo, setConteudo] = useState<ConteudoAPI.Conteudo | null>(null);
  const [tarefaDetalhe, setTarefaDetalhe] = useState<any>(null);
  const [provaDetalhe, setProvaDetalhe] = useState<any>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [arquivoEntrega, setArquivoEntrega] = useState<File | null>(null);
  const [enviandoEntrega, setEnviandoEntrega] = useState(false);
  const [abaAvaliacao, setAbaAvaliacao] = useState<AbaAvaliacao>('pendentes');
  const [alunoDetalheGUID, setAlunoDetalheGUID] = useState<string | null>(null);
  const [mostrarExclusao, setMostrarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [mostrarEstatisticas, setMostrarEstatisticas] = useState(false);
  const [estatisticas, setEstatisticas] = useState<MateriasModuloAPI.EstatisticasItem | null>(null);
  const [carregandoEstatisticas, setCarregandoEstatisticas] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ultimoReporte = useRef(0);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setAbaAvaliacao('pendentes');
    setAlunoDetalheGUID(null);
    setMostrarEstatisticas(false);
    setEstatisticas(null);
    void carregarDetalhe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.ItemGUID]);

  const carregarDetalhe = async () => {
    try {
      setCarregando(true);
      if (item.Tipo.startsWith('conteudo_')) {
        const dados = await ConteudoAPI.buscarConteudo(item.ItemGUID);
        setConteudo(dados);
        if (item.Tipo === 'conteudo_texto') {
          await MateriasModuloAPI.registrarProgressoTexto(item.ItemGUID);
          onProgressoAtualizado();
        }
      } else if (item.Tipo === 'tarefa_digital' || item.Tipo === 'tarefa_presencial') {
        // Uma linha de TarefaAcademica é compartilhada por N alunos da turma —
        // minhaMatricula=true restringe a resposta à atribuição do próprio
        // aluno (professor continua vendo a turma inteira).
        const query = ehProfessor ? '' : '?minhaMatricula=true';
        const response = await fetch(`${API_URL}/tarefa/${item.ItemGUID}${query}`, { headers: getHeaders() });
        const resultado = await response.json();
        setTarefaDetalhe(resultado?.data?.tarefa);
      } else if (item.Tipo === 'prova') {
        const response = await fetch(`${API_URL}/prova/${item.ItemGUID}`, { headers: getHeaders() });
        const resultado = await response.json();
        setProvaDetalhe(resultado?.data?.prova);
        // Sem gate de ehProfessor — mesmo padrão de texto/vídeo (nunca checam
        // o papel aqui): o backend já resolve a matrícula pelo CPF autenticado
        // e devolve 404 (silencioso, pego pelo catch abaixo) se não houver
        // nenhuma. Gatear por ehProfessor deixava de registrar progresso pra
        // contas com os dois papéis (professor + aluno), que têm matrícula
        // válida mas eram tratadas só como professor aqui.
        if (item.RefTurmaGUID) {
          await MateriasModuloAPI.registrarVisualizacaoProva(item.RefTurmaGUID);
          onProgressoAtualizado();
        }
      }
    } catch (erro) {
      console.error('Erro ao carregar item:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const agora = Date.now();
    if (agora - ultimoReporte.current < 5000) return;
    ultimoReporte.current = agora;
    void MateriasModuloAPI.registrarProgressoVideo(item.ItemGUID, video.currentTime, video.duration).then(onProgressoAtualizado);
  };

  const handleVideoEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    void MateriasModuloAPI.registrarProgressoVideo(item.ItemGUID, video.duration, video.duration).then(onProgressoAtualizado);
  };

  const reportarProgressoYoutube = (concluido: boolean) => {
    const player = youtubePlayerRef.current;
    if (!player || typeof player.getDuration !== 'function') return;
    const duracao = player.getDuration();
    if (!duracao) return;
    const segundosAssistidos = concluido ? duracao : player.getCurrentTime();
    void MateriasModuloAPI.registrarProgressoVideo(item.ItemGUID, segundosAssistidos, duracao).then(onProgressoAtualizado);
  };

  const handleYoutubeStateChange = (event: any) => {
    if (event.data === YOUTUBE_PLAYER_STATE.PLAYING) {
      if (youtubeIntervalRef.current) return;
      youtubeIntervalRef.current = setInterval(() => reportarProgressoYoutube(false), 5000);
    } else {
      if (youtubeIntervalRef.current) {
        clearInterval(youtubeIntervalRef.current);
        youtubeIntervalRef.current = null;
      }
      if (event.data === YOUTUBE_PLAYER_STATE.ENDED) {
        reportarProgressoYoutube(true);
      }
    }
  };

  // Instancia o player oficial da YouTube IFrame API (em vez de um <iframe>
  // cru) sempre que o conteúdo carregado for um vídeo por link do YouTube —
  // é o que permite reportar progresso de reprodução, algo que um <iframe>
  // simples não expõe de jeito nenhum.
  useEffect(() => {
    if (item.Tipo !== 'conteudo_video' || !conteudo?.Cronometrado) return;
    const origem = conteudo.Cronometrado;
    if (origem.OrigemTipo !== 'link' || !origem.LinkUrl) return;
    const youtubeId = extrairYoutubeId(origem.LinkUrl);
    if (!youtubeId) return;

    let cancelado = false;

    void carregarYoutubeIframeAPI().then((YT) => {
      if (cancelado || !youtubeContainerRef.current) return;
      youtubePlayerRef.current = new YT.Player(youtubeContainerRef.current, {
        videoId: youtubeId,
        playerVars: { rel: 0 },
        events: { onStateChange: handleYoutubeStateChange },
      });
    });

    return () => {
      cancelado = true;
      if (youtubeIntervalRef.current) {
        clearInterval(youtubeIntervalRef.current);
        youtubeIntervalRef.current = null;
      }
      youtubePlayerRef.current?.destroy?.();
      youtubePlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conteudo?.ConteudoGUID]);

  const paginas = conteudo?.Paginado?.Arquivos.slice().sort((a, b) => a.Ordem - b.Ordem) || [];

  useEffect(() => {
    // Sem gate de ehProfessor — mesmo motivo do registro de visualização de
    // prova acima: o backend já resolve a matrícula pelo CPF, gatear aqui só
    // quebrava contas com os dois papéis (professor + aluno).
    if (item.Tipo === 'conteudo_imagem' && paginas.length > 0) {
      const pagina = paginas[paginaAtual];
      if (pagina) {
        void MateriasModuloAPI.registrarProgressoPagina(pagina.ConteudoPaginadoArquivoGUID)
          .then(onProgressoAtualizado)
          .catch(() => {
            // Sem matrícula ativa (ex.: conta só-professor abrindo o item) — no-op silencioso, mesmo padrão de texto/prova.
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaAtual, conteudo?.ConteudoGUID]);

  const marcarTarefaFeita = async (feito: boolean) => {
    try {
      const response = await fetch(`${API_URL}/tarefa/${item.ItemGUID}/marcar-feito`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ MatriculaGUID: tarefaDetalhe?.MatriculasAtribuidas?.[0]?.MatriculaGUID, TarefaFeito: feito }),
      });
      const resultado = await response.json();
      if (!resultado.success) throw new Error(resultado.message);
      onProgressoAtualizado();
      await carregarDetalhe();
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao marcar tarefa');
    }
  };

  const enviarEntregaDigital = async () => {
    const minhaAtribuicao = tarefaDetalhe?.MatriculasAtribuidas?.[0];
    if (!arquivoEntrega || !minhaAtribuicao) return;
    try {
      setEnviandoEntrega(true);
      const anexo = await AnexoAPI.uploadAnexo(arquivoEntrega, escolaGUID);
      await TarefaAcademicaAPI.enviarAnexoEntrega(item.ItemGUID, anexo.AnexoGUID);
      await TarefaAcademicaAPI.marcarComoFeito(item.ItemGUID, minhaAtribuicao.MatriculaGUID, true);
      setArquivoEntrega(null);
      onProgressoAtualizado();
      await carregarDetalhe();
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao enviar entrega');
    } finally {
      setEnviandoEntrega(false);
    }
  };

  // Conteúdo/prova são fan-out (mesmo item em N turmas via ConteudoTurma/
  // ProvaAgendadaTurma) — dá pra excluir só o vínculo desta turma ou o item
  // inteiro. Tarefa é sempre de 1 turma só (decisão de arquitetura), então
  // não tem essa escolha: exclui direto.
  const excluirItem = async (todasAsTurmas: boolean) => {
    setExcluindo(true);
    try {
      if (item.Tipo.startsWith('conteudo_')) {
        if (todasAsTurmas) {
          await ConteudoAPI.excluirConteudo(item.ItemGUID);
        } else {
          await ConteudoAPI.removerConteudoDeTurma(item.ItemGUID, turmaGUID);
        }
      } else if (item.Tipo === 'prova') {
        const url = todasAsTurmas
          ? `${API_URL}/prova/${item.ItemGUID}`
          : `${API_URL}/prova/${item.ItemGUID}/turma/${turmaGUID}`;
        const response = await fetch(url, { method: 'DELETE', headers: getHeaders() });
        const resultado = await response.json();
        if (!resultado.success) throw new Error(resultado.message);
      } else {
        const response = await fetch(`${API_URL}/tarefa/${item.ItemGUID}`, { method: 'DELETE', headers: getHeaders() });
        const resultado = await response.json();
        if (!resultado.success) throw new Error(resultado.message);
      }
      onProgressoAtualizado();
      onFechar();
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao excluir item');
      setExcluindo(false);
    }
  };

  const alternarEstatisticas = async () => {
    const abrindo = !mostrarEstatisticas;
    setMostrarEstatisticas(abrindo);
    if (!abrindo || estatisticas || carregandoEstatisticas) return;
    try {
      setCarregandoEstatisticas(true);
      const dados = await MateriasModuloAPI.buscarEstatisticasItem(item.Tipo, item.ItemGUID, turmaGUID);
      setEstatisticas(dados);
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao carregar estatísticas');
      setMostrarEstatisticas(false);
    } finally {
      setCarregandoEstatisticas(false);
    }
  };

  const exportarEstatisticasExcel = () => {
    if (!estatisticas) return;
    const linhas = estatisticas.Ranking.map((aluno, indice) => ({
      Posição: indice + 1,
      Nome: aluno.AlunoNome,
      MatriculaGUID: aluno.MatriculaGUID,
      'Percentual (%)': aluno.Percentual,
      Nota: aluno.Nota ?? '',
    }));
    // Sanitiza pro nome do arquivo — qualquer caractere fora de a-Z0-9 (acento,
    // espaço, símbolo) já cai fora, não precisa de um passo separado de acento.
    const tituloItem = tarefaDetalhe?.TarefaTitulo || conteudo?.ConteudoTitulo || provaDetalhe?.ProvaDescricao || 'estatisticas';
    const nomeBase = tituloItem.replace(/[^a-zA-Z0-9]+/g, '-');
    exportarParaExcel(`estatisticas-${nomeBase}`, 'Estatísticas', linhas);
  };

  const avaliarEntrega = async (tarefaMatriculaGUID: string, notaTexto: string) => {
    const nota = Number(notaTexto);
    if (isNaN(nota) || nota < 0 || nota > 10) {
      alert('Informe uma nota entre 0 e 10.');
      return;
    }
    try {
      await MateriasModuloAPI.avaliarTarefa(tarefaMatriculaGUID, nota);
      onProgressoAtualizado();
      await carregarDetalhe();
      // O aluno acabou de sair de "pendentes" — segue a mesma pessoa,
      // agora na aba "avaliados", em vez de sumir da tela.
      setAbaAvaliacao('avaliados');
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao avaliar tarefa');
    }
  };

  const turmasDoItem: { TurmaGUID: string; TurmaNome: string; TurmaSerie: string }[] =
    item.Tipo.startsWith('conteudo_')
      ? conteudo?.Turmas || []
      : item.Tipo === 'prova'
        ? provaDetalhe?.TurmasAtribuidasDetalhe || []
        : [];

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.acoesHeader}>
          {ehProfessor && !carregando && (
            <>
              <button className={styles.botaoAcaoHeader} onClick={alternarEstatisticas} title="Estatísticas da turma">
                <Icon name="bar-chart" size={16} />
              </button>
              {onEditar && (
                <button className={styles.botaoAcaoHeader} onClick={onEditar} title="Editar">
                  <Icon name="edit" size={16} />
                </button>
              )}
              <button
                className={styles.botaoAcaoHeader}
                onClick={() => setMostrarExclusao((atual) => !atual)}
                title="Excluir"
              >
                <Icon name="trash" size={16} />
              </button>
            </>
          )}
          <button className={styles.botaoFechar} onClick={onFechar}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {mostrarEstatisticas && (
          <div className={styles.painelEstatisticas} onClick={(e) => e.stopPropagation()}>
            {carregandoEstatisticas && <p className={styles.carregando}>Carregando estatísticas...</p>}
            {!carregandoEstatisticas && estatisticas && (
              <>
                <div className={styles.estatisticasCabecalho}>
                  <p className={styles.estatisticasMedia}>
                    <Icon name="bar-chart" size={16} /> Média da turma: <strong>{estatisticas.MediaPercentual}%</strong>
                  </p>
                  {estatisticas.Ranking.length > 0 && (
                    <button className={styles.botaoExportar} onClick={exportarEstatisticasExcel} title="Exportar para Excel">
                      <Icon name="download" size={14} /> Exportar
                    </button>
                  )}
                </div>
                {estatisticas.Ranking.length === 0 ? (
                  <p className={styles.hintFuturo}>Nenhum aluno matriculado ativamente nesta turma.</p>
                ) : (
                  <ol className={styles.rankingLista}>
                    {estatisticas.Ranking.map((aluno, indice) => (
                      <li key={aluno.MatriculaGUID} className={styles.rankingItem}>
                        <span className={styles.rankingPosicao}>{indice + 1}º</span>
                        <span className={styles.rankingNome}>{aluno.AlunoNome}</span>
                        <span className={styles.rankingValor}>
                          {aluno.Nota !== null ? `Nota ${aluno.Nota.toFixed(2)} · ` : ''}
                          {aluno.Percentual}%
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </div>
        )}

        {mostrarExclusao && (
          <div className={styles.painelExclusao} onClick={(e) => e.stopPropagation()}>
            {item.Tipo.startsWith('tarefa_') ? (
              <>
                <p>Excluir esta tarefa? Essa ação não pode ser desfeita.</p>
                <div className={styles.painelExclusaoAcoes}>
                  <button disabled={excluindo} onClick={() => excluirItem(true)} className={styles.botaoExcluirConfirmar}>
                    {excluindo ? 'Excluindo...' : 'Excluir'}
                  </button>
                  <button disabled={excluindo} onClick={() => setMostrarExclusao(false)}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <p>
                  Este item está em {turmasDoItem.length} turma{turmasDoItem.length === 1 ? '' : 's'}
                  {turmasDoItem.length > 0 && (
                    <>: {turmasDoItem.map((t) => `${t.TurmaSerie} ${t.TurmaNome}`).join(', ')}</>
                  )}
                  . Excluir de onde?
                </p>
                <div className={styles.painelExclusaoAcoes}>
                  <button disabled={excluindo} onClick={() => excluirItem(false)}>
                    {excluindo ? 'Excluindo...' : 'Só desta turma'}
                  </button>
                  <button disabled={excluindo} onClick={() => excluirItem(true)} className={styles.botaoExcluirConfirmar}>
                    {excluindo ? 'Excluindo...' : 'De todas as turmas'}
                  </button>
                  <button disabled={excluindo} onClick={() => setMostrarExclusao(false)}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        )}

        {carregando && <p className={styles.carregando}>Carregando...</p>}

        {!carregando && conteudo && item.Tipo === 'conteudo_video' && conteudo.Cronometrado && (
          <div>
            <h2 className={styles.titulo}>{conteudo.ConteudoTitulo}</h2>
            {conteudo.Cronometrado.OrigemTipo === 'link' && conteudo.Cronometrado.LinkUrl ? (
              extrairYoutubeId(conteudo.Cronometrado.LinkUrl) ? (
                <div ref={youtubeContainerRef} className={styles.video} />
              ) : (
                <a href={conteudo.Cronometrado.LinkUrl} target="_blank" rel="noreferrer">
                  Abrir link do vídeo
                </a>
              )
            ) : (
              <video
                ref={videoRef}
                className={styles.video}
                src={conteudo.Cronometrado.ArquivoUrl || undefined}
                controls
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
              />
            )}
          </div>
        )}

        {!carregando && conteudo && item.Tipo === 'conteudo_texto' && conteudo.Texto && (
          <div>
            <h2 className={styles.titulo}>{conteudo.ConteudoTitulo}</h2>
            <div className={styles.textoConteudo} dangerouslySetInnerHTML={{ __html: conteudo.Texto.ConteudoHtml }} />
          </div>
        )}

        {!carregando && conteudo && item.Tipo === 'conteudo_imagem' && paginas.length > 0 && (
          <div>
            <h2 className={styles.titulo}>{conteudo.ConteudoTitulo}</h2>
            <img className={styles.imagem} src={paginas[paginaAtual]?.ArquivoUrl} alt={`Página ${paginaAtual + 1}`} />
            <div className={styles.navegacaoPaginas}>
              <button disabled={paginaAtual === 0} onClick={() => setPaginaAtual((p) => p - 1)}>
                <Icon name="chevron-left" size={18} />
              </button>
              <span>{paginaAtual + 1} / {paginas.length}</span>
              <button disabled={paginaAtual === paginas.length - 1} onClick={() => setPaginaAtual((p) => p + 1)}>
                <Icon name="chevron-right" size={18} />
              </button>
            </div>
          </div>
        )}

        {!carregando && provaDetalhe && (
          <div>
            <h2 className={styles.titulo}><Icon name="award" size={20} /> {provaDetalhe.ProvaDescricao || 'Prova'}</h2>
            <p className={styles.dataProva}>Data: {new Date(provaDetalhe.ProvaData).toLocaleString('pt-BR')}</p>
            <p className={styles.hintFuturo}>Recomendação de estudo por IA: em breve.</p>
          </div>
        )}

        {!carregando && tarefaDetalhe && (
          <div>
            <h2 className={styles.titulo}>{tarefaDetalhe.TarefaTitulo}</h2>
            <p>{tarefaDetalhe.TarefaConteudo}</p>
            <p className={styles.dataProva}>Prazo: {new Date(tarefaDetalhe.TarefaPrazoData).toLocaleString('pt-BR')}</p>

            {!ehProfessor && tarefaDetalhe.TarefaCompartilhada && (
              <Link href={`/dashboard/${escolaGUID}/tarefas/${item.ItemGUID}`} className={styles.linkGrupo}>
                <Icon name="users" size={16} /> Gerenciar grupo (convidar, transferir liderança...)
              </Link>
            )}

            {!ehProfessor && (
              <div className={styles.acoesAluno}>
                {item.Tipo === 'tarefa_presencial' ? (
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={Boolean(tarefaDetalhe.MatriculasAtribuidas?.[0]?.TarefaFeito)}
                      onChange={(e) => marcarTarefaFeita(e.target.checked)}
                    />
                    Marcar como concluída
                  </label>
                ) : (
                  <div className={styles.entregaDigital}>
                    {tarefaDetalhe.MatriculasAtribuidas?.[0]?.TarefaFeito && (
                      <p className={styles.statusEntregue}>
                        <Icon name="check-circle" size={16} /> Entregue
                        {tarefaDetalhe.MatriculasAtribuidas[0].TarefaRealizacaoData &&
                          ` em ${new Date(tarefaDetalhe.MatriculasAtribuidas[0].TarefaRealizacaoData).toLocaleString('pt-BR')}`}
                      </p>
                    )}
                    {(tarefaDetalhe.MatriculasAtribuidas?.[0]?.AnexosEntrega || []).map((anexo: any) => (
                      <button
                        key={anexo.AnexoGUID}
                        type="button"
                        className={styles.anexoEntregado}
                        onClick={() => AnexoAPI.baixarAnexo(anexo.AnexoGUID, anexo.AnexoNomeOriginal || undefined)}
                      >
                        <Icon name="paperclip" size={14} /> {anexo.AnexoNomeOriginal || 'Arquivo enviado'}
                      </button>
                    ))}
                    <label className={styles.inputArquivo}>
                      <Icon name="paperclip" size={16} />
                      {arquivoEntrega ? arquivoEntrega.name : 'Escolher arquivo'}
                      <input
                        type="file"
                        onChange={(e) => setArquivoEntrega(e.target.files?.[0] || null)}
                        hidden
                      />
                    </label>
                    <button
                      className={styles.botaoEnviarEntrega}
                      disabled={!arquivoEntrega || enviandoEntrega}
                      onClick={enviarEntregaDigital}
                    >
                      {enviandoEntrega
                        ? 'Enviando...'
                        : tarefaDetalhe.MatriculasAtribuidas?.[0]?.TarefaFeito
                          ? 'Enviar outro arquivo'
                          : 'Enviar e concluir'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {ehProfessor && (() => {
              const alunos: any[] = tarefaDetalhe.MatriculasAtribuidas || [];
              const grupos: Record<AbaAvaliacao, any[]> = {
                pendentes: alunos.filter((m) => categorizarAluno(m) === 'pendentes'),
                avaliados: alunos.filter((m) => categorizarAluno(m) === 'avaliados'),
                atrasados: alunos.filter((m) => categorizarAluno(m) === 'atrasados'),
                sem_postagem: alunos.filter((m) => categorizarAluno(m) === 'sem_postagem'),
              };
              const listaAtual = grupos[abaAvaliacao];
              const indiceAtual = alunoDetalheGUID
                ? listaAtual.findIndex((m) => m.TarefaMatriculaGUID === alunoDetalheGUID)
                : -1;
              const alunoAtual = indiceAtual >= 0 ? listaAtual[indiceAtual] : null;
              const alunoAtualAtrasado = Boolean(
                alunoAtual && !alunoAtual.TarefaFeito && new Date(alunoAtual.TarefaPrazoData) < new Date()
              );

              const abrirAba = (aba: AbaAvaliacao) => {
                setAbaAvaliacao(aba);
                setAlunoDetalheGUID(null);
              };

              const renderizarStatus = (m: any) => {
                const atrasada = !m.TarefaFeito && new Date(m.TarefaPrazoData) < new Date();
                if (m.TarefaFeito) {
                  return (
                    <>
                      <Icon name="check-circle" size={14} /> Entregue
                      {m.TarefaRealizacaoData && ` em ${new Date(m.TarefaRealizacaoData).toLocaleDateString('pt-BR')}`}
                    </>
                  );
                }
                if (atrasada) return <><Icon name="lock" size={14} /> Atrasada</>;
                return <><Icon name="clock" size={14} /> Pendente</>;
              };

              return (
                <div className={styles.avaliacaoBloco}>
                  <div className={styles.abasAvaliacao}>
                    <button
                      className={abaAvaliacao === 'pendentes' ? styles.abaAtiva : styles.aba}
                      onClick={() => abrirAba('pendentes')}
                    >
                      Pendentes ({grupos.pendentes.length})
                    </button>
                    <button
                      className={abaAvaliacao === 'avaliados' ? styles.abaAtiva : styles.aba}
                      onClick={() => abrirAba('avaliados')}
                    >
                      Avaliados ({grupos.avaliados.length})
                    </button>
                    <button
                      className={abaAvaliacao === 'atrasados' ? styles.abaAtiva : styles.aba}
                      onClick={() => abrirAba('atrasados')}
                    >
                      Atrasados ({grupos.atrasados.length})
                    </button>
                    <button
                      className={abaAvaliacao === 'sem_postagem' ? styles.abaAtiva : styles.aba}
                      onClick={() => abrirAba('sem_postagem')}
                    >
                      Sem postagem ({grupos.sem_postagem.length})
                    </button>
                  </div>

                  {!alunoAtual && (
                    <div className={styles.listaAlunos}>
                      {listaAtual.length === 0 && <p className={styles.hintFuturo}>Nenhum aluno nessa situação.</p>}
                      {listaAtual.map((m) => (
                        <button
                          key={m.TarefaMatriculaGUID}
                          type="button"
                          className={styles.linhaAlunoClicavel}
                          onClick={() => setAlunoDetalheGUID(m.TarefaMatriculaGUID)}
                        >
                          <div className={styles.alunoInfo}>
                            <span className={styles.alunoNome}>{m.AlunoNome || m.MatriculaGUID}</span>
                            <span className={styles.alunoStatus}>{renderizarStatus(m)}</span>
                          </div>
                          <Icon name="chevron-right" size={16} />
                        </button>
                      ))}
                    </div>
                  )}

                  {alunoAtual && (
                    <div className={styles.detalheAluno}>
                      <button type="button" className={styles.botaoVoltarLista} onClick={() => setAlunoDetalheGUID(null)}>
                        <Icon name="chevron-left" size={14} /> Voltar à lista
                      </button>

                      <div className={styles.navegacaoPaginas}>
                        <button
                          disabled={indiceAtual <= 0}
                          onClick={() => setAlunoDetalheGUID(listaAtual[indiceAtual - 1].TarefaMatriculaGUID)}
                        >
                          <Icon name="chevron-left" size={16} />
                        </button>
                        <span>{indiceAtual + 1} / {listaAtual.length}</span>
                        <button
                          disabled={indiceAtual >= listaAtual.length - 1}
                          onClick={() => setAlunoDetalheGUID(listaAtual[indiceAtual + 1].TarefaMatriculaGUID)}
                        >
                          <Icon name="chevron-right" size={16} />
                        </button>
                      </div>

                      <h3 className={styles.alunoNomeDetalhe}>{alunoAtual.AlunoNome || alunoAtual.MatriculaGUID}</h3>
                      <span className={styles.alunoStatus}>{renderizarStatus(alunoAtual)}</span>

                      <div className={styles.anexosDetalhe}>
                        {(alunoAtual.AnexosEntrega || []).length > 0 ? (
                          alunoAtual.AnexosEntrega.map((anexo: any) => (
                            <button
                              key={anexo.AnexoGUID}
                              type="button"
                              className={styles.anexoEntregado}
                              onClick={() => AnexoAPI.baixarAnexo(anexo.AnexoGUID, anexo.AnexoNomeOriginal || undefined)}
                            >
                              <Icon name="paperclip" size={14} /> {anexo.AnexoNomeOriginal || 'Arquivo enviado'}
                            </button>
                          ))
                        ) : (
                          <p className={styles.hintFuturo}>
                            {alunoAtual.TarefaFeito ? 'Sem anexo (entrega presencial ou marcada manualmente).' : 'Nenhum anexo enviado ainda.'}
                          </p>
                        )}
                      </div>

                      {alunoAtual.TarefaFeito ? (
                        <div className={styles.notaArea}>
                          <label htmlFor="inputNotaAluno">Nota</label>
                          <input
                            key={alunoAtual.TarefaMatriculaGUID}
                            id="inputNotaAluno"
                            type="number"
                            min={0}
                            max={10}
                            step={0.01}
                            defaultValue={alunoAtual.TarefaNota ?? ''}
                            placeholder="Nota"
                            className={styles.inputNota}
                            onBlur={(e) => e.target.value && avaliarEntrega(alunoAtual.TarefaMatriculaGUID, e.target.value)}
                          />
                        </div>
                      ) : alunoAtualAtrasado ? (
                        <p className={styles.hintFuturo}>
                          <Icon name="lock" size={14} />
                          {alunoAtual.TarefaNota !== null && alunoAtual.TarefaNota !== undefined
                            ? ` Prazo vencido sem entrega — nota zerada automaticamente (${Number(alunoAtual.TarefaNota).toFixed(2)}).`
                            : ' Prazo vencido sem entrega — a nota será zerada automaticamente em breve (verificação a cada 5 minutos).'}
                        </p>
                      ) : (
                        <p className={styles.hintFuturo}>
                          <Icon name="alert-triangle" size={14} /> Ainda não é possível avaliar — o aluno não entregou/marcou esta tarefa.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
