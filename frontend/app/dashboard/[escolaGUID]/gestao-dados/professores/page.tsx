'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';import Link from 'next/link';import styles from '../page.module.css';

import BaseFormularioCadastro, { CampoFormulario } from '@/components/gestao-dados/BaseFormularioCadastro';
import BaseUploadPlanilha, { DadosPlanilha } from '@/components/gestao-dados/BaseUploadPlanilha';
import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';

import * as ProfessorAPI from '@/lib/api/professor.api';
import * as EscolaAPI from '@/lib/api/escola.api';

export default function ProfessoresPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  // Estados
  const [professores, setProfessores] = useState<ProfessorAPI.Professor[]>([]);
  const [materias, setMaterias] = useState<ProfessorAPI.Materia[]>([]);
  const [turmas, setTurmas] = useState<ProfessorAPI.Turma[]>([]);
  const [escola, setEscola] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [dadosImportados, setDadosImportados] = useState<DadosPlanilha<any> | null>(null);
  const [processandoBatch, setProcessandoBatch] = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState<ProfessorAPI.BatchCreateResponse | null>(null);
  const [professorEditando, setProfessorEditando] = useState<ProfessorAPI.Professor | null>(null);
  const [alocacoesProfessor, setAlocacoesProfessor] = useState<ProfessorAPI.Alocacao[]>([]);
  const [carregandoAlocacoes, setCarregandoAlocacoes] = useState(false);
  const [novaAlocacaoTurma, setNovaAlocacaoTurma] = useState('');
  const [novaAlocacaoMateria, setNovaAlocacaoMateria] = useState('');
  const [salvandoAlocacao, setSalvandoAlocacao] = useState(false);
  const [erroAlocacao, setErroAlocacao] = useState('');
  const [avisoConflito, setAvisoConflito] = useState<{
    professorNome: string;
    materiaNome: string;
    turmaNome: string;
    confirmar: () => void;
  } | null>(null);

  // Estados do formulário
  const [valoresFormulario, setValoresFormulario] = useState<Record<string, any>>({
    UsuarioCPF: '',
    UsuarioNome: '',
    UsuarioEmail: '',
    UsuarioTelefone: '',
    UsuarioDataNascimento: '',
    Materias: '', // Multi-select como string "Matemática, Física"
    Turmas: '' // Multi-select como string "1º Ano A, 2º Ano B"
  });
  const [salvandoFormulario, setSalvandoFormulario] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Carregar dados
  useEffect(() => {
    carregarDados();
  }, [escolaGUID]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resultadoProfessores, resultadoMaterias, resultadoTurmas, resultadoEscola] = await Promise.all([
        ProfessorAPI.listarProfessores({ EscolaGUID: escolaGUID }),
        ProfessorAPI.listarMaterias(escolaGUID),
        ProfessorAPI.listarTurmas(escolaGUID),
        EscolaAPI.buscarEscola(escolaGUID)
      ]);
      setProfessores(resultadoProfessores.professores);
      setMaterias(resultadoMaterias);
      setTurmas(resultadoTurmas);
      setEscola(resultadoEscola.escola);
    } catch (erro: any) {
      console.error('Erro ao carregar dados:', erro);
      alert('Erro ao carregar dados: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  // Definir campos do formulário
  const camposFormulario: CampoFormulario[] = [
    {
      id: 'UsuarioCPF',
      label: 'CPF',
      tipo: 'text',
      obrigatorio: true,
      placeholder: '000.000.000-00'
    },
    {
      id: 'UsuarioNome',
      label: 'Nome Completo',
      tipo: 'text',
      obrigatorio: true,
      placeholder: 'Ex: João Silva Santos'
    },
    {
      id: 'UsuarioEmail',
      label: 'Email',
      tipo: 'email',
      obrigatorio: false,
      placeholder: 'professor@email.com'
    },
    {
      id: 'UsuarioTelefone',
      label: 'Telefone',
      tipo: 'text',
      obrigatorio: false,
      placeholder: '(00) 00000-0000'
    },
    {
      id: 'UsuarioDataNascimento',
      label: 'Data de Nascimento',
      tipo: 'date',
      obrigatorio: false
    },
    {
      id: 'Materias',
      label: 'Matérias',
      tipo: 'text',
      obrigatorio: false,
      placeholder: 'Ex: Matemática, Física, Química'
    },
    {
      id: 'Turmas',
      label: 'Turmas',
      tipo: 'text',
      obrigatorio: false,
      placeholder: 'Ex: 1º Ano A, 2º Ano B'
    }
  ];

  const camposFormularioEfetivos = professorEditando
    ? camposFormulario.filter(c => c.id !== 'Materias' && c.id !== 'Turmas')
    : camposFormulario;

  // Definir colunas da tabela
  const colunas: Coluna<ProfessorAPI.Professor>[] = [
    {
      id: 'UsuarioNome',
      label: 'Nome',
      width: '30%',
      render: (valor: any, professor: ProfessorAPI.Professor) => professor.UsuarioNome
    },
    {
      id: 'UsuarioCPF',
      label: 'CPF',
      width: '15%',
      render: (valor: any, professor: ProfessorAPI.Professor) => professor.UsuarioCPF
    },
    {
      id: 'UsuarioEmail',
      label: 'Email',
      width: '25%',
      render: (valor: any, professor: ProfessorAPI.Professor) => professor.UsuarioEmail || <span className={styles.textoSecundario}>Sem email</span>
    },
    {
      id: 'UsuarioTelefone',
      label: 'Telefone',
      width: '15%',
      render: (valor: any, professor: ProfessorAPI.Professor) => professor.UsuarioTelefone || <span className={styles.textoSecundario}>-</span>
    },
    {
      id: 'UsuarioStatus',
      label: 'Status',
      width: '15%',
      render: (valor: any, professor: ProfessorAPI.Professor) => {
        let className = styles.statusAtivo;
        if (professor.UsuarioStatus === 'Inativo') className = styles.statusInativo;
        if (professor.UsuarioStatus === 'Bloqueado') className = styles.statusEncerrado;
        return <span className={className}>{professor.UsuarioStatus}</span>;
      }
    }
  ];

  // Handlers
  const handleSubmitFormulario = async () => {
    try {
      setSalvandoFormulario(true);
      setErroFormulario('');

      if (professorEditando) {
        // Editar professor existente
        await ProfessorAPI.atualizarProfessor(professorEditando.UsuarioCPF, {
          UsuarioNome: valoresFormulario.UsuarioNome,
          UsuarioEmail: valoresFormulario.UsuarioEmail,
          UsuarioTelefone: valoresFormulario.UsuarioTelefone,
          UsuarioDataNascimento: valoresFormulario.UsuarioDataNascimento
        });
        alert('Professor atualizado com sucesso!');
      } else {
        // Criar novo professor
        await ProfessorAPI.criarProfessor({
          UsuarioCPF: valoresFormulario.UsuarioCPF,
          UsuarioNome: valoresFormulario.UsuarioNome,
          UsuarioEmail: valoresFormulario.UsuarioEmail,
          UsuarioTelefone: valoresFormulario.UsuarioTelefone,
          UsuarioDataNascimento: valoresFormulario.UsuarioDataNascimento,
          Materias: valoresFormulario.Materias,
          Turmas: valoresFormulario.Turmas
        }, escolaGUID, escola?.EscolaNome || 'Escola');
        alert('Professor criado com sucesso! Um email foi enviado com as credenciais de acesso.');
      }

      setModalAberto(false);
      setProfessorEditando(null);
      setValoresFormulario({
        UsuarioCPF: '',
        UsuarioNome: '',
        UsuarioEmail: '',
        UsuarioTelefone: '',
        UsuarioDataNascimento: '',
        Materias: '',
        Turmas: ''
      });
      carregarDados();

    } catch (erro: any) {
      console.error('Erro ao salvar professor:', erro);
      setErroFormulario(erro.message || 'Erro ao salvar professor');
    } finally {
      setSalvandoFormulario(false);
    }
  };

  const handleEditar = async (professor: ProfessorAPI.Professor) => {
    setProfessorEditando(professor);
    setAlocacoesProfessor([]);
    setValoresFormulario({
      UsuarioCPF: professor.UsuarioCPF,
      UsuarioNome: professor.UsuarioNome,
      UsuarioEmail: professor.UsuarioEmail || '',
      UsuarioTelefone: professor.UsuarioTelefone || '',
      UsuarioDataNascimento: professor.UsuarioDataNascimento
        ? String(professor.UsuarioDataNascimento).split('T')[0]
        : '',
      Materias: '',
      Turmas: ''
    });
    setModalAberto(true);

    try {
      setCarregandoAlocacoes(true);
      const { alocacoes } = await ProfessorAPI.buscarAlocacoesProfessor(professor.UsuarioCPF, escolaGUID);
      const ativas = alocacoes.filter(a => a.AlocacaoStatus === 'Ativa');
      setAlocacoesProfessor(ativas);
    } catch (erro: any) {
      console.error('Erro ao buscar alocações:', erro);
    } finally {
      setCarregandoAlocacoes(false);
    }
  };

  const recarregarAlocacoes = async (cpf: string) => {
    const { alocacoes } = await ProfessorAPI.buscarAlocacoesProfessor(cpf, escolaGUID);
    setAlocacoesProfessor(alocacoes.filter(a => a.AlocacaoStatus === 'Ativa'));
  };

  const handleDesassociarMateria = async (alocacaoGUID: string) => {
    try {
      await ProfessorAPI.excluirAlocacao(alocacaoGUID);
      await recarregarAlocacoes(professorEditando!.UsuarioCPF);
    } catch (erro: any) {
      alert('Erro ao desassociar: ' + erro.message);
    }
  };

  const handleDesassociarMateriaTodas = async (materiaGUID: string) => {
    const alvos = alocacoesProfessor.filter(a => a.MateriaGUID === materiaGUID);
    const mat = materias.find(m => m.MateriaGUID === materiaGUID);
    if (!confirm(`Remover "${mat?.MateriaNome ?? materiaGUID}" de todas as turmas deste professor?`)) return;
    try {
      await Promise.all(alvos.map(a => ProfessorAPI.excluirAlocacao(a.MatProfTurGUID)));
      await recarregarAlocacoes(professorEditando!.UsuarioCPF);
    } catch (erro: any) {
      alert('Erro ao desassociar matéria: ' + erro.message);
    }
  };

  const executarCriacaoAlocacao = async () => {
    try {
      setSalvandoAlocacao(true);
      setErroAlocacao('');
      await ProfessorAPI.criarAlocacao(
        { UsuarioCPF: professorEditando!.UsuarioCPF, MateriaGUID: novaAlocacaoMateria, TurmaGUID: novaAlocacaoTurma, AlocacaoStatus: 'Ativa' },
        escolaGUID
      );
      await recarregarAlocacoes(professorEditando!.UsuarioCPF);
      setNovaAlocacaoTurma('');
      setNovaAlocacaoMateria('');
    } catch (erro: any) {
      setErroAlocacao(erro.message || 'Erro ao associar');
    } finally {
      setSalvandoAlocacao(false);
    }
  };

  const handleAssociarMateria = async () => {
    if (!novaAlocacaoTurma || !novaAlocacaoMateria) {
      setErroAlocacao('Selecione uma turma e uma matéria.');
      return;
    }
    setErroAlocacao('');
    setAvisoConflito(null);

    try {
      setSalvandoAlocacao(true);
      const { alocacoes: existentes } = await ProfessorAPI.listarAlocacoes({
        MateriaGUID: novaAlocacaoMateria,
        TurmaGUID: novaAlocacaoTurma,
        AlocacaoStatus: 'Ativa',
      });

      const conflito = existentes.find(a => a.UsuarioCPF !== professorEditando!.UsuarioCPF);
      if (conflito) {
        const outroProfessor = professores.find(p => p.UsuarioCPF === conflito.UsuarioCPF);
        const mat = materias.find(m => m.MateriaGUID === novaAlocacaoMateria);
        const tur = turmas.find(t => t.TurmaGUID === novaAlocacaoTurma);
        setSalvandoAlocacao(false);
        setAvisoConflito({
          professorNome: outroProfessor?.UsuarioNome ?? conflito.UsuarioCPF,
          materiaNome: mat?.MateriaNome ?? novaAlocacaoMateria,
          turmaNome: tur ? `${tur.TurmaSerie} ${tur.TurmaNome}` : novaAlocacaoTurma,
          confirmar: executarCriacaoAlocacao,
        });
        return;
      }
    } catch {
      // se a verificação falhar, tenta criar mesmo assim
    } finally {
      setSalvandoAlocacao(false);
    }

    await executarCriacaoAlocacao();
  };

  const handleExcluir = async (professor: ProfessorAPI.Professor, index: number) => {
    if (!confirm(`Tem certeza que deseja inativar o professor "${professor.UsuarioNome}"?`)) {
      return;
    }

    try {
      await ProfessorAPI.inativarProfessor(professor.UsuarioCPF, escolaGUID);
      alert('Professor inativado com sucesso!');
      carregarDados();
    } catch (erro: any) {
      console.error('Erro ao inativar professor:', erro);
      alert('Erro ao inativar professor: ' + erro.message);
    }
  };

  const handleReativar = async (professor: ProfessorAPI.Professor, index: number) => {
    if (!confirm(`Tem certeza que deseja reativar o professor "${professor.UsuarioNome}"?`)) {
      return;
    }

    try {
      await ProfessorAPI.reativarProfessor(professor.UsuarioCPF);
      alert('Professor reativado com sucesso!');
      carregarDados();
    } catch (erro: any) {
      console.error('Erro ao reativar professor:', erro);
      alert('Erro ao reativar professor: ' + erro.message);
    }
  };

  const handleDadosCarregados = (dados: DadosPlanilha<any>) => {
    console.log('Dados carregados:', dados);
    setDadosImportados(dados);
  };

  const handleSalvarImportados = async () => {
    if (!dadosImportados) return;

    try {
      setProcessandoBatch(true);

      // Converter dados da planilha para DTO
      const professoresDTO: ProfessorAPI.ProfessorCreateDTO[] = dadosImportados.dados.map((linha: any) => ({
        UsuarioCPF: linha['CPF'] || linha.UsuarioCPF || linha.cpf || '',
        UsuarioNome: linha['Nome'] || linha.UsuarioNome || linha.nome || '',
        UsuarioEmail: linha['Email'] || linha.UsuarioEmail || linha.email || undefined,
        UsuarioTelefone: linha['Telefone'] || linha.UsuarioTelefone || linha.telefone || undefined,
        UsuarioDataNascimento: linha['Data de Nascimento'] || linha.UsuarioDataNascimento || undefined,
        Materias: linha['Matérias'] || linha.Materias || linha.materias || undefined,
        Turmas: linha['Turmas'] || linha.Turmas || linha.turmas || undefined
      }));

      // Enviar para API
      const resultado = await ProfessorAPI.criarProfessoresEmMassa(
        professoresDTO,
        escolaGUID,
        escola?.EscolaNome || 'Escola'
      );
      
      setResultadoBatch(resultado);
      setDadosImportados(null);
      carregarDados();

    } catch (erro: any) {
      console.error('Erro ao importar professores:', erro);
      alert('Erro ao importar professores: ' + erro.message);
    } finally {
      setProcessandoBatch(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>👨‍🏫 Gestão de Professores</h1>
          <p className={styles.subtitulo}>
            Gerencie os professores e suas alocações em matérias/turmas
          </p>
        </div>
        <div className={styles.acoes}>          <Link
            href={`/dashboard/${escolaGUID}/gestao-dados`}
            className={styles.botaoVoltar}
          >
            ← Voltar
          </Link>          <button
            onClick={() => setModalUploadAberto(true)}
            className={styles.botaoUpload}
          >
            📊 Importar Planilha
          </button>
          <button
            onClick={() => setModalAberto(true)}
            className={styles.botaoNovo}
          >
            + Novo Professor
          </button>
        </div>
      </div>

      {/* Tabela de Professores */}
      <BaseTabelaDados
        titulo="Professores Cadastrados"
        colunas={colunas}
        dados={professores}
        carregando={carregando}
        acoes={(professor, index) => (
          <>
            <button
              onClick={() => handleEditar(professor)}
              className={styles.botaoEditar}
              title="Editar"
            >
              ✏️
            </button>
            {professor.UsuarioStatus === 'Ativo' ? (
              <button
                onClick={() => handleExcluir(professor, index)}
                className={styles.botaoExcluir}
                title="Inativar"
              >
                🗑️
              </button>
            ) : (
              <button
                onClick={() => handleReativar(professor, index)}
                className={styles.botaoReativar}
                title="Reativar"
              >
                ✅
              </button>
            )}
          </>
        )}
        mensagemVazia="Nenhum professor cadastrado. Clique em 'Novo Professor' ou importe uma planilha."
      />

      {/* Modal: Cadastro Individual */}
      {modalAberto && (
        <div className={styles.overlay} onClick={() => setModalAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <BaseFormularioCadastro
              titulo={professorEditando ? "Editar Professor" : "Novo Professor"}
              campos={camposFormularioEfetivos}
              valores={valoresFormulario}
              onChange={(campo, valor) => setValoresFormulario({ ...valoresFormulario, [campo]: valor })}
              onSubmit={handleSubmitFormulario}
              onCancel={() => {
                setModalAberto(false);
                setProfessorEditando(null);
                setAlocacoesProfessor([]);
                setNovaAlocacaoTurma('');
                setNovaAlocacaoMateria('');
                setErroAlocacao('');
                setAvisoConflito(null);
                setValoresFormulario({
                  UsuarioCPF: '',
                  UsuarioNome: '',
                  UsuarioEmail: '',
                  UsuarioTelefone: '',
                  UsuarioDataNascimento: '',
                  Materias: '',
                  Turmas: ''
                });
              }}
              loading={salvandoFormulario}
              erro={erroFormulario}
              botaoTexto={professorEditando ? "Salvar Alterações" : "Criar Professor"}
            />
            {professorEditando ? (
              <div className={styles.ajuda}>
                {carregandoAlocacoes ? (
                  <p>Carregando alocações...</p>
                ) : (
                  <>
                    <p><strong>📚 Matérias:</strong></p>
                    {(() => {
                      const materiasUnicas = [...new Map(
                        alocacoesProfessor.map(a => [a.MateriaGUID, a])
                      ).values()];
                      return materiasUnicas.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 8px 0' }}>
                          {materiasUnicas.map(a => {
                            const m = materias.find(m => m.MateriaGUID === a.MateriaGUID);
                            const qtdTurmas = alocacoesProfessor.filter(al => al.MateriaGUID === a.MateriaGUID).length;
                            return (
                              <span key={a.MateriaGUID} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ebf4ff', border: '1px solid #bee3f8', borderRadius: 12, padding: '2px 10px', fontSize: 13 }}>
                                {m?.MateriaNome ?? a.MateriaGUID}
                                {qtdTurmas > 1 && <span style={{ fontSize: 11, color: '#718096' }}>({qtdTurmas} turmas)</span>}
                                <button
                                  onClick={() => handleDesassociarMateriaTodas(a.MateriaGUID)}
                                  title="Remover de todas as turmas"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: '0 2px', fontSize: 15, lineHeight: 1 }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={styles.textoSecundario} style={{ marginBottom: 8 }}>Nenhuma matéria associada.</p>
                      );
                    })()}

                    <p style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}><strong>🏫 Alocações por turma:</strong></p>
                    {(() => {
                      const porTurma = alocacoesProfessor.reduce<Record<string, ProfessorAPI.Alocacao[]>>(
                        (acc, a) => {
                          if (!acc[a.TurmaGUID]) acc[a.TurmaGUID] = [];
                          acc[a.TurmaGUID].push(a);
                          return acc;
                        },
                        {}
                      );
                      const entradas = Object.entries(porTurma);
                      return entradas.length > 0 ? (
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                          {entradas.map(([turmaGUID, alocacoes]) => {
                            const t = turmas.find(t => t.TurmaGUID === turmaGUID);
                            const nomeTurma = t ? `${t.TurmaSerie} ${t.TurmaNome}` : turmaGUID;
                            return (
                              <li key={turmaGUID} style={{ marginBottom: 4 }}>
                                <strong>{nomeTurma}:</strong>{' '}
                                {alocacoes.map((a, idx) => {
                                  const m = materias.find(m => m.MateriaGUID === a.MateriaGUID);
                                  return (
                                    <span key={a.MatProfTurGUID} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginRight: 6 }}>
                                      {m?.MateriaNome ?? a.MateriaGUID}
                                      <button
                                        onClick={() => handleDesassociarMateria(a.MatProfTurGUID)}
                                        title="Desassociar"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: '0 2px', fontSize: 14, lineHeight: 1 }}
                                      >
                                        ×
                                      </button>
                                      {idx < alocacoes.length - 1 && ','}
                                    </span>
                                  );
                                })}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className={styles.textoSecundario}>Nenhuma alocação ativa.</p>
                      );
                    })()}

                    <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                      <p style={{ marginBottom: 6 }}><strong>➕ Nova alocação:</strong></p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <select
                          value={novaAlocacaoTurma}
                          onChange={e => { setNovaAlocacaoTurma(e.target.value); setErroAlocacao(''); setAvisoConflito(null); }}
                          style={{ flex: 1, minWidth: 120, padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e0', fontSize: 13 }}
                        >
                          <option value="">Turma...</option>
                          {turmas.map(t => (
                            <option key={t.TurmaGUID} value={t.TurmaGUID}>{t.TurmaSerie} {t.TurmaNome}</option>
                          ))}
                        </select>
                        <select
                          value={novaAlocacaoMateria}
                          onChange={e => { setNovaAlocacaoMateria(e.target.value); setErroAlocacao(''); setAvisoConflito(null); }}
                          style={{ flex: 1, minWidth: 120, padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e0', fontSize: 13 }}
                        >
                          <option value="">Matéria...</option>
                          {materias
                            .filter(m => !novaAlocacaoTurma || !alocacoesProfessor.some(
                              a => a.MateriaGUID === m.MateriaGUID && a.TurmaGUID === novaAlocacaoTurma
                            ))
                            .map(m => (
                              <option key={m.MateriaGUID} value={m.MateriaGUID}>{m.MateriaNome}</option>
                            ))}
                        </select>
                        <button
                          onClick={handleAssociarMateria}
                          disabled={salvandoAlocacao || !novaAlocacaoTurma || !novaAlocacaoMateria}
                          style={{ padding: '4px 14px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, opacity: (salvandoAlocacao || !novaAlocacaoTurma || !novaAlocacaoMateria) ? 0.5 : 1 }}
                        >
                          {salvandoAlocacao ? '...' : 'Associar'}
                        </button>
                      </div>
                      {novaAlocacaoTurma && (() => {
                        const jaLeciona = alocacoesProfessor
                          .filter(a => a.TurmaGUID === novaAlocacaoTurma)
                          .map(a => materias.find(m => m.MateriaGUID === a.MateriaGUID)?.MateriaNome ?? a.MateriaGUID);
                        return jaLeciona.length > 0 ? (
                          <p style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>
                            Já leciona nesta turma: {jaLeciona.join(', ')}
                          </p>
                        ) : null;
                      })()}
                      {erroAlocacao && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{erroAlocacao}</p>}
                      {avisoConflito && (
                        <div style={{ marginTop: 8, padding: 8, background: '#fffbeb', border: '1px solid #fbd38d', borderRadius: 4 }}>
                          <p style={{ fontSize: 12, marginBottom: 6 }}>
                            ⚠️ <strong>{avisoConflito.materiaNome}</strong> já é lecionada por <strong>{avisoConflito.professorNome}</strong> em <strong>{avisoConflito.turmaNome}</strong>. Confirmar mesmo assim?
                          </p>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => { avisoConflito.confirmar(); setAvisoConflito(null); }}
                              style={{ padding: '3px 10px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setAvisoConflito(null)}
                              style={{ padding: '3px 10px', background: '#e2e8f0', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className={styles.ajuda}>
                <p><strong>💡 Dica:</strong> Você pode deixar Matérias e Turmas em branco e adicioná-las depois.</p>
                <p><strong>📝 Formato:</strong> Separe matérias e turmas por vírgula. Ex: "Matemática, Física"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Upload de Planilha */}
      {modalUploadAberto && (
        <div className={styles.overlay} onClick={() => setModalUploadAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Importar Professores via Planilha</h2>
              
              <BaseUploadPlanilha
                titulo="Upload de Planilha"
                subtitulo="Faça upload de um arquivo Excel (.xlsx) com os professores"
                modeloUrl="/modelos/modelo-professores.xlsx"
                onDadosCarregados={handleDadosCarregados}
                onErro={(erro) => alert(erro)}
                colunasEsperadas={['CPF', 'Nome']}
              />

              {/* Preview dos dados importados */}
              {dadosImportados && (
                <div className={styles.previewContainer}>
                  <h3 className={styles.previewTitulo}>
                    📋 Preview - {dadosImportados.dados.length} professores encontrados
                  </h3>
                  <div className={styles.previewLista}>
                    {dadosImportados.dados.slice(0, 5).map((linha: any, idx: number) => (
                      <div key={idx} className={styles.previewItem}>
                        ✅ {linha['Nome'] || linha.UsuarioNome || linha.nome} (CPF: {linha['CPF'] || linha.UsuarioCPF || linha.cpf})
                        {(linha['Matérias'] || linha.Materias) && (
                          <span className={styles.previewCurso}>
                            {' '}→ Matérias: {linha['Matérias'] || linha.Materias}
                          </span>
                        )}
                      </div>
                    ))}
                    {dadosImportados.dados.length > 5 && (
                      <div className={styles.previewMais}>
                        + {dadosImportados.dados.length - 5} professores...
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSalvarImportados}
                    disabled={processandoBatch}
                    className={styles.botaoImportar}
                  >
                    {processandoBatch ? 'Processando...' : '💾 Salvar Todos'}
                  </button>
                </div>
              )}

              {/* Resultado do Batch */}
              {resultadoBatch && (
                <div className={styles.resultadoContainer}>
                  <h3 className={styles.resultadoTitulo}>✅ Processamento Concluído</h3>
                  <div className={styles.resultadoStats}>
                    <div className={styles.stat}>
                      <span className={styles.statNumero}>{resultadoBatch.criados}</span>
                      <span className={styles.statLabel}>Criados</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumero}>{resultadoBatch.existentes}</span>
                      <span className={styles.statLabel}>Já cadastrados</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumero}>{resultadoBatch.erros}</span>
                      <span className={styles.statLabel}>Erros</span>
                    </div>
                  </div>
                  
                  {/* Mostrar erros se houver */}
                  {resultadoBatch.erros > 0 && (
                    <div className={styles.errosContainer}>
                      <h4 className={styles.errosTitulo}>⚠️ Erros Encontrados:</h4>
                      <div className={styles.errosLista}>
                        {resultadoBatch.resultados
                          .filter(r => r.tipo === 'erro')
                          .map((r, idx) => (
                            <div key={idx} className={styles.erroItem}>
                              <strong>{r.item.UsuarioNome}</strong>: {r.mensagem}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setResultadoBatch(null);
                      setModalUploadAberto(false);
                    }}
                    className={styles.botaoFechar}
                  >
                    Fechar
                  </button>
                </div>
              )}

              <button
                onClick={() => setModalUploadAberto(false)}
                className={styles.botaoCancelar}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

