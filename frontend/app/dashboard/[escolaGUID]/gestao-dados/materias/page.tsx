'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from '../page.module.css';

import BaseFormularioCadastro, { CampoFormulario } from '@/components/gestao-dados/BaseFormularioCadastro';
import BaseUploadPlanilha, { DadosPlanilha } from '@/components/gestao-dados/BaseUploadPlanilha';
import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';

import * as MateriaAPI from '@/lib/api/materia.api';
import * as CursoAPI from '@/lib/api/curso.api';

export default function MateriasPage() {
  const params = useParams();
  const escolaGUID = params.escolaGUID as string;

  // Estados
  const [materias, setMaterias] = useState<MateriaAPI.Materia[]>([]);
  const [cursos, setCursos] = useState<CursoAPI.Curso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [dadosImportados, setDadosImportados] = useState<DadosPlanilha<any> | null>(null);
  const [processandoBatch, setProcessandoBatch] = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState<MateriaAPI.BatchCreateResponse | null>(null);

  // Estados do formulário
  const [valoresFormulario, setValoresFormulario] = useState<Record<string, any>>({
    EscolaGUID: escolaGUID,
    MateriaNome: '',
    MateriaIsTecnico: false,
    MateriaStatus: 'Ativa',
    CursoGUID: ''
  });
  const [salvandoFormulario, setSalvandoFormulario] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Carregar matérias e cursos
  useEffect(() => {
    carregarDados();
  }, [escolaGUID]);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [resultadoMaterias, resultadoCursos] = await Promise.all([
        MateriaAPI.listarMaterias({ EscolaGUID: escolaGUID }),
        CursoAPI.listarCursos({ EscolaGUID: escolaGUID })
      ]);
      setMaterias(resultadoMaterias.materias);
      setCursos(resultadoCursos.cursos);
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
      id: 'MateriaNome',
      label: 'Nome da Matéria',
      tipo: 'text',
      obrigatorio: true,
      placeholder: 'Ex: Matemática, Português, Algoritmos'
    },
    {
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
    },
    {
      id: 'MateriaIsTecnico',
      label: 'É matéria técnica?',
      tipo: 'checkbox',
      obrigatorio: false
    },
    {
      id: 'MateriaStatus',
      label: 'Status',
      tipo: 'select',
      obrigatorio: true,
      opcoes: [
        { valor: 'Ativa', label: 'Ativa' },
        { valor: 'Inativa', label: 'Inativa' }
      ]
    }
  ];

  // Definir colunas da tabela
  const colunas: Coluna<MateriaAPI.Materia>[] = [
    {
      id: 'MateriaNome',
      label: 'Nome da Matéria',
      width: '30%'
    },
    {
      id: 'CursoGUID',
      label: 'Curso',
      width: '30%',
      render: (valor: any, materia: MateriaAPI.Materia) => {
        if (!valor) return <span className={styles.textoSecundario}>Sem curso</span>;
        const curso = cursos.find(c => c.CursoGUID === valor);
        return curso?.CursoNome || <span className={styles.textoSecundario}>Curso não encontrado</span>;
      }
    },
    {
      id: 'MateriaIsTecnico',
      label: 'Técnica',
      width: '10%',
      render: (valor: any) => (
        <span className={valor ? styles.badgeTecnico : styles.badgeRegular}>
          {valor ? 'Sim' : 'Não'}
        </span>
      )
    },
    {
      id: 'MateriaStatus',
      label: 'Status',
      width: '15%',
      render: (valor: any) => (
        <span className={valor === 'Ativa' ? styles.statusAtivo : styles.statusInativo}>
          {valor}
        </span>
      )
    },
    {
      id: 'MateriaCreatedAt',
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

      await MateriaAPI.criarMateria({
        EscolaGUID: escolaGUID,
        MateriaNome: valoresFormulario.MateriaNome,
        MateriaIsTecnico: valoresFormulario.MateriaIsTecnico,
        MateriaStatus: valoresFormulario.MateriaStatus,
        CursoGUID: valoresFormulario.CursoGUID || null
      });

      alert('Matéria criada com sucesso!');
      setModalAberto(false);
      setValoresFormulario({
        EscolaGUID: escolaGUID,
        MateriaNome: '',
        MateriaIsTecnico: false,
        MateriaStatus: 'Ativa',
        CursoGUID: ''
      });
      carregarDados();

    } catch (erro: any) {
      console.error('Erro ao criar matéria:', erro);
      setErroFormulario(erro.message || 'Erro ao criar matéria');
    } finally {
      setSalvandoFormulario(false);
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
      const materiasDTO: MateriaAPI.MateriaCreateDTO[] = dadosImportados.dados.map((linha: any) => ({
        EscolaGUID: escolaGUID,
        MateriaNome: linha['Nome da Matéria'] || linha.MateriaNome || linha.nome,
        CursoNome: linha['Nome do Curso'] || linha.CursoNome || undefined,
        MateriaIsTecnico: linha['É Técnica?'] === 'Sim' || linha.MateriaIsTecnico === true || false,
        MateriaStatus: 'Ativa'
      }));

      // Enviar para API
      const resultado = await MateriaAPI.criarMateriasEmMassa(materiasDTO);
      
      setResultadoBatch(resultado);
      setDadosImportados(null);
      carregarDados();

    } catch (erro: any) {
      console.error('Erro ao importar matérias:', erro);
      alert('Erro ao importar matérias: ' + erro.message);
    } finally {
      setProcessandoBatch(false);
    }
  };

  const handleExcluir = async (materia: MateriaAPI.Materia, index: number) => {
    if (!confirm(`Tem certeza que deseja excluir a matéria "${materia.MateriaNome}"?`)) {
      return;
    }

    try {
      await MateriaAPI.excluirMateria(materia.MateriaGUID);
      alert('Matéria excluída com sucesso!');
      carregarDados();
    } catch (erro: any) {
      console.error('Erro ao excluir matéria:', erro);
      alert('Erro ao excluir matéria: ' + erro.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>📚 Gestão de Matérias</h1>
          <p className={styles.subtitulo}>
            Gerencie as matérias/disciplinas da escola
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
            + Nova Matéria
          </button>
        </div>
      </div>

      {/* Tabela de Matérias */}
      <BaseTabelaDados
        titulo="Matérias Cadastradas"
        colunas={colunas}
        dados={materias}
        carregando={carregando}
        onExcluir={handleExcluir}
        mensagemVazia="Nenhuma matéria cadastrada. Clique em 'Nova Matéria' ou importe uma planilha."
      />

      {/* Modal: Cadastro Individual */}
      {modalAberto && (
        <div className={styles.overlay} onClick={() => setModalAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <BaseFormularioCadastro
              titulo="Nova Matéria"
              campos={camposFormulario}
              valores={valoresFormulario}
              onChange={(campo, valor) => setValoresFormulario({ ...valoresFormulario, [campo]: valor })}
              onSubmit={handleSubmitFormulario}
              onCancel={() => setModalAberto(false)}
              loading={salvandoFormulario}
              erro={erroFormulario}
              botaoTexto="Criar Matéria"
            />
          </div>
        </div>
      )}

      {/* Modal: Upload de Planilha */}
      {modalUploadAberto && (
        <div className={styles.overlay} onClick={() => setModalUploadAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Importar Matérias via Planilha</h2>
              
              <BaseUploadPlanilha
                titulo="Upload de Planilha"
                subtitulo="Faça upload de um arquivo Excel (.xlsx) com as matérias"
                modeloUrl="/modelos/modelo-materias.xlsx"
                onDadosCarregados={handleDadosCarregados}
                onErro={(erro) => alert(erro)}
                colunasEsperadas={['Nome da Matéria']}
              />

              {/* Preview dos dados importados */}
              {dadosImportados && (
                <div className={styles.previewContainer}>
                  <h3 className={styles.previewTitulo}>
                    📋 Preview - {dadosImportados.dados.length} matérias encontradas
                  </h3>
                  <div className={styles.previewLista}>
                    {dadosImportados.dados.slice(0, 5).map((linha: any, idx: number) => (
                      <div key={idx} className={styles.previewItem}>
                        ✅ {linha['Nome da Matéria'] || linha.MateriaNome || linha.nome}
                        {(linha['Nome do Curso'] || linha.CursoNome) && (
                          <span className={styles.previewCurso}>
                            {' '}- {linha['Nome do Curso'] || linha.CursoNome}
                          </span>
                        )}
                      </div>
                    ))}
                    {dadosImportados.dados.length > 5 && (
                      <div className={styles.previewMais}>
                        + {dadosImportados.dados.length - 5} matérias...
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSalvarImportados}
                    disabled={processandoBatch}
                    className={styles.botaoImportar}
                  >
                    {processandoBatch ? 'Processando...' : '💾 Salvar Todas'}
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
                      <h4 className={styles.errosTitulo}>⚠️ Erros Encontrados:</h4>
                      <div className={styles.errosLista}>
                        {resultadoBatch.resultados
                          .filter(r => r.tipo === 'erro')
                          .map((r, idx) => (
                            <div key={idx} className={styles.erroItem}>
                              <strong>{r.item.MateriaNome}</strong>: {r.mensagem}
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
