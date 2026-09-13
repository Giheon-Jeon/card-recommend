import { createContext } from "react";

export type StorageType = "session" | "local";

export interface GeminiApiKeyContextType {
  apiKey: string;
  storageType: StorageType;
  saveApiKey: (key: string, type?: StorageType) => void;
  removeApiKey: () => void;
}

export const STORAGE_KEY = "gemini_api_key";

export const GeminiApiKeyContext = createContext<GeminiApiKeyContextType>({
  apiKey: "",
  storageType: "session",
  saveApiKey: () => {},
  removeApiKey: () => {},
});
