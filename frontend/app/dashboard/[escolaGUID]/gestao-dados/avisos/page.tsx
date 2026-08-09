'use client';

/**
 * Gestão de Avisos — Direção, Coordenação e Secretaria publicam comunicados
 * pra escola inteira ou pra turmas específicas. Sem edição em v1: só criar
 * e excluir (ver plano em C:\Users\eduar\.claude\plans\enumerated-wishing-wren.md).
 *
 * Acesso restrito: FuncaoId 1 (Coordenação), 2 (Secretaria) ou 6 (Direção)
 * ativos nesta escola — mesmo padrão de checagem client-side de
 * `gestao-dados/coordenacao/page.tsx` (UX only; o backend valida de novo
 * em AvisoService.criarAviso via isCoordSecretariaOuDirecaoEmEscola).
 */

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Loader from '@/components/Loader';
import { Icon } from '@/components/Icon';
import styles from './page.module.css';

import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import * as TurmaAPI from '@/lib/api/turma.api';
import * as AnexoAPI from '@/lib/api/anexo.api';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAvisos } from '@/lib/aviso/useAvisoQueries';
import { useCriarAviso, useExcluirAviso } from '@/lib/aviso/useAvisoMutations';
import { Aviso, AvisoAbrangencia } from '@/lib/api/aviso.api';

const FUNCOES_PERMITIDAS = [1, 2, 6];

interface FuncaoEscola {
  FuncaoId: number;
  Status: 'Ativo' | 'Inativo' | 'Finalizado';
}

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: FuncaoEscola[];
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formularioVazio() {
  return {
    AvisoTitulo: '',
    AvisoConteudo: '',
    AvisoAbrangencia: 'Escola' as AvisoAbrangencia,
    turmasSelecionadas: new Set<string>(),
  };
}

