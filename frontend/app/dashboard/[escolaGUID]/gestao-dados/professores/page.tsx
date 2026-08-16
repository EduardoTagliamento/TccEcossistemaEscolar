'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';import styles from '../page.module.css';

import BaseFormularioCadastro, { CampoFormulario } from '@/components/gestao-dados/BaseFormularioCadastro';
import BaseUploadPlanilha, { DadosPlanilha } from '@/components/gestao-dados/BaseUploadPlanilha';
import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import { Icon } from '@/components/Icon';

import * as ProfessorAPI from '@/lib/api/professor.api';
import * as EscolaAPI from '@/lib/api/escola.api';
import { UsuarioBusca } from '@/lib/api/usuario.api';
import { useBuscaUsuarioPorNome } from '@/lib/usuario/useBuscaUsuarioPorNome';
import ListaCandidatosUsuario from '@/components/gestao-dados/ListaCandidatosUsuario';
import { useProfessores, useAlocacoesProfessor } from '@/lib/professor/useProfessorQueries';
import { exportarParaPlanilha } from '@/lib/utils/exportarPlanilha';
import {
  useCriarProfessor,
  useAtualizarProfessor,
  useCriarProfessoresEmMassa,
  useInativarProfessor,
  useReativarProfessor,
  useCriarAlocacao,
  useAtualizarAlocacao,
  useExcluirAlocacao,
} from '@/lib/professor/useProfessorMutations';

