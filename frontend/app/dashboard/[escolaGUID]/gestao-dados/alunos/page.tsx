'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';import styles from '../page.module.css';

import BaseFormularioCadastro, { CampoFormulario } from '@/components/gestao-dados/BaseFormularioCadastro';
import BaseUploadPlanilha, { DadosPlanilha } from '@/components/gestao-dados/BaseUploadPlanilha';
import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import { Icon } from '@/components/Icon';

import * as AlunoAPI from '@/lib/api/aluno.api';
import * as TurmaAPI from '@/lib/api/turma.api';
import * as EscolaAPI from '@/lib/api/escola.api';
import * as UsuarioAPI from '@/lib/api/usuario.api';
import { formatarCPF, limparCPF } from '@/lib/validators/cpf';

export default function AlunosPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  // Estados
  const [alunos, setAlunos] = useState<AlunoAPI.Aluno[]>([]);
  const [turmas, setTurmas] = useState<TurmaAPI.Turma[]>([]);
  const [escola, setEscola] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [dadosImportados, setDadosImportados] = useState<DadosPlanilha<any> | null>(null);
  const [processandoBatch, setProcessandoBatch] = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState<AlunoAPI.BatchCreateResponse | null>(null);

  // CPFs da planilha que já pertencem a usuários cadastrados na plataforma —
  // mesma checagem do formulário manual, só que em lote pra dar visibilidade
  // no preview antes de confirmar a importação (o backend já lida bem com
  // isso sozinho, isso aqui é só transparência pra quem está importando).
  const [cpfsExistentes, setCpfsExistentes] = useState<Set<string>>(new Set());
  const [verificandoExistentes, setVerificandoExistentes] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<AlunoAPI.Aluno | null>(null);

  // Estados do formulário
  const [valoresFormulario, setValoresFormulario] = useState<Record<string, any>>({
    UsuarioCPF: '',
    UsuarioNome: '',
    UsuarioEmail: '',
    UsuarioTelefone: '',
    UsuarioDataNascimento: '',
    TurmaGUID: ''
  });
  const [salvandoFormulario, setSalvandoFormulario] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Usuário já cadastrado na plataforma, detectado pelo CPF digitado no
  // formulário de criação (não se aplica a edição, que já trava o CPF) —
  // quando encontrado, autopreenche e trava os campos que já pertencem a
  // esse cadastro (não faz sentido "editar" o nome de alguém que já existe
  // aqui; só estamos vinculando essa pessoa como aluno desta escola/turma).
  const [usuarioExistente, setUsuarioExistente] = useState<UsuarioAPI.UsuarioBusca | null>(null);
  const [verificandoCPF, setVerificandoCPF] = useState(false);
  const [ultimoCPFConsultado, setUltimoCPFConsultado] = useState('');

  // Carregar dados
  useEffect(() => {
    carregarDados();
  }, [escolaGUID]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resultadoAlunos, resultadoTurmas, resultadoEscola] = await Promise.all([
        AlunoAPI.listarAlunos({ EscolaGUID: escolaGUID }),
        TurmaAPI.listarTurmas({ EscolaGUID: escolaGUID }),
        EscolaAPI.buscarEscola(escolaGUID)
      ]);
      setAlunos(resultadoAlunos.alunos);
      setTurmas(resultadoTurmas.turmas);
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
      tipo: 'cpf',
      obrigatorio: true,
      placeholder: '000.000.000-00',
      // CPF é o identificador do usuário — editar aqui não tem efeito (a
      // atualização usa alunoEditando.usuario.UsuarioCPF, não este campo),
      // então trava pra não sugerir que dá pra trocar.
      desabilitado: !!alunoEditando
    },
    {
      id: 'UsuarioNome',
      label: 'Nome Completo',
      tipo: 'text',
      obrigatorio: true,
      placeholder: 'Ex: João Silva Santos',
      desabilitado: !!usuarioExistente
    },
    {
      id: 'UsuarioEmail',
      label: 'Email',
      tipo: 'email',
      obrigatorio: false,
      placeholder: 'aluno@email.com',
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
      id: 'TurmaGUID',
      label: 'Turma',
      tipo: 'select',
      obrigatorio: true,
      opcoes: [
        { valor: '', label: 'Selecione a turma' },
        ...turmas.map(turma => ({
          valor: turma.TurmaGUID,
          label: `${turma.TurmaSerie} ${turma.TurmaNome}`
        }))
      ]
    }
  ];

  // Definir colunas da tabela
  const colunas: Coluna<AlunoAPI.Aluno>[] = [
    {
      id: 'UsuarioNome',
      label: 'Nome',
      width: '25%',
      render: (valor: any, aluno: AlunoAPI.Aluno) => aluno.usuario.UsuarioNome
    },
    {
      id: 'UsuarioCPF',
      label: 'CPF',
      width: '15%',
      render: (valor: any, aluno: AlunoAPI.Aluno) => aluno.usuario.UsuarioCPF
    },
    {
      id: 'UsuarioEmail',
      label: 'Email',
      width: '20%',
      render: (valor: any, aluno: AlunoAPI.Aluno) => aluno.usuario.UsuarioEmail || <span className={styles.textoSecundario}>Sem email</span>
    },
    {
      id: 'TurmaGUID',
      label: 'Turma',
      width: '20%',
      render: (valor: any, aluno: AlunoAPI.Aluno) => {
        const turma = turmas.find(t => t.TurmaGUID === aluno.matricula.TurmaGUID);
        return turma ? `${turma.TurmaSerie} ${turma.TurmaNome}` : <span className={styles.textoSecundario}>Turma não encontrada</span>;
      }
    },
    {
      id: 'MatriculaStatus',
      label: 'Status',
      width: '10%',
      render: (valor: any, aluno: AlunoAPI.Aluno) => {
        let className = styles.statusAtivo;
        if (aluno.matricula.MatriculaStatus === 'Transferida') className = styles.statusInativo;
        if (aluno.matricula.MatriculaStatus === 'Cancelada') className = styles.statusEncerrado;
        return <span className={className}>{aluno.matricula.MatriculaStatus}</span>;
      }
    },
    {
      id: 'MatriculaCreatedAt',
      label: 'Matrícula em',
      width: '10%',
      render: (valor: any, aluno: AlunoAPI.Aluno) => new Date(aluno.matricula.MatriculaCreatedAt).toLocaleDateString('pt-BR')
    }
  ];

  // Handlers
  const limparBuscaCPF = () => {
    setUsuarioExistente(null);
    setUltimoCPFConsultado('');
  };

  const resetarFormulario = () => {
    setValoresFormulario({
      UsuarioCPF: '',
      UsuarioNome: '',
      UsuarioEmail: '',
      UsuarioTelefone: '',
      UsuarioDataNascimento: '',
      TurmaGUID: ''
    });
    limparBuscaCPF();
  };

  // Intercepta a digitação do CPF: ao completar 11 dígitos (e só na
  // criação — na edição o CPF já vem travado), busca se já existe um
  // usuário cadastrado com esse CPF. Se existir, autopreenche e trava
  // nome/email/telefone/nascimento (ver camposFormulario acima).
  const handleChangeFormulario = (campo: string, valor: any) => {
    setValoresFormulario((prev) => ({ ...prev, [campo]: valor }));

    if (campo !== 'UsuarioCPF' || alunoEditando) return;

    const cpfLimpo = limparCPF(valor);
    if (cpfLimpo.length !== 11) {
      if (usuarioExistente) limparBuscaCPF();
      return;
    }
    if (cpfLimpo === ultimoCPFConsultado) return;

    setUltimoCPFConsultado(cpfLimpo);
    setVerificandoCPF(true);
    UsuarioAPI.buscarUsuarioPorCPF(valor)
      .then((encontrado) => {
        setUsuarioExistente(encontrado);
        setValoresFormulario((prev) => ({
          ...prev,
          UsuarioNome: encontrado.UsuarioNome,
          UsuarioEmail: encontrado.UsuarioEmail || '',
          UsuarioTelefone: encontrado.UsuarioTelefone || '',
          UsuarioDataNascimento: encontrado.UsuarioDataNascimento || '',
        }));
      })
      .catch(() => {
        // 404 esperado — CPF ainda não cadastrado, segue o cadastro normal.
        setUsuarioExistente(null);
      })
      .finally(() => setVerificandoCPF(false));
  };

  const handleSubmitFormulario = async () => {
    try {
      setSalvandoFormulario(true);
      setErroFormulario('');

      if (alunoEditando) {
        // Atualizar dados pessoais do usuário
        await AlunoAPI.atualizarAluno(alunoEditando.usuario.UsuarioGUID, {
          UsuarioNome: valoresFormulario.UsuarioNome,
          UsuarioEmail: valoresFormulario.UsuarioEmail || undefined,
          UsuarioTelefone: valoresFormulario.UsuarioTelefone || undefined,
          UsuarioDataNascimento: valoresFormulario.UsuarioDataNascimento || undefined,
        });

        // Atualizar turma apenas se mudou
        if (valoresFormulario.TurmaGUID && valoresFormulario.TurmaGUID !== alunoEditando.matricula.TurmaGUID) {
          await AlunoAPI.atualizarMatricula(alunoEditando.matricula.MatriculaGUID, {
            TurmaGUID: valoresFormulario.TurmaGUID
          });
        }

        alert('Aluno atualizado com sucesso!');
      } else {
        // Criar novo aluno (ou só vincular, se o CPF já pertence a um usuário existente)
        await AlunoAPI.criarAluno({
          UsuarioCPF: valoresFormulario.UsuarioCPF,
          UsuarioNome: valoresFormulario.UsuarioNome,
          UsuarioEmail: valoresFormulario.UsuarioEmail,
          UsuarioTelefone: valoresFormulario.UsuarioTelefone,
          UsuarioDataNascimento: valoresFormulario.UsuarioDataNascimento,
          TurmaGUID: valoresFormulario.TurmaGUID
        }, escolaGUID, !!usuarioExistente);
        alert(
          usuarioExistente
            ? 'Aluno vinculado à turma com sucesso!'
            : 'Aluno criado com sucesso! Um email foi enviado com as credenciais de acesso.'
        );
      }

      setModalAberto(false);
      setAlunoEditando(null);
      resetarFormulario();
      carregarDados();

    } catch (erro: any) {
      console.error('Erro ao salvar aluno:', erro);
      setErroFormulario(erro.message || 'Erro ao salvar aluno');
    } finally {
      setSalvandoFormulario(false);
    }
  };

  const handleEditar = (aluno: AlunoAPI.Aluno) => {
    limparBuscaCPF();
    setAlunoEditando(aluno);
    setValoresFormulario({
      UsuarioCPF: aluno.usuario.UsuarioCPF,
      UsuarioNome: aluno.usuario.UsuarioNome,
      UsuarioEmail: aluno.usuario.UsuarioEmail || '',
      UsuarioTelefone: aluno.usuario.UsuarioTelefone || '',
      UsuarioDataNascimento: aluno.usuario.UsuarioDataNascimento
        ? String(aluno.usuario.UsuarioDataNascimento).split('T')[0]
        : '',
      TurmaGUID: aluno.matricula.TurmaGUID
    });
    setModalAberto(true);
  };

  const extrairCPFDaLinha = (linha: any): string =>
    limparCPF(String(linha['CPF'] || linha.UsuarioCPF || linha.cpf || ''));

  const verificarCPFsExistentes = async (linhas: any[]) => {
    setVerificandoExistentes(true);
    try {
      const resultados = await Promise.allSettled(
        linhas.map(async (linha) => {
          const cpf = extrairCPFDaLinha(linha);
          if (cpf.length !== 11) return null;
          await UsuarioAPI.buscarUsuarioPorCPF(formatarCPF(cpf));
          return cpf;
        })
      );
      const encontrados = new Set<string>();
      for (const resultado of resultados) {
        if (resultado.status === 'fulfilled' && resultado.value) {
          encontrados.add(resultado.value);
        }
      }
      setCpfsExistentes(encontrados);
    } finally {
      setVerificandoExistentes(false);
    }
  };

  const handleDadosCarregados = (dados: DadosPlanilha<any>) => {
    console.log('Dados carregados:', dados);
    setDadosImportados(dados);
    setCpfsExistentes(new Set());
    void verificarCPFsExistentes(dados.dados);
  };

  const handleSalvarImportados = async () => {
    if (!dadosImportados) return;

    try {
      setProcessandoBatch(true);

      // Converter dados da planilha para DTO
      const alunosDTO: AlunoAPI.AlunoCreateDTO[] = dadosImportados.dados.map((linha: any) => ({
        UsuarioCPF: linha['CPF'] || linha.UsuarioCPF || linha.cpf || '',
        UsuarioNome: linha['Nome'] || linha.UsuarioNome || linha.nome || '',
        UsuarioEmail: linha['Email'] || linha.UsuarioEmail || linha.email || undefined,
        UsuarioTelefone: linha['Telefone'] || linha.UsuarioTelefone || linha.telefone || undefined,
        UsuarioDataNascimento: linha['Data de Nascimento'] || linha.UsuarioDataNascimento || undefined,
        TurmaNome: linha['Turma'] || linha.TurmaNome || undefined
      }));

      // Enviar para API
      const resultado = await AlunoAPI.criarAlunosEmMassa(
        alunosDTO,
        escolaGUID,
        escola?.EscolaNome || 'Escola'
      );
      
      setResultadoBatch(resultado);
      setDadosImportados(null);
      setCpfsExistentes(new Set());
      carregarDados();

    } catch (erro: any) {
      console.error('Erro ao importar alunos:', erro);
      alert('Erro ao importar alunos: ' + erro.message);
    } finally {
      setProcessandoBatch(false);
    }
  };

  const handleExcluir = async (aluno: AlunoAPI.Aluno, index: number) => {
    if (!confirm(`Tem certeza que deseja inativar a matrícula de "${aluno.usuario.UsuarioNome}"?`)) {
      return;
    }

    try {
      await AlunoAPI.atualizarMatricula(aluno.matricula.MatriculaGUID, { MatriculaStatus: 'Cancelada' });
      alert('Matrícula inativada com sucesso!');
      carregarDados();
    } catch (erro: any) {
      console.error('Erro ao inativar matrícula:', erro);
      alert('Erro ao inativar matrícula: ' + erro.message);
    }
  };
  const handleReativar = async (aluno: AlunoAPI.Aluno, index: number) => {
    if (!confirm(`Tem certeza que deseja reativar a matrícula de "${aluno.usuario.UsuarioNome}"?`)) {
      return;
    }

    try {
      await AlunoAPI.atualizarMatricula(aluno.matricula.MatriculaGUID, { MatriculaStatus: 'Ativa' });
      alert('Matrícula reativada com sucesso!');
      carregarDados();
    } catch (erro: any) {
      console.error('Erro ao reativar matrícula:', erro);
      alert('Erro ao reativar matrícula: ' + erro.message);
    }
  };
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}><Icon name="users" size={22} /> Gestão de Alunos</h1>
          <p className={styles.subtitulo}>
            Gerencie os alunos e suas matrículas
          </p>
        </div>
        <div className={styles.acoes}>
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
            + Novo Aluno
          </button>
        </div>
      </div>

      {/* Tabela de Alunos */}
      <BaseTabelaDados
        titulo="Alunos Matriculados"
        colunas={colunas}
        dados={alunos}
        carregando={carregando}
        filtrarPor={(aluno, termo) => {
          const termoLimpo = termo.replace(/\D/g, '');
          return (
            aluno.usuario.UsuarioNome.toLowerCase().includes(termo) ||
            (termoLimpo.length > 0 && !!aluno.usuario.UsuarioCPF && aluno.usuario.UsuarioCPF.replace(/\D/g, '').includes(termoLimpo)) ||
            (aluno.usuario.UsuarioId?.toLowerCase().includes(termo) ?? false)
          );
        }}
        buscaPlaceholder="Buscar por nome, CPF ou ID..."
        acoes={(aluno, index) => (
          <>
            <button
              onClick={() => handleEditar(aluno)}
              className={styles.botaoEditar}
              title="Editar"
            >
              <Icon name="edit" size={16} />
            </button>
            {aluno.matricula.MatriculaStatus === 'Ativa' ? (
              <button
                onClick={() => handleExcluir(aluno, index)}
                className={styles.botaoExcluir}
                title="Cancelar Matrícula"
              >
                <Icon name="trash" size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleReativar(aluno, index)}
                className={styles.botaoReativar}
                title="Reativar Matrícula"
              >
                <Icon name="check" size={16} />
              </button>
            )}
          </>
        )}
        mensagemVazia="Nenhum aluno matriculado. Clique em 'Novo Aluno' ou importe uma planilha."
      />

      {/* Modal: Cadastro Individual */}
      {modalAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {!alunoEditando && verificandoCPF && (
              <p style={{ margin: '1.25rem 1.25rem 0', color: 'var(--slate-400)', fontSize: '0.875rem' }}>
                Verificando CPF...
              </p>
            )}
            {!alunoEditando && usuarioExistente && (
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
                <Icon name="check" size={14} /> Esse CPF já pertence a um usuário cadastrado na plataforma — dados
                preenchidos automaticamente. Ao salvar, ele só será vinculado como aluno desta turma.
              </p>
            )}
            <BaseFormularioCadastro
              titulo={alunoEditando ? "Editar Aluno" : "Novo Aluno"}
              campos={camposFormulario}
              valores={valoresFormulario}
              onChange={handleChangeFormulario}
              onSubmit={handleSubmitFormulario}
              onCancel={() => {
                setModalAberto(false);
                setAlunoEditando(null);
                resetarFormulario();
              }}
              loading={salvandoFormulario}
              erro={erroFormulario}
              botaoTexto={alunoEditando ? "Salvar Alterações" : usuarioExistente ? "Vincular Aluno" : "Criar Aluno"}
            />
          </div>
        </div>
      )}

      {/* Modal: Upload de Planilha */}
      {modalUploadAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Importar Alunos via Planilha</h2>
              
              <BaseUploadPlanilha
                titulo="Upload de Planilha"
                subtitulo="Faça upload de um arquivo Excel (.xlsx) com os alunos"
                modeloUrl="/modelos/modelo-alunos.xlsx"
                onDadosCarregados={handleDadosCarregados}
                onErro={(erro) => alert(erro)}
                colunasEsperadas={['CPF', 'Nome', 'Turma']}
              />

              {/* Preview dos dados importados */}
              {dadosImportados && (
                <div className={styles.previewContainer}>
                  <h3 className={styles.previewTitulo}>
                    <Icon name="file-text" size={18} /> Preview - {dadosImportados.dados.length} alunos encontrados
                  </h3>
                  {verificandoExistentes ? (
                    <p className={styles.textoSecundario}>Verificando CPFs já cadastrados na plataforma...</p>
                  ) : cpfsExistentes.size > 0 ? (
                    <p
                      style={{
                        padding: '0.6rem 0.85rem',
                        marginBottom: '0.75rem',
                        background: 'var(--green-50)',
                        color: 'var(--green-700)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <Icon name="check" size={14} /> {cpfsExistentes.size} de {dadosImportados.dados.length} já{' '}
                      {cpfsExistentes.size === 1 ? 'está cadastrado' : 'estão cadastrados'} na plataforma — serão só
                      vinculados à turma, sem alterar os dados existentes.
                    </p>
                  ) : null}
                  <div className={styles.previewLista}>
                    {dadosImportados.dados.slice(0, 5).map((linha: any, idx: number) => {
                      const jaExiste = cpfsExistentes.has(extrairCPFDaLinha(linha));
                      return (
                        <div key={idx} className={styles.previewItem}>
                          <Icon name="check" size={14} /> {linha['Nome'] || linha.UsuarioNome || linha.nome} (CPF: {linha['CPF'] || linha.UsuarioCPF || linha.cpf})
                          <span className={styles.previewCurso}>
                            {' '}→ {linha['Turma'] || linha.TurmaNome || 'Turma não especificada'}
                          </span>
                          {jaExiste && (
                            <span
                              style={{
                                marginLeft: '0.5rem',
                                padding: '0.1rem 0.5rem',
                                background: 'var(--green-50)',
                                color: 'var(--green-700)',
                                borderRadius: 'var(--radius-pill)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              já cadastrado
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {dadosImportados.dados.length > 5 && (
                      <div className={styles.previewMais}>
                        + {dadosImportados.dados.length - 5} alunos...
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
                  setCpfsExistentes(new Set());
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
