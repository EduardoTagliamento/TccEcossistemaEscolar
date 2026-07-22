'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './page.module.css';

import BaseFormularioCadastro, { CampoFormulario } from '@/components/gestao-dados/BaseFormularioCadastro';
import BaseUploadPlanilha, { DadosPlanilha } from '@/components/gestao-dados/BaseUploadPlanilha';
import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import { Icon } from '@/components/Icon';

import * as CursoAPI from '@/lib/api/curso.api';

export default function CursosPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  // Estados
  const [cursos, setCursos] = useState<CursoAPI.Curso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [dadosImportados, setDadosImportados] = useState<DadosPlanilha<any> | null>(null);
  const [processandoBatch, setProcessandoBatch] = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState<CursoAPI.BatchCreateResponse | null>(null);
  const [cursoEditando, setCursoEditando] = useState<CursoAPI.Curso | null>(null);

  // Estados do formulário
  const [valoresFormulario, setValoresFormulario] = useState<Record<string, any>>({
    EscolaGUID: escolaGUID,
    CursoNome: ''
  });
  const [salvandoFormulario, setSalvandoFormulario] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Carregar cursos
  useEffect(() => {
    carregarCursos();
  }, [escolaGUID]);

  const carregarCursos = async () => {
    try {
      setCarregando(true);
      const resultado = await CursoAPI.listarCursos({ EscolaGUID: escolaGUID });
      setCursos(resultado.cursos);
    } catch (erro: any) {
      console.error('Erro ao carregar cursos:', erro);
      alert('Erro ao carregar cursos: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  // Definir campos do formulário
  const camposFormulario: CampoFormulario[] = [
    {
      id: 'CursoNome',
      label: 'Nome do Curso',
      tipo: 'text',
      obrigatorio: true,
      placeholder: 'Ex: Técnico em Informática'
    }
  ];

  // Definir colunas da tabela
  const colunas: Coluna<CursoAPI.Curso>[] = [
    {
      id: 'CursoNome',
      label: 'Nome do Curso',
      width: '60%'
    },
    {
      id: 'CursoStatus',
      label: 'Status',
      width: '20%',
      render: (valor: any) => (
        <span className={valor === 'Ativo' ? styles.statusAtivo : styles.statusInativo}>
          {valor}
        </span>
      )
    },
    {
      id: 'CursoCreatedAt',
      label: 'Criado em',
      width: '20%',
      render: (valor: any) => new Date(valor).toLocaleDateString('pt-BR')
    }
  ];

  // Handlers
  const handleSubmitFormulario = async () => {
    try {
      setSalvandoFormulario(true);
      setErroFormulario('');

      if (cursoEditando) {
        // Editar curso existente
        await CursoAPI.atualizarCurso(cursoEditando.CursoGUID, {
          CursoNome: valoresFormulario.CursoNome
        });
        alert('Curso atualizado com sucesso!');
      } else {
        // Criar novo curso
        await CursoAPI.criarCurso({
          EscolaGUID: escolaGUID,
          CursoNome: valoresFormulario.CursoNome,
          CursoStatus: 'Ativo'
        });
        alert('Curso criado com sucesso!');
      }

      setModalAberto(false);
      setCursoEditando(null);
      setValoresFormulario({ EscolaGUID: escolaGUID, CursoNome: '' });
      carregarCursos();

    } catch (erro: any) {
      console.error('Erro ao salvar curso:', erro);
      setErroFormulario(erro.message || 'Erro ao salvar curso');
    } finally {
      setSalvandoFormulario(false);
    }
  };

  const handleEditar = (curso: CursoAPI.Curso) => {
    setCursoEditando(curso);
    setValoresFormulario({
      EscolaGUID: escolaGUID,
      CursoNome: curso.CursoNome
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
      const cursosDTO: CursoAPI.CursoCreateDTO[] = dadosImportados.dados.map((linha: any) => ({
        EscolaGUID: escolaGUID,
        CursoNome: linha['Nome do Curso'] || linha.CursoNome || linha.nome,
        CursoStatus: 'Ativo'
      }));

      // Enviar para API
      const resultado = await CursoAPI.criarCursosEmMassa(cursosDTO);
      
      setResultadoBatch(resultado);
      setDadosImportados(null);
      carregarCursos();

    } catch (erro: any) {
      console.error('Erro ao importar cursos:', erro);
      alert('Erro ao importar cursos: ' + erro.message);
    } finally {
      setProcessandoBatch(false);
    }
  };

  const handleExcluir = async (curso: CursoAPI.Curso, index: number) => {
    if (!confirm(`Tem certeza que deseja inativar o curso "${curso.CursoNome}"?`)) {
      return;
    }

    try {
      await CursoAPI.atualizarCurso(curso.CursoGUID, { CursoStatus: 'Inativo' });
      alert('Curso inativado com sucesso!');
      carregarCursos();
    } catch (erro: any) {
      console.error('Erro ao inativar curso:', erro);
      alert('Erro ao inativar curso: ' + erro.message);
    }
  };
  const handleReativar = async (curso: CursoAPI.Curso, index: number) => {
    if (!confirm(`Tem certeza que deseja reativar o curso "${curso.CursoNome}"?`)) {
      return;
    }

    try {
      await CursoAPI.atualizarCurso(curso.CursoGUID, { CursoStatus: 'Ativo' });
      alert('Curso reativado com sucesso!');
      carregarCursos();
    } catch (erro: any) {
      console.error('Erro ao reativar curso:', erro);
      alert('Erro ao reativar curso: ' + erro.message);
    }
  };
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}><Icon name="layers" size={22} /> Gestão de Cursos</h1>
          <p className={styles.subtitulo}>
            Gerencie os cursos técnicos da escola
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
            onClick={() => setModalAberto(true)}
            className={styles.botaoNovo}
          >
            + Novo Curso
          </button>
        </div>
      </div>

      {/* Tabela de Cursos */}
      <BaseTabelaDados
        titulo="Cursos Cadastrados"
        colunas={colunas}
        dados={cursos}
        carregando={carregando}
        acoes={(curso, index) => (
          <>
            <button
              onClick={() => handleEditar(curso)}
              className={styles.botaoEditar}
              title="Editar"
            >
              <Icon name="edit" size={16} />
            </button>
            {curso.CursoStatus === 'Ativo' ? (
              <button
                onClick={() => handleExcluir(curso, index)}
                className={styles.botaoExcluir}
                title="Inativar"
              >
                <Icon name="trash" size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleReativar(curso, index)}
                className={styles.botaoReativar}
                title="Reativar"
              >
                <Icon name="check" size={16} />
              </button>
            )}
          </>
        )}
        mensagemVazia="Nenhum curso cadastrado. Clique em 'Novo Curso' ou importe uma planilha."
      />

      {/* Modal: Cadastro Individual */}
      {modalAberto && (
        <div className={styles.overlay} onClick={() => setModalAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <BaseFormularioCadastro
              titulo={cursoEditando ? "Editar Curso" : "Novo Curso"}
              campos={camposFormulario}
              valores={valoresFormulario}
              onChange={(campo, valor) => setValoresFormulario({ ...valoresFormulario, [campo]: valor })}
              onSubmit={handleSubmitFormulario}
              onCancel={() => {
                setModalAberto(false);
                setCursoEditando(null);
                setValoresFormulario({ EscolaGUID: escolaGUID, CursoNome: '' });
              }}
              loading={salvandoFormulario}
              erro={erroFormulario}
              botaoTexto={cursoEditando ? "Salvar Alterações" : "Criar Curso"}
            />
          </div>
        </div>
      )}

      {/* Modal: Upload de Planilha */}
      {modalUploadAberto && (
        <div className={styles.overlay} onClick={() => setModalUploadAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Importar Cursos via Planilha</h2>
              
              <BaseUploadPlanilha
                titulo="Upload de Planilha"
                subtitulo="Faça upload de um arquivo Excel (.xlsx) com os cursos"
                modeloUrl="/modelos/modelo-cursos.xlsx"
                onDadosCarregados={handleDadosCarregados}
                onErro={(erro) => alert(erro)}
                colunasEsperadas={['Nome do Curso']}
              />

              {/* Preview dos dados importados */}
              {dadosImportados && (
                <div className={styles.previewContainer}>
                  <h3 className={styles.previewTitulo}>
                    <Icon name="file-text" size={18} /> Preview - {dadosImportados.dados.length} cursos encontrados
                  </h3>
                  <div className={styles.previewLista}>
                    {dadosImportados.dados.slice(0, 5).map((linha: any, idx: number) => (
                      <div key={idx} className={styles.previewItem}>
                        <Icon name="check" size={14} /> {linha['Nome do Curso'] || linha.CursoNome || linha.nome}
                      </div>
                    ))}
                    {dadosImportados.dados.length > 5 && (
                      <div className={styles.previewMais}>
                        + {dadosImportados.dados.length - 5} cursos...
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
                      <span className={styles.statNumero}>{resultadoBatch.duplicados}</span>
                      <span className={styles.statLabel}>Duplicados</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumero}>{resultadoBatch.erros}</span>
                      <span className={styles.statLabel}>Erros</span>
                    </div>
                  </div>
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
