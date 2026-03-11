'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import styles from './page.module.css';

export default function HomePage() {
  useEffect(() => {
    // Smooth scroll para links de navegação
    const handleNavClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains(styles.navLink)) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href?.startsWith('#')) {
          const section = document.querySelector(href);
          section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    document.addEventListener('click', handleNavClick);

    // Observer para floating nav
    const hero = document.querySelector(`.${styles.hero}`);
    const floatingNav = document.querySelector(`.${styles.floatingHeroNav}`);
    
    if (hero && floatingNav) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              floatingNav.classList.remove(styles.visible);
            } else {
              floatingNav.classList.add(styles.visible);
            }
          });
        },
        { threshold: 0.15 }
      );
      observer.observe(hero);
    }

    // Observer para animações de cards
    const cards = document.querySelectorAll(`.${styles.revealCard}`);
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.isVisible);
            cardObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -40px 0px' }
    );

    cards.forEach((card) => cardObserver.observe(card));

    return () => {
      document.removeEventListener('click', handleNavClick);
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <nav className={styles.navbar}>
          <div className={styles.navLeftGroup}>
            <div className={styles.logoContainer}>
              <Image 
                src="/assets/baua_fundo.png" 
                alt="Bauá Logo" 
                width={50} 
                height={50}
                className={styles.logoImg}
              />
              <h1 className={styles.logoText}>Bauá</h1>
            </div>
          </div>
          <div className={styles.navLinks}>
            <a href="#sobre" className={styles.navLink}>Sobre</a>
            <a href="#recursos" className={styles.navLink}>Recursos</a>
            <a href="#contato" className={styles.navLink}>Contato</a>
            <Link href="/login" className={styles.navLink}>Entrar</Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h2 className={styles.heroTitle}>Bem-vindo ao Bauá</h2>
              <p className={styles.heroSubtitle}>Ecossistema Educacional Inteligente</p>
              <p className={styles.heroDescription}>
                Uma plataforma educacional inspirada no Google Classroom, 
                potencializada com recursos de Inteligência Artificial para 
                revolucionar a experiência de ensino e aprendizagem.
              </p>
              <div className={styles.heroButtons}>
                <Link href="/cadastro" className={styles.btnPrimary}>
                  Começar Agora
                </Link>
                <Link href="/saiba-mais" className={styles.btnSecondary}>
                  Saiba Mais
                </Link>
              </div>
            </div>
            <div className={styles.heroImage}>
              <Image 
                src="/assets/baua_fundo.png" 
                alt="Bauá - Pássaro da Sabedoria" 
                width={400} 
                height={400}
                className={styles.heroBird}
                priority
              />
            </div>
          </div>
        </section>

        {/* Sobre Section */}
        <section id="sobre" className={styles.about}>
          <div className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>O que é o Bauá?</h2>
            <div className={styles.aboutContent}>
              <div className={`${styles.aboutCard} ${styles.revealCard}`}>
                <div className={styles.cardIcon}>📚</div>
                <h3>Gestão Escolar Completa</h3>
                <p>
                  Gerencie escolas, turmas, professores, alunos e disciplinas 
                  em uma única plataforma integrada e intuitiva.
                </p>
              </div>
              <div className={`${styles.aboutCard} ${styles.revealCard}`}>
                <div className={styles.cardIcon}>🤖</div>
                <h3>Inteligência Artificial</h3>
                <p>
                  Recursos avançados de IA para personalizar o aprendizado, 
                  gerar planos de estudo e analisar desempenho dos alunos.
                </p>
              </div>
              <div className={`${styles.aboutCard} ${styles.revealCard}`}>
                <div className={styles.cardIcon}>🎓</div>
                <h3>Experiência Educacional</h3>
                <p>
                  Interface moderna e acessível, inspirada nas melhores práticas 
                  de plataformas educacionais do mundo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Recursos Section */}
        <section id="recursos" className={styles.features}>
          <div className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>Recursos Principais</h2>
            <div className={styles.featuresGrid}>
              <div className={`${styles.featureItem} ${styles.revealCard}`}>
                <span className={styles.featureEmoji}>🏫</span>
                <h4>Gestão de Escolas</h4>
                <p>Cadastro e administração completa de instituições de ensino</p>
              </div>
              <div className={`${styles.featureItem} ${styles.revealCard}`}>
                <span className={styles.featureEmoji}>👥</span>
                <h4>Gerenciamento de Turmas</h4>
                <p>Organize turmas, disciplinas e horários facilmente</p>
              </div>
              <div className={`${styles.featureItem} ${styles.revealCard}`}>
                <span className={styles.featureEmoji}>📝</span>
                <h4>Atividades e Avaliações</h4>
                <p>Crie, distribua e corrija atividades de forma eficiente</p>
              </div>
              <div className={`${styles.featureItem} ${styles.revealCard}`}>
                <span className={styles.featureEmoji}>📊</span>
                <h4>Relatórios Inteligentes</h4>
                <p>Análises detalhadas com insights gerados por IA</p>
              </div>
              <div className={`${styles.featureItem} ${styles.revealCard}`}>
                <span className={styles.featureEmoji}>💬</span>
                <h4>Comunicação Integrada</h4>
                <p>Notificações por e-mail e sistema de mensagens</p>
              </div>
              <div className={`${styles.featureItem} ${styles.revealCard}`}>
                <span className={styles.featureEmoji}>🔒</span>
                <h4>Segurança Avançada</h4>
                <p>Autenticação JWT e proteção de dados completa</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tecnologias Section */}
        <section className={styles.tech}>
          <div className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>Tecnologias Utilizadas</h2>
            <div className={styles.techStack}>
              <span className={styles.techBadge}>TypeScript</span>
              <span className={styles.techBadge}>Node.js + Express</span>
              <span className={styles.techBadge}>MySQL</span>
              <span className={styles.techBadge}>Next.js 14</span>
              <span className={styles.techBadge}>React 18</span>
              <span className={styles.techBadge}>Resend API</span>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta}>
          <div className={styles.sectionContainer}>
            <h2 className={styles.ctaTitle}>Pronto para transformar a educação?</h2>
            <p className={styles.ctaText}>
              Junte-se ao Bauá e faça parte da revolução educacional.
            </p>
            <Link href="/cadastro" className={styles.btnLarge}>
              Comece Gratuitamente
            </Link>
          </div>
        </section>

        {/* Contato Section */}
        <section id="contato" className={styles.contact}>
          <div className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>Contato</h2>
            <div className={styles.contactContent}>
              <p className={styles.contactText}>Para dúvidas e suporte, fale com a equipe Bauá:</p>
              <a className={styles.contactEmail} href="mailto:bauaecossistemaescolar@gmail.com">
                bauaecossistemaescolar@gmail.com
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Hero Nav */}
      <div className={styles.floatingHeroNav} aria-hidden="true">
        <div className={styles.heroButtons}>
          <Link href="/cadastro" className={styles.btnPrimary}>
            Começar Agora
          </Link>
          <Link href="/saiba-mais" className={styles.btnSecondary}>
            Saiba Mais
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.sectionContainer}>
          <div className={styles.footerContent}>
            <div className={styles.footerLogo}>
              <Image 
                src="/assets/baua_fundo.png" 
                alt="Bauá" 
                width={40} 
                height={40}
                className={styles.footerLogoImg}
              />
              <p>Bauá © {new Date().getFullYear()}</p>
            </div>
            <div className={styles.footerInfo}>
              <p>Projeto de TCC - Ecossistema Educacional</p>
              <p>Desenvolvido por Eduardo Tagliamento, Henrique Cruz e Vithor Maximus</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
