'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Poppins, Figtree, Baloo_2, JetBrains_Mono } from 'next/font/google';
import AuthBrandShell from '@/components/auth/AuthBrandShell';
import AuthButton from '@/components/auth/AuthButton';
import AuthIcon from '@/components/auth/AuthIcon';
import BauaLogo from '@/components/auth/BauaLogo';
import styles from './page.module.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});
const baloo2 = Baloo_2({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-wordmark',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export default function VerificarEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const initialSendTriggeredRef = useRef(false);

  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const enviarCodigo = async (emailDestino: string, mensagemSucesso?: string) => {
    if (!emailDestino) {
      throw new Error('Email não informado para envio do código');
    }

    const response = await fetch('/api/verificacao-email/reenviar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: emailDestino }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao enviar código');
    }

    if (mensagemSucesso) {
      setSuccess(mensagemSucesso);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
  }, []);

  useEffect(() => {
    const envioInicial = async () => {
      if (!email || initialSendTriggeredRef.current) {
        return;
      }

      initialSendTriggeredRef.current = true;
      setError('');
      setSuccess('');

      try {
        setIsResending(true);
        await enviarCodigo(email, 'Código enviado! Verifique seu email.');
      } catch (err: any) {
        setError(err.message || 'Erro ao enviar código de verificação');
      } finally {
        setIsResending(false);
      }
    };

    void envioInicial();
  }, [email]);

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
      await enviarCodigo(email, 'Código reenviado! Verifique seu email.');
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar código');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthBrandShell
      className={`${poppins.variable} ${figtree.variable} ${baloo2.variable} ${jetbrainsMono.variable}`}
      formMaxWidth={400}
    >
      <div className={styles.header}>
        <BauaLogo size={30} />
        <div className={styles.iconBadge}>
          <AuthIcon name="mail" size={24} />
        </div>
        <h1 className={styles.title}>Verifique seu e-mail</h1>
        <p className={styles.subtitle}>Enviamos um código de 6 dígitos para</p>
        <p className={styles.emailChip}>{email}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            <AuthIcon name="alert-triangle" size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={styles.successBanner} role="status">
            <AuthIcon name="check-circle" size={16} />
            <span>{success}</span>
          </div>
        )}

        <label htmlFor="codigo" className={styles.srOnly}>
          Código de verificação
        </label>
        <input
          id="codigo"
          type="text"
          inputMode="numeric"
          value={codigo}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            if (value.length <= 6) {
              setCodigo(value);
            }
          }}
          placeholder="000000"
          className={styles.codeInput}
          maxLength={6}
          disabled={isLoading}
          autoComplete="off"
          required
        />

        <AuthButton type="submit" variant="primary" size="lg" block disabled={isLoading || codigo.length !== 6}>
          {isLoading ? 'Verificando...' : 'Verificar código'}
        </AuthButton>
      </form>

      <div className={styles.footer}>
        <p className={styles.footerHint}>Não recebeu o código?</p>
        <button onClick={handleResend} className={styles.resendButton} disabled={isResending}>
          {isResending ? 'Reenviando...' : 'Reenviar código'}
        </button>

        <Link href="/login" className={styles.backLink}>
          <AuthIcon name="chevron-left" size={14} /> Voltar para o login
        </Link>
      </div>
    </AuthBrandShell>
  );
}
