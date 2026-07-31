'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useProjeto } from '@/lib/projeto/useProjetoQueries';
import { useGrupo } from '@/lib/grupoprojeto/useGrupoProjetoQueries';
import {
  useAdicionarMembro,
  useAtualizarGrupo,
  useAtualizarPontuacao,
  useEntrarGrupo,
  useExpulsarMembro,
  useSairGrupo,
  useTransferirLideranca,
} from '@/lib/grupoprojeto/useGrupoProjetoMutations';
import { useSolicitarEntrada } from '@/lib/convitegrupoprojeto/useConviteGrupoProjetoMutations';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import styles from './page.module.css';

export default function GrupoProjetoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const projetoGUIDParam = params?.projetoGUID;
  const projetoGUID = Array.isArray(projetoGUIDParam) ? projetoGUIDParam[0] : projetoGUIDParam || '';
  const grupoGUIDParam = params?.grupoGUID;
  const grupoGUID = Array.isArray(grupoGUIDParam) ? grupoGUIDParam[0] : grupoGUIDParam || '';

  const [erro, setErro] = useState<string | null>(null);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [acaoMensagem, setAcaoMensagem] = useState<string | null>(null);
  const [novoCPF, setNovoCPF] = useState('');
  const [pontuacaoInput, setPontuacaoInput] = useState('');

  const projetoQuery = useProjeto(usuario ? projetoGUID : undefined);
  const projeto = projetoQuery.data ?? null;
  const grupoQuery = useGrupo(grupoGUID);
  const grupo = grupoQuery.data ?? null;
  const loading = projetoQuery.isLoading || grupoQuery.isLoading;

  const entrarGrupoMutation = useEntrarGrupo();
  const solicitarEntradaMutation = useSolicitarEntrada();
  const sairGrupoMutation = useSairGrupo();
  const expulsarMembroMutation = useExpulsarMembro();
  const transferirLiderancaMutation = useTransferirLideranca();
  const atualizarGrupoMutation = useAtualizarGrupo();
  const adicionarMembroMutation = useAdicionarMembro();
  const atualizarPontuacaoMutation = useAtualizarPontuacao();

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
    }
  }, [usuario, authLoading, router]);

  useEffect(() => {
    if (projetoQuery.error) {
      setErro(projetoQuery.error instanceof Error ? projetoQuery.error.message : 'Falha ao carregar grupo');
    }
  }, [projetoQuery.error]);

  useEffect(() => {
    if (grupo) {
      setPontuacaoInput(grupo.GrupoProjetoPontuacao?.toString() || '');
    }
  }, [grupo]);

  const souLider = grupo?.UsuarioCPFLider === usuario?.UsuarioCPF;
  const souCriadorProjeto = projeto?.UsuarioCPFCriador === usuario?.UsuarioCPF;
  const souMembro = grupo?.Membros.some((m) => m.UsuarioCPF === usuario?.UsuarioCPF) ?? false;

  const executar = async (acao: () => Promise<void>, mensagemSucesso: string) => {
    setAcaoErro(null);
    setAcaoMensagem(null);
    try {
      await acao();
      setAcaoMensagem(mensagemSucesso);
    } catch (err: any) {
      setAcaoErro(err?.message || 'Falha ao executar ação');
    }
  };

  const handleEntrar = () => executar(() => entrarGrupoMutation.mutateAsync(grupoGUID), 'Você entrou no grupo!');

  const handleSolicitar = () => executar(async () => {
    await solicitarEntradaMutation.mutateAsync(grupoGUID);
  }, 'Solicitação enviada ao líder!');

  const handleSair = () => {
    if (!confirm('Tem certeza que deseja sair do grupo?')) return;
    void executar(() => sairGrupoMutation.mutateAsync(grupoGUID), 'Você saiu do grupo.');
  };

  const handleExpulsar = (cpf: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    void executar(() => expulsarMembroMutation.mutateAsync({ grupoGUID, cpf }), 'Membro removido.');
  };

  const handleTransferir = (cpf: string) => {
    if (!confirm('Tem certeza que deseja transferir a liderança?')) return;
    void executar(() => transferirLiderancaMutation.mutateAsync({ grupoGUID, novoLiderCPF: cpf }), 'Liderança transferida.');
  };

  const handleToggleVisibilidade = () => {
    if (!grupo) return;
    const novaVisibilidade = grupo.GrupoProjetoVisibilidade === 'Aberto' ? 'Fechado' : 'Aberto';
    void executar(
      () => atualizarGrupoMutation.mutateAsync({ grupoGUID, dados: { GrupoProjetoVisibilidade: novaVisibilidade } }),
      `Grupo agora está ${novaVisibilidade}.`
    );
  };

  const handleAdicionarMembro = (event: FormEvent) => {
    event.preventDefault();
    if (!novoCPF.trim()) return;
    void executar(async () => {
      await adicionarMembroMutation.mutateAsync({ grupoGUID, usuarioCPF: novoCPF.trim() });
      setNovoCPF('');
    }, 'Membro adicionado.');
  };

  const handleAtribuirPontuacao = (event: FormEvent) => {
    event.preventDefault();
    const pontuacao = Number(pontuacaoInput);
    if (isNaN(pontuacao) || pontuacao < 0) {
      setAcaoErro('Pontuação inválida');
      return;
    }
    void executar(() => atualizarPontuacaoMutation.mutateAsync({ grupoGUID, pontuacao }), 'Pontuação atribuída.');
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '3rem 0' }}>
          <Loader />
          <p className={styles.loading}>Carregando grupo...</p>
        </div>
      </div>
    );
  }

  if (erro || !grupo || !projeto) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{erro || 'Grupo não encontrado'}</p>
        <Link href={`/dashboard/${escolaGUID}/projetos/${projetoGUID}`} className={styles.backLink}>
          ← Voltar ao Projeto
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/dashboard/${escolaGUID}/projetos/${projetoGUID}`} className={styles.backLink}>
          ← Voltar ao Projeto
        </Link>
      </header>

      <section className={styles.grupoInfo}>
        <div className={styles.tituloRow}>
          <h1>{grupo.GrupoProjetoNome || `Grupo de ${grupo.NomeLider}`}</h1>
          <span className={`${styles.visibilidadeBadge} ${grupo.GrupoProjetoVisibilidade === 'Aberto' ? styles.aberto : styles.fechado}`}>
            {grupo.GrupoProjetoVisibilidade}
          </span>
        </div>
        <p className={styles.proposta}>{grupo.GrupoProjetoProposta}</p>
        <p className={styles.meta}>
          {grupo.TotalMembros} / {grupo.LimiteMaximo} membros
          {grupo.GrupoProjetoPontuacao !== null && (
            <> · <Icon name="star" size={14} color="var(--gold-500)" /> Pontuação: {grupo.GrupoProjetoPontuacao}</>
          )}
        </p>

        {souLider && !projeto.ProjetoStatus.includes('Encerrado') && (
          <button onClick={handleToggleVisibilidade} className={styles.secondaryBtn}>
            Tornar {grupo.GrupoProjetoVisibilidade === 'Aberto' ? 'Fechado' : 'Aberto'}
          </button>
        )}
      </section>

      {acaoErro && <p className={styles.error}>{acaoErro}</p>}
      {acaoMensagem && <p className={styles.sucesso}>{acaoMensagem}</p>}

      {!souMembro && projeto.ProjetoStatus === 'Aberto' && (
        <section className={styles.acoesEntrada}>
          {grupo.GrupoProjetoVisibilidade === 'Aberto' && grupo.PodeEntrar && (
            <button onClick={handleEntrar} className={styles.primaryBtn}>Entrar no grupo</button>
          )}
          {grupo.GrupoProjetoVisibilidade === 'Fechado' && (
            <button onClick={handleSolicitar} className={styles.primaryBtn}>Solicitar entrada</button>
          )}
        </section>
      )}

      <section className={styles.membrosSection}>
        <h2>Membros</h2>
        <ul className={styles.membrosList}>
          {grupo.Membros.map((membro) => (
            <li key={membro.UsuarioCPF} className={styles.membroItem}>
              <span>
                {membro.UsuarioNome} {membro.IsLider && (
                  <span className={styles.liderTag}>
                    <Icon name="award" size={12} /> Líder
                  </span>
                )}
              </span>
              <div className={styles.membroAcoes}>
                {souLider && !membro.IsLider && (
                  <>
                    <button onClick={() => handleTransferir(membro.UsuarioCPF)} className={styles.linkBtn}>
                      Tornar líder
                    </button>
                    <button onClick={() => handleExpulsar(membro.UsuarioCPF)} className={styles.linkBtnDanger}>
                      Remover
                    </button>
                  </>
                )}
                {souCriadorProjeto && !souLider && (
                  <button onClick={() => handleExpulsar(membro.UsuarioCPF)} className={styles.linkBtnDanger}>
                    Remover (criador do projeto)
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {souMembro && (
          <button onClick={handleSair} className={styles.secondaryBtnDanger}>
            Sair do grupo
          </button>
        )}
      </section>

      {souCriadorProjeto && (
        <section className={styles.criadorSection}>
          <h2>Ações do criador do projeto</h2>

          <form onSubmit={handleAdicionarMembro} className={styles.inlineForm}>
            <input
              type="text"
              placeholder="CPF do aluno (somente números)"
              value={novoCPF}
              onChange={(e) => setNovoCPF(e.target.value)}
            />
            <button type="submit" className={styles.primaryBtn}>Adicionar membro</button>
          </form>

          <form onSubmit={handleAtribuirPontuacao} className={styles.inlineForm}>
            <input
              type="number"
              min={0}
              step="0.1"
              placeholder="Pontuação"
              value={pontuacaoInput}
              onChange={(e) => setPontuacaoInput(e.target.value)}
            />
            <button type="submit" className={styles.primaryBtn}>Atribuir pontuação</button>
          </form>
        </section>
      )}
    </div>
  );
}
