'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import styles from './ModalSelecaoMultipla.module.css';

export interface OpcaoSelecaoMultipla {
  valor: string;
  label: string;
}

interface ModalSelecaoMultiplaProps {
  aberto: boolean;
  titulo: string;
  opcoes: OpcaoSelecaoMultipla[];
  selecionados: string[];
  carregando?: boolean;
  onFechar: () => void;
  onAplicar: (selecionados: string[]) => void;
}

export default function ModalSelecaoMultipla({
  aberto,
  titulo,
  opcoes,
  selecionados,
  carregando,
  onFechar,
  onAplicar,
}: ModalSelecaoMultiplaProps) {
  const [escolhidos, setEscolhidos] = useState<string[]>(selecionados);

  useEffect(() => {
    if (aberto) setEscolhidos(selecionados);
  }, [aberto, selecionados]);

  if (!aberto) return null;

  const toggle = (valor: string) => {
    setEscolhidos((atual) => (atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor]));
  };

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.cabecalho}>
          <h3 className={styles.titulo}>{titulo}</h3>
          <button type="button" className={styles.botaoFechar} onClick={onFechar} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        <div className={styles.lista}>
          {carregando && <p className={styles.mensagemVazia}>Carregando...</p>}
          {!carregando && opcoes.length === 0 && <p className={styles.mensagemVazia}>Nenhuma opção disponível.</p>}
          {!carregando &&
            opcoes.map((opcao) => (
              <label key={opcao.valor} className={styles.item}>
                <input type="checkbox" checked={escolhidos.includes(opcao.valor)} onChange={() => toggle(opcao.valor)} />
                {opcao.label}
              </label>
            ))}
        </div>

        <div className={styles.acoes}>
          <button type="button" className={styles.botaoSecundario} onClick={() => setEscolhidos([])}>
            Limpar
          </button>
          <button
            type="button"
            className={styles.botaoPrimario}
            onClick={() => {
              onAplicar(escolhidos);
              onFechar();
            }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
