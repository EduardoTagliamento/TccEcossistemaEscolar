import type { CSSProperties, ReactNode } from 'react';
import styles from './AuthBrandShell.module.css';

interface AuthBrandShellProps {
  children: ReactNode;
  /** Largura máxima da coluna de formulário (login=400, cadastro é mais largo por ter mais campos). */
  formMaxWidth?: number;
  className?: string;
  /** Espelha o painel de marca pro lado direito (usado em /cadastro, para alternar com /login). */
  invertido?: boolean;
  /**
   * Tema por escola (login individual, /login/[slug]) — quando ausente, usa
   * a marca "Bauá" padrão (login geral). `corPrimaria`/`corSecundaria` são
   * HEX de 6 caracteres SEM "#" (mesmo formato salvo em EscolaCorPriEs/
   * EscolaCorSecEs). Ver docs/PLANO_IMPLEMENTACAO_LOGIN_POR_ESCOLA.md, §6.
   */
  tema?: {
    nomeEscola?: string | null;
    corPrimaria?: string | null;
    corSecundaria?: string | null;
    /** Base64 sem prefixo data:*, mesmo formato de EscolaService.toDTOPublico. */
    iconeBase64?: string | null;
    tagline?: string | null;
  };
}

/**
 * Shell "split" (painel de marca verde + formulário) usado em
 * /login, /cadastro e /verificar-email — fiel ao layout de
 * "Login Escola.dc.html" do Bauá Design System. Com `tema`, o painel troca
 * a marca "Bauá" pela identidade visual da escola (login individual).
 */
export default function AuthBrandShell({ children, formMaxWidth = 400, className, invertido, tema }: AuthBrandShellProps) {
  const corPrimaria = tema?.corPrimaria ? `#${tema.corPrimaria.replace(/^#/, '')}` : null;
  const corSecundaria = tema?.corSecundaria ? `#${tema.corSecundaria.replace(/^#/, '')}` : corPrimaria;

  // Sobrescreve só as duas variáveis usadas no gradiente do painel
  // (--green-500/--green-700, ver AuthBrandShell.module.css) — o resto dos
  // tokens (radius, shadow, spacing) continua igual em qualquer escola.
  const panelStyle: CSSProperties | undefined = corPrimaria
    ? ({ '--green-500': corPrimaria, '--green-700': corSecundaria } as CSSProperties)
    : undefined;

  const nomeEscola = tema?.nomeEscola?.trim();
  const iconeSrc = tema?.iconeBase64 ? `data:image/png;base64,${tema.iconeBase64}` : null;

  return (
    <div className={`${styles.shell} ${invertido ? styles.invertido : ''} ${className || ''}`}>
      <div className={styles.brandPanel} style={panelStyle}>
        <div className={styles.texture} aria-hidden="true" />
        <div className={styles.blobTop} aria-hidden="true" />
        <div className={styles.blobBottom} aria-hidden="true" />
        <div className={styles.brandContent}>
          {iconeSrc ? (
            <img src={iconeSrc} alt="" className={styles.brandIcon} aria-hidden="true" />
          ) : (
            <span className={styles.brandBird} aria-hidden="true" />
          )}
          <span className={styles.brandWordmark}>{nomeEscola || 'bauá'}</span>
          <p className={styles.brandTagline}>
            {tema?.tagline || 'O ecossistema que conecta toda a sua escola em um só lugar.'}
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
