import { useState, useCallback } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { useToast } from "@/hooks/useToast";

export const MAX_COMPARE_COUNT = 3;

export function useCardComparison() {
  const [selectedCards, setSelectedCards] = useState<CatalogEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();

  const isSelected = useCallback(
    (sourceId: number) => {
      return selectedCards.some((card) => card.sourceId === sourceId);
    },
    [selectedCards],
  );

  const toggleCard = useCallback(
    (entry: CatalogEntry): boolean => {
      const exists = selectedCards.some((c) => c.sourceId === entry.sourceId);
      if (exists) {
        setSelectedCards((prev) => prev.filter((c) => c.sourceId !== entry.sourceId));
        return true;
      }

      if (selectedCards.length >= MAX_COMPARE_COUNT) {
        toast.warning(`비교할 카드는 최대 ${MAX_COMPARE_COUNT}장까지 선택할 수 있습니다.`);
        return false;
      }

      setSelectedCards((prev) => [...prev, entry]);
      return true;
    },
    [selectedCards, toast],
  );

  const removeCard = useCallback((sourceId: number) => {
    setSelectedCards((prev) => prev.filter((c) => c.sourceId !== sourceId));
  }, []);

  const clear = useCallback(() => {
    setSelectedCards([]);
    setIsModalOpen(false);
  }, []);

  const openModal = useCallback(() => {
    if (selectedCards.length < 2) {
      toast.info("비교하려면 최소 2장 이상의 카드를 선택해 주세요.");
      return;
    }
    setIsModalOpen(true);
  }, [selectedCards.length, toast]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    selectedCards,
    isSelected,
    toggleCard,
    removeCard,
    clear,
    isModalOpen,
    openModal,
    closeModal,
    count: selectedCards.length,
    isMax: selectedCards.length >= MAX_COMPARE_COUNT,
  };
}

export type UseCardComparisonReturn = ReturnType<typeof useCardComparison>;
