'use client';

import { useState, FormEvent } from 'react';
import { Poppins, Figtree, Baloo_2, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
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

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Informe seu e-mail');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/redefinicao-senha/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao solicitar redefinição de senha');
      }

      // O backend sempre responde com a mesma mensagem genérica, exista ou
      // não conta com esse e-mail — não dá pra distinguir aqui, e é assim
      // mesmo (evita que alguém descubra quais e-mails têm conta).
      setEnviado(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar redefinição de senha');
    } finally {
      setIsLoading(false);
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
        <h1 className={styles.title}>Esqueceu sua senha?</h1>
        <p className={styles.subtitle}>
          {enviado
            ? 'Verifique sua caixa de entrada'
            : 'Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.'}
        </p>
      </div>

      {enviado ? (
        <div className={styles.successBanner} role="status">
          <AuthIcon name="check-circle" size={16} />
          <span>Se existir uma conta com esse e-mail, enviamos um link de redefinição de senha.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBanner} role="alert">
              <AuthIcon name="alert-triangle" size={16} />
              <span>{error}</span>
            </div>
          )}

          <AuthInput
            label="E-mail"
            type="email"
            leadingIcon="mail"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isLoading}
          />

          <AuthButton type="submit" variant="primary" size="lg" block disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar link de redefinição'}
          </AuthButton>
        </form>
      )}

      <div className={styles.footer}>
        <Link href="/login" className={styles.backLink}>
          <AuthIcon name="chevron-left" size={14} /> Voltar para o login
        </Link>
      </div>
    </AuthBrandShell>
  );
}
