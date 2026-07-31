'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTarefa } from '@/lib/tarefas/useTarefaQueries';
import { useGruposDaTarefa, useGrupoComMembros } from '@/lib/grupotarefa/useGrupoTarefaQueries';
import { useAtualizarNomeGrupo, useExpulsarMembro } from '@/lib/grupotarefa/useGrupoTarefaMutations';
import { grupoTarefaKeys } from '@/lib/grupotarefa/queryKeys';
import ConviteGrupoModal from '@/components/ConviteGrupoModal';
import TransferirLiderancaModal from '@/components/TransferirLiderancaModal';
import ConvitesPendentesModal from '@/components/ConvitesPendentesModal';
import SolicitarEntradaModal from '@/components/SolicitarEntradaModal';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import styles from './page.module.css';

export default function TarefaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const tarefaGUIDParam = params?.tarefaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const tarefaGUID = Array.isArray(tarefaGUIDParam) ? tarefaGUIDParam[0] : tarefaGUIDParam || '';

  const { data: tarefaBruta, isLoading: tarefaLoading, error: tarefaError } = useTarefa(usuario ? tarefaGUID : undefined);
  const tarefa = tarefaBruta ? { ...tarefaBruta, TarefaCompartilhada: Boolean(tarefaBruta.TarefaCompartilhada) } : null;
  const erro = tarefaError instanceof Error ? tarefaError.message : null;

  const queryClient = useQueryClient();

  // "Meu grupo" é resolvido em duas etapas: lista os grupos da tarefa (já vem
  // com os membros de cada um) e acha o que o usuário faz parte; só então
  // busca o detalhe completo desse grupo específico.
  const gruposQuery = useGruposDaTarefa(tarefaGUID, Boolean(tarefa?.TarefaCompartilhada) && !!usuario);
  const meuGrupoResumo = gruposQuery.data?.find(
    (g) => g.UsuarioCPFLider === usuario?.UsuarioCPF || g.Membros?.some((m) => m.UsuarioCPF === usuario?.UsuarioCPF)
  );
  const grupoDetalheQuery = useGrupoComMembros(meuGrupoResumo?.GrupoTarefaGUID);
  const grupo = grupoDetalheQuery.data ?? null;

  const recarregarGrupo = () => {
    queryClient.invalidateQueries({ queryKey: grupoTarefaKeys.all });
  };

  const atualizarNomeGrupoMutation = useAtualizarNomeGrupo();
  const expulsarMembroMutation = useExpulsarMembro();

  const [modalConvite, setModalConvite] = useState(false);
  const [modalTransferir, setModalTransferir] = useState(false);
  const [modalConvitesPendentes, setModalConvitesPendentes] = useState(false);
  const [modalSolicitar, setModalSolicitar] = useState(false);

  const [grupoNomeEditado, setGrupoNomeEditado] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
    }
  }, [usuario, authLoading, router]);

  useEffect(() => {
    if (grupo) {
      setGrupoNomeEditado(grupo.GrupoNome || '');
    }
  }, [grupo]);

  const salvarNomeGrupo = async () => {
    if (!grupo || !usuarioELider) return;

    setSalvandoNome(true);
    try {
      await atualizarNomeGrupoMutation.mutateAsync({ grupoGUID: grupo.GrupoTarefaGUID, novoNome: grupoNomeEditado });
      alert('Nome do grupo atualizado!');
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar nome');
    } finally {
      setSalvandoNome(false);
    }
  };

  const handleExpulsarMembro = async (cpf: string, nome: string) => {
    if (!grupo || !usuarioELider) return;

    if (!confirm(`Deseja expulsar ${nome} do grupo?`)) return;

    try {
      await expulsarMembroMutation.mutateAsync({ grupoGUID: grupo.GrupoTarefaGUID, membroCPF: cpf });
      alert('Membro expulso do grupo.');
    } catch (err: any) {
      alert(err?.message || 'Erro ao expulsar membro');
    }
  };

  if (authLoading || tarefaLoading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '3rem 0' }}>
          <Loader />
          <p className={styles.loading}>Carregando detalhes da tarefa...</p>
        </div>
      </div>
    );
  }

  if (erro || !tarefa) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{erro || 'Tarefa não encontrada'}</p>
        <Link href={`/dashboard/${escolaGUID}/tarefas`} className={styles.backLink}>
          ← Voltar para tarefas
        </Link>
      </div>
    );
  }

  const prazo = new Date(tarefa.TarefaPrazoData);
  const agora = new Date();
  const atrasada = prazo < agora;
  const usuarioELider = grupo && grupo.UsuarioCPFLider === usuario?.UsuarioCPF;
  const usuarioEstaSozinho = grupo && grupo.Membros.filter(m => !m.IsLider).length === 0;
  const grupoAtingiuLimite = grupo && tarefa && (grupo.Membros.length + 1) >= (tarefa.TarefaMaxPessoas || 999);

  return (
    <div className={styles.container}>
      {grupo && (
        <>
          <ConviteGrupoModal
            isOpen={modalConvite}
            onClose={() => setModalConvite(false)}
            grupoGUID={grupo.GrupoTarefaGUID}
            turmaGUID={grupo.TurmaGUID}
            onConviteEnviado={recarregarGrupo}
          />
          <TransferirLiderancaModal
            isOpen={modalTransferir}
            onClose={() => setModalTransferir(false)}
            grupoGUID={grupo.GrupoTarefaGUID}
            membros={grupo.Membros}
            liderAtualCPF={grupo.UsuarioCPFLider}
            onTransferido={recarregarGrupo}
          />
        </>
      )}
      {tarefa?.TarefaCompartilhada && (
        <>
          <ConvitesPendentesModal
            isOpen={modalConvitesPendentes}
            onClose={() => setModalConvitesPendentes(false)}
            onConviteRespondido={recarregarGrupo}
          />
          <SolicitarEntradaModal
            isOpen={modalSolicitar}
            onClose={() => setModalSolicitar(false)}
            tarefaGUID={tarefaGUID}
            onSolicitacaoEnviada={recarregarGrupo}
          />
        </>
      )}

      <header className={styles.header}>
        <Link href={`/dashboard/${escolaGUID}/tarefas`} className={styles.backLink}>
          ← Voltar para tarefas
        </Link>
        {tarefa.TarefaCompartilhada && (
          <button
            onClick={() => setModalConvitesPendentes(true)}
            className={styles.btnNotificacoes}
          >
            <Icon name="mail" size={16} color="#FFFFFF" /> Convites
          </button>
        )}
      </header>

      <div className={styles.tarefaInfo}>
        <div className={styles.tarefaHeader}>
          <div className={styles.materiaIcone}>T</div>
          <div className={styles.tarefaTitulos}>
            <h1>{tarefa.TarefaTitulo}</h1>
            <p className={styles.materia}>Matéria • Professor</p>
          </div>
          {tarefa.TarefaCompartilhada && (
            <span className={styles.badgeCompartilhada}>
              <Icon name="users" size={14} color="#FFFFFF" /> Compartilhada
            </span>
          )}
        </div>

        <div className={styles.tarefaDetalhes}>
          <div className={styles.detalheItem}>
            <strong>Prazo:</strong>
            <span className={atrasada ? styles.prazoAtrasado : ''}>
              <Icon name="calendar" size={16} /> {prazo.toLocaleDateString('pt-BR')} às {prazo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className={styles.detalheItem}>
            <strong>Tipo de entrega:</strong>
            <span>{tarefa.TarefaTipoEntrega === 'digital' ? <><Icon name="upload" size={16} /> Digital</> : <><Icon name="file-text" size={16} /> Física</>}</span>
          </div>
          {tarefa.TarefaCompartilhada && (
            <div className={styles.detalheItem}>
              <strong>Tamanho do grupo:</strong>
              <span>{tarefa.TarefaMinPessoas} - {tarefa.TarefaMaxPessoas} pessoas</span>
            </div>
          )}
        </div>

        {tarefa.TarefaConteudo && (
          <div className={styles.tarefaConteudo}>
            <h3>Descrição</h3>
            <p>{tarefa.TarefaConteudo}</p>
          </div>
        )}
      </div>

      {tarefa.TarefaCompartilhada && (
        <div className={styles.grupoSection}>
          <h2><Icon name="users" size={20} /> Seu Grupo</h2>
          {grupo ? (
            <div className={styles.grupoCard}>
              <div className={styles.grupoHeader}>
                <input
                  type="text"
                  value={grupoNomeEditado}
                  onChange={(e) => setGrupoNomeEditado(e.target.value)}
                  onBlur={salvarNomeGrupo}
                  disabled={!usuarioELider || salvandoNome}
                  placeholder="Nome do grupo"
                  className={styles.grupoNomeInput}
                />
                <span className={styles.grupoContador}>
                  {grupo.Membros.length + 1} / {tarefa.TarefaMaxPessoas} membros
                </span>
              </div>

              <div className={styles.membrosLista}>
                <h3>Membros</h3>
                {grupo.Membros.map((membro) => (
                  <div key={membro.UsuarioCPF} className={styles.membroCard}>
                    <div className={styles.membroInfo}>
                      <div className={styles.membroAvatar}>
                        {membro.UsuarioNome.charAt(0)}
                      </div>
                      <div>
                        <p className={styles.membroNome}>
                          {membro.UsuarioNome}
                          {membro.IsLider && (
                            <span className={styles.badgeLider}>
                              <Icon name="award" size={12} /> Líder
                            </span>
                          )}
                        </p>
                        {membro.UsuarioEmail && (
                          <p className={styles.membroEmail}>{membro.UsuarioEmail}</p>
                        )}
                      </div>
                    </div>
                    {usuarioELider && !membro.IsLider && (
                      <div className={styles.membroAcoes}>
                        <button
                          className={styles.btnExpulsar}
                          onClick={() => handleExpulsarMembro(membro.UsuarioCPF, membro.UsuarioNome)}
                        >
                          Expulsar
                        </button>
                        <button
                          className={styles.btnTransferir}
                          onClick={() => setModalTransferir(true)}
                        >
                          Transferir Liderança
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {usuarioELider && !grupoAtingiuLimite && (
                <button
                  className={styles.btnConvidar}
                  onClick={() => setModalConvite(true)}
                >
                  <Icon name="plus" size={16} color="#FFFFFF" /> Convidar Membro
                </button>
              )}

              {!usuarioELider && usuarioEstaSozinho && (
                <button
                  className={styles.btnSolicitar}
                  onClick={() => setModalSolicitar(true)}
                >
                  <Icon name="search" size={16} /> Solicitar Entrada em Outro Grupo
                </button>
              )}
            </div>
          ) : (
            <div className={styles.grupoPlaceholder}>
              <p>Você ainda não faz parte de um grupo para esta tarefa.</p>
              <button
                className={styles.btnSolicitar}
                onClick={() => setModalSolicitar(true)}
              >
                <Icon name="search" size={16} /> Buscar Grupo
              </button>
            </div>
          )}
        </div>
      )}

      <div className={styles.trabalhoSection}>
        <h2>
          {tarefa.TarefaCompartilhada ? <><Icon name="folder" size={20} /> Trabalho do Grupo</> : <><Icon name="folder" size={20} /> Seu Trabalho</>}
        </h2>

        {tarefa.TarefaTipoEntrega === 'digital' ? (
          <div className={styles.anexosArea}>
            <p className={styles.infoText}>
              {tarefa.TarefaCompartilhada
                ? 'Qualquer membro pode adicionar ou remover arquivos enquanto em rascunho.'
                : 'Adicione seus arquivos para envio.'}
            </p>

            <div className={styles.anexosList}>
              <p className={styles.empty}>Nenhum arquivo anexado ainda</p>
            </div>

            <div className={styles.anexosAcoes}>
              <button className={styles.btnAnexar}>
                <Icon name="paperclip" size={16} /> Adicionar Arquivo
              </button>
              <button className={styles.btnConcluir} disabled>
                <Icon name="check-circle" size={16} color="#FFFFFF" /> Concluir e Enviar
              </button>
            </div>

            {tarefa.TarefaCompartilhada && (
              <p className={styles.warningText}>
                <Icon name="alert-triangle" size={16} color="var(--gold-500)" /> Ao concluir, todos os membros do grupo terão a tarefa marcada como feita.
              </p>
            )}
          </div>
        ) : (
          <div className={styles.fisicaArea}>
            <p className={styles.infoText}>
              Esta tarefa requer entrega física.
              {tarefa.TarefaCompartilhada && ' Qualquer membro pode marcar como entregue.'}
            </p>
            <label className={styles.checkboxEntregue}>
              <input type="checkbox" />
              <span>Marcar como entregue</span>
            </label>
          </div>
        )}
      </div>

      {tarefa.TarefaCompartilhada && grupo && (
        <div className={styles.pendenciasSection}>
          <div className={styles.pendenciasHeader}>
            <h2><Icon name="file-text" size={20} /> Pendências Individuais</h2>
            {usuarioELider && (
              <button className={styles.btnNovaPendencia}>
                <Icon name="plus" size={16} color="#FFFFFF" /> Nova Pendência
              </button>
            )}
          </div>
          <div className={styles.pendenciasLista}>
            <p className={styles.empty}>Nenhuma pendência criada ainda</p>
          </div>
        </div>
      )}
    </div>
  );
}
