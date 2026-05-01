'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export default function VerificarEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
      setError('O código deve ter 6 dígitos');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/verificacao-email/validar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          codigo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Código inválido');
      }

      setSuccess('Email verificado com sucesso!');
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar código');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setIsResending(true);

    try {
      const response = await fetch('/api/verificacao-email/reenviar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao reenviar código');
      }

      setSuccess('Código reenviado! Verifique seu email.');
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar código');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.icon}>✉️</div>
          <h1 className={styles.logo}>Bauá</h1>
          <p className={styles.subtitle}>Verificação de Email</p>
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>Verifique seu email</h2>
          <p className={styles.description}>
            Enviamos um código de 6 dígitos para:
          </p>
          <p className={styles.email}>{email}</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            {success && (
              <div className={styles.successMessage}>
                {success}
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="codigo" className={styles.label}>
                Código de Verificação
              </label>
              <input
                id="codigo"
                type="text"
                value={codigo}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) {
                    setCodigo(value);
                  }
                }}
                placeholder="000000"
                className={styles.codigoInput}
                maxLength={6}
                disabled={isLoading}
                autoComplete="off"
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || codigo.length !== 6}
            >
              {isLoading ? 'Verificando...' : 'Verificar Código'}
            </button>
          </form>

          <div className={styles.footer}>
            <p>Não recebeu o código?</p>
            <button
              onClick={handleResend}
              className={styles.resendButton}
              disabled={isResending}
            >
              {isResending ? 'Reenviando...' : 'Reenviar código'}
            </button>

            <Link href="/login" className={styles.link}>
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
