'use client';

import { useState } from 'react';
import { MembroGrupo } from '@/types/grupotarefa';
import styles from './TransferirLiderancaModal.module.css';

interface TransferirLiderancaModalProps {
  isOpen: boolean;
  onClose: () => void;
  grupoGUID: string;
  membros: MembroGrupo[];
  liderAtualCPF: string;
  onTransferido: () => void;
}

export default function TransferirLiderancaModal({
  isOpen,
  onClose,
  grupoGUID,
  membros,
  liderAtualCPF,
  onTransferido
}: TransferirLiderancaModalProps) {
  const [cpfSelecionado, setCpfSelecionado] = useState<string | null>(null);
  const [transferindo, setTransferindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const membrosDisponiveis = membros.filter(m => !m.IsLider);

  const confirmarTransferencia = async () => {
    if (!cpfSelecionado) {
      setErro('Selecione um membro para transferir a liderança');
      return;
    }

    if (!confirm('Tem certeza? Você se tornará membro comum do grupo.')) {
      return;
    }

    setTransferindo(true);
    setErro(null);

    try {
      const token = localStorage.getItem('@baua:token');
      const response = await fetch(`/api/grupotarefa/${grupoGUID}/transferir-lider`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ NovoCPFLider: cpfSelecionado })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao transferir liderança');
      }

      alert('Liderança transferida com sucesso!');
      onTransferido();
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao transferir liderança');
    } finally {
      setTransferindo(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>👑 Transferir Liderança</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.warning}>
            <strong>⚠️ Atenção:</strong>
            <p>Ao transferir a liderança, você se tornará um membro comum do grupo e não poderá desfazer esta ação.</p>
          </div>

          {erro && <p className={styles.error}>{erro}</p>}

          {membrosDisponiveis.length === 0 ? (
            <p className={styles.empty}>Não há membros disponíveis para transferir a liderança.</p>
          ) : (
            <>
              <p className={styles.label}>Selecione o novo líder:</p>
              <div className={styles.membrosList}>
                {membrosDisponiveis.map((membro) => (
                  <label
                    key={membro.UsuarioCPF}
                    className={`${styles.membroCard} ${cpfSelecionado === membro.UsuarioCPF ? styles.selected : ''}`}
                  >
                    <input
                      type="radio"
                      name="novoLider"
                      value={membro.UsuarioCPF}
                      checked={cpfSelecionado === membro.UsuarioCPF}
                      onChange={(e) => setCpfSelecionado(e.target.value)}
                      className={styles.radio}
                    />
                    <div className={styles.membroInfo}>
                      <div className={styles.membroAvatar}>
                        {membro.UsuarioNome.charAt(0)}
                      </div>
                      <div>
                        <p className={styles.membroNome}>{membro.UsuarioNome}</p>
                        {membro.UsuarioEmail && (
                          <p className={styles.membroEmail}>{membro.UsuarioEmail}</p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button
            onClick={onClose}
            className={styles.btnCancelar}
            disabled={transferindo}
          >
            Cancelar
          </button>
          <button
            onClick={confirmarTransferencia}
            disabled={transferindo || !cpfSelecionado || membrosDisponiveis.length === 0}
            className={styles.btnConfirmar}
          >
            {transferindo ? 'Transferindo...' : 'Confirmar Transferência'}
          </button>
        </div>
      </div>
    </div>
  );
}
