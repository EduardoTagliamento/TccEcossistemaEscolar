'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { buscarProjeto, encerrarProjeto } from '@/lib/api/projeto.api';
import { criarGrupo, entrarGrupo, listarGruposDoProjeto } from '@/lib/api/grupoprojeto.api';
import { GrupoProjeto, GrupoProjetoVisibilidade, Projeto } from '@/types/projeto';
import styles from './page.module.css';

export default function ProjetoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const projetoGUIDParam = params?.projetoGUID;
  const projetoGUID = Array.isArray(projetoGUIDParam) ? projetoGUIDParam[0] : projetoGUIDParam || '';

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [grupos, setGrupos] = useState<GrupoProjeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [mostrarFormGrupo, setMostrarFormGrupo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({
    GrupoProjetoNome: '',
    GrupoProjetoProposta: '',
    GrupoProjetoVisibilidade: 'Aberto' as GrupoProjetoVisibilidade
  });

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario) {
      void carregarDados();
    }
  }, [usuario, authLoading]);

  const carregarDados = async () => {
    setLoading(true);
    setErro(null);
    try {
      const [projetoDados, gruposDados] = await Promise.all([
        buscarProjeto(projetoGUID),
        listarGruposDoProjeto(projetoGUID)
      ]);
      setProjeto(projetoDados);
      setGrupos(gruposDados);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar projeto');
    } finally {
      setLoading(false);
    }
  };

  const meuGrupo = grupos.find((g) => g.Membros.some((m) => m.UsuarioCPF === usuario?.UsuarioCPF));
  const souCriador = projeto?.UsuarioCPFCriador === usuario?.UsuarioCPF;
  const projetoEncerrado = projeto?.ProjetoStatus === 'Encerrado';
  const prazoVencido = projeto ? new Date(projeto.ProjetoInscricaoPrazoData) < new Date() : false;

  const handleCriarGrupo = async (event: FormEvent) => {
    event.preventDefault();
    setAcaoErro(null);
    setSubmitting(true);
    try {
      const grupo = await criarGrupo({
        ProjetoGUID: projetoGUID,
        GrupoProjetoNome: novoGrupo.GrupoProjetoNome || undefined,
        GrupoProjetoProposta: novoGrupo.GrupoProjetoProposta,
        GrupoProjetoVisibilidade: novoGrupo.GrupoProjetoVisibilidade
      });
      router.push(`/dashboard/${escolaGUID}/projetos/${projetoGUID}/grupos/${grupo.GrupoProjetoGUID}`);
    } catch (err: any) {
      setAcaoErro(err?.message || 'Falha ao criar grupo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEntrarGrupo = async (grupoGUID: string) => {
    setAcaoErro(null);
    try {
      await entrarGrupo(grupoGUID);
      router.push(`/dashboard/${escolaGUID}/projetos/${projetoGUID}/grupos/${grupoGUID}`);
    } catch (err: any) {
      setAcaoErro(err?.message || 'Falha ao entrar no grupo');
    }
  };

  const handleEncerrarProjeto = async () => {
    if (!confirm('Tem certeza que deseja encerrar este projeto?')) return;
    try {
      await encerrarProjeto(projetoGUID);
      void carregarDados();
    } catch (err: any) {
      setAcaoErro(err?.message || 'Falha ao encerrar projeto');
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Carregando projeto...</p>
      </div>
    );
  }

  if (erro || !projeto) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{erro || 'Projeto não encontrado'}</p>
        <Link href={`/dashboard/${escolaGUID}/projetos`} className={styles.backLink}>
          ← Voltar aos Projetos
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/dashboard/${escolaGUID}/projetos`} className={styles.backLink}>
          ← Voltar aos Projetos
        </Link>
      </header>

      <section className={styles.projetoInfo}>
        <div className={styles.tituloRow}>
          <h1>{projeto.ProjetoTitulo}</h1>
          <span className={`${styles.statusBadge} ${projetoEncerrado ? styles.statusEncerrado : styles.statusAberto}`}>
            {projeto.ProjetoStatus}
          </span>
        </div>
        <p className={styles.criador}>Criado por {projeto.NomeCriador || projeto.UsuarioCPFCriador}</p>
        <p className={styles.descricao}>{projeto.ProjetoDescricao}</p>

        {projeto.ProjetoMecanicaPontuacao && (
          <div className={styles.mecanica}>
            <strong>Mecânica de pontuação:</strong>
            <p>{projeto.ProjetoMecanicaPontuacao}</p>
          </div>
        )}

        <div className={styles.metaGrid}>
          <span>👥 Grupos de {projeto.ProjetoGrupoMinPessoas} a {projeto.ProjetoGrupoMaxPessoas} pessoas</span>
          <span>📅 Inscrições até {new Date(projeto.ProjetoInscricaoPrazoData).toLocaleString('pt-BR')}</span>
          {projeto.ProjetoEntregaPrazoData && (
            <span>🏁 Entrega até {new Date(projeto.ProjetoEntregaPrazoData).toLocaleString('pt-BR')}</span>
          )}
        </div>

        {souCriador && !projetoEncerrado && (
          <button onClick={handleEncerrarProjeto} className={styles.encerrarBtn}>
            Encerrar Projeto
          </button>
        )}
      </section>

      {acaoErro && <p className={styles.error}>{acaoErro}</p>}

      <section className={styles.gruposSection}>
        <div className={styles.gruposHeader}>
          <h2>Grupos ({grupos.length})</h2>
          {!souCriador && !meuGrupo && !projetoEncerrado && !prazoVencido && (
            <button onClick={() => setMostrarFormGrupo((v) => !v)} className={styles.criarGrupoBtn}>
              {mostrarFormGrupo ? 'Cancelar' : '+ Criar meu grupo'}
            </button>
          )}
        </div>

        {mostrarFormGrupo && (
          <form onSubmit={handleCriarGrupo} className={styles.formGrupo}>
            <label>
              <span>Nome do grupo (opcional)</span>
              <input
                type="text"
                maxLength={128}
                value={novoGrupo.GrupoProjetoNome}
                onChange={(e) => setNovoGrupo({ ...novoGrupo, GrupoProjetoNome: e.target.value })}
              />
            </label>
            <label>
              <span>Proposta</span>
              <textarea
                required
                rows={3}
                maxLength={2048}
                value={novoGrupo.GrupoProjetoProposta}
                onChange={(e) => setNovoGrupo({ ...novoGrupo, GrupoProjetoProposta: e.target.value })}
              />
            </label>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  checked={novoGrupo.GrupoProjetoVisibilidade === 'Aberto'}
                  onChange={() => setNovoGrupo({ ...novoGrupo, GrupoProjetoVisibilidade: 'Aberto' })}
                />
                Aberto (qualquer aluno elegível pode entrar)
              </label>
              <label>
                <input
                  type="radio"
                  checked={novoGrupo.GrupoProjetoVisibilidade === 'Fechado'}
                  onChange={() => setNovoGrupo({ ...novoGrupo, GrupoProjetoVisibilidade: 'Fechado' })}
                />
                Fechado (só por convite/solicitação aceita)
              </label>
            </div>
            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? 'Criando...' : 'Criar Grupo'}
            </button>
          </form>
        )}

        {grupos.length === 0 ? (
          <p className={styles.empty}>Nenhum grupo criado ainda.</p>
        ) : (
          <div className={styles.gruposGrid}>
            {grupos.map((grupo) => {
              const souMembro = grupo.Membros.some((m) => m.UsuarioCPF === usuario?.UsuarioCPF);
              return (
                <div key={grupo.GrupoProjetoGUID} className={styles.grupoCard}>
                  <Link href={`/dashboard/${escolaGUID}/projetos/${projetoGUID}/grupos/${grupo.GrupoProjetoGUID}`}>
                    <h3>{grupo.GrupoProjetoNome || `Grupo de ${grupo.NomeLider}`}</h3>
                  </Link>
                  <span className={`${styles.visibilidadeBadge} ${grupo.GrupoProjetoVisibilidade === 'Aberto' ? styles.aberto : styles.fechado}`}>
                    {grupo.GrupoProjetoVisibilidade}
                  </span>
                  <p className={styles.proposta}>{grupo.GrupoProjetoProposta}</p>
                  <p className={styles.membrosCount}>{grupo.TotalMembros} / {grupo.LimiteMaximo} membros</p>
                  {grupo.GrupoProjetoPontuacao !== null && (
                    <p className={styles.pontuacao}>⭐ Pontuação: {grupo.GrupoProjetoPontuacao}</p>
                  )}
                  {!souMembro && !meuGrupo && grupo.GrupoProjetoVisibilidade === 'Aberto' && grupo.PodeEntrar && !projetoEncerrado && !prazoVencido && (
                    <button onClick={() => handleEntrarGrupo(grupo.GrupoProjetoGUID)} className={styles.entrarBtn}>
                      Entrar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
