import { useContext } from "react";
import { GeminiApiKeyContext } from "@/contexts/geminiApiKeyContextDef";

export function useGeminiApiKey() {
  return useContext(GeminiApiKeyContext);
}
