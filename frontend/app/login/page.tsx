'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import { useAuth } from '@/lib/auth/AuthContext';
import AuthBrandShell from '@/components/auth/AuthBrandShell';
import AuthInput from '@/components/auth/AuthInput';
import AuthButton from '@/components/auth/AuthButton';
import AuthIcon from '@/components/auth/AuthIcon';
import BauaLogo from '@/components/auth/BauaLogo';
import styles from './page.module.css';

// Tipografia da marca Bauá (tokens/fonts.css do design system):
// Poppins -> display/headings · Figtree -> corpo/UI · Baloo 2 -> wordmark "bauá"
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

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  // Detectar tipo de identificador
  const detectIdentifierType = (value: string): string => {
    // Email: contém @
    if (value.includes('@')) {
      return 'email';
    }

    // CPF: 11 dígitos
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length === 11) {
      return 'CPF';
    }

    // Telefone: 10 ou 11 dígitos (com DDD)
    if (digitsOnly.length === 10 || digitsOnly.length === 11) {
      return 'telefone';
    }

    return 'desconhecido';
  };

  // Formatar CPF
  const formatCPF = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  // Formatar telefone
  const formatTelefone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      if (digits.length === 11) {
        return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      } else if (digits.length === 10) {
        return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      }
    }
    return value;
  };

  // Formatar identificador ao digitar
  const handleIdentifierChange = (value: string) => {
    const type = detectIdentifierType(value);

    if (type === 'CPF') {
      setIdentifier(formatCPF(value));
    } else if (type === 'telefone') {
      setIdentifier(formatTelefone(value));
    } else {
      setIdentifier(value);
    }
  };

  // Submeter formulário
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!identifier.trim()) {
      setError('Por favor, insira seu CPF, email ou telefone');
      return;
    }

    if (!senha.trim()) {
      setError('Por favor, insira sua senha');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    try {
      await login(identifier, senha);

      // Redirecionar para dashboard ou seleção de escola
      router.push('/selecionar-escola');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    }
  };

  const identifierType = detectIdentifierType(identifier);

  return (
    <AuthBrandShell
      className={`${poppins.variable} ${figtree.variable} ${baloo2.variable}`}
      formMaxWidth={400}
    >
      <BauaLogo size={30} />
      <h1 className={styles.title}>Acessar a plataforma</h1>
      <p className={styles.subtitle}>Entre com sua conta Bauá para continuar.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            <AuthIcon name="alert-triangle" size={16} />
            <span>{error}</span>
          </div>
        )}

        <AuthInput
          label="CPF, e-mail ou telefone"
          leadingIcon="user"
          placeholder="voce@escola.com"
          value={identifier}
          onChange={(e) => handleIdentifierChange(e.target.value)}
          autoComplete="username"
          disabled={isLoading}
          hint={identifier ? `Detectado como: ${identifierType}` : undefined}
        />

        <AuthInput
          label="Senha"
          passwordToggle
          placeholder="••••••••"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          disabled={isLoading}
        />

        <button
          type="button"
          className={styles.forgotLink}
          onClick={() => alert('Funcionalidade em desenvolvimento')}
          disabled={isLoading}
        >
          Esqueci minha senha
        </button>

        <AuthButton type="submit" variant="primary" size="lg" block disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </AuthButton>
      </form>

      <p className={styles.footerText}>
        Não tem uma conta?{' '}
        <Link href="/cadastro" className={styles.footerLink}>
          Cadastre-se
        </Link>
      </p>
    </AuthBrandShell>
  );
}
