'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from '../page.module.css';

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

  const handleEditar = (professor: ProfessorAPI.Professor) => {
    setProfessorEditando(professor);
    setValoresFormulario({
      UsuarioCPF: professor.UsuarioCPF,
      UsuarioNome: professor.UsuarioNome,
      UsuarioEmail: professor.UsuarioEmail || '',
      UsuarioTelefone: professor.UsuarioTelefone || '',
      UsuarioDataNascimento: professor.UsuarioDataNascimento || '',
      Materias: '',
      Turmas: ''
    });
    setModalAberto(true);
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
        <div className={styles.acoes}>
          <button
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
        onEditar={handleEditar}
        onExcluir={handleExcluir}
        mensagemVazia="Nenhum professor cadastrado. Clique em 'Novo Professor' ou importe uma planilha."
      />

      {/* Modal: Cadastro Individual */}
      {modalAberto && (
        <div className={styles.overlay} onClick={() => setModalAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <BaseFormularioCadastro
              titulo={professorEditando ? "Editar Professor" : "Novo Professor"}
              campos={camposFormulario}
              valores={valoresFormulario}
              onChange={(campo, valor) => setValoresFormulario({ ...valoresFormulario, [campo]: valor })}
              onSubmit={handleSubmitFormulario}
              onCancel={() => {
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
              }}
              loading={salvandoFormulario}
              erro={erroFormulario}
              botaoTexto={professorEditando ? "Salvar Alterações" : "Criar Professor"}
            />
            <div className={styles.ajuda}>
              <p><strong>💡 Dica:</strong> Você pode deixar Matérias e Turmas em branco e adicioná-las depois.</p>
              <p><strong>📝 Formato:</strong> Separe matérias e turmas por vírgula. Ex: "Matemática, Física"</p>
            </div>
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

