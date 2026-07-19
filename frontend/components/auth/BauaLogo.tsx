'use client';

import styles from './BauaLogo.module.css';

interface BauaLogoProps {
  /** Controla a altura do pássaro e o tamanho do wordmark, como em components/brand/Logo.jsx (Bauá Design System). */
  size?: number;
  /** 'default' = pássaro verde + wordmark tinta (sobre fundo claro). 'inverse' = tudo branco (sobre fundo verde). */
  tone?: 'default' | 'inverse';
  showWordmark?: boolean;
  className?: string;
}

/**
 * Marca Bauá (pássaro-gralha + wordmark "bauá").
 * O PNG de origem (assets/mark-baua*.png / bird-*.png) não é lido pelo MCP,
 * então reaproveitamos a mesma técnica da Landing Page: recolorir
 * /assets/baua_fundo.png via CSS mask-image com a cor do token desejado.
 */
export default function BauaLogo({ size = 32, tone = 'default', showWordmark = true, className }: BauaLogoProps) {
  const birdColor = tone === 'inverse' ? '#FFFFFF' : 'var(--green-500)';
  const wordColor = tone === 'inverse' ? '#FFFFFF' : 'var(--ink-900)';

  return (
    <span className={`${styles.logo} ${className || ''}`} style={{ gap: size * 0.28 }}>
      <span
        className={styles.bird}
        style={{ height: size * 1.15, width: size * 1.05, backgroundColor: birdColor }}
        aria-hidden="true"
      />
      {showWordmark && (
        <span className={styles.wordmark} style={{ fontSize: size, color: wordColor }}>
          bauá
        </span>
      )}
    </span>
  );
}
