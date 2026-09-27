import { useContext } from "react";
import { ToastContext } from "@/contexts/toastContextDef";
import type { ToastContextType } from "@/contexts/toastContextDef";

export function useToast(): ToastContextType {
  return useContext(ToastContext);
}
