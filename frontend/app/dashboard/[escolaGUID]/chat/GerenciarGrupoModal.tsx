'use client';

import { useState } from 'react';
import * as ConversaAPI from '@/lib/api/conversa.api';
import * as GrupoTarefaAPI from '@/lib/api/grupotarefa.api';
import { Icon } from './icons';
import styles from './GerenciarGrupoModal.module.css';

interface GerenciarGrupoModalProps {
  aberto: boolean;
  conversa: ConversaAPI.ConversaDetalhe;
  meuCPF: string;
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
  meuCPF,
  meuPapelNoGrupo,
  isCoordenacaoOuDirecao,
  onClose,
  onAtualizado,
}: GerenciarGrupoModalProps) {
  const [cpfEmAcao, setCpfEmAcao] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  if (!aberto) return null;

  const ehTurma = conversa.ConversaGrupoTipo === 'Turma';
  const souRepresentante = meuPapelNoGrupo === 'Representante';
  const souLiderTarefa = !ehTurma && meuPapelNoGrupo === 'Lider';

  const executar = async (cpf: string, acao: () => Promise<void>) => {
    setCpfEmAcao(cpf);
    setErro('');
    try {
      await acao();
      onAtualizado();
    } catch (erroAcao: any) {
      setErro(erroAcao?.message || 'Erro ao executar ação');
    } finally {
      setCpfEmAcao(null);
    }
  };

  const handleDefinirRepresentante = (cpf: string) =>
    executar(cpf, () => ConversaAPI.definirRepresentante(conversa.ConversaGUID, cpf));

  const handleRemoverRepresentante = (cpf: string) =>
    executar(cpf, () => ConversaAPI.removerRepresentante(conversa.ConversaGUID));

  const handleDefinirVice = (cpf: string) =>
    executar(cpf, () => ConversaAPI.definirViceRepresentante(conversa.ConversaGUID, cpf));

  const handleRemoverVice = (cpf: string) =>
    executar(cpf, () => ConversaAPI.removerViceRepresentante(conversa.ConversaGUID, cpf));

  const handleExpulsar = (cpf: string, nome: string) => {
    if (!conversa.ConversaGrupoRefGUID) return;
    if (!confirm(`Expulsar ${nome} do grupo? Essa pessoa passa a ter um grupo próprio.`)) return;
    return executar(cpf, () => GrupoTarefaAPI.expulsarMembro(conversa.ConversaGrupoRefGUID!, cpf));
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
            const ehEuMesmo = membro.UsuarioCPF === meuCPF;
            const emAcao = cpfEmAcao === membro.UsuarioCPF;

            return (
              <div key={membro.UsuarioCPF} className={styles.membroItem}>
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
                    <span className={styles.spinnerPequeno} />
                  ) : (
                    <>
                      {ehTurma && isCoordenacaoOuDirecao && membro.MembroFuncao !== 'Lider' && (
                        membro.MembroFuncao === 'Representante' ? (
                          <button type="button" onClick={() => handleRemoverRepresentante(membro.UsuarioCPF)}>
                            Remover representante
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleDefinirRepresentante(membro.UsuarioCPF)}>
                            Definir representante
                          </button>
                        )
                      )}

                      {((ehTurma && souRepresentante) || souLiderTarefa) &&
                        !ehEuMesmo &&
                        membro.MembroFuncao !== 'Representante' &&
                        membro.MembroFuncao !== 'Lider' &&
                        (membro.MembroFuncao === 'Vice-Representante' ? (
                          <button type="button" onClick={() => handleRemoverVice(membro.UsuarioCPF)}>
                            Remover vice
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleDefinirVice(membro.UsuarioCPF)}>
                            Definir vice
                          </button>
                        ))}

                      {souLiderTarefa && !ehEuMesmo && (
                        <button
                          type="button"
                          className={styles.acaoPerigo}
                          onClick={() => handleExpulsar(membro.UsuarioCPF, membro.UsuarioNome)}
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
