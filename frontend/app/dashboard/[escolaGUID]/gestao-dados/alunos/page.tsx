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
import { UsuarioBusca } from '@/lib/api/usuario.api';
import { useBuscaUsuarioPorNome } from '@/lib/usuario/useBuscaUsuarioPorNome';
import ListaCandidatosUsuario from '@/components/gestao-dados/ListaCandidatosUsuario';
import { exportarParaPlanilha } from '@/lib/utils/exportarPlanilha';

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

  // Usuário já cadastrado na plataforma, selecionado a partir da busca por
  // nome (CPF não é mais o identificador de busca — ficou opcional) —
  // quando escolhido, autopreenche e trava os campos que já pertencem a
  // esse cadastro (não faz sentido "editar" o nome de alguém que já existe
  // aqui; só estamos vinculando essa pessoa como aluno desta escola/turma).
  const [usuarioExistente, setUsuarioExistente] = useState<UsuarioBusca | null>(null);
  const [termoBuscaNome, setTermoBuscaNome] = useState('');
  const { candidatos, buscando: buscandoNome, limpar: limparBuscaNome } = useBuscaUsuarioPorNome(
    !alunoEditando && !usuarioExistente ? termoBuscaNome : ''
  );

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
      id: 'UsuarioNome',
      label: 'Nome Completo',
      tipo: 'text',
      obrigatorio: true,
      placeholder: 'Ex: João Silva Santos',
      // Nome é o novo identificador de busca (CPF virou opcional) — digitar
      // aqui dispara a busca de candidatos (ver handleChangeFormulario).
      desabilitado: !!usuarioExistente
    },
    {
      id: 'UsuarioCPF',
      label: 'CPF (opcional)',
      tipo: 'cpf',
      obrigatorio: false,
      placeholder: '000.000.000-00',
      desabilitado: !!alunoEditando || !!usuarioExistente
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
      TurmaGUID: ''
    });
    limparBuscaCandidato();
  };

  // Intercepta a digitação do Nome (novo identificador de busca — CPF virou
  // opcional) e alimenta useBuscaUsuarioPorNome, que mostra os candidatos
  // via ListaCandidatosUsuario abaixo do campo. Só roda na criação — na
  // edição o nome já vem travado.
  const handleChangeFormulario = (campo: string, valor: any) => {
    setValoresFormulario((prev) => ({ ...prev, [campo]: valor }));

    if (campo !== 'UsuarioNome' || alunoEditando || usuarioExistente) return;
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
        // Criar novo aluno (ou só vincular, se a pessoa já foi encontrada pela busca por nome)
        await AlunoAPI.criarAluno({
          UsuarioCPF: valoresFormulario.UsuarioCPF || undefined,
          UsuarioNome: valoresFormulario.UsuarioNome,
          UsuarioEmail: valoresFormulario.UsuarioEmail,
          UsuarioTelefone: valoresFormulario.UsuarioTelefone,
          UsuarioDataNascimento: valoresFormulario.UsuarioDataNascimento,
          TurmaGUID: valoresFormulario.TurmaGUID
        }, escolaGUID, usuarioExistente?.UsuarioGUID, escola?.EscolaNome);
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
    limparBuscaCandidato();
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

  const handleDadosCarregados = (dados: DadosPlanilha<any>) => {
    console.log('Dados carregados:', dados);
    setDadosImportados(dados);
  };

  const handleSalvarImportados = async () => {
    if (!dadosImportados) return;

    try {
      setProcessandoBatch(true);

      // Converter dados da planilha para DTO. Nome é o identificador de
      // resolução agora (CPF é opcional, só serve de desempate extra) — a
      // resolução em si (achar pessoa existente por nome, ou criar nova)
      // acontece no backend, linha por linha (ver
      // UsuarioService#resolverOuCriarUsuario).
      const alunosDTO: AlunoAPI.AlunoCreateDTO[] = dadosImportados.dados.map((linha: any) => ({
        UsuarioNome: linha['Nome'] || linha.UsuarioNome || linha.nome || '',
        UsuarioCPF: linha['CPF'] || linha.UsuarioCPF || linha.cpf || undefined,
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
            onClick={() => {
              const linhas = alunos.map(({ usuario, matricula }) => {
                const turma = turmas.find(t => t.TurmaGUID === matricula.TurmaGUID);
                return {
                  Nome: usuario.UsuarioNome,
                  CPF: usuario.UsuarioCPF || '',
                  Email: usuario.UsuarioEmail || '',
                  Telefone: usuario.UsuarioTelefone || '',
                  'Data de Nascimento': usuario.UsuarioDataNascimento ? String(usuario.UsuarioDataNascimento).split('T')[0] : '',
                  Turma: turma ? `${turma.TurmaSerie} ${turma.TurmaNome}` : ''
                };
              });
              exportarParaPlanilha(linhas, 'alunos.xlsx');
            }}
            disabled={alunos.length === 0}
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
            {!alunoEditando && !usuarioExistente && (
              <div style={{ margin: '1.25rem 1.25rem 0' }}>
                <ListaCandidatosUsuario
                  termo={termoBuscaNome}
                  candidatos={candidatos}
                  buscando={buscandoNome}
                  onSelecionar={handleSelecionarCandidato}
                />
              </div>
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
                <Icon name="check" size={14} /> Esse nome já pertence a um usuário cadastrado na plataforma — dados
                preenchidos automaticamente. Ao salvar, ele só será vinculado como aluno desta turma.{' '}
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
                colunasEsperadas={['Nome', 'Turma']}
              />

              {/* Preview dos dados importados */}
              {dadosImportados && (
                <div className={styles.previewContainer}>
                  <h3 className={styles.previewTitulo}>
                    <Icon name="file-text" size={18} /> Preview - {dadosImportados.dados.length} alunos encontrados
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
                        <span className={styles.previewCurso}>
                          {' '}→ {linha['Turma'] || linha.TurmaNome || 'Turma não especificada'}
                        </span>
                      </div>
                    ))}
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