export default function ProfessoresPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  // Estados
  const [materias, setMaterias] = useState<ProfessorAPI.Materia[]>([]);
  const [turmas, setTurmas] = useState<ProfessorAPI.Turma[]>([]);
  const [escola, setEscola] = useState<any>(null);
  const [carregandoAuxiliares, setCarregandoAuxiliares] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [dadosImportados, setDadosImportados] = useState<DadosPlanilha<any> | null>(null);
  const [processandoBatch, setProcessandoBatch] = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState<ProfessorAPI.BatchCreateResponse | null>(null);

  const [professorEditando, setProfessorEditando] = useState<ProfessorAPI.Professor | null>(null);
  const [novaAlocacaoTurma, setNovaAlocacaoTurma] = useState('');
  const [novaAlocacaoMateria, setNovaAlocacaoMateria] = useState('');
  const [novaAlocacaoAulasPorSemana, setNovaAlocacaoAulasPorSemana] = useState('');
  const [salvandoAlocacao, setSalvandoAlocacao] = useState(false);
  const [erroAlocacao, setErroAlocacao] = useState('');
  const [editandoAulasPorSemana, setEditandoAulasPorSemana] = useState<string | null>(null);
  const [valorAulasPorSemanaEditando, setValorAulasPorSemanaEditando] = useState('');
  const [avisoConflito, setAvisoConflito] = useState<{
    professorNome: string;
    materiaNome: string;
    turmaNome: string;
    confirmar: () => void;
  } | null>(null);
  const [credenciaisCriadas, setCredenciaisCriadas] = useState<{ nome: string; senhaTemporaria: string } | null>(null);

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

  // Usuário já cadastrado na plataforma, selecionado a partir da busca por
  // nome (CPF não é mais o identificador de busca — ficou opcional) —
  // quando escolhido, autopreenche e trava os campos que já pertencem a
  // esse cadastro (só estamos vinculando essa pessoa como professor desta
  // escola, não recriando/editando o cadastro dela).
  const [usuarioExistente, setUsuarioExistente] = useState<UsuarioBusca | null>(null);
  const [termoBuscaNome, setTermoBuscaNome] = useState('');
  const { candidatos, buscando: buscandoNome, limpar: limparBuscaNome } = useBuscaUsuarioPorNome(
    !professorEditando && !usuarioExistente ? termoBuscaNome : ''
  );

  const professoresQuery = useProfessores(escolaGUID);
  const professores = professoresQuery.data?.professores ?? [];

  // Colunas idênticas ao mapeamento de importação (colunasEsperadas do
  // BaseUploadPlanilha abaixo) — dá pra exportar e reimportar sem ajustar nada.
  const handleExportarPlanilha = () => {
    const linhas = professores.map((professor) => ({
      Nome: professor.UsuarioNome,
      CPF: professor.UsuarioCPF || '',
      Email: professor.UsuarioEmail || '',
      Telefone: professor.UsuarioTelefone || '',
      'Data de Nascimento': professor.UsuarioDataNascimento
        ? String(professor.UsuarioDataNascimento).split('T')[0]
        : ''
    }));
    exportarParaPlanilha(linhas, 'professores.xlsx');
  };
  const alocacoesQuery = useAlocacoesProfessor(professorEditando?.UsuarioGUID ?? undefined, escolaGUID, !!professorEditando);
  const alocacoesProfessor = (alocacoesQuery.data?.alocacoes ?? []).filter((a) => a.AlocacaoStatus === 'Ativa');
  const carregandoAlocacoes = alocacoesQuery.isLoading;
  const carregando = professoresQuery.isLoading || carregandoAuxiliares;

  const criarProfessorMutation = useCriarProfessor();
  const atualizarProfessorMutation = useAtualizarProfessor();
  const criarProfessoresEmMassaMutation = useCriarProfessoresEmMassa();
  const inativarProfessorMutation = useInativarProfessor();
  const reativarProfessorMutation = useReativarProfessor();
  const criarAlocacaoMutation = useCriarAlocacao();
  const atualizarAlocacaoMutation = useAtualizarAlocacao();
  const excluirAlocacaoMutation = useExcluirAlocacao();

  // Carregar dados auxiliares (matérias/turmas/escola — domínios fora do escopo desta migração)
  useEffect(() => {
    carregarDadosAuxiliares();
  }, [escolaGUID]);

  const carregarDadosAuxiliares = async () => {
    try {
      setCarregandoAuxiliares(true);
      const [resultadoMaterias, resultadoTurmas, resultadoEscola] = await Promise.all([
        ProfessorAPI.listarMaterias(escolaGUID),
        ProfessorAPI.listarTurmas(escolaGUID),
        EscolaAPI.buscarEscola(escolaGUID)
      ]);
      setMaterias(resultadoMaterias);
      setTurmas(resultadoTurmas);
      setEscola(resultadoEscola.escola);
    } catch (erro: any) {
      console.error('Erro ao carregar dados:', erro);
      alert('Erro ao carregar dados: ' + erro.message);
    } finally {
      setCarregandoAuxiliares(false);
    }
  };

  // Definir campos do formulário
  const camposFormulario: CampoFormulario[] = [
    {
      id: 'UsuarioNome',
      label: 'Nome Completo',
      tipo: 'text',
      obrigatorio: true,
      placeholder: 'Ex: João Silva Santos',
      // Nome é o novo identificador de busca (CPF virou opcional) — digitar
      // aqui dispara a busca de candidatos (ver handleChangeFormulario).
      // Trava quando um candidato já foi selecionado, igual aos demais
      // campos pessoais.
      desabilitado: !!usuarioExistente
    },
    {
      id: 'UsuarioCPF',
      label: 'CPF (opcional)',
      tipo: 'cpf',
      obrigatorio: false,
      placeholder: '000.000.000-00',
      desabilitado: !!professorEditando || !!usuarioExistente
    },
    {
      id: 'UsuarioEmail',
      label: 'Email',
      tipo: 'email',
      obrigatorio: false,
      placeholder: 'professor@email.com',
      desabilitado: !!usuarioExistente
    },
    {
      id: 'UsuarioTelefone',
      label: 'Telefone',
      tipo: 'tel',
      obrigatorio: false,
      placeholder: '(00) 00000-0000',
      desabilitado: !!usuarioExistente
    },
    {
      id: 'UsuarioDataNascimento',
      label: 'Data de Nascimento',
      tipo: 'date',
      obrigatorio: false,
      desabilitado: !!usuarioExistente
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
  const limparBuscaCandidato = () => {
    setUsuarioExistente(null);
    setTermoBuscaNome('');
    limparBuscaNome();
  };

  const resetarFormulario = () => {
    setValoresFormulario({
      UsuarioCPF: '',
      UsuarioNome: '',
      UsuarioEmail: '',
      UsuarioTelefone: '',
      UsuarioDataNascimento: '',
      Materias: '',
      Turmas: ''
    });
    limparBuscaCandidato();
  };

  // Intercepta a digitação do Nome (novo identificador de busca — CPF virou
  // opcional) e alimenta useBuscaUsuarioPorNome, que mostra os candidatos
  // via ListaCandidatosUsuario abaixo do campo. Selecionar um candidato
  // autopreenche e trava os campos pessoais (ver camposFormulario acima e
  // handleSelecionarCandidato). Só roda na criação — na edição o nome já
  // vem travado.
  const handleChangeFormulario = (campo: string, valor: any) => {
    setValoresFormulario((prev) => ({ ...prev, [campo]: valor }));

    if (campo !== 'UsuarioNome' || professorEditando || usuarioExistente) return;
    setTermoBuscaNome(valor);
  };

  const handleSelecionarCandidato = (encontrado: UsuarioBusca) => {
    setUsuarioExistente(encontrado);
    setValoresFormulario((prev) => ({
      ...prev,
      UsuarioNome: encontrado.UsuarioNome,
      UsuarioCPF: encontrado.UsuarioCPF || '',
      UsuarioEmail: encontrado.UsuarioEmail || '',
      UsuarioTelefone: encontrado.UsuarioTelefone || '',
      UsuarioDataNascimento: encontrado.UsuarioDataNascimento || '',
    }));
  };

  const handleSubmitFormulario = async () => {
    try {
      setSalvandoFormulario(true);
      setErroFormulario('');

      if (professorEditando) {
        // Editar professor existente
        await atualizarProfessorMutation.mutateAsync({
          usuarioGUID: professorEditando.UsuarioGUID,
          updates: {
            UsuarioNome: valoresFormulario.UsuarioNome,
            UsuarioEmail: valoresFormulario.UsuarioEmail,
            UsuarioTelefone: valoresFormulario.UsuarioTelefone,
            UsuarioDataNascimento: valoresFormulario.UsuarioDataNascimento
          },
        });
        alert('Professor atualizado com sucesso!');
      } else {
        // Criar novo professor (ou só vincular, se a pessoa já foi encontrada pela busca por nome)
        const resultado = await criarProfessorMutation.mutateAsync({
          dados: {
            UsuarioGUID: usuarioExistente?.UsuarioGUID,
            UsuarioCPF: valoresFormulario.UsuarioCPF || undefined,
            UsuarioNome: valoresFormulario.UsuarioNome,
            UsuarioEmail: valoresFormulario.UsuarioEmail,
            UsuarioTelefone: valoresFormulario.UsuarioTelefone,
            UsuarioDataNascimento: valoresFormulario.UsuarioDataNascimento,
            Materias: valoresFormulario.Materias,
            Turmas: valoresFormulario.Turmas
          },
          escolaGUID,
          escolaNome: escola?.EscolaNome || 'Escola',
        });

        if (usuarioExistente) {
          alert('Professor vinculado à escola com sucesso!');
        } else if (resultado.senhaTemporaria) {
          // Mostra a senha gerada — se não houver email cadastrado, essa é a
          // única forma de descobrir a senha (WhatsApp também recebe, se
          // houver telefone cadastrado).
          setCredenciaisCriadas({ nome: valoresFormulario.UsuarioNome, senhaTemporaria: resultado.senhaTemporaria });
        } else {
          alert('Professor criado com sucesso!');
        }
      }

      setModalAberto(false);
      setProfessorEditando(null);
      resetarFormulario();

    } catch (erro: any) {
      console.error('Erro ao salvar professor:', erro);
      setErroFormulario(erro.message || 'Erro ao salvar professor');
    } finally {
      setSalvandoFormulario(false);
    }
  };

  const handleEditar = (professor: ProfessorAPI.Professor) => {
    limparBuscaCandidato();
    setProfessorEditando(professor);
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
    // alocacoesQuery reage sozinha à mudança de professorEditando (enabled: !!professorEditando)
  };

  const handleDesassociarMateria = async (alocacaoGUID: string) => {
    try {
      await excluirAlocacaoMutation.mutateAsync(alocacaoGUID);
      await alocacoesQuery.refetch();
    } catch (erro: any) {
      alert('Erro ao desassociar: ' + erro.message);
    }
  };

  const handleDesassociarMateriaTodas = async (materiaGUID: string) => {
    const alvos = alocacoesProfessor.filter(a => a.MateriaGUID === materiaGUID);
    const mat = materias.find(m => m.MateriaGUID === materiaGUID);
    if (!confirm(`Remover "${mat?.MateriaNome ?? materiaGUID}" de todas as turmas deste professor?`)) return;
    try {
      await Promise.all(alvos.map(a => excluirAlocacaoMutation.mutateAsync(a.MatProfTurGUID)));
      await alocacoesQuery.refetch();
    } catch (erro: any) {
      alert('Erro ao desassociar matéria: ' + erro.message);
    }
  };

  const executarCriacaoAlocacao = async () => {
    try {
      setSalvandoAlocacao(true);
      setErroAlocacao('');
      await criarAlocacaoMutation.mutateAsync({
        alocacao: {
          UsuarioGUID: professorEditando!.UsuarioGUID,
          MateriaGUID: novaAlocacaoMateria,
          TurmaGUID: novaAlocacaoTurma,
          AlocacaoStatus: 'Ativa',
          AulasPorSemana: novaAlocacaoAulasPorSemana ? parseInt(novaAlocacaoAulasPorSemana, 10) : null,
        },
        escolaGUID,
      });
      await alocacoesQuery.refetch();
      setNovaAlocacaoTurma('');
      setNovaAlocacaoMateria('');
      setNovaAlocacaoAulasPorSemana('');
    } catch (erro: any) {
      setErroAlocacao(erro.message || 'Erro ao associar');
    } finally {
      setSalvandoAlocacao(false);
    }
  };

  const salvarAulasPorSemana = async (matProfTurGUID: string) => {
    try {
      await atualizarAlocacaoMutation.mutateAsync({
        alocacaoGUID: matProfTurGUID,
        updates: { AulasPorSemana: valorAulasPorSemanaEditando ? parseInt(valorAulasPorSemanaEditando, 10) : null },
      });
      setEditandoAulasPorSemana(null);
      await alocacoesQuery.refetch();
    } catch (erro: any) {
      alert('Erro ao atualizar aulas por semana: ' + erro.message);
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

      const conflito = existentes.find(a => a.UsuarioGUID !== professorEditando!.UsuarioGUID);
      if (conflito) {
        const outroProfessor = professores.find(p => p.UsuarioGUID === conflito.UsuarioGUID);
        const mat = materias.find(m => m.MateriaGUID === novaAlocacaoMateria);
        const tur = turmas.find(t => t.TurmaGUID === novaAlocacaoTurma);
        setSalvandoAlocacao(false);
        setAvisoConflito({
          professorNome: outroProfessor?.UsuarioNome ?? conflito.UsuarioGUID,
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
      await inativarProfessorMutation.mutateAsync({ cpf: professor.UsuarioCPF ?? '', escolaGUID });
      alert('Professor inativado com sucesso!');
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
      await reativarProfessorMutation.mutateAsync(professor.UsuarioGUID);
      alert('Professor reativado com sucesso!');
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

      // Converter dados da planilha para DTO. Nome é o identificador de
      // resolução agora (CPF é opcional, só serve de desempate extra quando
      // presente) — a resolução em si (achar pessoa existente por nome, ou
      // criar nova) acontece no backend, linha por linha, pra cada item do
      // lote (ver ProfessorService#resolverOuCriarUsuario).
      const professoresDTO: ProfessorAPI.ProfessorCreateDTO[] = dadosImportados.dados.map((linha: any) => ({
        UsuarioNome: linha['Nome'] || linha.UsuarioNome || linha.nome || '',
        UsuarioCPF: linha['CPF'] || linha.UsuarioCPF || linha.cpf || undefined,
        UsuarioEmail: linha['Email'] || linha.UsuarioEmail || linha.email || undefined,
        UsuarioTelefone: linha['Telefone'] || linha.UsuarioTelefone || linha.telefone || undefined,
        UsuarioDataNascimento: linha['Data de Nascimento'] || linha.UsuarioDataNascimento || undefined,
        Materias: linha['Matérias'] || linha.Materias || linha.materias || undefined,
        Turmas: linha['Turmas'] || linha.Turmas || linha.turmas || undefined
      }));

      // Enviar para API
      const resultado = await criarProfessoresEmMassaMutation.mutateAsync({
        professores: professoresDTO,
        escolaGUID,
        escolaNome: escola?.EscolaNome || 'Escola',
      });

      setResultadoBatch(resultado);
      setDadosImportados(null);

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
          <h1 className={styles.titulo}><Icon name="award" size={22} /> Gestão de Professores</h1>
          <p className={styles.subtitulo}>
            Gerencie os professores e suas alocações em matérias/turmas
          </p>
        </div>
        <div className={styles.acoes}>
          <button
            onClick={handleExportarPlanilha}
            disabled={professores.length === 0}
            className={styles.botaoUpload}
          >
            <Icon name="download" size={16} /> Exportar Planilha
          </button>
          <button
            onClick={() => setModalUploadAberto(true)}
            className={styles.botaoUpload}
          >
<Icon name="upload" size={16} /> Importar Planilha
          </button>
          <button
            onClick={() => {
              resetarFormulario();
              setModalAberto(true);
            }}
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
        filtrarPor={(professor, termo) => {
          const termoLimpo = termo.replace(/\D/g, '');
          return (
            professor.UsuarioNome.toLowerCase().includes(termo) ||
            (termoLimpo.length > 0 && !!professor.UsuarioCPF && professor.UsuarioCPF.replace(/\D/g, '').includes(termoLimpo)) ||
            (professor.UsuarioId?.toLowerCase().includes(termo) ?? false)
          );
        }}
        buscaPlaceholder="Buscar por nome, CPF ou ID..."
        acoes={(professor, index) => (
          <>
            <button
              onClick={() => handleEditar(professor)}
              className={styles.botaoEditar}
              title="Editar"
            >
              <Icon name="edit" size={16} />
            </button>
            {professor.UsuarioStatus === 'Ativo' ? (
              <button
                onClick={() => handleExcluir(professor, index)}
                className={styles.botaoExcluir}
                title="Inativar"
              >
                <Icon name="trash" size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleReativar(professor, index)}
                className={styles.botaoReativar}
                title="Reativar"
              >
                <Icon name="check" size={16} />
              </button>
            )}
          </>
        )}
        mensagemVazia="Nenhum professor cadastrado. Clique em 'Novo Professor' ou importe uma planilha."
      />

      {/* Modal: senha temporária gerada (professor sem email cadastrado) */}
      {credenciaisCriadas && (
        <div className={styles.overlay} onClick={() => setCredenciaisCriadas(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ padding: '1.25rem' }}>
              <h2 className={styles.modalTitulo}><Icon name="check-circle" size={20} /> Professor criado com sucesso</h2>
              <p style={{ marginTop: 8 }}>
                <strong>{credenciaisCriadas.nome}</strong> já pode acessar o sistema. Anote e repasse essa senha temporária:
              </p>
              <div style={{ marginTop: 12, padding: 12, background: '#f9f9f9', border: '1px solid #e2e8f0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <code style={{ fontSize: 18, fontWeight: 600 }}>{credenciaisCriadas.senhaTemporaria}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(credenciaisCriadas.senhaTemporaria)}
                  style={{ padding: '4px 10px', background: '#e2e8f0', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                >
                  Copiar
                </button>
              </div>
              <p style={{ marginTop: 12, fontSize: 12, color: '#718096' }}>
                O login é feito com o CPF ou telefone cadastrado (ou o email, se preenchido) + essa senha. Se um telefone foi informado, essa mesma senha também foi enviada por WhatsApp.
              </p>
              <button
                type="button"
                onClick={() => setCredenciaisCriadas(null)}
                style={{ marginTop: 16, width: '100%', padding: '8px', background: '#2f855a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastro Individual */}
      {modalAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {!professorEditando && !usuarioExistente && (
              <div style={{ margin: '1.25rem 1.25rem 0' }}>
                <ListaCandidatosUsuario
                  termo={termoBuscaNome}
                  candidatos={candidatos}
                  buscando={buscandoNome}
                  onSelecionar={handleSelecionarCandidato}
                />
              </div>
            )}
            {!professorEditando && usuarioExistente && (
              <p
                style={{
                  margin: '1.25rem 1.25rem 0',
                  padding: '0.75rem 1rem',
                  background: 'var(--green-50)',
                  color: 'var(--green-700)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Icon name="check" size={14} /> Esse nome já pertence a um usuário cadastrado na plataforma — dados
                preenchidos automaticamente. Ao salvar, ele só será vinculado como professor desta escola.{' '}
                <button
                  type="button"
                  onClick={() => {
                    limparBuscaCandidato();
                    setValoresFormulario((prev) => ({ ...prev, UsuarioNome: '', UsuarioCPF: '', UsuarioEmail: '', UsuarioTelefone: '', UsuarioDataNascimento: '' }));
                  }}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 'inherit' }}
                >
                  Buscar outra pessoa
                </button>
              </p>
            )}
            <BaseFormularioCadastro
              titulo={professorEditando ? "Editar Professor" : "Novo Professor"}
              campos={camposFormularioEfetivos}
              valores={valoresFormulario}
              onChange={handleChangeFormulario}
              onSubmit={handleSubmitFormulario}
              onCancel={() => {
                setModalAberto(false);
                setProfessorEditando(null);
                setNovaAlocacaoTurma('');
                setNovaAlocacaoMateria('');
                setErroAlocacao('');
                setAvisoConflito(null);
                resetarFormulario();
              }}
              loading={salvandoFormulario}
              erro={erroFormulario}
              botaoTexto={professorEditando ? "Salvar Alterações" : usuarioExistente ? "Vincular Professor" : "Criar Professor"}
            />
            {professorEditando ? (
              <div className={styles.ajuda}>
                {carregandoAlocacoes ? (
                  <p>Carregando alocações...</p>
                ) : (
                  <>
                    <p><strong><Icon name="book-open" size={16} /> Matérias:</strong></p>
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

                    <p style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}><strong><Icon name="grid" size={16} /> Alocações por turma:</strong></p>
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
                                  const editandoEsta = editandoAulasPorSemana === a.MatProfTurGUID;
                                  return (
                                    <span key={a.MatProfTurGUID} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginRight: 6 }}>
                                      {m?.MateriaNome ?? a.MateriaGUID}
                                      {editandoEsta ? (
                                        <>
                                          <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={valorAulasPorSemanaEditando}
                                            onChange={e => setValorAulasPorSemanaEditando(e.target.value)}
                                            placeholder="padrão"
                                            style={{ width: 48, padding: '1px 4px', fontSize: 11, marginLeft: 4 }}
                                          />
                                          <button
                                            onClick={() => salvarAulasPorSemana(a.MatProfTurGUID)}
                                            title="Salvar aulas/semana"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2f855a', fontSize: 12 }}
                                          >
                                            <Icon name="check" size={14} />
                                          </button>
                                        </>
                                      ) : (
                                        <span
                                          onClick={() => {
                                            setEditandoAulasPorSemana(a.MatProfTurGUID);
                                            setValorAulasPorSemanaEditando(a.AulasPorSemana?.toString() ?? '');
                                          }}
                                          title="Definir aulas/semana nesta turma (em branco = usa o padrão da matéria)"
                                          style={{ fontSize: 11, color: '#718096', cursor: 'pointer', marginLeft: 2 }}
                                        >
                                          ({a.AulasPorSemana ?? 'padrão'}x/sem)
                                        </span>
                                      )}
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
                      <p style={{ marginBottom: 6 }}><strong><Icon name="plus-circle" size={16} /> Nova alocação:</strong></p>
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
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={novaAlocacaoAulasPorSemana}
                          onChange={e => setNovaAlocacaoAulasPorSemana(e.target.value)}
                          placeholder="Aulas/sem (padrão)"
                          title="Aulas por semana nesta turma (em branco = usa o padrão da matéria)"
                          style={{ width: 110, padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e0', fontSize: 13 }}
                        />
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
                            <Icon name="alert-triangle" size={14} /> <strong>{avisoConflito.materiaNome}</strong> já é lecionada por <strong>{avisoConflito.professorNome}</strong> em <strong>{avisoConflito.turmaNome}</strong>. Confirmar mesmo assim?
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
                <p><strong><Icon name="help-circle" size={16} /> Dica:</strong> Você pode deixar Matérias e Turmas em branco e adicioná-las depois.</p>
                <p><strong><Icon name="file-text" size={16} /> Formato:</strong> Separe matérias e turmas por vírgula. Ex: "Matemática, Física"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Upload de Planilha */}
      {modalUploadAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Importar Professores via Planilha</h2>
              
              <BaseUploadPlanilha
                titulo="Upload de Planilha"
                subtitulo="Faça upload de um arquivo Excel (.xlsx) com os professores"
                modeloUrl="/modelos/modelo-professores.xlsx"
                onDadosCarregados={handleDadosCarregados}
                onErro={(erro) => alert(erro)}
                colunasEsperadas={['Nome']}
              />

              {/* Preview dos dados importados */}
              {dadosImportados && (
                <div className={styles.previewContainer}>
                  <h3 className={styles.previewTitulo}>
                    <Icon name="file-text" size={18} /> Preview - {dadosImportados.dados.length} professores encontrados
                  </h3>
                  <p className={styles.textoSecundario}>
                    <Icon name="help-circle" size={14} /> Cada pessoa é resolvida por nome ao salvar — se já existir
                    na plataforma, só é vinculada; senão, uma conta nova é criada. CPF na planilha é opcional, mas
                    ajuda a desempatar nomes repetidos.
                  </p>
                  <div className={styles.previewLista}>
                    {dadosImportados.dados.slice(0, 5).map((linha: any, idx: number) => (
                      <div key={idx} className={styles.previewItem}>
                        <Icon name="check" size={14} /> {linha['Nome'] || linha.UsuarioNome || linha.nome}
                        {(linha['CPF'] || linha.UsuarioCPF || linha.cpf) && (
                          <span> (CPF: {linha['CPF'] || linha.UsuarioCPF || linha.cpf})</span>
                        )}
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
                    {processandoBatch ? 'Processando...' : (<><Icon name="check" size={16} /> Salvar Todos</>)}
                  </button>
                </div>
              )}

              {/* Resultado do Batch */}
              {resultadoBatch && (
                <div className={styles.resultadoContainer}>
                  <h3 className={styles.resultadoTitulo}><Icon name="check-circle" size={20} /> Processamento Concluído</h3>
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
                      <h4 className={styles.errosTitulo}><Icon name="alert-triangle" size={18} /> Erros Encontrados:</h4>
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

                  {/* Senhas temporárias dos professores criados sem email — sem isso não tem
                      como descobrir a senha gerada (WhatsApp também recebe, se houver telefone). */}
                  {resultadoBatch.resultados.some(r => r.tipo === 'criado' && r.senhaTemporaria) && (
                    <div className={styles.errosContainer}>
                      <h4 className={styles.errosTitulo}><Icon name="lock" size={18} /> Senhas temporárias geradas:</h4>
                      <div className={styles.errosLista}>
                        {resultadoBatch.resultados
                          .filter(r => r.tipo === 'criado' && r.senhaTemporaria)
                          .map((r, idx) => (
                            <div key={idx} className={styles.erroItem} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                              <span>{r.item.UsuarioNome}</span>
                              <code>{r.senhaTemporaria}</code>
                            </div>
                          ))}
                      </div>
                      <p style={{ marginTop: 8, fontSize: 12, color: '#718096' }}>
                        Anote antes de fechar — só aparece aqui. Professores com telefone cadastrado também receberam a senha por WhatsApp.
                      </p>
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
                onClick={() => {
                  setModalUploadAberto(false);
                  setDadosImportados(null);
                }}
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

