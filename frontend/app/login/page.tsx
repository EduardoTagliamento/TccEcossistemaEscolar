'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
  const placeholderText = 
    identifierType === 'email' ? 'Email' :
    identifierType === 'CPF' ? 'CPF' :
    identifierType === 'telefone' ? 'Telefone' :
    'CPF, Email ou Telefone';

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1 className={styles.logo}>Bauá</h1>
          <p className={styles.subtitle}>Ecossistema Educacional</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Entrar</h2>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="identifier" className={styles.label}>
              {placeholderText}
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              placeholder="Digite seu CPF, email ou telefone"
              className={styles.input}
              autoComplete="username"
              disabled={isLoading}
            />
            {identifier && (
              <span className={styles.hint}>
                Detectado como: {identifierType}
              </span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="senha" className={styles.label}>
              Senha
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className={styles.input}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                disabled={isLoading}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className={styles.forgotPassword}
            onClick={() => alert('Funcionalidade em desenvolvimento')}
            disabled={isLoading}
          >
            Esqueci minha senha
          </button>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className={styles.footer}>
            <p>
              Não tem cadastro?{' '}
              <Link href="/cadastro" className={styles.link}>
                Criar conta
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
