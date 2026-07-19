import type { ReactNode } from 'react';
import styles from './AuthGreenShell.module.css';

interface AuthGreenShellProps {
  children: ReactNode;
  maxWidth?: number;
  className?: string;
}

/**
 * Shell verde cheio com cartão branco central — usado em
 * /selecionar-escola e /criar-escola, fiel ao bloco "ESCOLHA DE
 * ESCOLA" de "Login Escola.dc.html" do Bauá Design System.
 */
export default function AuthGreenShell({ children, maxWidth = 640, className }: AuthGreenShellProps) {
  return (
    <div className={`${styles.shell} ${className || ''}`}>
      <div className={styles.gridBg} aria-hidden="true" />
      <div className={styles.card} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
