'use client';

import { useState, useEffect } from 'react';
import { useEnviarConvite } from '@/lib/convitegrupotarefa/useConviteGrupoTarefaMutations';
import { listarAlunosDisponiveis, AlunoDisponivel } from '@/lib/api/convitegrupotarefa.api';
import styles from './ConviteGrupoModal.module.css';

type Aluno = AlunoDisponivel;

interface ConviteGrupoModalProps {
  isOpen: boolean;
  onClose: () => void;
  grupoGUID: string;
  turmaGUID: string;
  onConviteEnviado: () => void;
}

export default function ConviteGrupoModal({
  isOpen,
  onClose,
  grupoGUID,
  turmaGUID,
  onConviteEnviado
}: ConviteGrupoModalProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const enviarConviteMutation = useEnviarConvite();
  const enviando = enviarConviteMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      carregarAlunosDisponiveis();
    }
  }, [isOpen, grupoGUID, turmaGUID]);

  const carregarAlunosDisponiveis = async () => {
    setLoading(true);
    setErro(null);
    try {
      const lista = await listarAlunosDisponiveis(grupoGUID);
      setAlunos(lista);
    } catch (err: any) {
      setErro(err?.message || 'Erro ao carregar alunos');
    } finally {
      setLoading(false);
    }
  };

  const enviarConvite = async (cpf: string | null) => {
    if (!cpf) return;
    setErro(null);
    try {
      await enviarConviteMutation.mutateAsync({ grupoGUID, cpfConvidado: cpf });
      alert('Convite enviado com sucesso!');
      onConviteEnviado();
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao enviar convite');
    }
  };

  const alunosFiltrados = alunos.filter(aluno =>
    aluno.UsuarioNome.toLowerCase().includes(filtro.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Convidar Membro</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <input
            type="text"
            placeholder="Buscar aluno por nome..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className={styles.searchInput}
          />

          {erro && <p className={styles.error}>{erro}</p>}

          {loading ? (
            <p className={styles.loading}>Carregando alunos...</p>
          ) : (
            <div className={styles.alunosList}>
              {alunosFiltrados.length === 0 ? (
                <p className={styles.empty}>Nenhum aluno disponível</p>
              ) : (
                alunosFiltrados.map((aluno) => (
                  <div key={aluno.UsuarioGUID} className={styles.alunoCard}>
                    <div className={styles.alunoInfo}>
                      <div className={styles.alunoAvatar}>
                        {aluno.UsuarioNome.charAt(0)}
                      </div>
                      <div>
                        <p className={styles.alunoNome}>{aluno.UsuarioNome}</p>
                        {aluno.UsuarioEmail && (
                          <p className={styles.alunoEmail}>{aluno.UsuarioEmail}</p>
                        )}
                        {aluno.TemMembros && (
                          <span className={styles.badgeTemMembros}>
                            👥 Tem membros no grupo
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => enviarConvite(aluno.UsuarioCPF)}
                      disabled={enviando || aluno.TemMembros || !aluno.UsuarioCPF}
                      className={styles.btnConvidar}
                      title={
                        aluno.TemMembros
                          ? 'Aluno tem membros no próprio grupo'
                          : !aluno.UsuarioCPF
                            ? 'Aluno sem CPF cadastrado'
                            : 'Enviar convite'
                      }
                    >
                      {enviando ? '...' : 'Convidar'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
