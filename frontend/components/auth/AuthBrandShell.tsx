import type { ReactNode } from 'react';
import styles from './AuthBrandShell.module.css';

interface AuthBrandShellProps {
  children: ReactNode;
  /** Largura máxima da coluna de formulário (login=400, cadastro é mais largo por ter mais campos). */
  formMaxWidth?: number;
  className?: string;
}

/**
 * Shell "split" (painel de marca verde + formulário) usado em
 * /login, /cadastro e /verificar-email — fiel ao layout de
 * "Login Escola.dc.html" do Bauá Design System.
 */
export default function AuthBrandShell({ children, formMaxWidth = 400, className }: AuthBrandShellProps) {
  return (
    <div className={`${styles.shell} ${className || ''}`}>
      <div className={styles.brandPanel}>
        <div className={styles.texture} aria-hidden="true" />
        <div className={styles.blobTop} aria-hidden="true" />
        <div className={styles.blobBottom} aria-hidden="true" />
        <div className={styles.brandContent}>
          <span className={styles.brandBird} aria-hidden="true" />
          <span className={styles.brandWordmark}>bauá</span>
          <p className={styles.brandTagline}>
            O ecossistema que conecta toda a sua escola em um só lugar.
          </p>
        </div>
      </div>
      <div className={styles.formPanel}>
        <div className={styles.formInner} style={{ maxWidth: formMaxWidth }}>
          {children}
        </div>
      </div>
    </div>
  );
}
