'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import * as ConteudoAPI from '@/lib/api/conteudo.api';
import * as MateriasModuloAPI from '@/lib/api/materiasmodulo.api';
import type { ItemCategoria } from '@/lib/api/materiasmodulo.api';
import * as AnexoAPI from '@/lib/api/anexo.api';
import * as TarefaAcademicaAPI from '@/lib/api/tarefaacademica.api';
import { carregarYoutubeIframeAPI, YOUTUBE_PLAYER_STATE } from '@/lib/youtube/youtubeIframeApi';
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

interface VisualizadorItemModalProps {
  item: ItemCategoria;
  ehProfessor: boolean;
  escolaGUID: string;
  onFechar: () => void;
  onProgressoAtualizado: () => void;
}

export default function VisualizadorItemModal({ item, ehProfessor, escolaGUID, onFechar, onProgressoAtualizado }: VisualizadorItemModalProps) {
  const [carregando, setCarregando] = useState(true);
  const [conteudo, setConteudo] = useState<ConteudoAPI.Conteudo | null>(null);
  const [tarefaDetalhe, setTarefaDetalhe] = useState<any>(null);
  const [provaDetalhe, setProvaDetalhe] = useState<any>(null);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const [arquivoEntrega, setArquivoEntrega] = useState<File | null>(null);
  const [enviandoEntrega, setEnviandoEntrega] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ultimoReporte = useRef(0);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const youtubeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
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
        if (!ehProfessor && item.RefTurmaGUID) {
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
    if (item.Tipo === 'conteudo_imagem' && paginas.length > 0 && !ehProfessor) {
      const pagina = paginas[paginaAtual];
      if (pagina) {
        void MateriasModuloAPI.registrarProgressoPagina(pagina.ConteudoPaginadoArquivoGUID).then(onProgressoAtualizado);
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

  const avaliarEntrega = async (tarefaMatriculaGUID: string, notaTexto: string) => {
    const nota = Number(notaTexto);
    if (isNaN(nota) || nota < 0 || nota > 10) {
      alert('Informe uma nota entre 0 e 10.');
      return;
    }
    try {
      await MateriasModuloAPI.avaliarTarefa(tarefaMatriculaGUID, nota);
      alert('Nota atribuída com sucesso!');
      onProgressoAtualizado();
      await carregarDetalhe();
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao avaliar tarefa');
    }
  };

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.botaoFechar} onClick={onFechar}>
          <Icon name="x" size={18} />
        </button>

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

            {ehProfessor && (
              <div className={styles.listaAlunos}>
                <h3>Alunos</h3>
                {(tarefaDetalhe.MatriculasAtribuidas || []).map((m: any) => {
                  const atrasada = !m.TarefaFeito && new Date(m.TarefaPrazoData) < new Date();
                  return (
                    <div key={m.TarefaMatriculaGUID} className={styles.linhaAluno}>
                      <div className={styles.alunoInfo}>
                        <span className={styles.alunoNome}>{m.AlunoNome || m.MatriculaGUID}</span>
                        <span className={styles.alunoStatus}>
                          {m.TarefaFeito ? (
                            <><Icon name="check-circle" size={14} /> Entregue{m.TarefaRealizacaoData && ` em ${new Date(m.TarefaRealizacaoData).toLocaleDateString('pt-BR')}`}</>
                          ) : atrasada ? (
                            <><Icon name="lock" size={14} /> Atrasada</>
                          ) : (
                            <><Icon name="clock" size={14} /> Pendente</>
                          )}
                        </span>
                        {(m.AnexosEntrega || []).map((anexo: any) => (
                          <button
                            key={anexo.AnexoGUID}
                            type="button"
                            className={styles.anexoEntregado}
                            onClick={() => AnexoAPI.baixarAnexo(anexo.AnexoGUID, anexo.AnexoNomeOriginal || undefined)}
                          >
                            <Icon name="paperclip" size={12} /> {anexo.AnexoNomeOriginal || 'Arquivo enviado'}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.01}
                        defaultValue={m.TarefaNota ?? ''}
                        placeholder="Nota"
                        className={styles.inputNota}
                        onBlur={(e) => e.target.value && avaliarEntrega(m.TarefaMatriculaGUID, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
