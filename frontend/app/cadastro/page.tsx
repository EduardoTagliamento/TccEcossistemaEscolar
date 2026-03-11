'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiEye, FiEyeOff, FiCheck, FiX } from 'react-icons/fi';
import { validarCPF, formatarCPF, limparCPF } from '@/lib/validators/cpf';
import { validarEmail, normalizarEmail } from '@/lib/validators/email';
import { validarTelefone, formatarTelefone, limparTelefone } from '@/lib/validators/telefone';
import { validarSenha, verificarForcaSenha } from '@/lib/validators/senha';
import styles from './page.module.css';

export default function CadastroPage() {
  const router = useRouter();

  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
    <div className={styles.container}>
      <div className={styles.cadastroCard}>
        <div className={styles.header}>
          <h1 className={styles.logo}>Bauá</h1>
          <p className={styles.subtitle}>Ecossistema Educacional</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Criar Conta</h2>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label htmlFor="nome" className={styles.label}>
                Nome *
              </label>
              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome"
                className={styles.input}
                autoComplete="given-name"
                disabled={isLoading}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="sobrenome" className={styles.label}>
                Sobrenome *
              </label>
              <input
                id="sobrenome"
                type="text"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                placeholder="Digite seu sobrenome"
                className={styles.input}
                autoComplete="family-name"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cpf" className={styles.label}>
              CPF *
              {cpf.length > 0 && (
                <span className={cpfValido ? styles.validIcon : styles.invalidIcon}>
                  {cpfValido ? <FiCheck /> : <FiX />}
                </span>
              )}
            </label>
            <input
              id="cpf"
              type="text"
              value={cpf}
              onChange={(e) => handleCpfChange(e.target.value)}
              placeholder="000.000.000-00"
              className={styles.input}
              maxLength={14}
              disabled={isLoading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email *
              {email.length > 0 && (
                <span className={emailValido ? styles.validIcon : styles.invalidIcon}>
                  {emailValido ? <FiCheck /> : <FiX />}
                </span>
              )}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className={styles.input}
              autoComplete="email"
              disabled={isLoading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="telefone" className={styles.label}>
              Telefone *
              {telefone.length > 0 && (
                <span className={telefoneValido ? styles.validIcon : styles.invalidIcon}>
                  {telefoneValido ? <FiCheck /> : <FiX />}
                </span>
              )}
            </label>
            <input
              id="telefone"
              type="tel"
              value={telefone}
              onChange={(e) => handleTelefoneChange(e.target.value)}
              placeholder="(00) 00000-0000"
              className={styles.input}
              maxLength={15}
              autoComplete="tel"
              disabled={isLoading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="senha" className={styles.label}>
              Senha *
              {forcaSenha && (
                <span className={`${styles.forcaSenha} ${styles[forcaSenha]}`}>
                  {forcaSenha.charAt(0).toUpperCase() + forcaSenha.slice(1)}
                </span>
              )}
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className={styles.input}
                autoComplete="new-password"
                disabled={isLoading}
                required
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
            {senha.length > 0 && !senhaValidacao.valida && (
              <ul className={styles.senhaRequisitos}>
                {senhaValidacao.erros.map((erro, index) => (
                  <li key={index} className={styles.requisito}>
                    <FiX /> {erro}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmarSenha" className={styles.label}>
              Confirmar Senha *
              {confirmarSenha.length > 0 && (
                <span className={senhasFazMatch ? styles.validIcon : styles.invalidIcon}>
                  {senhasFazMatch ? <FiCheck /> : <FiX />}
                </span>
              )}
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmarSenha"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme sua senha"
                className={styles.input}
                autoComplete="new-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                disabled={isLoading}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Criando conta...' : 'Criar Conta'}
          </button>

          <div className={styles.footer}>
            <p>
              Já tem uma conta?{' '}
              <Link href="/login" className={styles.link}>
                Fazer login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
