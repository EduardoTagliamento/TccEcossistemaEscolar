'use client';

import Link from 'next/link';
import { Poppins, Figtree, Baloo_2 } from 'next/font/google';
import styles from './page.module.css';

// Mesma tipografia da marca Bauá usada na landing page (frontend/app/page.tsx),
// tokens/fonts.css do design system: Poppins -> títulos, Figtree -> corpo/UI,
// Baloo 2 -> wordmark "bauá" no cabeçalho.
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

type IconName = 'arrow-left' | 'arrow-right' | 'check-circle' | 'award';

// Componente Icon local, mesmo padrão de frontend/app/page.tsx (página irmã):
// glifos Feather-style extraídos de components/core/Icon.jsx do Bauá Design
// System. 'check-circle' e 'arrow-right' são os mesmos glifos já usados em
// page.tsx/frontend/components/Icon.tsx; 'arrow-left' é novo (não existe em
// nenhum arquivo do projeto) e segue o mesmo estilo Feather do 'arrow-right'
// já usado — é o espelho horizontal do mesmo ícone.
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
    case 'arrow-left':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common} aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'award':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    default:
      return null;
  }
}

// Funcionalidades específicas em mais detalhe — deliberadamente sem repetir
// os tópicos já cobertos pela landing page (segurança/JWT/bcrypt/isolamento
// por escola já estão em CONFIANCA_ITENS de frontend/app/page.tsx). Aqui o
// foco é em "como a plataforma funciona por dentro" no dia a dia da escola.
const FUNCIONALIDADES = [
  {
    titulo: 'Personalização Total',
    texto:
      'Cada escola define as próprias 4 cores de identidade visual e envia seu logotipo — o tema se aplica automaticamente em toda a plataforma, para todos os usuários daquela instituição.',
  },
  {
    titulo: 'Gestão de Usuários e Turmas',
    texto:
      'Cadastro de professores, alunos, turmas, cursos e disciplinas, vinculando cada pessoa à função e à turma corretas dentro da escola.',
  },
  {
    titulo: 'Multi-Escola',
    texto:
      'Um mesmo usuário pode estar vinculado a mais de uma escola, com papéis diferentes em cada uma — sem precisar criar contas separadas.',
  },
  {
    titulo: 'Calendário Integrado',
    texto:
      'Provas, tarefas, feriados, eventos e anotações organizados em um único calendário, visível conforme a função de quem acessa.',
  },
  {
    titulo: 'Tarefas e Provas',
    texto:
      'Professores criam, corrigem e organizam tarefas e provas; alunos acompanham prazos, notas e entregas em um histórico próprio.',
  },
  {
    titulo: 'Comunicação Integrada',
    texto:
      'Conversas individuais e em grupo entre professores, alunos e responsáveis, direto na plataforma, sem depender de grupos externos.',
  },
  {
    titulo: 'Upload de Arquivos',
    texto:
      'Sistema de upload com validação de tipo e tamanho para logotipos, materiais de aula e anexos de tarefas.',
  },
];

const TECNOLOGIAS = [
  {
    categoria: 'Frontend',
    itens: ['Next.js 14 (App Router)', 'React 18', 'TypeScript 5.7', 'CSS Modules'],
  },
  {
    categoria: 'Backend',
    itens: ['Node.js + Express', 'TypeScript', 'MySQL', 'JWT + bcrypt'],
  },
  {
    categoria: 'Infraestrutura',
    itens: ['Resend (Email)', 'Multer (Upload)', 'CORS', 'node-cron'],
  },
];

export default function SaibaMaisPage() {
  return (
    <div className={`${styles.container} ${poppins.variable} ${figtree.variable} ${baloo2.variable}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoBird} aria-hidden="true" />
            <span className={styles.logoWordmark}>bauá</span>
          </Link>
          <Link href="/" className={styles.backLink}>
            <Icon name="arrow-left" size={18} /> Voltar para Home
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>
            Sobre o <span className={styles.highlight}>Bauá</span>
          </h1>
          <p className={styles.subtitle}>
            Conheça em mais detalhe a plataforma de gestão educacional que conecta escolas,
            professores, alunos e famílias em um único ecossistema.
          </p>
        </section>

        <section className={styles.section}>
          <h2>O que é o Bauá?</h2>
          <p>
            O Bauá é um ecossistema educacional integrado que conecta direção, secretaria,
            coordenação, professores, alunos e responsáveis em uma única plataforma. Inspirado no
            Google Classroom, mas pensado desde a raiz para a realidade das escolas brasileiras —
            da gestão administrativa ao dia a dia da sala de aula.
          </p>
          <p>
            Cada escola que adere ao Bauá ganha seu próprio espaço dentro da plataforma: usuários,
            turmas, disciplinas, calendário e comunicação vivem dentro do contexto daquela
            instituição, com identidade visual e permissões configuradas sob medida.
          </p>
          <p>
            Diferente de uma planilha ou de vários sistemas soltos, o Bauá centraliza o fluxo
            completo — cadastro de dados, gestão de turmas e disciplinas, calendário de eventos,
            tarefas e provas, comunicação entre as partes — em uma única conta por usuário, acessível
            de qualquer navegador, em computador, tablet ou celular.
          </p>
        </section>

        <section className={`${styles.section} ${styles.origemSection}`}>
          <span className={styles.origemBadge}>
            <Icon name="award" size={20} /> De onde veio o Bauá
          </span>
          <p>
            O Bauá nasceu como um Trabalho de Conclusão de Curso (TCC) — e isso é um diferencial
            real, não um problema a esconder: a plataforma foi pensada desde o início para ser
            usada de verdade, sob medida para a realidade das escolas brasileiras, em vez de ser
            um sistema genérico adaptado de fora. Desenvolvido por Eduardo Tagliamento, Henrique
            Cruz e Vithor Maximus, o projeto segue em expansão, com novos módulos e melhorias
            adicionados a cada etapa.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Funcionalidades em Detalhe</h2>
          <div className={styles.featuresGrid}>
            {FUNCIONALIDADES.map((item) => (
              <div key={item.titulo} className={styles.featureItem}>
                <Icon name="check-circle" size={26} />
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Tecnologias Utilizadas</h2>
          <div className={styles.techStack}>
            {TECNOLOGIAS.map((categoria) => (
              <div key={categoria.categoria} className={styles.techCategory}>
                <h3>{categoria.categoria}</h3>
                <ul>
                  {categoria.itens.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h2>Pronto para começar?</h2>
          <p>Crie sua conta gratuitamente e configure sua primeira escola em minutos</p>
          <div className={styles.ctaButtons}>
            <Link href="/cadastro" className={styles.primaryButton}>
              Criar Conta Grátis <Icon name="arrow-right" size={18} />
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
