/**
 * Ícones de linha (Lucide-style) portados do helper `ic(name,size)` do
 * mockup "Etapa Escola Mobile" — mesmos paths SVG, agora via
 * `react-native-svg` em vez de `React.createElement('svg', ...)`.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';

const PATHS: Record<string, string[]> = {
  home: ['M3 9.5 12 3l9 6.5', 'M5 10v10h14V10'],
  book: ['M4 5a2 2 0 0 1 2-2h5v16H6a2 2 0 0 0-2 2z', 'M20 5a2 2 0 0 0-2-2h-5v16h5a2 2 0 0 1 2 2z'],
  list: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  chat: [
    'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z',
  ],
  calendar: ['M8 2v4M16 2v4M3 9h18', 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.5 21a2 2 0 0 1-3 0'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
  back: ['m15 18-6-6 6-6'],
  forward: ['m9 18 6-6-6-6'],
  send: ['M22 2 11 13M22 2l-7 20-4-9-9-4z'],
  attach: ['M21 11.5 12 20a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8'],
  award: ['M12 2 3 7v6c0 5 3.5 8 9 9 5.5-1 9-4 9-9V7z'],
  alert: ['M12 9v4M12 17h.01', 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'],
  dots: ['M5 12h.01M12 12h.01M19 12h.01'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  'eye-off': [
    'M9.9 4.24A10.4 10.4 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-2.16 3.19M6.1 6.1A17.5 17.5 0 0 0 2 11s3.5 7 10 7a10.3 10.3 0 0 0 4.15-.87',
    'M9.5 9.5a3 3 0 0 0 4.24 4.24',
    'M2 2l20 20',
  ],
  'log-out': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  'chevron-right': ['m9 18 6-6-6-6'],
  check: ['M20 6 9 17l-5-5'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  plus: ['M12 5v14M5 12h14'],
};

interface IconProps {
  name: keyof typeof PATHS;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = 'currentColor' }: IconProps) {
  const segs = PATHS[name] || PATHS.dots;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {segs.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}
