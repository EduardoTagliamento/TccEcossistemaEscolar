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
    const estilo = getComputedStyle(document.documentElement);
    setPaleta(VARIAVEIS.map((variavel, i) => estilo.getPropertyValue(variavel).trim() || PALETA_PADRAO[i]));
  }, []);

  return paleta;
}
