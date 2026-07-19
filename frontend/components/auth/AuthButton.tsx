import type { ButtonHTMLAttributes } from 'react';
import styles from './AuthButton.module.css';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}

/** Botão em pílula Bauá — fiel a components/core/Button.jsx do Design System. */
export default function AuthButton({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  children,
  ...rest
}: AuthButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
