'use client';

import { useEffect, useState } from 'react';

// Mesmos defaults legados de frontend/styles/globals.css :root — usados só
// até o efeito abaixo conseguir ler o valor real (setado em DashboardNavbar
// a partir de EscolaCorPriEs/PriCl/SecEs/SecCl) no primeiro render client-side.
const PALETA_PADRAO = ['#1CC47B', '#FFFFFF', '#000000', '#FFD700'];

const VARIAVEIS = ['--color-primary', '--color-secondary', '--color-tertiary', '--color-accent'] as const;

/**
 * As 4 cores configuradas pela escola (Gestão de Dados → Config. da escola),
 * na ordem Primária escura / Primária clara / Secundária escura / Secundária
 * clara — pra usar como paleta alternada em listas de cards sem cor própria
 * definida (ex.: matérias/turmas sem customização), evitando que a grade
 * fique monocromática no fallback.
 */
export function useCoresEscola(): string[] {
  const [paleta, setPaleta] = useState<string[]>(PALETA_PADRAO);

  useEffect(() => {
    const ler = () => {
      const estilo = getComputedStyle(document.documentElement);
      setPaleta(VARIAVEIS.map((variavel, i) => estilo.getPropertyValue(variavel).trim() || PALETA_PADRAO[i]));
    };

    ler(); // tenta na hora — já cobre o caso de a navbar ter escrito primeiro

    // A DashboardNavbar só escreve essas variáveis depois de um fetch
    // assíncrono da escola — na maioria das vezes esse componente monta e lê
    // ANTES disso acontecer, pegando a paleta padrão do Bauá e nunca mais
    // relendo. Um MutationObserver no atributo style do <html> resolve
    // porque reage sempre que a navbar realmente escrever, não importa a
    // ordem/tempo entre os dois.
    const observer = new MutationObserver(ler);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    return () => observer.disconnect();
  }, []);

  return paleta;
}
