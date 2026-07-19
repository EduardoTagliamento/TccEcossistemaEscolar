'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import * as PendenciaAPI from '@/lib/api/pendencia.api';
import * as TarefaAPI from '@/lib/api/tarefaacademica.api';
import * as NotificacaoAPI from '@/lib/api/notificacao.api';
import type { TarefaListItem } from '@/types/tarefaacademica';
import styles from './page.module.css';

interface Escola {
  EscolaGUID: string;
  EscolaNome: string;
}

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: Array<{ FuncaoId: number; Status: 'Ativo' | 'Inativo' | 'Finalizado' }>;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const { usuario, token, isLoading: authLoading } = useAuth();

  const [escola, setEscola] = useState<Escola | null>(null);
  const [funcoesEscola, setFuncoesEscola] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---------- Widgets de conteúdo real ----------
  const [pendencias, setPendencias] = useState<PendenciaAPI.Pendencia[]>([]);
  const [carregandoPendencias, setCarregandoPendencias] = useState(true);
  const [erroPendencias, setErroPendencias] = useState('');

  const [tarefas, setTarefas] = useState<TarefaListItem[]>([]);
  const [carregandoTarefas, setCarregandoTarefas] = useState(true);
  const [erroTarefas, setErroTarefas] = useState('');

  const [avisos, setAvisos] = useState<NotificacaoAPI.Notificacao[]>([]);
  const [carregandoAvisos, setCarregandoAvisos] = useState(true);
  const [erroAvisos, setErroAvisos] = useState('');

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }

    if (usuario && escolaGUID) {
      buscarEscola();
      buscarFuncoesDaEscola();
      void carregarPendencias();
      void carregarAvisos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, authLoading, escolaGUID]);

  const buscarEscola = async () => {
    setLoadError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/escola/${escolaGUID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setLoadError('Escola não encontrada ou sem permissão de acesso.');
          return;
        }
        throw new Error(data?.message || 'Erro ao buscar escola');
      }

      const escolaPayload: Escola | undefined = data?.data?.escola ?? data?.data;
      if (!escolaPayload) throw new Error('Resposta da API de escola está em formato inválido');
      setEscola(escolaPayload);
    } catch (err: any) {
      console.error('Erro ao buscar escola:', err);
      setLoadError(err?.message || 'Falha ao carregar o dashboard. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const buscarFuncoesDaEscola = async () => {
    if (!usuario) return;
    try {
      const response = await fetch(`/api/usuario/${usuario.UsuarioCPF}/escolas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) return;

      const escolas: EscolaComFuncoes[] = data?.data?.escolas || [];
      const escolaSelecionada = escolas.find((item) => item.escola.EscolaGUID === escolaGUID);
      const funcoesAtivas = (escolaSelecionada?.funcoes || [])
        .filter((funcao) => funcao.Status === 'Ativo')
        .map((funcao) => funcao.FuncaoId);
      setFuncoesEscola(funcoesAtivas);

      // "Tarefas a se esgotar" só faz sentido pra quem tem tarefas atribuídas
      // (Aluno) — mesma fonte de dados de /tarefas (listarTarefas).
      if (funcoesAtivas.includes(5)) {
        void carregarTarefas();
      } else {
        setCarregandoTarefas(false);
      }
    } catch (error) {
      console.error('Erro ao buscar funções da escola:', error);
      setFuncoesEscola([]);
      setCarregandoTarefas(false);
    }
  };

  const carregarPendencias = async () => {
    setCarregandoPendencias(true);
    setErroPendencias('');
    try {
      const resultado = await PendenciaAPI.listarPendencias({ EscolaGUID: escolaGUID, PendenciaFeito: false, limit: 5 });
      const ordenadas = [...resultado.pendencias].sort(
        (a, b) => new Date(a.PendenciaPrazoData).getTime() - new Date(b.PendenciaPrazoData).getTime()
      );
      setPendencias(ordenadas);
    } catch (erro: any) {
      setErroPendencias(erro?.message || 'Erro ao carregar pendências');
    } finally {
      setCarregandoPendencias(false);
    }
  };

  const carregarTarefas = async () => {
    setCarregandoTarefas(true);
    setErroTarefas('');
    try {
      const dados = await TarefaAPI.listarTarefas();
      const ordenadas = [...dados].sort(
        (a, b) => new Date(a.TarefaPrazoData).getTime() - new Date(b.TarefaPrazoData).getTime()
      );
      setTarefas(ordenadas.slice(0, 5));
    } catch (erro: any) {
      setErroTarefas(erro?.message || 'Erro ao carregar tarefas');
    } finally {
      setCarregandoTarefas(false);
    }
  };

  const carregarAvisos = async () => {
    setCarregandoAvisos(true);
    setErroAvisos('');
    try {
      const [lista, tipos] = await Promise.all([
        NotificacaoAPI.listarNotificacoes({ limit: 20 }),
        NotificacaoAPI.listarTipos(),
      ]);
      const categoriaPorTipo = new Map(tipos.map((tipo) => [tipo.NotificacaoTipoId, tipo.NotificacaoTipoCategoria]));
      const soAvisos = lista.filter((n) => categoriaPorTipo.get(n.NotificacaoTipoId) === 'Aviso').slice(0, 5);
      setAvisos(soAvisos);
    } catch (erro: any) {
      setErroAvisos(erro?.message || 'Erro ao carregar avisos');
    } finally {
      setCarregandoAvisos(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Não foi possível carregar o dashboard</h2>
          <p className={styles.errorText}>{loadError}</p>
          <div className={styles.errorActions}>
            <button type="button" className={styles.retryButton} onClick={() => void buscarEscola()}>
              Tentar Novamente
            </button>
            <Link href="/selecionar-escola" className={styles.changeSchoolButton}>
              Voltar para Seleção
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAluno = funcoesEscola.includes(5);

  const agora = new Date();
  const hora = agora.getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const diaSemana = capitalizar(agora.toLocaleDateString('pt-BR', { weekday: 'long' }));
  const diaMes = agora.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const primeiroNome = usuario?.UsuarioNome || '';

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <div className={styles.contentStack}>
          <section className={styles.greetingBanner}>
            <div className={styles.gridBg} aria-hidden="true" />
            <div className={styles.bannerContent}>
              <span className={styles.bannerEyebrow}>{diaSemana} · {diaMes}</span>
              <h1 className={styles.bannerTitle}>{saudacao}, {primeiroNome || 'bem-vindo'} 👋</h1>
              <p className={styles.bannerSubtitle}>
                Aqui está um resumo do que precisa da sua atenção em {escola?.EscolaNome || 'sua escola'}.
              </p>
            </div>
          </section>

          <section className={styles.widgetsGrid}>
            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <h3>Pendências</h3>
              </div>
              {carregandoPendencias ? (
                <p className={styles.widgetEstado}>Carregando...</p>
              ) : erroPendencias ? (
                <p className={styles.widgetErro}>{erroPendencias}</p>
              ) : pendencias.length === 0 ? (
                <p className={styles.widgetEstado}>Nenhuma pendência em aberto.</p>
              ) : (
                <ul className={styles.widgetLista}>
                  {pendencias.map((pendencia) => (
                    <li key={pendencia.PendenciaGUID} className={styles.widgetItem}>
                      <span className={styles.widgetItemTitulo}>{pendencia.PendenciaTitulo}</span>
                      <span className={styles.widgetItemData}>Prazo: {formatarData(pendencia.PendenciaPrazoData)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isAluno && (
              <div className={styles.widgetCard}>
                <div className={styles.widgetHeader}>
                  <h3>Tarefas a se esgotar</h3>
                  <Link href={`/dashboard/${escolaGUID}/tarefas`} className={styles.widgetVerTodas}>
                    Ver todas
                  </Link>
                </div>
                {carregandoTarefas ? (
                  <p className={styles.widgetEstado}>Carregando...</p>
                ) : erroTarefas ? (
                  <p className={styles.widgetErro}>{erroTarefas}</p>
                ) : tarefas.length === 0 ? (
                  <p className={styles.widgetEstado}>Nenhuma tarefa pendente.</p>
                ) : (
                  <ul className={styles.widgetLista}>
                    {tarefas.map((tarefa) => (
                      <li key={tarefa.TarefaGUID}>
                        <Link
                          href={`/dashboard/${escolaGUID}/tarefas/${tarefa.TarefaGUID}`}
                          className={styles.widgetItem}
                        >
                          <span className={styles.widgetItemTitulo}>{tarefa.TarefaTitulo}</span>
                          <span className={styles.widgetItemData}>Prazo: {formatarData(tarefa.TarefaPrazoData)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className={styles.widgetCard}>
              <div className={styles.widgetHeader}>
                <h3>Avisos gerais</h3>
                <Link href={`/dashboard/${escolaGUID}/notificacoes`} className={styles.widgetVerTodas}>
                  Ver todas
                </Link>
              </div>
              {carregandoAvisos ? (
                <p className={styles.widgetEstado}>Carregando...</p>
              ) : erroAvisos ? (
                <p className={styles.widgetErro}>{erroAvisos}</p>
              ) : avisos.length === 0 ? (
                <p className={styles.widgetEstado}>Nenhum aviso por aqui.</p>
              ) : (
                <ul className={styles.widgetLista}>
                  {avisos.map((aviso) => (
                    <li key={aviso.NotificacaoGUID} className={styles.widgetItem}>
                      <span className={styles.widgetItemTitulo}>{aviso.NotificacaoTitulo}</span>
                      <span className={styles.widgetItemData}>{formatarData(aviso.NotificacaoCreatedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
