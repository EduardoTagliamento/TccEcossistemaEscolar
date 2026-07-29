'use client';

import styles from './Loader.module.css';

interface LoaderProps {
  /** Altura do pássaro em px — a largura acompanha proporcionalmente. */
  size?: number;
  /** Layout lado a lado (ex: dentro de um botão), em vez do bloco central padrão. */
  inline?: boolean;
  className?: string;
}

// Proporção original de frontend/refs/bird.gif (200x174) — recolorido pra
// verde da marca (preto -> #17C077, alpha preservado) e salvo como APNG em
// public/assets/baua-loader.png. Reprocessar manualmente (script one-off,
// não versionado) só se o gif de referência mudar.
const ASPECTO = 200 / 174;

/**
 * Indicador de carregamento padrão do app — o pássaro do Bauá voando (mesma
 * animação de frontend/refs/bird.gif, recolorida pro verde da marca), em vez
 * de um spinner circular genérico.
 */
export default function Loader({ size = 36, inline = false, className }: LoaderProps) {
  return (
    <div
      className={`${inline ? styles.wrapInline : styles.wrap} ${className || ''}`}
      role="status"
      aria-label="Carregando"
    >
      <img
        src="/assets/baua-loader.png"
        alt=""
        aria-hidden="true"
        width={Math.round(size * ASPECTO)}
        height={size}
        className={styles.bird}
      />
    </div>
  );
}
