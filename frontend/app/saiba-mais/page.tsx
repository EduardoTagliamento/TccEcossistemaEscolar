'use client';

import Link from 'next/link';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import styles from './page.module.css';

export default function SaibaMaisPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backButton}>
          <FiArrowLeft /> Voltar para Home
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>
            Sobre o <span className={styles.highlight}>Bauá</span>
          </h1>
          <p className={styles.subtitle}>
            Plataforma completa de gestão educacional desenvolvida para facilitar
            a administração de instituições de ensino
          </p>
        </section>

        <section className={styles.section}>
          <h2>O que é o Bauá?</h2>
          <p>
            O Bauá é um ecossistema educacional integrado que conecta escolas, professores,
            alunos e famílias em uma única plataforma. Desenvolvido com tecnologias modernas,
            oferece uma experiência personalizada para cada instituição de ensino.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Recursos Principais</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureItem}>
              <FiCheckCircle className={styles.featureIcon} />
              <h3>Autenticação Segura</h3>
              <p>Sistema robusto de autenticação com JWT e verificação de email</p>
            </div>

            <div className={styles.featureItem}>
              <FiCheckCircle className={styles.featureIcon} />
              <h3>Personalização Total</h3>
              <p>Cada escola pode customizar cores e logo, criando sua identidade visual única</p>
            </div>

            <div className={styles.featureItem}>
              <FiCheckCircle className={styles.featureIcon} />
              <h3>Gestão de Usuários</h3>
              <p>Controle completo de usuários, funções e permissões por escola</p>
            </div>

            <div className={styles.featureItem}>
              <FiCheckCircle className={styles.featureIcon} />
              <h3>Multi-Escola</h3>
              <p>Usuários podem estar vinculados a múltiplas escolas com diferentes funções</p>
            </div>

            <div className={styles.featureItem}>
              <FiCheckCircle className={styles.featureIcon} />
              <h3>Upload de Arquivos</h3>
              <p>Sistema seguro de upload de logos com validação de tipo e tamanho</p>
            </div>

            <div className={styles.featureItem}>
              <FiCheckCircle className={styles.featureIcon} />
              <h3>Responsivo</h3>
              <p>Interface adaptada para desktop, tablet e smartphone</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Tecnologias Utilizadas</h2>
          <div className={styles.techStack}>
            <div className={styles.techCategory}>
              <h3>Frontend</h3>
              <ul>
                <li>Next.js 14 (App Router)</li>
                <li>React 18</li>
                <li>TypeScript 5.7</li>
                <li>CSS Modules</li>
              </ul>
            </div>

            <div className={styles.techCategory}>
              <h3>Backend</h3>
              <ul>
                <li>Node.js + Express</li>
                <li>TypeScript</li>
                <li>MySQL</li>
                <li>JWT + bcrypt</li>
              </ul>
            </div>

            <div className={styles.techCategory}>
              <h3>Infraestrutura</h3>
              <ul>
                <li>Resend (Email)</li>
                <li>Multer (Upload)</li>
                <li>CORS</li>
                <li>node-cron</li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h2>Pronto para começar?</h2>
          <p>Crie sua conta gratuitamente e configure sua primeira escola em minutos</p>
          <div className={styles.ctaButtons}>
            <Link href="/cadastro" className={styles.primaryButton}>
              Criar Conta Grátis
            </Link>
            <Link href="/login" className={styles.secondaryButton}>
              Já tenho conta
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Bauá - Ecossistema Educacional. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
