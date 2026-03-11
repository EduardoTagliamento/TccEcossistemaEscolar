import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>Bauá</h1>
          <span>Ecossistema Educacional</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/login" className={styles.loginButton}>
            Entrar
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h2 className={styles.title}>
            Bem-vindo ao <span className={styles.highlight}>Bauá</span>
          </h2>
          <p className={styles.description}>
            Plataforma integrada de gestão educacional que conecta escolas, 
            professores, alunos e famílias em um único ecossistema.
          </p>
          <div className={styles.actions}>
            <Link href="/cadastro" className={styles.primaryButton}>
              Começar Agora
            </Link>
            <Link href="/saiba-mais" className={styles.secondaryButton}>
              Saiba Mais
            </Link>
          </div>
        </section>

        <section className={styles.features}>
          <h3>Recursos Principais</h3>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🎨</div>
              <h4>Personalização</h4>
              <p>Cada escola pode personalizar suas cores e identidade visual</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>👥</div>
              <h4>Gestão Integrada</h4>
              <p>Gerencie usuários, funções e permissões de forma centralizada</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔒</div>
              <h4>Segurança</h4>
              <p>Autenticação robusta e proteção de dados em todas as camadas</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📊</div>
              <h4>Dashboard</h4>
              <p>Visualize informações importantes em tempo real</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Bauá - Ecossistema Educacional. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
