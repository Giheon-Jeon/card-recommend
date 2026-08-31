import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface GeminiApiKeyContextType {
  apiKey: string;
  saveApiKey: (key: string) => void;
  removeApiKey: () => void;
}

const GeminiApiKeyContext = createContext<GeminiApiKeyContextType>({
  apiKey: "",
  saveApiKey: () => {},
  removeApiKey: () => {},
});

export function GeminiApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key")?.trim() ?? "";
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "gemini_api_key") {
        setApiKey(e.newValue?.trim() ?? "");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    localStorage.setItem("gemini_api_key", trimmed);
    setApiKey(trimmed);
  };

  const removeApiKey = () => {
    localStorage.removeItem("gemini_api_key");
    setApiKey("");
  };

  return (
    <GeminiApiKeyContext.Provider value={{ apiKey, saveApiKey, removeApiKey }}>
      {children}
    </GeminiApiKeyContext.Provider>
  );
}

export function useGeminiApiKey() {
  return useContext(GeminiApiKeyContext);
}
