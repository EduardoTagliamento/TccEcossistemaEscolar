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
  useAtualizarPermissaoMembroGrupoProjeto,
  useVincularAnexoSubmissao,
  useSubmeterProjeto,
} from '@/lib/grupoprojeto/useGrupoProjetoMutations';
import { useSolicitarEntrada } from '@/lib/convitegrupoprojeto/useConviteGrupoProjetoMutations';
import { buscarUsuarioPorCPF } from '@/lib/api/usuario.api';
import { uploadAnexo } from '@/lib/api/anexo.api';
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
  const [anexosVinculados, setAnexosVinculados] = useState<string[]>([]);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);

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
  const atualizarPermissaoMutation = useAtualizarPermissaoMembroGrupoProjeto();
  const vincularAnexoMutation = useVincularAnexoSubmissao();
  const submeterProjetoMutation = useSubmeterProjeto();

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

  const souLider = grupo?.UsuarioGUIDLider === usuario?.UsuarioGUID;
  const souCriadorProjeto = projeto?.UsuarioGUIDCriador === usuario?.UsuarioGUID;
  const souMembro = grupo?.Membros.some((m) => m.UsuarioGUID === usuario?.UsuarioGUID) ?? false;
  const podeExpulsar = grupo?.MinhasPermissoes?.PodeExpulsarMembros ?? souLider;
  const podeAtualizarGrupo = grupo?.MinhasPermissoes?.PodeAtualizarGrupo ?? souLider;
  const podeSubmeter = grupo?.MinhasPermissoes?.PodeSubmeterProjeto ?? souLider;
  const jaSubmetido = Boolean(grupo?.GrupoProjetoSubmetidoEm);

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

  const handleExpulsar = (membroGUID: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    void executar(() => expulsarMembroMutation.mutateAsync({ grupoGUID, membroGUID }), 'Membro removido.');
  };

  const handleTransferir = (membroGUID: string) => {
    if (!confirm('Tem certeza que deseja transferir a liderança?')) return;
    void executar(() => transferirLiderancaMutation.mutateAsync({ grupoGUID, novoLiderGUID: membroGUID }), 'Liderança transferida.');
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
      const usuarioEncontrado = await buscarUsuarioPorCPF(novoCPF.trim());
      await adicionarMembroMutation.mutateAsync({ grupoGUID, usuarioGUID: usuarioEncontrado.UsuarioGUID });
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

  const handleTogglePermissao = (
    membroGUID: string,
    capacidade: 'PodeExpulsarMembros' | 'PodeAtualizarGrupo' | 'PodeSubmeterProjeto',
    valorAtual: boolean
  ) => {
    void executar(
      () => atualizarPermissaoMutation.mutateAsync({ grupoGUID, membroGUID, patch: { [capacidade]: !valorAtual } }),
      'Permissão atualizada.'
    );
  };

  const handleAnexarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    setAcaoErro(null);
    setEnviandoAnexo(true);
    try {
      const anexo = await uploadAnexo(arquivo, escolaGUID);
      await vincularAnexoMutation.mutateAsync({ grupoGUID, anexoGUID: anexo.AnexoGUID });
      setAnexosVinculados((atual) => [...atual, arquivo.name]);
    } catch (err: any) {
      setAcaoErro(err?.message || 'Falha ao anexar arquivo');
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const handleSubmeterProjeto = () => {
    if (!confirm('Submeter o projeto? Essa ação marca a entrega do grupo como concluída.')) return;
    void executar(() => submeterProjetoMutation.mutateAsync(grupoGUID), 'Projeto submetido com sucesso!');
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

        {podeAtualizarGrupo && !projeto.ProjetoStatus.includes('Encerrado') && (
          <button onClick={handleToggleVisibilidade} className={styles.secondaryBtn}>
            Tornar {grupo.GrupoProjetoVisibilidade === 'Aberto' ? 'Fechado' : 'Aberto'}
          </button>
        )}

        {souMembro && grupo.ConversaGUID && (
          <Link href={`/dashboard/${escolaGUID}/chat?conversa=${grupo.ConversaGUID}`} className={`${styles.secondaryBtn} ${styles.chatLink}`}>
            <Icon name="message-circle" size={14} /> Ir para o chat do grupo
          </Link>
        )}

        {jaSubmetido && (
          <p className={styles.sucesso}>
            <Icon name="check-circle" size={14} /> Projeto submetido em {new Date(grupo.GrupoProjetoSubmetidoEm as string).toLocaleString('pt-BR')}
          </p>
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
            <li key={membro.UsuarioGUID} className={styles.membroItem}>
              <span>
                {membro.UsuarioNome} {membro.IsLider && (
                  <span className={styles.liderTag}>
                    <Icon name="award" size={12} /> Líder
                  </span>
                )}
              </span>
              <div className={styles.membroAcoes}>
                {souLider && !membro.IsLider && (
                  <button onClick={() => handleTransferir(membro.UsuarioGUID)} className={styles.linkBtn}>
                    Tornar líder
                  </button>
                )}
                {podeExpulsar && !membro.IsLider && (
                  <button onClick={() => handleExpulsar(membro.UsuarioGUID)} className={styles.linkBtnDanger}>
                    Remover
                  </button>
                )}
                {souCriadorProjeto && !souLider && !podeExpulsar && (
                  <button onClick={() => handleExpulsar(membro.UsuarioGUID)} className={styles.linkBtnDanger}>
                    Remover (criador do projeto)
                  </button>
                )}
              </div>

              {souLider && !membro.IsLider && (
                <div className={styles.permissoesRow}>
                  <label className={styles.permissaoCheckbox}>
                    <input
                      type="checkbox"
                      checked={membro.Permissoes?.PodeExpulsarMembros ?? false}
                      onChange={() => handleTogglePermissao(membro.UsuarioGUID, 'PodeExpulsarMembros', membro.Permissoes?.PodeExpulsarMembros ?? false)}
                    />
                    Expulsar membros
                  </label>
                  <label className={styles.permissaoCheckbox}>
                    <input
                      type="checkbox"
                      checked={membro.Permissoes?.PodeAtualizarGrupo ?? false}
                      onChange={() => handleTogglePermissao(membro.UsuarioGUID, 'PodeAtualizarGrupo', membro.Permissoes?.PodeAtualizarGrupo ?? false)}
                    />
                    Atualizar grupo
                  </label>
                  <label className={styles.permissaoCheckbox}>
                    <input
                      type="checkbox"
                      checked={membro.Permissoes?.PodeSubmeterProjeto ?? false}
                      onChange={() => handleTogglePermissao(membro.UsuarioGUID, 'PodeSubmeterProjeto', membro.Permissoes?.PodeSubmeterProjeto ?? false)}
                    />
                    Submeter projeto
                  </label>
                </div>
              )}
            </li>
          ))}
        </ul>

        {souMembro && (
          <button onClick={handleSair} className={styles.secondaryBtnDanger}>
            Sair do grupo
          </button>
        )}
      </section>

      {souMembro && (
        <section className={styles.submissaoSection}>
          <h2>Submissão do projeto</h2>
          {jaSubmetido ? (
            <p className={styles.sucesso}>
              <Icon name="check-circle" size={14} /> Projeto já submetido — não é possível anexar novos arquivos.
            </p>
          ) : podeSubmeter ? (
            <>
              <div className={styles.anexosList}>
                {anexosVinculados.length === 0 ? (
                  <p className={styles.meta}>Nenhum arquivo anexado ainda nesta sessão.</p>
                ) : (
                  anexosVinculados.map((nome, indice) => (
                    <span key={`${nome}-${indice}`} className={styles.anexoItem}>
                      <Icon name="paperclip" size={12} /> {nome}
                    </span>
                  ))
                )}
              </div>
              <div className={styles.inlineForm}>
                <label className={styles.secondaryBtn} style={{ cursor: enviandoAnexo ? 'default' : 'pointer' }}>
                  {enviandoAnexo ? <Loader size={16} inline /> : 'Anexar arquivo'}
                  <input type="file" onChange={handleAnexarArquivo} disabled={enviandoAnexo} style={{ display: 'none' }} />
                </label>
                <button
                  onClick={handleSubmeterProjeto}
                  disabled={anexosVinculados.length === 0}
                  className={styles.primaryBtn}
                >
                  Submeter projeto
                </button>
              </div>
            </>
          ) : (
            <p className={styles.meta}>Você não tem permissão para submeter este projeto — peça ao líder para conceder essa permissão.</p>
          )}
        </section>
      )}

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
