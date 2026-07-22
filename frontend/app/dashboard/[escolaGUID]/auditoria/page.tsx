'use client';

/**
 * Registro de Auditoria — tela read-only (quem fez o quê, quando, em qual
 * entidade, por escola). Visível apenas a Coordenação/Secretaria/Direção.
 * O backend já bloqueia com 403 quem não tem permissão (ver
 * backend/controllers/auditoria.controller.ts); a checagem de função aqui
 * é só UX, para não renderizar filtros/lista pra quem de qualquer forma
 * receberia erro do backend (mesmo padrão de `configuracoes/page.tsx` para
 * a seção "Identidade da Escola", restrita à Direção).
 *
 * Ver docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seções 5 e 7.
 */

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

import * as AuditoriaAPI from '@/lib/api/auditoria.api';
import {
  ACAO_AUDITORIA_LABEL,
  CATEGORIA_AUDITORIA_LABEL,
  ENTIDADE_TIPO_OPCOES,
  ENTIDADE_TIPO_LABEL,
  type AcaoAuditoriaTipo,
  type CategoriaAuditoria,
  type RegistroAuditoria,
} from '@/lib/api/auditoria.api';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatarCPF } from '@/lib/validators/cpf';

interface FuncaoEscola {
  FuncaoId: number;
  Status: 'Ativo' | 'Inativo' | 'Finalizado';
}

interface EscolaComFuncoes {
  escola: { EscolaGUID: string };
  funcoes: FuncaoEscola[];
}

const LIMITE_PAGINA = 50;

function categoriaClasse(nome: string): string {
  switch (nome) {
    case 'Trivial':
      return styles.badgeTrivial;
    case 'Operacional':
      return styles.badgeOperacional;
    case 'DadosPessoais':
      return styles.badgeDadosPessoais;
    case 'Financeiro':
      return styles.badgeFinanceiro;
    case 'SegurancaConta':
      return styles.badgeSegurancaConta;
    default:
      return '';
  }
}

