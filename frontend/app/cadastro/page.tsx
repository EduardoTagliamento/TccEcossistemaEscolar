'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import { validarCPF, formatarCPF, limparCPF } from '@/lib/validators/cpf';
import { validarEmail, normalizarEmail } from '@/lib/validators/email';
import { validarTelefone, formatarTelefone, limparTelefone } from '@/lib/validators/telefone';
import { validarSenha, verificarForcaSenha } from '@/lib/validators/senha';
import AuthBrandShell from '@/components/auth/AuthBrandShell';
import AuthInput from '@/components/auth/AuthInput';
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

const STRENGTH_CLASS: Record<string, string> = {
  fraca: 'strengthFraca',
  média: 'strengthMedia',
  forte: 'strengthForte',
};

export default function CadastroPage() {
  const router = useRouter();

  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validações em tempo real
  const cpfValido = cpf.length >= 14 && validarCPF(cpf);
  const emailValido = email.length > 0 && validarEmail(email);
  const telefoneValido = telefone.length >= 14 && validarTelefone(telefone);
  const senhaValidacao = validarSenha(senha);
  const senhasFazMatch = senha.length > 0 && senha === confirmarSenha;
  const forcaSenha = senha.length > 0 ? verificarForcaSenha(senha) : null;

  const handleCpfChange = (value: string) => {
    setCpf(formatarCPF(value));
  };

  const handleTelefoneChange = (value: string) => {
    setTelefone(formatarTelefone(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!validarCPF(cpf)) {
      setError('CPF inválido');
      return;
    }

    if (!validarEmail(email)) {
      setError('Email inválido');
      return;
    }

    if (!validarTelefone(telefone)) {
      setError('Telefone inválido');
      return;
    }

    if (!nome.trim() || nome.trim().length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      return;
    }

    if (!sobrenome.trim() || sobrenome.trim().length < 2) {
      setError('Sobrenome deve ter pelo menos 2 caracteres');
      return;
    }

    if (!senhaValidacao.valida) {
      setError(senhaValidacao.erros[0]);
      return;
    }

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UsuarioCPF: limparCPF(cpf),
          UsuarioEmail: normalizarEmail(email),
          UsuarioTelefone: limparTelefone(telefone),
          UsuarioNome: nome.trim(),
          UsuarioSobrenome: sobrenome.trim(),
          UsuarioSenha: senha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar conta');
      }

      // Redirecionar para verificação de email
      router.push(`/verificar-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBrandShell
      className={`${poppins.variable} ${figtree.variable} ${baloo2.variable}`}
      formMaxWidth={560}
      invertido
    >
      <BauaLogo size={30} />
      <h1 className={styles.title}>Criar sua conta</h1>
      <p className={styles.subtitle}>Leva menos de um minuto para começar.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            <AuthIcon name="alert-triangle" size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.grid}>
          <AuthInput
            label="Nome"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="given-name"
            disabled={isLoading}
            required
          />
          <AuthInput
            label="Sobrenome"
            placeholder="Seu sobrenome"
            value={sobrenome}
            onChange={(e) => setSobrenome(e.target.value)}
            autoComplete="family-name"
            disabled={isLoading}
            required
          />

          <AuthInput
            label="CPF"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => handleCpfChange(e.target.value)}
            maxLength={14}
            disabled={isLoading}
            valid={cpf.length > 0 && cpfValido}
            invalid={cpf.length > 0 && !cpfValido}
            required
          />
          <AuthInput
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={telefone}
            onChange={(e) => handleTelefoneChange(e.target.value)}
            maxLength={15}
            autoComplete="tel"
            disabled={isLoading}
            valid={telefone.length > 0 && telefoneValido}
            invalid={telefone.length > 0 && !telefoneValido}
            required
          />

          <div className={styles.spanFull}>
            <AuthInput
              label="E-mail"
              leadingIcon="mail"
              type="email"
              placeholder="voce@escola.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isLoading}
              valid={email.length > 0 && emailValido}
              invalid={email.length > 0 && !emailValido}
              required
            />
          </div>

          <AuthInput
            label="Senha"
            passwordToggle
            placeholder="Crie uma senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            disabled={isLoading}
            hint={senha.length === 0 ? 'Mínimo 6 caracteres, 1 número e 1 símbolo' : undefined}
            error={senha.length > 0 && !senhaValidacao.valida ? senhaValidacao.erros.join(' · ') : undefined}
            required
          />
          <AuthInput
            label="Confirmar senha"
            passwordToggle
            placeholder="Repita a senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            autoComplete="new-password"
            disabled={isLoading}
            error={confirmarSenha.length > 0 && !senhasFazMatch ? 'As senhas não coincidem' : undefined}
            required
          />
        </div>

        {forcaSenha && (
          <span className={`${styles.strengthBadge} ${styles[STRENGTH_CLASS[forcaSenha]]}`}>
            Força da senha: {forcaSenha}
          </span>
        )}

        <AuthButton
          type="submit"
          variant="primary"
          size="lg"
          block
          disabled={isLoading}
          className={styles.submitButton}
        >
          {isLoading ? 'Criando conta...' : 'Criar conta'}
        </AuthButton>
      </form>

      <p className={styles.footerText}>
        Já tem uma conta?{' '}
        <Link href="/login" className={styles.footerLink}>
          Entrar
        </Link>
      </p>
    </AuthBrandShell>
  );
}
