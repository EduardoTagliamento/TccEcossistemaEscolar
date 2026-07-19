'use client';

import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import AuthIcon, { AuthIconName } from './AuthIcon';
import styles from './AuthInput.module.css';

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: AuthIconName;
  valid?: boolean;
  invalid?: boolean;
  passwordToggle?: boolean;
  containerClassName?: string;
}

/**
 * Campo de texto Bauá — fiel a components/core/Input.jsx do Design
 * System: rótulo, ícone à esquerda opcional, alternância de senha,
 * ícone de validação (✓ / ✗) e texto de apoio/erro.
 */
const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  {
    label,
    hint,
    error,
    leadingIcon,
    valid,
    invalid,
    passwordToggle = false,
    type = 'text',
    id,
    containerClassName,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const autoId = useId();
  const inputId = id || autoId;

  const state = error || invalid ? 'invalid' : valid ? 'valid' : focus ? 'focus' : 'default';
  const effectiveType = passwordToggle ? (show ? 'text' : 'password') : type;
  const showValidIcon = !passwordToggle && (valid || invalid || !!error);

  return (
    <div className={`${styles.field} ${containerClassName || ''}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper} data-state={state}>
        {leadingIcon && (
          <span className={styles.leadingIcon}>
            <AuthIcon name={leadingIcon} size={18} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          className={`${styles.input} ${leadingIcon ? styles.hasLeading : ''} ${
            passwordToggle || showValidIcon ? styles.hasTrailing : ''
          }`}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {passwordToggle && (
          <button
            type="button"
            className={styles.trailingButton}
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <AuthIcon name={show ? 'eye-off' : 'eye'} size={18} />
          </button>
        )}
        {showValidIcon && (
          <span className={`${styles.trailingIcon} ${error || invalid ? styles.invalidIcon : styles.validIcon}`}>
            <AuthIcon name={error || invalid ? 'x' : 'check'} size={18} />
          </span>
        )}
      </div>
      {(error || hint) && (
        <span className={`${styles.helper} ${error ? styles.helperError : ''}`}>{error || hint}</span>
      )}
    </div>
  );
});

export default AuthInput;
