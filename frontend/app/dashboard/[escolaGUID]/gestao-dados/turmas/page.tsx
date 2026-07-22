'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

import BaseFormularioCadastro, { CampoFormulario } from '@/components/gestao-dados/BaseFormularioCadastro';
import BaseUploadPlanilha, { DadosPlanilha } from '@/components/gestao-dados/BaseUploadPlanilha';
import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import { Icon } from '@/components/Icon';

import * as TurmaAPI from '@/lib/api/turma.api';
import * as CursoAPI from '@/lib/api/curso.api';

export default function TurmasPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  // Estados
  const [turmas, setTurmas] = useState<TurmaAPI.Turma[]>([]);
  const [cursos, setCursos] = useState<CursoAPI.Curso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [dadosImportados, setDadosImportados] = useState<DadosPlanilha<any> | null>(null);
  const [processandoBatch, setProcessandoBatch] = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState<TurmaAPI.BatchCreateResponse | null>(null);
  const [turmaEditando, setTurmaEditando] = useState<TurmaAPI.Turma | null>(null);

  // Estados do formulário
  const [valoresFormulario, setValoresFormulario] = useState<Record<string, any>>({
    EscolaGUID: escolaGUID,
    TurmaSerie: '',
    TurmaNome: '',
    TurmaIsTecnico: false,
    CursoGUID: ''
  });
  const [salvandoFormulario, setSalvandoFormulario] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Carregar turmas e cursos
  useEffect(() => {
    carregarDados();
  }, [escolaGUID]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resultadoTurmas, resultadoCursos] = await Promise.all([
        TurmaAPI.listarTurmas({ EscolaGUID: escolaGUID }),
        CursoAPI.listarCursos({ EscolaGUID: escolaGUID })
      ]);
      setTurmas(resultadoTurmas.turmas);
      setCursos(resultadoCursos.cursos);
    } catch (erro: any) {
      console.error('Erro ao carregar dados:', erro);
      alert('Erro ao carregar dados: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  // Definir campos do formulário
  const camposFormulario: CampoFormulario[] = useMemo(() => {
    const campos: CampoFormulario[] = [
      {
        id: 'TurmaSerie',
        label: 'Série',
        tipo: 'text',
        obrigatorio: true,
        placeholder: 'Ex: 1º Ano, 2º Ano, 3º Ano'
      },
      {
        id: 'TurmaNome',
        label: 'Nome da Turma',
        tipo: 'text',
        obrigatorio: true,
        placeholder: 'Ex: A, B, Matutino, Noturno'
      },
      {
        id: 'TurmaIsTecnico',
        label: 'É turma técnica?',
        tipo: 'checkbox',
        obrigatorio: false
      }
    ];

    // Só mostrar campo de curso se for turma técnica
    if (valoresFormulario.TurmaIsTecnico) {
      campos.push({
        id: 'CursoGUID',
        label: 'Curso (opcional)',
        tipo: 'select',
        obrigatorio: false,
        opcoes: [
          { valor: '', label: 'Nenhum curso' },
          ...cursos.map(curso => ({
            valor: curso.CursoGUID,
            label: curso.CursoNome
          }))
        ]
      });
    }

    return campos;
  }, [cursos, valoresFormulario.TurmaIsTecnico]);

  // Definir colunas da tabela
  const colunas: Coluna<TurmaAPI.Turma>[] = [
    {
      id: 'TurmaSerie',
      label: 'Série',
      width: '15%'
    },
    {
      id: 'TurmaNome',
      label: 'Nome',
      width: '20%'
    },
    {
      id: 'CursoGUID',
      label: 'Curso',
      width: '25%',
      render: (valor: any, turma: TurmaAPI.Turma) => {
        if (!valor) return <span className={styles.textoSecundario}>Sem curso</span>;
        const curso = cursos.find(c => c.CursoGUID === valor);
        return curso?.CursoNome || <span className={styles.textoSecundario}>Curso não encontrado</span>;
      }
    },
    {
      id: 'TurmaIsTecnico',
      label: 'Técnica',
      width: '10%',
      render: (valor: any) => (
        <span className={valor ? styles.badgeTecnico : styles.badgeRegular}>
          {valor ? 'Sim' : 'Não'}
        </span>
      )
    },
    {
      id: 'TurmaStatus',
      label: 'Status',
      width: '15%',
      render: (valor: any) => {
        let className = styles.statusAtivo;
        if (valor === 'Inativa') className = styles.statusInativo;
        if (valor === 'Encerrada') className = styles.statusEncerrado;
        return <span className={className}>{valor}</span>;
      }
    },
    {
      id: 'TurmaCreatedAt',
      label: 'Criado em',
      width: '15%',
      render: (valor: any) => new Date(valor).toLocaleDateString('pt-BR')
    }
  ];

  // Handlers
  const handleSubmitFormulario = async () => {
    try {
      setSalvandoFormulario(true);
      setErroFormulario('');

      if (turmaEditando) {
        // Editar turma existente
        await TurmaAPI.atualizarTurma(turmaEditando.TurmaGUID, {
          TurmaSerie: valoresFormulario.TurmaSerie,
          TurmaNome: valoresFormulario.TurmaNome,
          TurmaIsTecnico: valoresFormulario.TurmaIsTecnico,
          CursoGUID: valoresFormulario.CursoGUID || null
        });
        alert('Turma atualizada com sucesso!');
      } else {
        // Criar nova turma
        await TurmaAPI.criarTurma({
          EscolaGUID: escolaGUID,
          TurmaSerie: valoresFormulario.TurmaSerie,
          TurmaNome: valoresFormulario.TurmaNome,
          TurmaIsTecnico: valoresFormulario.TurmaIsTecnico,
          TurmaStatus: 'Ativa',
          CursoGUID: valoresFormulario.CursoGUID || null
        });
        alert('Turma criada com sucesso!');
      }

      setModalAberto(false);
      setTurmaEditando(null);
      setValoresFormulario({
        EscolaGUID: escolaGUID,
        TurmaSerie: '',
        TurmaNome: '',
        TurmaIsTecnico: false,
        CursoGUID: ''
      });
      carregarDados();

    } catch (erro: any) {
      console.error('Erro ao salvar turma:', erro);
      setErroFormulario(erro.message || 'Erro ao salvar turma');
    } finally {
      setSalvandoFormulario(false);
    }
  };

  const handleEditar = (turma: TurmaAPI.Turma) => {
    setTurmaEditando(turma);
    setValoresFormulario({
      EscolaGUID: escolaGUID,
      TurmaSerie: turma.TurmaSerie,
      TurmaNome: turma.TurmaNome,
      TurmaIsTecnico: turma.TurmaIsTecnico,
      CursoGUID: turma.CursoGUID || ''
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

      // Converter dados da planilha para DTO
      const turmasDTO: TurmaAPI.TurmaCreateDTO[] = dadosImportados.dados.map((linha: any) => {
        const serie = linha['Série'] ?? linha.TurmaSerie ?? linha.serie ?? '';
        const nome = linha['Nome da Turma'] ?? linha.TurmaNome ?? linha.nome ?? '';
        const cursoNome = linha['Nome do Curso'] ?? linha.CursoNome ?? undefined;
        return {
          EscolaGUID: escolaGUID,
          TurmaSerie: String(serie).trim(),
          TurmaNome: String(nome).trim(),
          CursoNome: cursoNome ? String(cursoNome).trim() : undefined,
          TurmaIsTecnico: !!cursoNome || linha['É Técnica?'] === 'Sim' || linha.TurmaIsTecnico === true,
          TurmaStatus: 'Ativa'
        };
      });

      // Enviar para API
      const resultado = await TurmaAPI.criarTurmasEmMassa(turmasDTO);
      
      setResultadoBatch(resultado);
      setDadosImportados(null);
      carregarDados();

    } catch (erro: any) {
      console.error('Erro ao importar turmas:', erro);
      alert('Erro ao importar turmas: ' + erro.message);
    } finally {
      setProcessandoBatch(false);
    }
  };

  const handleExcluir = async (turma: TurmaAPI.Turma, index: number) => {
    if (!confirm(`Tem certeza que deseja inativar a turma "${turma.TurmaSerie} ${turma.TurmaNome}"?`)) {
      return;
    }

    try {
      await TurmaAPI.atualizarTurma(turma.TurmaGUID, { TurmaStatus: 'Inativa' });
      alert('Turma inativada com sucesso!');
      carregarDados();
    } catch (erro: any) {
      console.error('Erro ao inativar turma:', erro);
      alert('Erro ao inativar turma: ' + erro.message);
    }
  };
  const handleReativar = async (turma: TurmaAPI.Turma, index: number) => {
    if (!confirm(`Tem certeza que deseja reativar a turma "${turma.TurmaNome}"?`)) {
      return;
    }

    try {
      await TurmaAPI.atualizarTurma(turma.TurmaGUID, { TurmaStatus: 'Ativa' });
      alert('Turma reativada com sucesso!');
      carregarDados();
    } catch (erro: any) {
      console.error('Erro ao reativar turma:', erro);
      alert('Erro ao reativar turma: ' + erro.message);
    }
  };
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}><Icon name="grid" size={22} /> Gestão de Turmas</h1>
          <p className={styles.subtitulo}>
            Gerencie as turmas da escola
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
<Icon name="upload" size={16} /> Importar Planilha
          </button>
          <button
            onClick={() => setModalAberto(true)}
            className={styles.botaoNovo}
          >
            + Nova Turma
          </button>
        </div>
      </div>

      {/* Tabela de Turmas */}
      <BaseTabelaDados
        titulo="Turmas Cadastradas"
        colunas={colunas}
        dados={turmas}
        carregando={carregando}
        acoes={(turma, index) => (
          <>
            <Link
              href={`/dashboard/${escolaGUID}/gestao-dados/turmas/${turma.TurmaGUID}/cronograma`}
              className={styles.botaoEditar}
              title="Cronograma"
            >
              <Icon name="calendar" size={16} />
            </Link>
            <button
              onClick={() => handleEditar(turma)}
              className={styles.botaoEditar}
              title="Editar"
            >
              <Icon name="edit" size={16} />
            </button>
            {turma.TurmaStatus === 'Ativa' ? (
              <button
                onClick={() => handleExcluir(turma, index)}
                className={styles.botaoExcluir}
                title="Inativar"
              >
                <Icon name="trash" size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleReativar(turma, index)}
                className={styles.botaoReativar}
                title="Reativar"
              >
                <Icon name="check" size={16} />
              </button>
            )}
          </>
        )}
        mensagemVazia="Nenhuma turma cadastrada. Clique em 'Nova Turma' ou importe uma planilha."
      />

      {/* Modal: Cadastro Individual */}
      {modalAberto && (
        <div className={styles.overlay} onClick={() => setModalAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <BaseFormularioCadastro
              titulo={turmaEditando ? "Editar Turma" : "Nova Turma"}
              campos={camposFormulario}
              valores={valoresFormulario}
              onChange={(campo, valor) => setValoresFormulario({ ...valoresFormulario, [campo]: valor })}
              onSubmit={handleSubmitFormulario}
              onCancel={() => {
                setModalAberto(false);
                setTurmaEditando(null);
                setValoresFormulario({
                  EscolaGUID: escolaGUID,
                  TurmaSerie: '',
                  TurmaNome: '',
                  TurmaIsTecnico: false,
                  CursoGUID: ''
                });
              }}
              loading={salvandoFormulario}
              erro={erroFormulario}
              botaoTexto={turmaEditando ? "Salvar Alterações" : "Criar Turma"}
            />
          </div>
        </div>
      )}

      {/* Modal: Upload de Planilha */}
      {modalUploadAberto && (
        <div className={styles.overlay} onClick={() => setModalUploadAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Importar Turmas via Planilha</h2>
              
              <BaseUploadPlanilha
                titulo="Upload de Planilha"
                subtitulo="Faça upload de um arquivo Excel (.xlsx) com as turmas"
                modeloUrl="/modelos/modelo-turmas.xlsx"
                onDadosCarregados={handleDadosCarregados}
                onErro={(erro) => alert(erro)}
                colunasEsperadas={['Série', 'Nome da Turma']}
              />

              {/* Preview dos dados importados */}
              {dadosImportados && (
                <div className={styles.previewContainer}>
                  <h3 className={styles.previewTitulo}>
                    <Icon name="file-text" size={18} /> Preview - {dadosImportados.dados.length} turmas encontradas
                  </h3>
                  <div className={styles.previewLista}>
                    {dadosImportados.dados.slice(0, 5).map((linha: any, idx: number) => (
                      <div key={idx} className={styles.previewItem}>
                        <Icon name="check" size={14} /> {linha['Série'] || linha.TurmaSerie || linha.serie} - {linha['Nome da Turma'] || linha.TurmaNome || linha.nome}
                        {(linha['Nome do Curso'] || linha.CursoNome) && (
                          <span className={styles.previewCurso}>
                            {' '}({linha['Nome do Curso'] || linha.CursoNome})
                          </span>
                        )}
                      </div>
                    ))}
                    {dadosImportados.dados.length > 5 && (
                      <div className={styles.previewMais}>
                        + {dadosImportados.dados.length - 5} turmas...
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSalvarImportados}
                    disabled={processandoBatch}
                    className={styles.botaoImportar}
                  >
                    {processandoBatch ? 'Processando...' : (<><Icon name="check" size={16} /> Salvar Todas</>)}
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
                      <span className={styles.statNumero}>{resultadoBatch.duplicados}</span>
                      <span className={styles.statLabel}>Duplicados</span>
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
                              <strong>{r.item.TurmaSerie} {r.item.TurmaNome}</strong>: {r.mensagem}
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
