'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import * as RepresentanteAPI from '@/lib/api/representantelancamento.api';
import * as GradeHorariaAPI from '@/lib/api/gradehoraria.api';
import { DiaSemana, DIA_SEMANA_LABEL } from '@/lib/api/escolaconfiguracao.api';

/**
 * Lançamento de Prova/Tarefa/Conteúdo por Representante (temporário) — ver
 * docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md.
 *
 * Página enxuta e independente das telas de Gestão de Dados do professor —
 * o representante só lança pra própria turma, sem a complexidade de
 * distribuição multi-turma/categoria que o professor tem. Prova/Tarefa
 * reaproveitam o mesmo "definir automaticamente pelo cronograma"
 * (GradeHorariaAPI.calcularDatas) que ProvaAgendadaForm/TarefaForm já usam;
 * Conteúdo tem a opção extra de publicar no exato momento, já que não tem
 * prazo (ver §2.3 da spec).
 */
export default function RepresentantePage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [carregando, setCarregando] = useState(true);
  const [alocacoes, setAlocacoes] = useState<RepresentanteAPI.AlocacaoRepresentante[]>([]);
  const [alocacaoSelecionada, setAlocacaoSelecionada] = useState('');
  const [aba, setAba] = useState<'prova' | 'tarefa' | 'conteudo'>('prova');

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'digital' | 'fisica'>('digital');

  // Prova/Tarefa: data específica OU calculada automaticamente pelo cronograma.
  const [modoData, setModoData] = useState<'especifico' | 'automatico'>('especifico');
  const [data, setData] = useState('');
  const [semanaBase, setSemanaBase] = useState('');
  const [diaEscolhido, setDiaEscolhido] = useState<DiaSemana | ''>('');
  const [resultadoCalculo, setResultadoCalculo] = useState<GradeHorariaAPI.ResultadoCalculo | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erroCalculo, setErroCalculo] = useState('');

  // Conteúdo: agendar pra uma data OU publicar no exato momento.
  const [modoConteudo, setModoConteudo] = useState<'agora' | 'agendado'>('agora');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    if (!escolaGUID) return;
    RepresentanteAPI.listarMinhasAlocacoes(escolaGUID)
      .then((lista) => {
        setAlocacoes(lista);
        if (lista.length > 0) setAlocacaoSelecionada(lista[0].MatProfTurGUID);
      })
      .catch((err) => setErro(err.message || 'Erro ao carregar suas turmas'))
      .finally(() => setCarregando(false));
  }, [escolaGUID]);

  const alvo = alocacoes.find((a) => a.MatProfTurGUID === alocacaoSelecionada);
  // Prova sempre é calculada pelo cronograma — só Tarefa deixa escolher entre
  // dia definido e variável (data específica não faz sentido pra prova aqui).
  const modoDataEfetivo = aba === 'prova' ? 'automatico' : modoData;

  const resetarFormulario = () => {
    setTitulo('');
    setDescricao('');
    setData('');
    setTipoEntrega('digital');
    setModoData('especifico');
    setSemanaBase('');
    setDiaEscolhido('');
    setResultadoCalculo(null);
    setErroCalculo('');
    setModoConteudo('agora');
  };

  const calcularAutomatico = async (diaOverride?: DiaSemana) => {
    if (!alvo || !semanaBase) return;
    setCalculando(true);
    setErroCalculo('');
    try {
      const [resultado] = await GradeHorariaAPI.calcularDatas(alvo.MateriaGUID, [
        { TurmaGUID: alvo.TurmaGUID, SemanaBase: semanaBase, DiaSemana: diaOverride ?? (diaEscolhido || undefined) },
      ]);
      setResultadoCalculo(resultado);
      if (resultado.status === 'erro') setErroCalculo(resultado.mensagem || 'Não foi possível calcular a data.');
      if (resultado.status === 'semCronograma') setErroCalculo('Esta turma não tem cronograma cadastrado para esta matéria — use data específica.');
    } catch (err: any) {
      setErroCalculo(err.message || 'Erro ao calcular a data automaticamente');
    } finally {
      setCalculando(false);
    }
  };

  const handleEscolherDia = async (dia: DiaSemana) => {
    setDiaEscolhido(dia);
    await calcularAutomatico(dia);
  };

  const handleSalvar = async () => {
    if (!alvo) return;

    setSalvando(true);
    setErro('');
    setSucesso('');
    try {
      if (aba === 'prova') {
        await RepresentanteAPI.criarProvaRepresentante(alvo.TurmaGUID, {
          MateriaGUID: alvo.MateriaGUID,
          ProvaTitulo: titulo,
          ProvaData: modoDataEfetivo === 'automatico' ? resultadoCalculo!.DataCalculada! : data,
          ProvaDescricao: descricao || undefined,
          ModoAutomatico: modoDataEfetivo === 'automatico',
          SemanaBase: modoDataEfetivo === 'automatico' ? semanaBase : undefined,
          DiaSemana: modoDataEfetivo === 'automatico' ? resultadoCalculo?.DiaSemana : undefined,
        });
        setSucesso(`Prova "${titulo}" criada em nome de ${alvo.ProfessorNome} para ${alvo.TurmaNome}.`);
      } else if (aba === 'tarefa') {
        await RepresentanteAPI.criarTarefaRepresentante(alvo.TurmaGUID, {
          MateriaGUID: alvo.MateriaGUID,
          TarefaTitulo: titulo,
          TarefaConteudo: descricao || undefined,
          TarefaPrazoData: modoDataEfetivo === 'automatico' ? resultadoCalculo!.DataCalculada! : data,
          TarefaTipoEntrega: tipoEntrega,
          ModoAutomatico: modoDataEfetivo === 'automatico',
          SemanaBase: modoDataEfetivo === 'automatico' ? semanaBase : undefined,
          DiaSemana: modoDataEfetivo === 'automatico' ? resultadoCalculo?.DiaSemana : undefined,
        });
        setSucesso(`Tarefa "${titulo}" criada em nome de ${alvo.ProfessorNome} para ${alvo.TurmaNome}.`);
      } else {
        const dataPublicacao = modoConteudo === 'agora' ? new Date().toISOString().slice(0, 16) : data;
        await RepresentanteAPI.criarConteudoRepresentante(alvo.TurmaGUID, {
          MateriaGUID: alvo.MateriaGUID,
          ConteudoTitulo: titulo,
          ConteudoDescricao: descricao || undefined,
          ConteudoDataPublicacao: dataPublicacao,
          ConteudoHtml: `<p>${descricao || titulo}</p>`,
        });
        setSucesso(`Conteúdo "${titulo}" publicado em nome de ${alvo.ProfessorNome} para ${alvo.TurmaNome}.`);
      }
      resetarFormulario();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className={styles.container}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (alocacoes.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.titulo}>Lançar em nome do professor</h1>
        <div className={styles.aviso}>
          {erro || 'Você não é representante ativo de nenhuma turma, ou a escola ainda não ativou este recurso.'}
        </div>
      </div>
    );
  }

  const dataResolvidaOk = modoDataEfetivo === 'especifico' ? !!data : resultadoCalculo?.status === 'ok';
  const podeSalvar =
    !!titulo &&
    (aba === 'conteudo' ? (modoConteudo === 'agora' || !!data) : dataResolvidaOk);

  return (
    <div className={styles.container}>
      <h1 className={styles.titulo}>Lançar em nome do professor</h1>
      <p className={styles.subtitulo}>
        Enquanto os professores ainda não usam o sistema, você pode lançar prova, tarefa e conteúdo pelas
        turmas onde é representante — sempre em nome do professor responsável pela matéria.
      </p>

      <div className={styles.campoContainer}>
        <label className={styles.label}>Turma / Matéria</label>
        <select
          className={styles.select}
          value={alocacaoSelecionada}
          onChange={(e) => {
            setAlocacaoSelecionada(e.target.value);
            setResultadoCalculo(null);
          }}
        >
          {alocacoes.map((a) => (
            <option key={a.MatProfTurGUID} value={a.MatProfTurGUID}>
              {a.TurmaNome} — {a.MateriaNome} ({a.ProfessorNome})
            </option>
          ))}
        </select>
      </div>

      {alvo && (
        <div className={styles.badge}>
          Será criado em nome de <strong>{alvo.ProfessorNome}</strong>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${aba === 'prova' ? styles.tabAtiva : ''}`}
          onClick={() => {
            setAba('prova');
            resetarFormulario();
          }}
        >
          Prova
        </button>
        <button
          type="button"
          className={`${styles.tab} ${aba === 'tarefa' ? styles.tabAtiva : ''}`}
          onClick={() => {
            setAba('tarefa');
            resetarFormulario();
          }}
        >
          Tarefa
        </button>
        <button
          type="button"
          className={`${styles.tab} ${aba === 'conteudo' ? styles.tabAtiva : ''}`}
          onClick={() => {
            setAba('conteudo');
            resetarFormulario();
          }}
        >
          Conteúdo
        </button>
      </div>

      {erro && <div className={styles.erro}>{erro}</div>}
      {sucesso && <div className={styles.sucesso}>{sucesso}</div>}

      <div className={styles.campoContainer}>
        <label className={styles.label}>Título</label>
        <input className={styles.input} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>

      <div className={styles.campoContainer}>
        <label className={styles.label}>{aba === 'conteudo' ? 'Conteúdo' : 'Descrição'}</label>
        <textarea className={styles.textarea} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>

      {aba === 'tarefa' && (
        <div className={styles.campoContainer}>
          <label className={styles.label}>Tipo de entrega</label>
          <select className={styles.select} value={tipoEntrega} onChange={(e) => setTipoEntrega(e.target.value as 'digital' | 'fisica')}>
            <option value="digital">Digital</option>
            <option value="fisica">Física</option>
          </select>
        </div>
      )}

      {(aba === 'prova' || aba === 'tarefa') && (
        <>
          <div className={styles.campoContainer}>
            <label className={styles.label}>{aba === 'tarefa' ? 'Prazo' : 'Data da prova'}</label>
            {aba === 'tarefa' ? (
              <div className={styles.segmentado}>
                <button
                  type="button"
                  className={`${styles.segmentadoOpcao} ${modoData === 'especifico' ? styles.segmentadoAtivo : ''}`}
                  onClick={() => setModoData('especifico')}
                >
                  Dia definido
                </button>
                <button
                  type="button"
                  className={`${styles.segmentadoOpcao} ${modoData === 'automatico' ? styles.segmentadoAtivo : ''}`}
                  onClick={() => setModoData('automatico')}
                >
                  Dia variável (cronograma)
                </button>
              </div>
            ) : (
              <p className={styles.textoSecundario}>Prova sempre é calculada automaticamente pelo cronograma da turma.</p>
            )}
          </div>

          {modoDataEfetivo === 'especifico' ? (
            <div className={styles.campoContainer}>
              <input type="datetime-local" className={styles.input} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          ) : (
            <div className={styles.campoContainer}>
              <label className={styles.label}>Qualquer dia dentro da semana desejada</label>
              <input
                type="date"
                className={styles.input}
                value={semanaBase}
                onChange={(e) => {
                  setSemanaBase(e.target.value);
                  setResultadoCalculo(null);
                  setDiaEscolhido('');
                }}
                onBlur={() => semanaBase && calcularAutomatico()}
              />

              {calculando && <p className={styles.textoSecundario}>Calculando...</p>}
              {erroCalculo && <div className={styles.erro}>{erroCalculo}</div>}

              {resultadoCalculo?.status === 'escolherDia' && resultadoCalculo.Ocorrencias && (
                <div className={styles.campoContainer}>
                  <label className={styles.label}>Esta matéria ocorre mais de uma vez por semana nesta turma — escolha o dia</label>
                  <select className={styles.select} value={diaEscolhido} onChange={(e) => handleEscolherDia(e.target.value as DiaSemana)}>
                    <option value="">Selecione...</option>
                    {resultadoCalculo.Ocorrencias.map((o) => (
                      <option key={o.DiaSemana} value={o.DiaSemana}>
                        {DIA_SEMANA_LABEL[o.DiaSemana]} {o.HoraInicio}–{o.HoraFim}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {resultadoCalculo?.status === 'ok' && resultadoCalculo.DataCalculada && (
                <p className={styles.sucesso}>
                  Data calculada: {new Date(resultadoCalculo.DataCalculada).toLocaleString('pt-BR')} ({DIA_SEMANA_LABEL[resultadoCalculo.DiaSemana!]})
                </p>
              )}
            </div>
          )}
        </>
      )}

      {aba === 'conteudo' && (
        <>
          <div className={styles.campoContainer}>
            <label className={styles.label}>Publicação</label>
            <div className={styles.segmentado}>
              <button
                type="button"
                className={`${styles.segmentadoOpcao} ${modoConteudo === 'agora' ? styles.segmentadoAtivo : ''}`}
                onClick={() => setModoConteudo('agora')}
              >
                Publicar agora
              </button>
              <button
                type="button"
                className={`${styles.segmentadoOpcao} ${modoConteudo === 'agendado' ? styles.segmentadoAtivo : ''}`}
                onClick={() => setModoConteudo('agendado')}
              >
                Agendar
              </button>
            </div>
          </div>

          {modoConteudo === 'agendado' && (
            <div className={styles.campoContainer}>
              <label className={styles.label}>Data de publicação</label>
              <input type="datetime-local" className={styles.input} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          )}
        </>
      )}

      <button className={styles.botaoSalvar} onClick={handleSalvar} disabled={salvando || !podeSalvar}>
        {salvando ? 'Salvando...' : 'Criar'}
      </button>
    </div>
  );
}
