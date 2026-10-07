'use client';

import Link from 'next/link';
import styles from './CardSelecaoBanco.module.css';

interface CardSelecaoBancoProps {
  /** Navega (matéria -> tela da matéria). Mutuamente exclusivo com `onClick`. */
  href?: string;
  /** Dispara ação local (submatéria -> começar prática sem mudar de URL). Mutuamente exclusivo com `href`. */
  onClick?: () => void;
  disabled?: boolean;
  titulo: string;
  quantidade: number;
  cor: string;
}

// Mesmo cálculo de contraste de MateriaTurmaCard.tsx — duplicado de propósito (componente
// pequeno e autocontido, não vale acoplar os dois só pra reusar 10 linhas).
function luminanciaRelativa(hex: string): number {
  const limpo = hex.replace('#', '');
  if (limpo.length !== 3 && limpo.length !== 6) return 0;
  const full = limpo.length === 3 ? limpo.split('').map((c) => c + c).join('') : limpo;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const canal = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function corTextoParaFundo(hex: string): string {
  return luminanciaRelativa(hex) > 0.5 ? '#0F1D17' : '#FFFFFF';
}

export default function CardSelecaoBanco({ href, onClick, disabled, titulo, quantidade, cor }: CardSelecaoBancoProps) {
  const corTitulo = corTextoParaFundo(cor);

  const conteudo = (
    <>
      <div className={styles.capa} style={{ backgroundColor: cor }}>
        <span className={styles.capaTitulo} style={{ color: corTitulo }}>
          {titulo}
        </span>
      </div>
      <div className={styles.rodape}>
        <span className={styles.quantidade}>
          {quantidade} questã{quantidade === 1 ? 'ão' : 'ões'}
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={styles.card}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button type="button" className={styles.card} onClick={onClick} disabled={disabled}>
      {conteudo}
    </button>
  );
}
