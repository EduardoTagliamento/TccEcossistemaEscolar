'use client';

import styles from './Loader.module.css';

interface LoaderProps {
  /** Altura do pássaro em px — a largura acompanha proporcionalmente. */
  size?: number;
  /** Cor do pássaro. `currentColor` herda a cor do texto do elemento pai (útil dentro de botões coloridos). */
  color?: string;
  /** Layout lado a lado (ex: dentro de um botão), em vez do bloco central padrão. */
  inline?: boolean;
  className?: string;
}

/**
 * Indicador de carregamento padrão do app — o pássaro do Bauá "pulando"
 * no lugar, em vez de um spinner circular genérico. Substitui 1-para-1 o
 * antigo `<div className={styles.spinner} />` usado em várias telas
 * (mesma técnica de mask-image do bird de BauaLogo/landing page).
 */
export default function Loader({ size = 36, color = 'var(--green-500, #17C077)', inline = false, className }: LoaderProps) {
  return (
    <div
      className={`${inline ? styles.wrapInline : styles.wrap} ${className || ''}`}
      role="status"
      aria-label="Carregando"
    >
      <span
        className={styles.bird}
        style={{ width: size * 0.92, height: size, backgroundColor: color }}
        aria-hidden="true"
      />
      <span className={styles.sombra} style={{ width: size * 0.72 }} aria-hidden="true" />
    </div>
  );
}
