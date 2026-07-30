'use client';

/**
 * Importação em massa de questões de tarefa "lista" via planilha Excel —
 * aditivo em cima do que já existe: reaproveita BaseUploadPlanilha (parse
 * genérico) e criarQuestao/criarQuestoesBatch já validados (Fases 1-2).
 *
 * Duas rotas de saída, dependendo de a tarefa já existir ou não:
 * - `tarefaGUID` presente (modo edição): valida no cliente e já importa
 *   direto no backend (POST .../questoes/importar), que tenta cada linha
 *   independentemente — uma linha inválida não derruba as demais.
 * - `tarefaGUID` ausente (tarefa nova, ainda sem GUID): só valida no
 *   cliente e devolve o rascunho pro formulário acrescentar à lista local,
 *   que vai junto no criarQuestoesBatch quando a tarefa for salva.
 */

import { useState } from 'react';
import BaseUploadPlanilha, { DadosPlanilha } from '@/components/gestao-dados/BaseUploadPlanilha';
import { Icon } from '@/components/Icon';
import { useImportarQuestoesPlanilha } from '@/lib/tarefas/useTarefaMutations';
import { exportarParaExcel } from '@/lib/exportarExcel';
import type { AlternativaInput, Questao, QuestaoImportRow } from '@/types/tarefaacademica';
import styles from './ImportarQuestoesPlanilha.module.css';

const LETRAS = ['A', 'B', 'C', 'D', 'E'] as const;

function parseLinha(raw: any, linhaOriginal: number): { questao: QuestaoImportRow } | { erro: string } {
  const enunciado = String(raw['Enunciado'] ?? '').trim();
  if (!enunciado) {
    return { erro: `Linha ${linhaOriginal}: 'Enunciado' é obrigatório.` };
  }

  const tipoRaw = String(raw['Tipo'] ?? '').trim().toLowerCase();
  const tipo: 'objetiva' | 'discursiva' | null =
    tipoRaw === 'objetiva' ? 'objetiva' : tipoRaw === 'discursiva' ? 'discursiva' : null;
  if (!tipo) {
    return { erro: `Linha ${linhaOriginal}: 'Tipo' deve ser 'Objetiva' ou 'Discursiva'.` };
  }

  const pontosMaximos = Number(raw['Pontos Máximos']);
  if (!raw['Pontos Máximos'] || isNaN(pontosMaximos) || pontosMaximos <= 0) {
    return { erro: `Linha ${linhaOriginal}: 'Pontos Máximos' é obrigatório e deve ser um número > 0.` };
  }

  const explicacaoRaw = raw['Explicação'];
  const explicacao = explicacaoRaw ? String(explicacaoRaw).trim() : undefined;

  if (tipo === 'discursiva') {
    return {
      questao: {
        LinhaOriginal: linhaOriginal,
        QuestaoEnunciado: enunciado,
        QuestaoTipo: 'discursiva',
        QuestaoPontosMaximos: pontosMaximos,
        QuestaoExplicacao: explicacao,
      },
    };
  }

  const corretaLetra = String(raw['Correta'] ?? '').trim().toUpperCase();
  if (!(LETRAS as readonly string[]).includes(corretaLetra)) {
    return { erro: `Linha ${linhaOriginal}: 'Correta' deve ser uma letra entre A e E.` };
  }

  const alternativas: AlternativaInput[] = [];
  for (const letra of LETRAS) {
    const texto = raw[`Alternativa ${letra}`];
    if (texto === undefined || texto === null || String(texto).trim() === '') continue;

    const pontosLetraRaw = raw[`Pontos ${letra}`];
    const pontosLetra =
      pontosLetraRaw !== undefined && pontosLetraRaw !== ''
        ? Number(pontosLetraRaw)
        : letra === corretaLetra
          ? pontosMaximos
          : 0;

    alternativas.push({
      AlternativaTexto: String(texto).trim(),
      AlternativaCorreta: letra === corretaLetra,
      AlternativaPontos: isNaN(pontosLetra) ? 0 : pontosLetra,
    });
  }

  if (alternativas.length < 2) {
    return { erro: `Linha ${linhaOriginal}: questão objetiva precisa de ao menos 2 alternativas preenchidas.` };
  }
  if (!alternativas.some((a) => a.AlternativaCorreta)) {
    return { erro: `Linha ${linhaOriginal}: a letra marcada em 'Correta' (${corretaLetra}) não corresponde a nenhuma alternativa preenchida.` };
  }

  return {
    questao: {
      LinhaOriginal: linhaOriginal,
      QuestaoEnunciado: enunciado,
      QuestaoTipo: 'objetiva',
      QuestaoPontosMaximos: pontosMaximos,
      QuestaoExplicacao: explicacao,
      Alternativas: alternativas,
    },
  };
}

interface ImportarQuestoesPlanilhaProps {
  tarefaGUID?: string;
  onImportadoRascunho?: (linhas: QuestaoImportRow[]) => void;
  onImportadoBackend?: (criadas: Questao[]) => void;
}

