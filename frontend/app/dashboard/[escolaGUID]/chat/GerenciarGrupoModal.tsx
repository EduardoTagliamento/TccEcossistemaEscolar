'use client';

import { useState } from 'react';
import * as ConversaAPI from '@/lib/api/conversa.api';
import * as GrupoTarefaAPI from '@/lib/api/grupotarefa.api';
import { Icon } from './icons';
import Loader from '@/components/Loader';
import styles from './GerenciarGrupoModal.module.css';

interface GerenciarGrupoModalProps {
  aberto: boolean;
  conversa: ConversaAPI.ConversaDetalhe;
  meuGUID: string;
  meuPapelNoGrupo: ConversaAPI.MembroFuncao | null;
  isCoordenacaoOuDirecao: boolean;
  onClose: () => void;
  onAtualizado: () => void;
}

function obterIniciais(nome: string): string {
  return (
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0))
      .join('')
      .toUpperCase() || '?'
  );
}

function rotuloFuncao(funcao: ConversaAPI.MembroFuncao): string {
  switch (funcao) {
    case 'Lider':
      return 'Líder';
    case 'Representante':
      return 'Representante';
    case 'Vice-Representante':
      return 'Vice-Representante';
    default:
      return 'Membro';
  }
}

/**
 * Gestão de grupo do chat — só as 4 ações de papel já existentes no backend
 * (definir/remover Representante e Vice-Representante) e, em grupos de
 * Tarefa, o "expulsar" que já existe no módulo de Tarefa Compartilhada
 * (`grupotarefa.api.ts`, reaproveitado aqui, não reimplementado). Grupos de
 * Turma nunca têm expulsão — só saem por transferência de turma ou saída da
 * escola (fluxo de outro módulo), confirmado com o usuário.
 */
export default function GerenciarGrupoModal({
  aberto,
  conversa,
  meuGUID,
  meuPapelNoGrupo,
  isCoordenacaoOuDirecao,
  onClose,
  onAtualizado,
}: GerenciarGrupoModalProps) {
  const [guidEmAcao, setGuidEmAcao] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  if (!aberto) return null;

  const ehTurma = conversa.ConversaGrupoTipo === 'Turma';
  const souRepresentante = meuPapelNoGrupo === 'Representante';
  const souLiderTarefa = !ehTurma && meuPapelNoGrupo === 'Lider';

  const executar = async (guid: string, acao: () => Promise<void>) => {
    setGuidEmAcao(guid);
    setErro('');
    try {
      await acao();
      onAtualizado();
    } catch (erroAcao: any) {
      setErro(erroAcao?.message || 'Erro ao executar ação');
    } finally {
      setGuidEmAcao(null);
    }
  };

  const handleDefinirRepresentante = (guid: string) =>
    executar(guid, () => ConversaAPI.definirRepresentante(conversa.ConversaGUID, guid));

  const handleRemoverRepresentante = (guid: string) =>
    executar(guid, () => ConversaAPI.removerRepresentante(conversa.ConversaGUID));

  const handleDefinirVice = (guid: string) =>
    executar(guid, () => ConversaAPI.definirViceRepresentante(conversa.ConversaGUID, guid));

  const handleRemoverVice = (guid: string) =>
    executar(guid, () => ConversaAPI.removerViceRepresentante(conversa.ConversaGUID, guid));

  // Nota: usuarioxgrupotarefa (tabela dona de GrupoTarefaAPI.expulsarMembro)
  // também teve sua FK migrada pra UsuarioGUID na mesma migração de schema —
  // o cluster de grupos/projetos/tarefas está atualizando esse endpoint em
  // paralelo para aceitar GUID. conversa_grupo_membro não guarda mais CPF,
  // então GUID é o único identificador disponível aqui.
  const handleExpulsar = (guid: string, nome: string) => {
    if (!conversa.ConversaGrupoRefGUID) return;
    if (!confirm(`Expulsar ${nome} do grupo? Essa pessoa passa a ter um grupo próprio.`)) return;
    return executar(guid, () => GrupoTarefaAPI.expulsarMembro(conversa.ConversaGrupoRefGUID!, guid));
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(evento) => evento.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3>Gerenciar grupo</h3>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={18} />
          </button>
        </div>

        {erro && <p className={styles.erro}>{erro}</p>}

        <div className={styles.lista}>
          {(conversa.Membros || []).map((membro) => {
            const ehEuMesmo = membro.UsuarioGUID === meuGUID;
            const emAcao = guidEmAcao === membro.UsuarioGUID;

            return (
              <div key={membro.UsuarioGUID} className={styles.membroItem}>
                <span className={styles.avatar}>{obterIniciais(membro.UsuarioNome)}</span>
                <span className={styles.membroInfo}>
                  <span className={styles.membroNome}>
                    {membro.UsuarioNome}
                    {ehEuMesmo && <span className={styles.voceTag}> (você)</span>}
                  </span>
                  <span className={styles.membroFuncao}>
                    {(membro.MembroFuncao === 'Representante' || membro.MembroFuncao === 'Vice-Representante' || membro.MembroFuncao === 'Lider') && (
                      <Icon name="shield" size={12} />
                    )}
                    {rotuloFuncao(membro.MembroFuncao)}
                  </span>
                </span>

                <div className={styles.acoes}>
                  {emAcao ? (
                    <Loader size={16} inline />
                  ) : (
                    <>
                      {ehTurma && isCoordenacaoOuDirecao && membro.MembroFuncao !== 'Lider' && (
                        membro.MembroFuncao === 'Representante' ? (
                          <button type="button" onClick={() => handleRemoverRepresentante(membro.UsuarioGUID)}>
                            Remover representante
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleDefinirRepresentante(membro.UsuarioGUID)}>
                            Definir representante
                          </button>
                        )
                      )}

                      {((ehTurma && souRepresentante) || souLiderTarefa) &&
                        !ehEuMesmo &&
                        membro.MembroFuncao !== 'Representante' &&
                        membro.MembroFuncao !== 'Lider' &&
                        (membro.MembroFuncao === 'Vice-Representante' ? (
                          <button type="button" onClick={() => handleRemoverVice(membro.UsuarioGUID)}>
                            Remover vice
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleDefinirVice(membro.UsuarioGUID)}>
                            Definir vice
                          </button>
                        ))}

                      {souLiderTarefa && !ehEuMesmo && (
                        <button
                          type="button"
                          className={styles.acaoPerigo}
                          onClick={() => handleExpulsar(membro.UsuarioGUID, membro.UsuarioNome)}
                          aria-label={`Expulsar ${membro.UsuarioNome}`}
                        >
                          <Icon name="user-x" size={14} /> Expulsar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