export default function AuditoriaPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const { usuario, token } = useAuth();

  const [verificandoPermissao, setVerificandoPermissao] = useState(true);
  const [permitido, setPermitido] = useState(false);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAuditoria[]>([]);

  const [offset, setOffset] = useState(0);
  const [temMais, setTemMais] = useState(false);

  // Filtros (aplicados só ao clicar em "Filtrar")
  const [filtroAcaoTipo, setFiltroAcaoTipo] = useState<AcaoAuditoriaTipo | ''>('');
  const [filtroEntidadeTipo, setFiltroEntidadeTipo] = useState('');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [filtroCPFAtor, setFiltroCPFAtor] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  useEffect(() => {
    if (escolaGUID && usuario) {
      void verificarPermissao();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID, usuario]);

  useEffect(() => {
    if (permitido) {
      void carregarCategorias();
      void carregarRegistros(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permitido]);

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

      setPermitido(funcoesAtivas.includes(1) || funcoesAtivas.includes(2) || funcoesAtivas.includes(6));
    } catch (error) {
      console.error('Erro ao verificar permissão de auditoria:', error);
      setPermitido(false);
    } finally {
      setVerificandoPermissao(false);
    }
  };

  const carregarCategorias = async () => {
    try {
      const lista = await AuditoriaAPI.listarCategorias();
      setCategorias(lista);
    } catch (error) {
      console.error('Erro ao carregar categorias de auditoria:', error);
    }
  };

  const montarFiltros = (): AuditoriaAPI.AuditoriaFiltros => ({
    AcaoTipo: filtroAcaoTipo || undefined,
    EntidadeTipo: filtroEntidadeTipo || undefined,
    CategoriaAuditoriaId: filtroCategoriaId ? Number(filtroCategoriaId) : undefined,
    UsuarioCPFAtor: filtroCPFAtor.trim() ? filtroCPFAtor.replace(/\D/g, '') : undefined,
    dataInicio: filtroDataInicio || undefined,
    dataFim: filtroDataFim || undefined,
    limit: LIMITE_PAGINA,
  });

  const carregarRegistros = async (novoOffset: number) => {
    try {
      setCarregando(true);
      setErro('');

      const { registros: lista } = await AuditoriaAPI.listarRegistros(escolaGUID, {
        ...montarFiltros(),
        offset: novoOffset,
      });

      setRegistros(lista);
      setOffset(novoOffset);
      setTemMais(lista.length === LIMITE_PAGINA);
    } catch (err: any) {
      console.error('Erro ao carregar registros de auditoria:', err);
      setErro(err.message || 'Erro ao carregar registros de auditoria');
      setRegistros([]);
      setTemMais(false);
    } finally {
      setCarregando(false);
    }
  };

  const handleFiltrar = () => {
    void carregarRegistros(0);
  };

  const handleLimparFiltros = () => {
    setFiltroAcaoTipo('');
    setFiltroEntidadeTipo('');
    setFiltroCategoriaId('');
    setFiltroCPFAtor('');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    void carregarRegistros(0);
  };

  const handleAnterior = () => {
    const novoOffset = Math.max(0, offset - LIMITE_PAGINA);
    void carregarRegistros(novoOffset);
  };

  const handleProxima = () => {
    void carregarRegistros(offset + LIMITE_PAGINA);
  };

  const truncarGUID = (guid: string) => (guid.length > 12 ? `${guid.slice(0, 8)}…${guid.slice(-4)}` : guid);

  if (verificandoPermissao) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!permitido) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.titulo}>Registro de Auditoria</h1>
          </div>
        </div>
        <div className={styles.acessoRestrito}>
          <p>Acesso restrito.</p>
          <p>
            O Registro de Auditoria está disponível apenas para usuários com função de Coordenação,
            Secretaria ou Direção nesta escola.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Registro de Auditoria</h1>
          <p className={styles.subtitulo}>Histórico de ações realizadas nesta escola</p>
        </div>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}

      <div className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Filtros</h2>
        <div className={styles.filtrosGrid}>
          <div className={styles.campoContainer}>
            <label className={styles.label}>Ação</label>
            <select
              className={styles.input}
              value={filtroAcaoTipo}
              onChange={(e) => setFiltroAcaoTipo(e.target.value as AcaoAuditoriaTipo | '')}
            >
              <option value="">Todas</option>
              <option value="Create">Criação</option>
              <option value="Update">Edição</option>
              <option value="Delete">Exclusão</option>
            </select>
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label}>Módulo</label>
            <select
              className={styles.input}
              value={filtroEntidadeTipo}
              onChange={(e) => setFiltroEntidadeTipo(e.target.value)}
            >
              <option value="">Todos</option>
              {ENTIDADE_TIPO_OPCOES.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label}>Categoria</label>
            <select
              className={styles.input}
              value={filtroCategoriaId}
              onChange={(e) => setFiltroCategoriaId(e.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.CategoriaAuditoriaId} value={categoria.CategoriaAuditoriaId}>
                  {CATEGORIA_AUDITORIA_LABEL[categoria.CategoriaAuditoriaNome] || categoria.CategoriaAuditoriaNome}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label}>CPF do responsável</label>
            <input
              type="text"
              className={styles.input}
              placeholder="000.000.000-00"
              value={filtroCPFAtor}
              onChange={(e) => setFiltroCPFAtor(e.target.value)}
            />
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label}>De</label>
            <input
              type="date"
              className={styles.input}
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
            />
          </div>

          <div className={styles.campoContainer}>
            <label className={styles.label}>Até</label>
            <input
              type="date"
              className={styles.input}
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.rodapeSecao}>
          <button type="button" className={styles.botaoSecundario} onClick={handleLimparFiltros} disabled={carregando}>
            Limpar filtros
          </button>
          <button type="button" className={styles.botaoSalvar} onClick={handleFiltrar} disabled={carregando}>
            {carregando ? 'Filtrando...' : 'Filtrar'}
          </button>
        </div>
      </div>

      <div className={styles.secao}>
        {carregando ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Carregando registros...</p>
          </div>
        ) : registros.length === 0 ? (
          <div className={styles.estadoVazio}>
            <p>Nenhum registro de auditoria encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <>
            <div className={styles.tabelaWrap}>
              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th>Data/hora</th>
                    <th>Categoria</th>
                    <th>Ação</th>
                    <th>Módulo</th>
                    <th>Registro</th>
                    <th>Responsável (CPF)</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((registro) => {
                    const categoria = categorias.find(
                      (c) => c.CategoriaAuditoriaId === registro.CategoriaAuditoriaId
                    );
                    return (
                      <tr key={registro.RegistroAuditoriaGUID}>
                        <td>{new Date(registro.CreatedAt).toLocaleString('pt-BR')}</td>
                        <td>
                          {categoria && (
                            <span className={`${styles.badge} ${categoriaClasse(categoria.CategoriaAuditoriaNome)}`}>
                              {CATEGORIA_AUDITORIA_LABEL[categoria.CategoriaAuditoriaNome] ||
                                categoria.CategoriaAuditoriaNome}
                            </span>
                          )}
                        </td>
                        <td>{ACAO_AUDITORIA_LABEL[registro.AcaoTipo] || registro.AcaoTipo}</td>
                        <td>{ENTIDADE_TIPO_LABEL[registro.EntidadeTipo] || registro.EntidadeTipo}</td>
                        <td>{registro.EntidadeDescricao || truncarGUID(registro.EntidadeGUID)}</td>
                        <td>{formatarCPF(registro.UsuarioCPFAtor)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.paginacao}>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={handleAnterior}
                disabled={carregando || offset === 0}
              >
                ← Anterior
              </button>
              <span className={styles.paginacaoInfo}>
                Mostrando {registros.length} registro{registros.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={handleProxima}
                disabled={carregando || !temMais}
              >
                Próxima →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