export default function ImportarQuestoesPlanilha({
  tarefaGUID,
  onImportadoRascunho,
  onImportadoBackend,
}: ImportarQuestoesPlanilhaProps) {
  const [linhasValidas, setLinhasValidas] = useState<QuestaoImportRow[]>([]);
  const [errosParse, setErrosParse] = useState<string[]>([]);
  const [errosBackend, setErrosBackend] = useState<string[]>([]);
  const [totalImportado, setTotalImportado] = useState<number | null>(null);
  const importarMutation = useImportarQuestoesPlanilha(tarefaGUID ?? '');
  const importando = importarMutation.isPending;

  const handleDadosCarregados = (dados: DadosPlanilha<any>) => {
    const validas: QuestaoImportRow[] = [];
    const erros: string[] = [];

    dados.dados.forEach((linha, indice) => {
      const linhaOriginal = indice + 2; // linha 1 da planilha é o cabeçalho
      const resultado = parseLinha(linha, linhaOriginal);
      if ('erro' in resultado) erros.push(resultado.erro);
      else validas.push(resultado.questao);
    });

    setLinhasValidas(validas);
    setErrosParse(erros);
    setTotalImportado(null);
    setErrosBackend([]);
  };

  const baixarModelo = () => {
    exportarParaExcel('modelo-questoes-lista', 'Questões', [
      {
        Enunciado: 'Qual é a capital do Brasil?',
        Tipo: 'Objetiva',
        'Alternativa A': 'São Paulo',
        'Alternativa B': 'Brasília',
        'Alternativa C': 'Rio de Janeiro',
        'Alternativa D': '',
        'Alternativa E': '',
        'Pontos A': '',
        'Pontos B': '',
        'Pontos C': '',
        'Pontos D': '',
        'Pontos E': '',
        Correta: 'B',
        'Pontos Máximos': 1,
        Explicação: 'Brasília é a capital federal desde 1960.',
      },
      {
        Enunciado: 'Explique com suas palavras o que é fotossíntese.',
        Tipo: 'Discursiva',
        'Alternativa A': '',
        'Alternativa B': '',
        'Alternativa C': '',
        'Alternativa D': '',
        'Alternativa E': '',
        'Pontos A': '',
        'Pontos B': '',
        'Pontos C': '',
        'Pontos D': '',
        'Pontos E': '',
        Correta: '',
        'Pontos Máximos': 2,
        Explicação: '',
      },
    ]);
  };

  const confirmarImportacao = async () => {
    if (linhasValidas.length === 0) return;

    if (!tarefaGUID) {
      onImportadoRascunho?.(linhasValidas);
      setLinhasValidas([]);
      setErrosParse([]);
      return;
    }

    try {
      const resultado = await importarMutation.mutateAsync(linhasValidas);
      setTotalImportado(resultado.count);
      setErrosBackend(resultado.erros.map((e) => `Linha ${e.linha}: ${e.mensagem}`));
      onImportadoBackend?.(resultado.criadas);
      setLinhasValidas([]);
    } catch (erro: any) {
      alert(erro?.message || 'Erro ao importar questões');
    }
  };

  return (
    <div className={styles.container}>
      <button type="button" className={styles.botaoModelo} onClick={baixarModelo}>
        <Icon name="download" size={14} /> Baixar modelo da planilha
      </button>

      <BaseUploadPlanilha
        titulo="Importar questões"
        subtitulo="Envie um Excel (.xlsx) com as questões — use o modelo acima para o formato esperado."
        onDadosCarregados={handleDadosCarregados}
        onErro={(erro) => alert(erro)}
        colunasEsperadas={['Enunciado', 'Tipo']}
      />

      {(linhasValidas.length > 0 || errosParse.length > 0) && (
        <div className={styles.preview}>
          {linhasValidas.length > 0 && (
            <>
              <p className={styles.previewTitulo}>
                <Icon name="check-circle" size={16} /> {linhasValidas.length} questão(ões) válida(s)
              </p>
              <ul className={styles.previewLista}>
                {linhasValidas.slice(0, 5).map((q) => (
                  <li key={q.LinhaOriginal}>
                    Linha {q.LinhaOriginal}: {q.QuestaoEnunciado.slice(0, 60)}
                    {q.QuestaoEnunciado.length > 60 ? '…' : ''} ({q.QuestaoTipo})
                  </li>
                ))}
                {linhasValidas.length > 5 && <li>+ {linhasValidas.length - 5} questão(ões)...</li>}
              </ul>
              <button type="button" className={styles.botaoImportar} disabled={importando} onClick={confirmarImportacao}>
                {importando ? 'Importando...' : `Importar ${linhasValidas.length} questão(ões)`}
              </button>
            </>
          )}

          {errosParse.length > 0 && (
            <div className={styles.erros}>
              <p className={styles.errosTitulo}>
                <Icon name="alert-triangle" size={14} /> {errosParse.length} linha(s) com erro:
              </p>
              <ul>
                {errosParse.map((erro, idx) => (
                  <li key={idx}>{erro}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {totalImportado !== null && (
        <p className={styles.resultado}>
          <Icon name="check-circle" size={16} /> {totalImportado} questão(ões) importada(s) com sucesso.
        </p>
      )}
      {errosBackend.length > 0 && (
        <div className={styles.erros}>
          <p className={styles.errosTitulo}>
            <Icon name="alert-triangle" size={14} /> Erros na importação:
          </p>
          <ul>
            {errosBackend.map((erro, idx) => (
              <li key={idx}>{erro}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
