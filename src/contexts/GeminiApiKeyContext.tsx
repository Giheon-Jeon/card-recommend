import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type StorageType = "session" | "local";

interface GeminiApiKeyContextType {
  apiKey: string;
  storageType: StorageType;
  saveApiKey: (key: string, type?: StorageType) => void;
  removeApiKey: () => void;
}

const STORAGE_KEY = "gemini_api_key";

const GeminiApiKeyContext = createContext<GeminiApiKeyContextType>({
  apiKey: "",
  storageType: "session",
  saveApiKey: () => {},
  removeApiKey: () => {},
});

function getInitialState(): { key: string; type: StorageType } {
  try {
    const sessionKey = sessionStorage.getItem(STORAGE_KEY)?.trim();
    if (sessionKey) {
      return { key: sessionKey, type: "session" };
    }
  } catch {
    // sessionStorage 접근 불가 환경 대응
  }

  try {
    const localKey = localStorage.getItem(STORAGE_KEY)?.trim();
    if (localKey) {
      return { key: localKey, type: "local" };
    }
  } catch {
    // localStorage 접근 불가 환경 대응
  }

  return { key: "", type: "session" };
}

export function GeminiApiKeyProvider({ children }: { children: ReactNode }) {
  const [keyState, setKeyState] = useState<{ key: string; type: StorageType }>(getInitialState);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        // sessionStorage에 키가 이미 있다면 session 우선 유지
        try {
          const hasSessionKey = sessionStorage.getItem(STORAGE_KEY)?.trim();
          if (hasSessionKey) return;
        } catch {
          // ignore
        }

        const newLocalVal = e.newValue?.trim() ?? "";
        setKeyState({ key: newLocalVal, type: "local" });
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const saveApiKey = (key: string, type: StorageType = "session") => {
    const trimmed = key.trim();

    try {
      if (type === "session") {
        sessionStorage.setItem(STORAGE_KEY, trimmed);
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, trimmed);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error("스토리지에 API 키를 저장하는 중 오류 발생:", e);
    }

    setKeyState({ key: trimmed, type });
  };

  const removeApiKey = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("스토리지에서 API 키를 제거하는 중 오류 발생:", e);
    }
    setKeyState({ key: "", type: "session" });
  };

  return (
    <GeminiApiKeyContext.Provider
      value={{
        apiKey: keyState.key,
        storageType: keyState.type,
        saveApiKey,
        removeApiKey,
      }}
    >
      {children}
    </GeminiApiKeyContext.Provider>
  );
}

export function useGeminiApiKey() {
  return useContext(GeminiApiKeyContext);
}
