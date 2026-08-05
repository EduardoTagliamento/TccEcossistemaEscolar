'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Poppins, Figtree, Baloo_2, JetBrains_Mono } from 'next/font/google';
import AuthBrandShell from '@/components/auth/AuthBrandShell';
import AuthButton from '@/components/auth/AuthButton';
import AuthInput from '@/components/auth/AuthInput';
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

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tokenCarregado, setTokenCarregado] = useState(false);

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
    setTokenCarregado(true);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Link de redefinição inválido. Solicite um novo.');
      return;
    }

    if (novaSenha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/redefinicao-senha/redefinir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao redefinir senha');
      }

      setSuccess('Senha redefinida com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha');
    } finally {
      setIsLoading(false);
    }
  };

  const linkInvalido = tokenCarregado && !token;

  return (
    <AuthBrandShell
      className={`${poppins.variable} ${figtree.variable} ${baloo2.variable} ${jetbrainsMono.variable}`}
      formMaxWidth={400}
    >
      <div className={styles.header}>
        <BauaLogo size={30} />
        <div className={styles.iconBadge}>
          <AuthIcon name="user" size={24} />
        </div>
        <h1 className={styles.title}>Redefinir senha</h1>
        <p className={styles.subtitle}>Escolha uma nova senha para sua conta.</p>
      </div>

      {linkInvalido ? (
        <div className={styles.errorBanner} role="alert">
          <AuthIcon name="alert-triangle" size={16} />
          <span>Link de redefinição inválido ou incompleto. Solicite um novo.</span>
        </div>
      ) : (
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

          <AuthInput
            label="Nova senha"
            passwordToggle
            placeholder="••••••••"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            autoComplete="new-password"
            disabled={isLoading || !!success}
          />

          <AuthInput
            label="Confirmar nova senha"
            passwordToggle
            placeholder="••••••••"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            autoComplete="new-password"
            disabled={isLoading || !!success}
          />

          <AuthButton type="submit" variant="primary" size="lg" block disabled={isLoading || !!success}>
            {isLoading ? 'Redefinindo...' : 'Redefinir senha'}
          </AuthButton>
        </form>
      )}

      <div className={styles.footer}>
        {linkInvalido && (
          <Link href="/esqueci-senha" className={styles.backLink}>
            Solicitar novo link
          </Link>
        )}
        <Link href="/login" className={styles.backLink}>
          <AuthIcon name="chevron-left" size={14} /> Voltar para o login
        </Link>
      </div>
    </AuthBrandShell>
  );
}
