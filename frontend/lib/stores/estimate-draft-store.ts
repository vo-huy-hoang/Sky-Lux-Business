import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DraftRevenueLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  multiplier?: number;
  passengerTypeId?: string;
  passengerTypeName?: string;
  note?: string;
}

export interface DraftCostLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  multiplier?: number;
  serviceCategoryId?: string;
  serviceCategoryName?: string;
  supplierId?: string;
  supplierName?: string;
  note?: string;
}

export interface EstimateDraftState {
  dossierId: string | null;
  currency: string;
  revenueLines: DraftRevenueLine[];
  costLines: DraftCostLine[];
  discountAmount: number;
  commissionPercent: number;

  // Actions
  setDossierId: (id: string | null) => void;
  setCurrency: (currency: string) => void;
  addRevenueLine: (line: Omit<DraftRevenueLine, 'id'>) => void;
  updateRevenueLine: (id: string, updates: Partial<DraftRevenueLine>) => void;
  removeRevenueLine: (id: string) => void;

  addCostLine: (line: Omit<DraftCostLine, 'id'>) => void;
  updateCostLine: (id: string, updates: Partial<DraftCostLine>) => void;
  removeCostLine: (id: string) => void;

  setDiscountAmount: (discount: number) => void;
  setCommissionPercent: (percent: number) => void;
  clearDraft: () => void;

  // Realtime Financial Calculations
  getTotalRevenue: () => number;
  getTotalCost: () => number;
  getGrossProfit: () => number;
  getProfitMargin: () => number;
  getCommissionAmount: () => number;
  getNetProfit: () => number;
}

function generateId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useEstimateDraftStore = create<EstimateDraftState>()(
  persist(
    (set, get) => ({
      dossierId: null,
      currency: 'VND',
      revenueLines: [],
      costLines: [],
      discountAmount: 0,
      commissionPercent: 0,

      setDossierId: (id) => set({ dossierId: id }),
      setCurrency: (curr) => set({ currency: curr }),

      addRevenueLine: (line) =>
        set((state) => ({
          revenueLines: [
            ...state.revenueLines,
            { ...line, id: generateId(), multiplier: line.multiplier || 1 },
          ],
        })),

      updateRevenueLine: (id, updates) =>
        set((state) => ({
          revenueLines: state.revenueLines.map((line) =>
            line.id === id ? { ...line, ...updates } : line,
          ),
        })),

      removeRevenueLine: (id) =>
        set((state) => ({
          revenueLines: state.revenueLines.filter((line) => line.id !== id),
        })),

      addCostLine: (line) =>
        set((state) => ({
          costLines: [
            ...state.costLines,
            { ...line, id: generateId(), multiplier: line.multiplier || 1 },
          ],
        })),

      updateCostLine: (id, updates) =>
        set((state) => ({
          costLines: state.costLines.map((line) =>
            line.id === id ? { ...line, ...updates } : line,
          ),
        })),

      removeCostLine: (id) =>
        set((state) => ({
          costLines: state.costLines.filter((line) => line.id !== id),
        })),

      setDiscountAmount: (discount) =>
        set({ discountAmount: Math.max(0, discount) }),

      setCommissionPercent: (percent) =>
        set({ commissionPercent: Math.max(0, Math.min(100, percent)) }),

      clearDraft: () =>
        set({
          dossierId: null,
          currency: 'VND',
          revenueLines: [],
          costLines: [],
          discountAmount: 0,
          commissionPercent: 0,
        }),

      getTotalRevenue: () => {
        const { revenueLines, discountAmount } = get();
        const rawRevenue = revenueLines.reduce((sum, line) => {
          const mult = line.multiplier || 1;
          const lineGross = line.quantity * line.unitPrice * mult;
          const lineVat = lineGross * (line.vatRate / 100);
          return sum + lineGross + lineVat;
        }, 0);
        return Math.max(0, rawRevenue - (discountAmount || 0));
      },

      getTotalCost: () => {
        const { costLines } = get();
        return costLines.reduce((sum, line) => {
          const mult = line.multiplier || 1;
          const lineGross = line.quantity * line.unitPrice * mult;
          const lineVat = lineGross * (line.vatRate / 100);
          return sum + lineGross + lineVat;
        }, 0);
      },

      getGrossProfit: () => {
        const totalRevenue = get().getTotalRevenue();
        const totalCost = get().getTotalCost();
        return totalRevenue - totalCost;
      },

      getProfitMargin: () => {
        const totalRevenue = get().getTotalRevenue();
        const grossProfit = get().getGrossProfit();
        if (!totalRevenue || totalRevenue <= 0) return 0;
        return Number(((grossProfit / totalRevenue) * 100).toFixed(2));
      },

      getCommissionAmount: () => {
        const totalRevenue = get().getTotalRevenue();
        const { commissionPercent } = get();
        return (totalRevenue * (commissionPercent || 0)) / 100;
      },

      getNetProfit: () => {
        const grossProfit = get().getGrossProfit();
        const commission = get().getCommissionAmount();
        return grossProfit - commission;
      },
    }),
    {
      name: 'skylux-estimate-draft-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
