/**
 * 🦜 Bauá - Ecossistema Educacional
 * Main TypeScript Entry Point
 */

// Inicialização do aplicativo
console.log('🦜 Bauá - Ecossistema Educacional iniciado!');

// Smooth scroll para links de navegação
document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-link');
  navLinks.forEach((link: HTMLAnchorElement) => {
    link.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      if (targetId?.startsWith('#')) {
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Animação de entrada dos elementos ao scroll
  const observerOptions: IntersectionObserverInit = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry: IntersectionObserverEntry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-visible');
      }
    });
  }, observerOptions);

  // Observar seções para animação
  const sections = document.querySelectorAll<HTMLElement>('section');
  sections.forEach((section: HTMLElement) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
  });

  // Adicionar classe para elementos visíveis
  const style = document.createElement('style');
  style.textContent = `
    .fade-in-visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);

  // Botões de ação
  const buttons = document.querySelectorAll<HTMLButtonElement>('.btn');
  buttons.forEach((button: HTMLButtonElement) => {
    button.addEventListener('click', () => {
      console.log('🦜 Botão clicado:', button.textContent);
      // Aqui você pode adicionar navegação ou ações específicas
    });
  });

  // Easter egg: clique no logo
  const logo = document.querySelector<HTMLImageElement>('.logo-img');
  if (logo) {
    let clickCount = 0;
    logo.addEventListener('click', () => {
      clickCount++;
      if (clickCount === 5) {
        alert('🦜 Bauá é um pássaro inteligente! O nome vem da ave conhecida por sua sabedoria.');
        clickCount = 0;
      }
    });
  }

  // Log de boas-vindas
  console.log(`
    🦜 ================================
    🎓 Bauá - Ecossistema Educacional
    ================================
    📚 Plataforma educacional com IA
    💻 Desenvolvido em TypeScript
    🚀 Versão: 1.0.0
    ================================
  `);
});

// Exportar para uso futuro
export default {};
