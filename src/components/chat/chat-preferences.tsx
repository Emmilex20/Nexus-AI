"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AiModelId } from "@/config/ai-models";

type ChatPreferencesContextValue = {
  selectedModel: AiModelId;
  setSelectedModel: (model: AiModelId) => void;
};

const ChatPreferencesContext =
  createContext<ChatPreferencesContextValue | null>(null);

export function ChatPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedModel, setSelectedModel] = useState<AiModelId>("gpt-4o-mini");

  const value = useMemo(
    () => ({
      selectedModel,
      setSelectedModel,
    }),
    [selectedModel]
  );

  return (
    <ChatPreferencesContext.Provider value={value}>
      {children}
    </ChatPreferencesContext.Provider>
  );
}

export function useChatPreferences() {
  const context = useContext(ChatPreferencesContext);

  if (!context) {
    throw new Error(
      "useChatPreferences must be used within ChatPreferencesProvider"
    );
  }

  return context;
}