export default function AvisosPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const { usuario, token } = useAuth();

  // ===== Gating: só Direção/Coordenação/Secretaria pode acessar esta tela =====
  const [verificandoPermissao, setVerificandoPermissao] = useState(true);
  const [permitido, setPermitido] = useState(false);

  const avisosQuery = useAvisos(escolaGUID, permitido);
  const avisos = avisosQuery.data ?? [];

  const [turmas, setTurmas] = useState<TurmaAPI.Turma[]>([]);
  const [carregandoTurmas, setCarregandoTurmas] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(formularioVazio());
  const [arquivoAnexo, setArquivoAnexo] = useState<File | null>(null);
  const [erroForm, setErroForm] = useState('');

  const criarAvisoMutation = useCriarAviso();
  const excluirAvisoMutation = useExcluirAviso();

  useEffect(() => {
    if (escolaGUID && usuario) {
      void verificarPermissao();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID, usuario]);

  const verificarPermissao = async () => {
    if (!usuario) return;
    try {
      setVerificandoPermissao(true);
      const response = await fetch(`/api/usuario/${usuario.UsuarioCPF}/escolas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setPermitido(false);
        return;
      }

      const escolas: EscolaComFuncoes[] = data?.data?.escolas || [];
      const escolaSelecionada = escolas.find((item) => item.escola.EscolaGUID === escolaGUID);
      const funcoesAtivas = (escolaSelecionada?.funcoes || [])
        .filter((funcao) => funcao.Status === 'Ativo')
        .map((funcao) => funcao.FuncaoId);

      setPermitido(funcoesAtivas.some((f) => FUNCOES_PERMITIDAS.includes(f)));
    } catch (error) {
      console.error('Erro ao verificar permissão de Avisos:', error);
      setPermitido(false);
    } finally {
      setVerificandoPermissao(false);
    }
  };

  const abrirModal = async () => {
    setForm(formularioVazio());
    setArquivoAnexo(null);
    setErroForm('');
    setModalAberto(true);

    if (turmas.length === 0) {
      setCarregandoTurmas(true);
      try {
        const { turmas: lista } = await TurmaAPI.listarTurmas({ EscolaGUID: escolaGUID, TurmaStatus: 'Ativa' });
        setTurmas(lista);
      } catch (erro) {
        console.error('Erro ao carregar turmas:', erro);
      } finally {
        setCarregandoTurmas(false);
      }
    }
  };

  const alternarTurma = (turmaGUID: string) => {
    setForm((prev) => {
      const proximo = new Set(prev.turmasSelecionadas);
      if (proximo.has(turmaGUID)) proximo.delete(turmaGUID);
      else proximo.add(turmaGUID);
      return { ...prev, turmasSelecionadas: proximo };
    });
  };

  const handleSelecionarArquivo = (arquivo: File | null) => {
    if (!arquivo) {
      setArquivoAnexo(null);
      return;
    }
    if (arquivo.size > AnexoAPI.ANEXO_TAMANHO_MAXIMO_BYTES) {
      alert('Arquivo maior que o limite permitido (50MB).');
      return;
    }
    if (!AnexoAPI.ANEXO_MIME_TYPES_PERMITIDOS.includes(arquivo.type)) {
      alert('Tipo de arquivo não permitido.');
      return;
    }
    setArquivoAnexo(arquivo);
  };

  const handlePublicar = async () => {
    setErroForm('');

    if (!form.AvisoTitulo.trim()) {
      setErroForm('Título é obrigatório');
      return;
    }
    if (!form.AvisoConteudo.trim()) {
      setErroForm('Conteúdo é obrigatório');
      return;
    }
    if (form.AvisoAbrangencia === 'Turmas' && form.turmasSelecionadas.size === 0) {
      setErroForm('Selecione ao menos uma turma');
      return;
    }

    try {
      let anexoGUIDs: string[] | undefined;
      if (arquivoAnexo) {
        const anexo = await AnexoAPI.uploadAnexo(arquivoAnexo, escolaGUID);
        anexoGUIDs = [anexo.AnexoGUID];
      }

      await criarAvisoMutation.mutateAsync({
        EscolaGUID: escolaGUID,
        AvisoTitulo: form.AvisoTitulo,
        AvisoConteudo: form.AvisoConteudo,
        AvisoAbrangencia: form.AvisoAbrangencia,
        TurmaGUIDs: form.AvisoAbrangencia === 'Turmas' ? Array.from(form.turmasSelecionadas) : undefined,
        AnexoGUIDs: anexoGUIDs,
      });

      setModalAberto(false);
    } catch (erro: any) {
      setErroForm(erro?.message || 'Erro ao publicar aviso');
    }
  };

  const handleExcluir = async (aviso: Aviso) => {
    if (!confirm(`Excluir o aviso "${aviso.AvisoTitulo}"?`)) return;
    try {
      await excluirAvisoMutation.mutateAsync(aviso.AvisoGUID);
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao excluir aviso');
    }
  };

  const colunas: Coluna<Aviso>[] = [
    { id: 'AvisoTitulo', label: 'Título' },
    {
      id: 'AvisoAbrangencia',
      label: 'Abrangência',
      render: (valor: AvisoAbrangencia, linha) =>
        valor === 'Escola' ? 'Escola inteira' : `${linha.TurmaGUIDs.length} turma(s)`,
    },
    { id: 'AvisoCreatedAt', label: 'Publicado em', render: (valor: string) => formatarDataHora(valor) },
  ];

  if (verificandoPermissao) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Loader />
          <p>Verificando permissão...</p>
        </div>
      </div>
    );
  }

  if (!permitido) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.titulo}>
              <Icon name="bell" size={22} /> Avisos
            </h1>
          </div>
        </div>
        <div className={styles.acessoRestrito}>
          <p>Acesso restrito.</p>
          <p>Publicar avisos está disponível apenas para Direção, Coordenação ou Secretaria ativas nesta escola.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>
            <Icon name="bell" size={22} /> Avisos
          </h1>
          <p className={styles.subtitulo}>Publique comunicados para toda a escola ou para turmas específicas</p>
        </div>
        <div className={styles.acoes}>
          <button onClick={() => void abrirModal()} className={styles.botaoNovo}>
            <Icon name="plus" size={16} /> Novo Aviso
          </button>
        </div>
      </div>

      <BaseTabelaDados
        titulo="Avisos publicados"
        colunas={colunas}
        dados={avisos}
        carregando={avisosQuery.isLoading}
        filtrarPor={(aviso, termo) => aviso.AvisoTitulo.toLowerCase().includes(termo)}
        buscaPlaceholder="Buscar por título..."
        acoes={(aviso) => (
          <>
            <Link href={`/dashboard/${escolaGUID}/avisos/${aviso.AvisoGUID}`} className={styles.botaoEditar} title="Ver">
              <Icon name="eye" size={14} />
            </Link>
            <button onClick={() => void handleExcluir(aviso)} className={styles.botaoExcluir} title="Excluir">
              <Icon name="trash" size={16} />
            </button>
          </>
        )}
        mensagemVazia="Nenhum aviso publicado ainda. Clique em 'Novo Aviso'."
      />

      {modalAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Novo Aviso</h2>

              <div className={styles.campo}>
                <label htmlFor="avisoTitulo">Título</label>
                <input
                  id="avisoTitulo"
                  type="text"
                  value={form.AvisoTitulo}
                  onChange={(e) => setForm((prev) => ({ ...prev, AvisoTitulo: e.target.value }))}
                  maxLength={150}
                  className={styles.inputBusca}
                  placeholder="Ex.: Reunião de pais no dia 20"
                />
              </div>

              <div className={styles.campo}>
                <label htmlFor="avisoConteudo">Conteúdo</label>
                <textarea
                  id="avisoConteudo"
                  value={form.AvisoConteudo}
                  onChange={(e) => setForm((prev) => ({ ...prev, AvisoConteudo: e.target.value }))}
                  maxLength={10000}
                  rows={6}
                  className={styles.textarea}
                  placeholder="Escreva o comunicado..."
                />
              </div>

              <div className={styles.campo}>
                <label>Enviar para</label>
                <div className={styles.abrangenciaOpcoes}>
                  <label className={styles.opcaoRadio}>
                    <input
                      type="radio"
                      name="abrangencia"
                      checked={form.AvisoAbrangencia === 'Escola'}
                      onChange={() => setForm((prev) => ({ ...prev, AvisoAbrangencia: 'Escola' }))}
                    />
                    Escola inteira
                  </label>
                  <label className={styles.opcaoRadio}>
                    <input
                      type="radio"
                      name="abrangencia"
                      checked={form.AvisoAbrangencia === 'Turmas'}
                      onChange={() => setForm((prev) => ({ ...prev, AvisoAbrangencia: 'Turmas' }))}
                    />
                    Turmas específicas
                  </label>
                </div>
              </div>

              {form.AvisoAbrangencia === 'Turmas' && (
                <div className={styles.campo}>
                  {carregandoTurmas ? (
                    <p className={styles.textoSecundario}>Carregando turmas...</p>
                  ) : turmas.length === 0 ? (
                    <p className={styles.textoSecundario}>Nenhuma turma ativa encontrada.</p>
                  ) : (
                    <div className={styles.listaTurmas}>
                      {turmas.map((turma) => (
                        <label key={turma.TurmaGUID} className={styles.opcaoCheckbox}>
                          <input
                            type="checkbox"
                            checked={form.turmasSelecionadas.has(turma.TurmaGUID)}
                            onChange={() => alternarTurma(turma.TurmaGUID)}
                          />
                          {turma.TurmaSerie} {turma.TurmaNome}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.campo}>
                <label className={styles.inputArquivo}>
                  <Icon name="paperclip" size={16} />
                  {arquivoAnexo ? arquivoAnexo.name : 'Anexar arquivo (opcional)'}
                  <input
                    type="file"
                    accept={AnexoAPI.ANEXO_MIME_TYPES_PERMITIDOS.join(',')}
                    onChange={(e) => handleSelecionarArquivo(e.target.files?.[0] || null)}
                    hidden
                  />
                </label>
              </div>

              {erroForm && <div className={styles.erro}>{erroForm}</div>}

              <button
                onClick={() => void handlePublicar()}
                disabled={criarAvisoMutation.isPending}
                className={styles.botaoImportar}
              >
                {criarAvisoMutation.isPending ? 'Publicando...' : 'Publicar aviso'}
              </button>
              <button onClick={() => setModalAberto(false)} className={styles.botaoCancelar}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
