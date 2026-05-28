'use client';

import { useState, useEffect } from 'react';
import { GrupoTarefaComMembros } from '@/types/grupotarefa';
import styles from './SolicitarEntradaModal.module.css';

interface SolicitarEntradaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarefaGUID: string;
  onSolicitacaoEnviada: () => void;
}

export default function SolicitarEntradaModal({
  isOpen,
  onClose,
  tarefaGUID,
  onSolicitacaoEnviada
}: SolicitarEntradaModalProps) {
  const [grupos, setGrupos] = useState<GrupoTarefaComMembros[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    if (isOpen) {
      carregarGruposDisponiveis();
    }
  }, [isOpen, tarefaGUID]);

  const carregarGruposDisponiveis = async () => {
    setLoading(true);
    setErro(null);
    try {
      const token = localStorage.getItem('@baua:token');
      const response = await fetch(`/api/grupotarefa/${tarefaGUID}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar grupos');
      }

      // Filtrar apenas grupos que não estão cheios
      const gruposDisponiveis = result.data.filter((g: GrupoTarefaComMembros) => {
        const totalMembros = g.Membros.length + 1; // +1 para contar o líder
        return totalMembros < 5; // TODO: pegar MaxPessoas da tarefa
      });

      setGrupos(gruposDisponiveis);
    } catch (err: any) {
      setErro(err?.message || 'Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const solicitarEntrada = async (grupoGUID: string) => {
    if (!confirm('Deseja solicitar entrada neste grupo?')) return;

    setEnviando(true);
    setErro(null);
    try {
      const token = localStorage.getItem('@baua:token');
      const response = await fetch(`/api/convitegrupotarefa/${grupoGUID}/solicitacoes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao solicitar entrada');
      }

      alert('Solicitação enviada! Aguarde aprovação do líder.');
      onSolicitacaoEnviada();
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Erro ao solicitar entrada');
    } finally {
      setEnviando(false);
    }
  };

  const gruposFiltrados = grupos.filter(g =>
    g.GrupoNome?.toLowerCase().includes(filtro.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>🔄 Solicitar Entrada em Grupo</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.info}>
            <p>
              <strong>ℹ️ Importante:</strong> Ao solicitar entrada, você está pedindo permissão ao líder do grupo. Seu grupo atual será dissolvido apenas se o líder aceitar sua solicitação.
            </p>
          </div>

          <input
            type="text"
            placeholder="Buscar grupo por nome..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className={styles.searchInput}
          />

          {erro && <p className={styles.error}>{erro}</p>}

          {loading ? (
            <p className={styles.loading}>Carregando grupos...</p>
          ) : (
            <div className={styles.gruposList}>
              {gruposFiltrados.length === 0 ? (
                <p className={styles.empty}>Nenhum grupo disponível</p>
              ) : (
                gruposFiltrados.map((grupo) => {
                  const totalMembros = grupo.Membros.length + 1; // +1 para o líder
                  const lider = grupo.Membros.find(m => m.IsLider);
                  
                  return (
                    <div key={grupo.GrupoTarefaGUID} className={styles.grupoCard}>
                      <div className={styles.grupoInfo}>
                        <h4 className={styles.grupoNome}>
                          {grupo.GrupoNome || `Grupo de ${lider?.UsuarioNome || 'Sem nome'}`}
                        </h4>
                        <p className={styles.lider}>
                          👑 Líder: {lider?.UsuarioNome || 'Desconhecido'}
                        </p>
                        <p className={styles.membros}>
                          👥 {totalMembros} / 5 membros
                        </p>
                        <div className={styles.membrosList}>
                          {grupo.Membros.slice(0, 3).map(m => (
                            <span key={m.UsuarioCPF} className={styles.membroAvatar}>
                              {m.UsuarioNome.charAt(0)}
                            </span>
                          ))}
                          {grupo.Membros.length > 3 && (
                            <span className={styles.maisAvatar}>
                              +{grupo.Membros.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => solicitarEntrada(grupo.GrupoTarefaGUID)}
                        disabled={enviando}
                        className={styles.btnSolicitar}
                      >
                        {enviando ? '...' : 'Solicitar'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
