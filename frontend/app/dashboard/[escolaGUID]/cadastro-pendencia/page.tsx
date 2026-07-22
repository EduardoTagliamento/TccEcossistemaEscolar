'use client';

/**
 * Tela de Cadastro de Pendências — visível só a Coordenação/Secretaria/Direção
 * (gate real é o backend, que retorna 403 para os demais papéis; aqui só não
 * linkamos na navbar para os outros — ver `_components/DashboardNavbar.tsx`).
 *
 * Padrão de formulário/estado extraído de
 * `frontend/app/dashboard/[escolaGUID]/cadastro-evento/page.tsx` (que por sua
 * vez segue `frontend/app/dashboard/[escolaGUID]/cadastro/TarefaForm.tsx`):
 * um objeto de form controlado, `editingGUID` alternando entre modo
 * criação/edição, lista de registros existentes abaixo do form com ações
 * inline, feedback via `alert()`.
 *
 * Seletor de destinatário: não existe hoje no projeto um componente/endpoint
 * genérico de "buscar todos os usuários de uma escola com nome" (confirmado:
 * `GET /api/escolaxusuarioxfuncao` devolve `UsuarioCPF`/`FuncaoNome`, mas não
 * `UsuarioNome`). Em vez de fazer N+1 lookups em `/api/usuario/:CPF`, esta
 * tela reaproveita os endpoints que já resolvem "usuários com nome desta
 * escola" para os dois papéis mais realistas como destinatário de pendência
 * (aluno pedagógico, professor administrativo): `AlunoAPI.listarAlunos` e
 * `ProfessorAPI.listarProfessores`. Coordenação/Secretaria/Direção não
 * aparecem como opção — quem cria a pendência normalmente não a destina a
 * si mesmo/outro admin; se isso vier a ser necessário, um endpoint dedicado
 * de busca de membros da escola deve ser criado no backend.
 */

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { converterParaBrasil, converterDoBrasil } from '@/lib/timezone-utils';
import {
  Pendencia,
  criarPendencia,
  atualizarPendencia,
  excluirPendencia,
  listarPendencias,
} from '@/lib/api/pendencia.api';
import * as AlunoAPI from '@/lib/api/aluno.api';
import * as ProfessorAPI from '@/lib/api/professor.api';
import styles from './page.module.css';

interface MembroEscola {
  UsuarioCPF: string;
  UsuarioNome: string;
  papel: 'Aluno' | 'Professor';
}

/**
 * Data padrão do formulário: amanhã às 23:59 — precisa ser sempre futura
 * (`PendenciaPrazoData` é validado como futuro tanto na criação quanto na
 * atualização quando alterado, ver `docs/routes/pendencia-api.md`).
 */
