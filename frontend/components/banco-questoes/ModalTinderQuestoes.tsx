'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import * as QuestaoBancoAPI from '@/lib/api/questaobanco.api';
import { renderEnunciado } from '@/lib/banco-questoes/renderEnunciado';
import styles from './ModalTinderQuestoes.module.css';

interface ModalTinderQuestoesProps {
  submateriaNome: string;
  quantidade: number;
  /** Pool de candidatas já filtrado pela submatéria (Status=Validado) — a ordem de apresentação
   * é a que vier aqui; quem chama decide se embaralha antes (modo Tinder normalmente quer uma
   * ordem variada, mas isso não é responsabilidade deste componente). */
  pool: QuestaoBancoAPI.QuestaoBanco[];
  onConcluir: (aceitas: QuestaoBancoAPI.QuestaoBanco[]) => void;
}

/**
 * Modal "estilo Tinder" pra montar um simulado não-randomizado —
 * SPEC_SIMULADOS_BANCO_QUESTOES.md item 2.2. Mostra uma questão por vez (só
 * enunciado+alternativas, sem indicar qual é a correta — não é pra responder
 * agora, é só decidir se ela entra no simulado); Aceitar soma na quota,
 * Rejeitar descarta sem voltar.
 */
export default function ModalTinderQuestoes({ submateriaNome, quantidade, pool, onConcluir }: ModalTinderQuestoesProps) {
  const [indice, setIndice] = useState(0);
  const [aceitas, setAceitas] = useState<QuestaoBancoAPI.QuestaoBanco[]>([]);

  const questaoAtual = pool[indice] || null;
  const poolEsgotado = !questaoAtual;
  const faltam = quantidade - aceitas.length;

  const avancar = (novaLista: QuestaoBancoAPI.QuestaoBanco[]) => {
    if (novaLista.length >= quantidade) {
      onConcluir(novaLista);
      return;
    }
    setIndice((i) => i + 1);
  };

  const handleAceitar = () => {
    if (!questaoAtual) return;
    const novaLista = [...aceitas, questaoAtual];
    setAceitas(novaLista);
    avancar(novaLista);
  };

  const handleRejeitar = () => {
    if (!questaoAtual) return;
    avancar(aceitas);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2 className={styles.titulo}>{submateriaNome}</h2>
          <span className={styles.progresso}>{aceitas.length} de {quantidade} aceitas</span>
        </header>

        {poolEsgotado ? (
          <div className={styles.esgotado}>
            <Icon name="alert-triangle" size={28} />
            <p>
              Acabaram as questões disponíveis dessa submatéria antes de completar a quantidade pedida.
              Faltam {faltam} — você pode seguir só com as {aceitas.length} aceitas.
            </p>
            <button type="button" className={styles.botaoPrimario} onClick={() => onConcluir(aceitas)}>
              Seguir com {aceitas.length}
            </button>
          </div>
        ) : (
          <>
            <div className={styles.cartao}>
              <span className={styles.cartaoDificuldade}>{questaoAtual.Dificuldade}</span>
              <div className={styles.cartaoEnunciado}>
                {renderEnunciado(questaoAtual.Enunciado, styles.enunciadoParagrafo, styles.enunciadoImagem)}
              </div>
              <ul className={styles.cartaoAlternativas}>
                {[...questaoAtual.Alternativas]
                  .sort((a, b) => a.AlternativaOrdem - b.AlternativaOrdem)
                  .map((alt, i) => (
                    <li key={alt.AlternativaGUID} className={styles.cartaoAlternativa}>
                      <span className={styles.cartaoAlternativaLetra}>{String.fromCharCode(65 + i)}</span>
                      {alt.AlternativaTexto}
                    </li>
                  ))}
              </ul>
            </div>

            <div className={styles.acoes}>
              <button type="button" className={styles.botaoRejeitar} onClick={handleRejeitar}>
                <Icon name="x" size={20} /> Rejeitar
              </button>
              <button type="button" className={styles.botaoAceitar} onClick={handleAceitar}>
                <Icon name="check" size={20} /> Aceitar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
