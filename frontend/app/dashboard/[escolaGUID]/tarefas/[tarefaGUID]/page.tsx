'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { buscarTarefa } from '@/lib/api/tarefaacademica.api';
import { buscarGrupoComMembros, atualizarNomeGrupo, expulsarMembro } from '@/lib/api/grupotarefa.api';
import { TarefaAcademica } from '@/types/tarefaacademica';
import { GrupoTarefaComMembros } from '@/types/grupotarefa';
import ConviteGrupoModal from '@/components/ConviteGrupoModal';
import TransferirLiderancaModal from '@/components/TransferirLiderancaModal';
import ConvitesPendentesModal from '@/components/ConvitesPendentesModal';
import SolicitarEntradaModal from '@/components/SolicitarEntradaModal';
import styles from './page.module.css';

export default function TarefaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, token, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const tarefaGUIDParam = params?.tarefaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const tarefaGUID = Array.isArray(tarefaGUIDParam) ? tarefaGUIDParam[0] : tarefaGUIDParam || '';

  const [tarefa, setTarefa] = useState<TarefaAcademica | null>(null);
  const [grupo, setGrupo] = useState<GrupoTarefaComMembros | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  const [modalConvite, setModalConvite] = useState(false);
  const [modalTransferir, setModalTransferir] = useState(false);
  const [modalConvitesPendentes, setModalConvitesPendentes] = useState(false);
  const [modalSolicitar, setModalSolicitar] = useState(false);
  
  const [grupoNomeEditado, setGrupoNomeEditado] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario && tarefaGUID) {
      void carregarDados();
    }
  }, [usuario, authLoading, tarefaGUID]);

  useEffect(() => {
    if (grupo) {
      setGrupoNomeEditado(grupo.GrupoNome || '');
    }
  }, [grupo]);

  const carregarDados = async () => {
    setLoading(true);
    setErro(null);
    try {
      const tarefaData = await buscarTarefa(tarefaGUID);
      setTarefa(tarefaData);

      if (tarefaData.TarefaCompartilhada && usuario) {
        try {
          const tokenStr = localStorage.getItem('@baua:token');
          const response = await fetch(`/api/grupotarefa/${tarefaGUID}`, {
            headers: { 'Authorization': `Bearer ${tokenStr}` }
          });
          const result = await response.json();
          
          if (response.ok && result.data) {
            const meuGrupo = result.data.find((g: any) => 
              g.UsuarioCPFLider === usuario.UsuarioCPF || 
              g.Membros?.some((m: any) => m.UsuarioCPF === usuario.UsuarioCPF)
            );
            
            if (meuGrupo) {
              const grupoCompleto = await buscarGrupoComMembros(meuGrupo.GrupoTarefaGUID);
              setGrupo(grupoCompleto);
            }
          }
        } catch (err) {
          console.error('Erro ao buscar grupo:', err);
        }
      }
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar tarefa');
    } finally {
      setLoading(false);
    }
  };

  const salvarNomeGrupo = async () => {
    if (!grupo || !usuarioELider) return;
    
    setSalvandoNome(true);
    try {
      await atualizarNomeGrupo(grupo.GrupoTarefaGUID, grupoNomeEditado);
      await carregarDados();
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
      await expulsarMembro(grupo.GrupoTarefaGUID, cpf);
      alert('Membro expulso do grupo.');
      await carregarDados();
    } catch (err: any) {
      alert(err?.message || 'Erro ao expulsar membro');
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Carregando detalhes da tarefa...</p>
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
            onConviteEnviado={carregarDados}
          />
          <TransferirLiderancaModal
            isOpen={modalTransferir}
            onClose={() => setModalTransferir(false)}
            grupoGUID={grupo.GrupoTarefaGUID}
            membros={grupo.Membros}
            liderAtualCPF={grupo.UsuarioCPFLider}
            onTransferido={carregarDados}
          />
        </>
      )}
      <ConvitesPendentesModal
        isOpen={modalConvitesPendentes}
        onClose={() => setModalConvitesPendentes(false)}
        onConviteRespondido={carregarDados}
      />
      {tarefa && (
        <SolicitarEntradaModal
          isOpen={modalSolicitar}
          onClose={() => setModalSolicitar(false)}
          tarefaGUID={tarefaGUID}
          onSolicitacaoEnviada={carregarDados}
        />
      )}

      <header className={styles.header}>
        <Link href={`/dashboard/${escolaGUID}/tarefas`} className={styles.backLink}>
          ← Voltar para tarefas
        </Link>
        <button
          onClick={() => setModalConvitesPendentes(true)}
          className={styles.btnNotificacoes}
        >
          📬 Convites
        </button>
      </header>

      <div className={styles.tarefaInfo}>
        <div className={styles.tarefaHeader}>
          <div className={styles.materiaIcone}>T</div>
          <div className={styles.tarefaTitulos}>
            <h1>{tarefa.TarefaTitulo}</h1>
            <p className={styles.materia}>Matéria • Professor</p>
          </div>
          {tarefa.TarefaCompartilhada && (
            <span className={styles.badgeCompartilhada}>👥 Compartilhada</span>
          )}
        </div>

        <div className={styles.tarefaDetalhes}>
          <div className={styles.detalheItem}>
            <strong>Prazo:</strong>
            <span className={atrasada ? styles.prazoAtrasado : ''}>
              📅 {prazo.toLocaleDateString('pt-BR')} às {prazo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className={styles.detalheItem}>
            <strong>Tipo de entrega:</strong>
            <span>{tarefa.TarefaTipoEntrega === 'digital' ? '💻 Digital' : '📄 Física'}</span>
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
          <h2>👥 Seu Grupo</h2>
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
                          {membro.IsLider && <span className={styles.badgeLider}>👑 Líder</span>}
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
                  ➕ Convidar Membro
                </button>
              )}

              {!usuarioELider && usuarioEstaSozinho && (
                <button 
                  className={styles.btnSolicitar}
                  onClick={() => setModalSolicitar(true)}
                >
                  🔄 Solicitar Entrada em Outro Grupo
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
                🔄 Buscar Grupo
              </button>
            </div>
          )}
        </div>
      )}

      <div className={styles.trabalhoSection}>
        <h2>
          {tarefa.TarefaCompartilhada ? '📦 Trabalho do Grupo' : '📦 Seu Trabalho'}
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
                📎 Adicionar Arquivo
              </button>
              <button className={styles.btnConcluir} disabled>
                ✅ Concluir e Enviar
              </button>
            </div>

            {tarefa.TarefaCompartilhada && (
              <p className={styles.warningText}>
                ⚠️ Ao concluir, todos os membros do grupo terão a tarefa marcada como feita.
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
            <h2>📋 Pendências Individuais</h2>
            {usuarioELider && (
              <button className={styles.btnNovaPendencia}>
                ➕ Nova Pendência
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
