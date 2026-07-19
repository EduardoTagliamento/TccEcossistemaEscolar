'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import { useAuth } from '@/lib/auth/AuthContext';
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

type IconName =
  | 'arrow-right'
  | 'book-open'
  | 'star'
  | 'award'
  | 'home'
  | 'users'
  | 'file-text'
  | 'bar-chart'
  | 'message-circle'
  | 'lock'
  | 'mail'
  | 'edit';

// Glifos Feather-style extraídos literalmente de components/core/Icon.jsx
// (Bauá Design System) — mesmo conjunto de ícones usado em "Landing Page.dc.html".
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'arrow-right':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    case 'book-open':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common} aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'award':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'file-text':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'bar-chart':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      );
    case 'message-circle':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    default:
      return null;
  }
}

const NAV_LINKS = [
  { href: '#inicio', label: 'Início' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#sobre', label: 'Sobre Nós' },
  { href: '#contato', label: 'Contato' },
];

const PERSONAS = [
  {
    icon: 'bar-chart' as IconName,
    title: 'Para Diretores',
    text: 'Gerencie sua escola em um só lugar.',
    href: '#sobre',
  },
  {
    icon: 'edit' as IconName,
    title: 'Para Professores',
    text: 'Planeje aulas e interaja de forma mais dinâmica.',
    href: '#sobre',
  },
  {
    icon: 'book-open' as IconName,
    title: 'Para Alunos',
    text: 'Acesse materiais e acompanhe seu progresso.',
    href: '/login',
  },
];

const SOBRE_ITENS = [
  {
    icon: 'book-open' as IconName,
    tone: styles.sobreIconGreen,
    title: 'Gestão Escolar Completa',
    text: 'Gerencie escolas, turmas, professores, alunos e disciplinas em uma única plataforma integrada e intuitiva.',
  },
  {
    icon: 'star' as IconName,
    tone: styles.sobreIconBlue,
    title: 'Inteligência Artificial',
    text: 'Recursos avançados de IA para personalizar o aprendizado, gerar planos de estudo e analisar o desempenho dos alunos.',
  },
  {
    icon: 'award' as IconName,
    tone: styles.sobreIconGold,
    title: 'Experiência Educacional',
    text: 'Interface moderna e acessível, inspirada nas melhores práticas de plataformas educacionais do mundo.',
  },
];

const RECURSOS = [
  {
    icon: 'home' as IconName,
    title: 'Gestão de Escolas',
    text: 'Cadastro e administração completa de instituições de ensino.',
  },
  {
    icon: 'users' as IconName,
    title: 'Gerenciamento de Turmas',
    text: 'Organize turmas, disciplinas e horários facilmente.',
  },
  {
    icon: 'file-text' as IconName,
    title: 'Atividades e Avaliações',
    text: 'Crie, distribua e corrija atividades de forma eficiente.',
  },
  {
    icon: 'bar-chart' as IconName,
    title: 'Relatórios Inteligentes',
    text: 'Análises detalhadas com insights gerados por IA.',
  },
  {
    icon: 'message-circle' as IconName,
    title: 'Comunicação Integrada',
    text: 'Notificações por e-mail e sistema de mensagens.',
  },
  {
    icon: 'lock' as IconName,
    title: 'Segurança Avançada',
    text: 'Autenticação JWT e proteção de dados completa.',
  },
];

const TECNOLOGIAS = ['TypeScript', 'Node.js + Express', 'MySQL', 'Next.js 14', 'React 18', 'Resend API'];

export default function HomePage() {
  const { token, isLoading } = useAuth();

  useEffect(() => {
    // Redireciona automaticamente se já estiver autenticado.
    // Usa o AuthContext (nunca acessa localStorage diretamente).
    if (!isLoading && token) {
      window.location.href = '/selecionar-escola';
    }
  }, [isLoading, token]);

  useEffect(() => {
    const handleNavClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!target) return;
      const href = target.getAttribute('href');
      if (href && href.length > 1) {
        const section = document.querySelector(href);
        if (section) {
          e.preventDefault();
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    document.addEventListener('click', handleNavClick);

    const cards = document.querySelectorAll(`.${styles.reveal}`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -40px 0px' }
    );
    cards.forEach((card) => observer.observe(card));

    return () => {
      document.removeEventListener('click', handleNavClick);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`${styles.page} ${poppins.variable} ${figtree.variable} ${baloo2.variable}`}>
      {/* NAV */}
      <header>
        <nav className={styles.nav}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoBird} aria-hidden="true" />
            <span className={styles.logoWordmark}>bauá</span>
          </Link>
          <div className={styles.navLinks}>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))}
            <Link href="/login" className={styles.navLink}>
              Já sou Aluno
            </Link>
          </div>
          <div className={styles.navSpacer} />
          <Link href="/cadastro" className={styles.btnPrimary}>
            Assinar
          </Link>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section id="inicio" className={styles.hero}>
          <div className={`${styles.gridBg} ${styles.heroGridBg}`} aria-hidden="true" />
          <div className={styles.heroBlobTop} aria-hidden="true" />
          <div className={styles.heroBlobBottomRight} aria-hidden="true" />
          <div className={styles.heroBlobBottomLeft} aria-hidden="true" />
          <div className={`${styles.dotBg} ${styles.heroDotBg}`} aria-hidden="true" />

          <div className={styles.heroInner}>
            <div>
              <h1 className={styles.heroTitle}>
                BAUÁ: O Ecossistema
                <br />
                Escolar <span className={styles.heroAccent}>Uni</span>ficado
              </h1>
              <p className={styles.heroSubtitle}>
                Conecte sua escola, alunos, professores e responsáveis em uma plataforma única e
                intuitiva. Gerencie tudo em um só lugar.
              </p>
              <Link href="/saiba-mais" className={styles.btnPrimaryLg}>
                Quero saber mais
                <Icon name="arrow-right" size={20} />
              </Link>
            </div>
            <div className={styles.heroImageCol}>
              <span className={styles.heroBird} role="img" aria-label="Bauá — gralha formanda" />
            </div>
          </div>
        </section>

        {/* PERSONAS */}
        <section id="funcionalidades" className={`${styles.mintBand} ${styles.personasSection}`}>
          <h2 className={styles.sectionTitle}>
            Um Ecossistema Único para <span className={styles.accentGreen}>Qualquer Escola</span>
          </h2>
          <div className={styles.personasGrid}>
            {PERSONAS.map((persona) => (
              <div key={persona.title} className={`${styles.personaCard} ${styles.reveal}`}>
                <span className={styles.personaIcon}>
                  <Icon name={persona.icon} size={26} />
                </span>
                <div>
                  <h3 className={styles.personaTitle}>{persona.title}</h3>
                  <p className={styles.personaText}>{persona.text}</p>
                  {persona.href.startsWith('#') ? (
                    <a href={persona.href} className={styles.inlineLink}>
                      Saiba mais <Icon name="arrow-right" size={16} />
                    </a>
                  ) : (
                    <Link href={persona.href} className={styles.inlineLink}>
                      Saiba mais <Icon name="arrow-right" size={16} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* O QUE É O BAUÁ */}
        <section id="sobre" className={styles.sobreSection}>
          <div className={styles.sobreInner}>
            <h2 className={styles.sectionTitle}>
              O que é o <span className={styles.accentGreen}>Bauá</span>?
            </h2>
            <p className={styles.sobreSubtitle}>
              Uma plataforma educacional inspirada no Google Classroom, potencializada com
              Inteligência Artificial para transformar o ensino e a aprendizagem.
            </p>
            <div className={styles.sobreGrid}>
              {SOBRE_ITENS.map((item) => (
                <div key={item.title} className={`${styles.sobreItem} ${styles.reveal}`}>
                  <span className={`${styles.sobreIcon} ${item.tone}`}>
                    <Icon name={item.icon} size={30} />
                  </span>
                  <h3 className={styles.sobreItemTitle}>{item.title}</h3>
                  <p className={styles.sobreItemText}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RECURSOS PRINCIPAIS */}
        <section id="recursos" className={styles.recursosSection}>
          <div className={styles.recursosInner}>
            <h2 className={styles.sectionTitle}>
              Recursos <span className={styles.accentGreen}>Principais</span>
            </h2>
            <div className={styles.recursosGrid}>
              {RECURSOS.map((recurso) => (
                <div key={recurso.title} className={`${styles.recursoCard} ${styles.reveal}`}>
                  <span className={styles.recursoIcon}>
                    <Icon name={recurso.icon} size={24} />
                  </span>
                  <h3 className={styles.recursoTitle}>{recurso.title}</h3>
                  <p className={styles.recursoText}>{recurso.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TECNOLOGIAS */}
        <section className={`${styles.mintBand} ${styles.techSection}`}>
          <div className={styles.techInner}>
            <h2 className={styles.techTitle}>Tecnologias Utilizadas</h2>
            <div className={styles.techStack}>
              {TECNOLOGIAS.map((tech) => (
                <span key={tech} className={styles.techBadge}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={styles.cta}>
          <div className={`${styles.gridBg} ${styles.ctaGridBg}`} aria-hidden="true" />
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>Pronto para transformar a educação?</h2>
            <p className={styles.ctaText}>Junte-se ao Bauá e faça parte da revolução educacional.</p>
            <Link href="/cadastro" className={styles.ctaButton}>
              Comece Gratuitamente
              <Icon name="arrow-right" size={20} />
            </Link>
          </div>
        </section>
      </main>

      {/* CONTATO / RODAPÉ */}
      <footer id="contato" className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrandCol}>
              <div className={styles.footerLogo}>
                <span className={styles.footerLogoBird} aria-hidden="true" />
                <span className={styles.footerWordmark}>bauá</span>
              </div>
              <p className={styles.footerDesc}>
                Ecossistema educacional inteligente que conecta escolas, professores, alunos e
                responsáveis em uma plataforma única.
              </p>
            </div>
            <div>
              <h4 className={styles.footerContactTitle}>Contato</h4>
              <p className={styles.footerContactText}>Para dúvidas e suporte, fale com a equipe Bauá:</p>
              <a className={styles.footerContactEmail} href="mailto:bauaecossistemaescolar@gmail.com">
                <Icon name="mail" size={16} /> bauaecossistemaescolar@gmail.com
              </a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <div>Bauá © {new Date().getFullYear()} · Projeto de TCC — Ecossistema Educacional</div>
            <div>Desenvolvido por Eduardo Tagliamento, Henrique Cruz e Vithor Maximus</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
