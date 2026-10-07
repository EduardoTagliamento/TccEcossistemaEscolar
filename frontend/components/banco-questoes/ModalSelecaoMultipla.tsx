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

// Abaixo disso não vale a pena mostrar busca (ex.: Dificuldade tem só 3 opções) — Vestibular,
// com 50+, é o caso real que precisa.
const LIMITE_PARA_MOSTRAR_BUSCA = 8;

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
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (aberto) {
      setEscolhidos(selecionados);
      setBusca('');
    }
  }, [aberto, selecionados]);

  if (!aberto) return null;

  const toggle = (valor: string) => {
    setEscolhidos((atual) => (atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor]));
  };

  const opcoesFiltradas = busca.trim()
    ? opcoes.filter((o) => o.label.toLowerCase().includes(busca.trim().toLowerCase()))
    : opcoes;

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.cabecalho}>
          <h3 className={styles.titulo}>{titulo}</h3>
          <button type="button" className={styles.botaoFechar} onClick={onFechar} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>

        {opcoes.length > LIMITE_PARA_MOSTRAR_BUSCA && (
          <div className={styles.buscaContainer}>
            <Icon name="search" className={styles.buscaIcone} />
            <input
              type="text"
              className={styles.buscaInput}
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className={styles.lista}>
          {carregando && <p className={styles.mensagemVazia}>Carregando...</p>}
          {!carregando && opcoesFiltradas.length === 0 && (
            <p className={styles.mensagemVazia}>
              {opcoes.length === 0 ? 'Nenhuma opção disponível.' : 'Nenhum resultado pra essa busca.'}
            </p>
          )}
          {!carregando &&
            opcoesFiltradas.map((opcao) => (
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
