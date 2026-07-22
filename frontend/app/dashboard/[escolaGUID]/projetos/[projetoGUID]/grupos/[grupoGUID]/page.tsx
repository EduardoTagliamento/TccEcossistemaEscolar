'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { buscarProjeto } from '@/lib/api/projeto.api';
import {
  adicionarMembro,
  atualizarGrupo,
  atualizarPontuacao,
  buscarGrupo,
  entrarGrupo,
  expulsarMembro,
  sairGrupo,
  transferirLideranca
} from '@/lib/api/grupoprojeto.api';
import { solicitarEntrada } from '@/lib/api/convitegrupoprojeto.api';
import { GrupoProjeto, Projeto } from '@/types/projeto';
import { Icon } from '@/components/Icon';
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

  const [grupo, setGrupo] = useState<GrupoProjeto | null>(null);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [acaoErro, setAcaoErro] = useState<string | null>(null);
  const [acaoMensagem, setAcaoMensagem] = useState<string | null>(null);
  const [novoCPF, setNovoCPF] = useState('');
  const [pontuacaoInput, setPontuacaoInput] = useState('');

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
      const [grupoDados, projetoDados] = await Promise.all([buscarGrupo(grupoGUID), buscarProjeto(projetoGUID)]);
      setGrupo(grupoDados);
      setProjeto(projetoDados);
      setPontuacaoInput(grupoDados.GrupoProjetoPontuacao?.toString() || '');
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar grupo');
    } finally {
      setLoading(false);
    }
  };

  const souLider = grupo?.UsuarioCPFLider === usuario?.UsuarioCPF;
  const souCriadorProjeto = projeto?.UsuarioCPFCriador === usuario?.UsuarioCPF;
  const souMembro = grupo?.Membros.some((m) => m.UsuarioCPF === usuario?.UsuarioCPF) ?? false;

  const executar = async (acao: () => Promise<void>, mensagemSucesso: string) => {
    setAcaoErro(null);
    setAcaoMensagem(null);
    try {
      await acao();
      setAcaoMensagem(mensagemSucesso);
      void carregarDados();
    } catch (err: any) {
      setAcaoErro(err?.message || 'Falha ao executar ação');
    }
  };

  const handleEntrar = () => executar(() => entrarGrupo(grupoGUID), 'Você entrou no grupo!');

  const handleSolicitar = () => executar(async () => {
    await solicitarEntrada(grupoGUID);
  }, 'Solicitação enviada ao líder!');

  const handleSair = () => {
    if (!confirm('Tem certeza que deseja sair do grupo?')) return;
    void executar(() => sairGrupo(grupoGUID), 'Você saiu do grupo.');
  };

  const handleExpulsar = (cpf: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    void executar(() => expulsarMembro(grupoGUID, cpf), 'Membro removido.');
  };

  const handleTransferir = (cpf: string) => {
    if (!confirm('Tem certeza que deseja transferir a liderança?')) return;
    void executar(() => transferirLideranca(grupoGUID, cpf), 'Liderança transferida.');
  };

  const handleToggleVisibilidade = () => {
    if (!grupo) return;
    const novaVisibilidade = grupo.GrupoProjetoVisibilidade === 'Aberto' ? 'Fechado' : 'Aberto';
    void executar(
      () => atualizarGrupo(grupoGUID, { GrupoProjetoVisibilidade: novaVisibilidade }),
      `Grupo agora está ${novaVisibilidade}.`
    );
  };

  const handleAdicionarMembro = (event: FormEvent) => {
    event.preventDefault();
    if (!novoCPF.trim()) return;
    void executar(async () => {
      await adicionarMembro(grupoGUID, novoCPF.trim());
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
    void executar(() => atualizarPontuacao(grupoGUID, pontuacao), 'Pontuação atribuída.');
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Carregando grupo...</p>
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
