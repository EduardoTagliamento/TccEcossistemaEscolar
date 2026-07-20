'use client';

/**
 * Estado de UI do Chat compartilhado entre a tela cheia
 * (`/dashboard/[escolaGUID]/chat`) e a bolha flutuante minimizada
 * (`MinimizedChatBubble`, montada em `layout.tsx`). Separado do
 * `SocketContext` de propósito — aqui só vive "qual conversa está aberta",
 * não a conexão WebSocket em si (a bolha e a tela cheia consomem
 * `useSocket()` independentemente, cada uma com seus próprios listeners).
 *
 * Fluxo:
 * - A tela cheia atualiza `conversaAbertaGUID` sempre que o usuário troca de
 *   conversa (ou fecha, no mobile) — ver chat/page.tsx.
 * - Ao navegar pra qualquer outra página do dashboard com uma conversa
 *   aberta, a `MinimizedChatBubble` (sempre montada) detecta que não está
 *   mais na tela de chat e passa a exibir essa conversa como bolha
 *   flutuante (estilo Instagram Web).
 * - "Fechar" a bolha só limpa este estado (não sai da conversa no backend
 *   — não existe conceito de "sair" de uma conversa nesta API).
 * - "Expandir" navega de volta pra `/chat`, que lê `conversaAbertaGUID` no
 *   mount pra já abrir a conversa certa.
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatUIContextData {
  conversaAbertaGUID: string | null;
  definirConversaAberta: (guid: string | null) => void;
}

const ChatUIContext = createContext<ChatUIContextData>({
  conversaAbertaGUID: null,
  definirConversaAberta: () => {},
});

export function ChatUIProvider({ children }: { children: ReactNode }) {
  const [conversaAbertaGUID, setConversaAbertaGUID] = useState<string | null>(null);

  return (
    <ChatUIContext.Provider value={{ conversaAbertaGUID, definirConversaAberta: setConversaAbertaGUID }}>
      {children}
    </ChatUIContext.Provider>
  );
}

export function useChatUI(): ChatUIContextData {
  return useContext(ChatUIContext);
}
