'use client';

import { useState } from 'react';
import { useConvitesPendentes } from '@/lib/convitegrupotarefa/useConviteGrupoTarefaQueries';
import { useAceitarConvite, useRecusarConvite } from '@/lib/convitegrupotarefa/useConviteGrupoTarefaMutations';
import styles from './ConvitesPendentesModal.module.css';

interface ConvitesPendentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConviteRespondido: () => void;
}

export default function ConvitesPendentesModal({
  isOpen,
  onClose,
  onConviteRespondido
}: ConvitesPendentesModalProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const convitesQuery = useConvitesPendentes(isOpen);
  const convites = convitesQuery.data ?? [];
  const loading = convitesQuery.isLoading;
  const aceitarConviteMutation = useAceitarConvite();
  const recusarConviteMutation = useRecusarConvite();

  const handleAceitar = async (conviteGUID: string) => {
    setProcessando(conviteGUID);
    setErro(null);
    try {
      await aceitarConviteMutation.mutateAsync(conviteGUID);
      alert('Convite aceito! Você agora faz parte do grupo.');
      onConviteRespondido();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao aceitar convite');
    } finally {
      setProcessando(null);
    }
  };

  const handleRecusar = async (conviteGUID: string) => {
    if (!confirm('Deseja recusar este convite?')) return;

    setProcessando(conviteGUID);
    setErro(null);
    try {
      await recusarConviteMutation.mutateAsync(conviteGUID);
      alert('Convite recusado.');
    } catch (err: any) {
      setErro(err?.message || 'Erro ao recusar convite');
    } finally {
      setProcessando(null);
    }
  };

  if (!isOpen) return null;

  const convitesRecebidos = convites.filter(c => c.ConviteTipo === 'Convite');
  const solicitacoesEnviadas = convites.filter(c => c.ConviteTipo === 'Solicitacao');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📬 Convites e Solicitações</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          {erro && <p className={styles.error}>{erro}</p>}

          {loading ? (
            <p className={styles.loading}>Carregando...</p>
          ) : (
            <>
              {/* Convites Recebidos */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Convites Recebidos ({convitesRecebidos.length})
                </h3>
                {convitesRecebidos.length === 0 ? (
                  <p className={styles.empty}>Nenhum convite pendente</p>
                ) : (
                  <div className={styles.convitesList}>
                    {convitesRecebidos.map((convite) => (
                      <div key={convite.ConviteGUID} className={styles.conviteCard}>
                        <div className={styles.conviteInfo}>
                          <h4 className={styles.tarefaTitulo}>{convite.TarefaTitulo}</h4>
                          <p className={styles.grupoNome}>
                            Grupo: {convite.GrupoNome || `Grupo de ${convite.LiderNome}`}
                          </p>
                          <p className={styles.lider}>
                            Líder: {convite.LiderNome}
                          </p>
                          <p className={styles.membros}>
                            {convite.TotalMembros} / {convite.MaxPessoas} membros
                          </p>
                          <p className={styles.prazo}>
                            Prazo: {new Date(convite.TarefaPrazoData).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className={styles.acoes}>
                          <button
                            onClick={() => handleAceitar(convite.ConviteGUID)}
                            disabled={processando === convite.ConviteGUID}
                            className={styles.btnAceitar}
                          >
                            {processando === convite.ConviteGUID ? '...' : '✅ Aceitar'}
                          </button>
                          <button
                            onClick={() => handleRecusar(convite.ConviteGUID)}
                            disabled={processando === convite.ConviteGUID}
                            className={styles.btnRecusar}
                          >
                            {processando === convite.ConviteGUID ? '...' : '❌ Recusar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Solicitações Enviadas */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Solicitações Enviadas ({solicitacoesEnviadas.length})
                </h3>
                {solicitacoesEnviadas.length === 0 ? (
                  <p className={styles.empty}>Nenhuma solicitação pendente</p>
                ) : (
                  <div className={styles.convitesList}>
                    {solicitacoesEnviadas.map((solicitacao) => (
                      <div key={solicitacao.ConviteGUID} className={styles.conviteCard}>
                        <div className={styles.conviteInfo}>
                          <h4 className={styles.tarefaTitulo}>{solicitacao.TarefaTitulo}</h4>
                          <p className={styles.grupoNome}>
                            Grupo: {solicitacao.GrupoNome || `Grupo de ${solicitacao.LiderNome}`}
                          </p>
                          <p className={styles.lider}>
                            Líder: {solicitacao.LiderNome}
                          </p>
                          <p className={styles.status}>⏳ Aguardando resposta do líder</p>
                        </div>
                        <div className={styles.acoes}>
                          <button
                            onClick={() => handleRecusar(solicitacao.ConviteGUID)}
                            disabled={processando === solicitacao.ConviteGUID}
                            className={styles.btnCancelar}
                          >
                            {processando === solicitacao.ConviteGUID ? '...' : 'Cancelar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