function obterDataPadrao(): string {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(23, 59, 0, 0);
  const ano = amanha.getFullYear();
  const mes = String(amanha.getMonth() + 1).padStart(2, '0');
  const dia = String(amanha.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T23:59`;
}

export default function CadastroPendenciaPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [membrosEscola, setMembrosEscola] = useState<MembroEscola[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingGUID, setEditingGUID] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    UsuarioCPFDestino: '',
    PendenciaTitulo: '',
    PendenciaConteudo: '',
    PendenciaPrazoData: obterDataPadrao(),
  });

  const [buscaDestinatario, setBuscaDestinatario] = useState('');

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario && escolaGUID) {
      void carregarMembros();
      void carregarPendencias();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, authLoading, escolaGUID]);

  const carregarMembros = async () => {
    try {
      const [resultadoAlunos, resultadoProfessores] = await Promise.all([
        AlunoAPI.listarAlunos({ EscolaGUID: escolaGUID }),
        ProfessorAPI.listarProfessores({ EscolaGUID: escolaGUID }),
      ]);
      const alunos: MembroEscola[] = resultadoAlunos.alunos.map((a) => ({
        UsuarioCPF: a.usuario.UsuarioCPF,
        UsuarioNome: a.usuario.UsuarioNome,
        papel: 'Aluno',
      }));
      const professores: MembroEscola[] = resultadoProfessores.professores.map((p) => ({
        UsuarioCPF: p.UsuarioCPF,
        UsuarioNome: p.UsuarioNome,
        papel: 'Professor',
      }));
      setMembrosEscola([...alunos, ...professores]);
    } catch (err) {
      console.error('Erro ao carregar membros da escola:', err);
    }
  };

  const carregarPendencias = async () => {
    setLoading(true);
    setErro(null);
    try {
      const resultado = await listarPendencias({ EscolaGUID: escolaGUID });
      setPendencias(resultado.pendencias);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar pendências');
    } finally {
      setLoading(false);
    }
  };

  const nomePorCPF = useMemo(() => {
    const mapa = new Map<string, string>();
    membrosEscola.forEach((m) => mapa.set(m.UsuarioCPF, m.UsuarioNome));
    return mapa;
  }, [membrosEscola]);

  const resultadosBusca = useMemo(() => {
    const termo = buscaDestinatario.trim().toLowerCase();
    if (!termo || form.UsuarioCPFDestino) return [];
    return membrosEscola
      .filter((m) => m.UsuarioNome.toLowerCase().includes(termo))
      .slice(0, 8);
  }, [buscaDestinatario, membrosEscola, form.UsuarioCPFDestino]);

  const selecionarDestinatario = (membro: MembroEscola) => {
    setForm((prev) => ({ ...prev, UsuarioCPFDestino: membro.UsuarioCPF }));
    setBuscaDestinatario('');
  };

  const limparDestinatario = () => {
    setForm((prev) => ({ ...prev, UsuarioCPFDestino: '' }));
    setBuscaDestinatario('');
  };

  const limparFormulario = () => {
    setEditingGUID(null);
    setForm({
      UsuarioCPFDestino: '',
      PendenciaTitulo: '',
      PendenciaConteudo: '',
      PendenciaPrazoData: obterDataPadrao(),
    });
    setBuscaDestinatario('');
  };

  const editarPendencia = (pendencia: Pendencia) => {
    setEditingGUID(pendencia.PendenciaGUID);
    setForm({
      UsuarioCPFDestino: pendencia.UsuarioCPF,
      PendenciaTitulo: pendencia.PendenciaTitulo,
      PendenciaConteudo: pendencia.PendenciaConteudo || '',
      PendenciaPrazoData: converterDoBrasil(pendencia.PendenciaPrazoData),
    });
    setBuscaDestinatario('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!editingGUID && !form.UsuarioCPFDestino) {
      alert('Selecione um destinatário para a pendência.');
      return;
    }

    setSubmitting(true);
    setErro(null);

    try {
      if (editingGUID) {
        await atualizarPendencia(editingGUID, {
          PendenciaTitulo: form.PendenciaTitulo,
          PendenciaConteudo: form.PendenciaConteudo || null,
          PendenciaPrazoData: converterParaBrasil(form.PendenciaPrazoData),
        });
        alert('Pendência atualizada com sucesso!');
      } else {
        await criarPendencia({
          UsuarioCPFDestino: form.UsuarioCPFDestino,
          EscolaGUID: escolaGUID,
          PendenciaTitulo: form.PendenciaTitulo,
          PendenciaConteudo: form.PendenciaConteudo || undefined,
          PendenciaPrazoData: converterParaBrasil(form.PendenciaPrazoData),
        });
        alert('Pendência criada com sucesso!');
      }

      limparFormulario();
      await carregarPendencias();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar pendência');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcluir = async (pendenciaGUID: string) => {
    if (!confirm('Deseja realmente excluir esta pendência? Esta ação não pode ser desfeita.')) return;
    try {
      await excluirPendencia(pendenciaGUID);
      await carregarPendencias();
    } catch (err: any) {
      alert(err?.message || 'Erro ao excluir pendência');
    }
  };

  const obterStatus = (pendencia: Pendencia): { texto: string; classe: string } => {
    if (pendencia.PendenciaFeito) return { texto: 'Feito', classe: styles.badgeFeito };
    const atrasada = new Date(pendencia.PendenciaPrazoData) < new Date();
    if (atrasada) return { texto: 'Atrasada', classe: styles.badgeAtrasada };
    return { texto: 'Pendente', classe: styles.badgePendente };
  };

  const destinatarioSelecionadoNome = form.UsuarioCPFDestino ? nomePorCPF.get(form.UsuarioCPFDestino) : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Cadastro de Pendências</h1>
          <p className={styles.subtitulo}>
            Crie lembretes/avisos direcionados a um único aluno ou professor da escola.
          </p>
        </div>
      </header>

      {erro && <p className={styles.erro}>{erro}</p>}

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>
          {editingGUID ? 'Editar Pendência' : 'Nova Pendência'}
        </h2>

        <form onSubmit={onSubmit}>
          <div className={styles.campoContainer}>
            <label className={styles.label} htmlFor="pendenciaDestinatario">Destinatário *</label>
            {editingGUID ? (
              <input
                id="pendenciaDestinatario"
                className={styles.inputFull}
                value={nomePorCPF.get(form.UsuarioCPFDestino) || form.UsuarioCPFDestino}
                disabled
              />
            ) : (
              <>
                <input
                  id="pendenciaDestinatario"
                  className={styles.inputFull}
                  value={buscaDestinatario}
                  onChange={(e) => setBuscaDestinatario(e.target.value)}
                  placeholder="Digite o nome do aluno ou professor..."
                  autoComplete="off"
                />
                {resultadosBusca.length > 0 && (
                  <ul className={styles.resultadosBusca}>
                    {resultadosBusca.map((membro) => (
                      <li key={membro.UsuarioCPF}>
                        <button
                          type="button"
                          className={styles.resultadoItem}
                          onClick={() => selecionarDestinatario(membro)}
                        >
                          <span>{membro.UsuarioNome}</span>
                          <span className={styles.resultadoItemPapel}>{membro.papel}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {buscaDestinatario.trim() !== '' && !form.UsuarioCPFDestino && resultadosBusca.length === 0 && (
                  <ul className={styles.resultadosBusca}>
                    <li className={styles.resultadosVazio}>Nenhum aluno ou professor encontrado.</li>
                  </ul>
                )}
                {destinatarioSelecionadoNome && (
                  <span className={styles.destinatarioSelecionado}>
                    {destinatarioSelecionadoNome}
                    <button
                      type="button"
                      className={styles.destinatarioSelecionadoLimpar}
                      onClick={limparDestinatario}
                      aria-label="Remover destinatário selecionado"
                    >
                      ×
                    </button>
                  </span>
                )}
              </>
            )}
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label} htmlFor="pendenciaTitulo">Título *</label>
            <input
              id="pendenciaTitulo"
              className={styles.inputFull}
              value={form.PendenciaTitulo}
              onChange={(e) => setForm((prev) => ({ ...prev, PendenciaTitulo: e.target.value }))}
              minLength={3}
              maxLength={128}
              required
            />
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label} htmlFor="pendenciaConteudo">Conteúdo</label>
            <textarea
              id="pendenciaConteudo"
              className={styles.textarea}
              value={form.PendenciaConteudo}
              onChange={(e) => setForm((prev) => ({ ...prev, PendenciaConteudo: e.target.value }))}
              maxLength={1024}
            />
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label} htmlFor="pendenciaPrazo">Prazo *</label>
            <input
              id="pendenciaPrazo"
              type="datetime-local"
              className={styles.inputFull}
              value={form.PendenciaPrazoData}
              onChange={(e) => setForm((prev) => ({ ...prev, PendenciaPrazoData: e.target.value }))}
              required
            />
            <p className={styles.hint}>O prazo precisa estar no futuro.</p>
          </div>

          <div className={styles.rodape}>
            <button type="submit" className={styles.botaoSalvar} disabled={submitting}>
              {submitting ? 'Salvando...' : editingGUID ? 'Atualizar Pendência' : 'Criar Pendência'}
            </button>
            {editingGUID && (
              <button type="button" className={styles.botaoSecundario} onClick={limparFormulario}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Pendências cadastradas</h2>

        {loading ? (
          <p className={styles.info}>Carregando...</p>
        ) : pendencias.length === 0 ? (
          <p className={styles.info}>Nenhuma pendência cadastrada ainda.</p>
        ) : (
          <ul className={styles.lista}>
            {pendencias.map((pendencia) => {
              const status = obterStatus(pendencia);
              return (
                <li key={pendencia.PendenciaGUID} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardTituloLinha}>
                      <strong className={styles.cardTitulo}>{pendencia.PendenciaTitulo}</strong>
                      <span className={`${styles.badge} ${status.classe}`}>{status.texto}</span>
                    </div>
                    <p className={styles.cardDestinatario}>
                      Destinatário: {nomePorCPF.get(pendencia.UsuarioCPF) || pendencia.UsuarioCPF}
                    </p>
                    <p className={styles.cardData}>
                      Prazo: {new Date(pendencia.PendenciaPrazoData).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" className={styles.botaoAcao} onClick={() => editarPendencia(pendencia)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.botaoAcaoPerigo}
                      onClick={() => handleExcluir(pendencia.PendenciaGUID)}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
