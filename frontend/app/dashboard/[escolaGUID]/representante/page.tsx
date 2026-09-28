'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import * as RepresentanteAPI from '@/lib/api/representantelancamento.api';

/**
 * Lançamento de Prova/Tarefa/Conteúdo por Representante (temporário) — ver
 * docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md.
 *
 * Página enxuta e independente das telas de Gestão de Dados do professor —
 * o representante só lança pra própria turma, sem a complexidade de
 * distribuição multi-turma/categoria que o professor tem. Data é sempre
 * específica (sem "agendamento automático pelo cronograma", que também não
 * está disponível no fluxo do WhatsApp por este mesmo motivo — ver spec §9).
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
  const [data, setData] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<'digital' | 'fisica'>('digital');

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

  const resetarFormulario = () => {
    setTitulo('');
    setDescricao('');
    setData('');
    setTipoEntrega('digital');
  };

  const handleSalvar = async () => {
    const alvo = alocacoes.find((a) => a.MatProfTurGUID === alocacaoSelecionada);
    if (!alvo) return;

    setSalvando(true);
    setErro('');
    setSucesso('');
    try {
      if (aba === 'prova') {
        await RepresentanteAPI.criarProvaRepresentante(alvo.TurmaGUID, {
          MateriaGUID: alvo.MateriaGUID,
          ProvaTitulo: titulo,
          ProvaData: data,
          ProvaDescricao: descricao || undefined,
        });
        setSucesso(`Prova "${titulo}" criada em nome de ${alvo.ProfessorNome} para ${alvo.TurmaNome}.`);
      } else if (aba === 'tarefa') {
        await RepresentanteAPI.criarTarefaRepresentante(alvo.TurmaGUID, {
          MateriaGUID: alvo.MateriaGUID,
          TarefaTitulo: titulo,
          TarefaConteudo: descricao || undefined,
          TarefaPrazoData: data,
          TarefaTipoEntrega: tipoEntrega,
        });
        setSucesso(`Tarefa "${titulo}" criada em nome de ${alvo.ProfessorNome} para ${alvo.TurmaNome}.`);
      } else {
        await RepresentanteAPI.criarConteudoRepresentante(alvo.TurmaGUID, {
          MateriaGUID: alvo.MateriaGUID,
          ConteudoTitulo: titulo,
          ConteudoDescricao: descricao || undefined,
          ConteudoDataPublicacao: data,
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

  const alvo = alocacoes.find((a) => a.MatProfTurGUID === alocacaoSelecionada);

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
          onChange={(e) => setAlocacaoSelecionada(e.target.value)}
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
          onClick={() => setAba('prova')}
        >
          Prova
        </button>
        <button
          type="button"
          className={`${styles.tab} ${aba === 'tarefa' ? styles.tabAtiva : ''}`}
          onClick={() => setAba('tarefa')}
        >
          Tarefa
        </button>
        <button
          type="button"
          className={`${styles.tab} ${aba === 'conteudo' ? styles.tabAtiva : ''}`}
          onClick={() => setAba('conteudo')}
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

      <div className={styles.campoContainer}>
        <label className={styles.label}>{aba === 'tarefa' ? 'Prazo' : aba === 'prova' ? 'Data da prova' : 'Data de publicação'}</label>
        <input
          type="datetime-local"
          className={styles.input}
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
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

      <button className={styles.botaoSalvar} onClick={handleSalvar} disabled={salvando || !titulo || !data}>
        {salvando ? 'Salvando...' : 'Criar'}
      </button>
    </div>
  );
}
