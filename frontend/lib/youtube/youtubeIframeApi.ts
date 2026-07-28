'use client';

/**
 * Carregamento singleton do script https://www.youtube.com/iframe_api.
 * O player em si é instanciado por quem chamar isso (ver VisualizadorItemModal),
 * usado pra reportar progresso de vídeo via YT.PlayerState (onStateChange),
 * já que um <iframe> puro não expõe evento nenhum de reprodução.
 */

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let carregamento: Promise<any> | null = null;

export function carregarYoutubeIframeAPI(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube IFrame API só funciona no browser'));
  }

  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (carregamento) return carregamento;

  carregamento = new Promise((resolve) => {
    const callbackAnterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      callbackAnterior?.();
      resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return carregamento;
}

/** Estados de YT.PlayerState relevantes (a lib só define isso depois de carregada). */
export const YOUTUBE_PLAYER_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
} as const;
