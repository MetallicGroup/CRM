import { create } from 'zustand';
import { Month } from './types';

interface StoreState {
  selectedMonth: Month;
  selectedYear: number;
  setSelectedMonth: (month: Month) => void;
  setSelectedYear: (year: number) => void;
}

export const useStore = create<StoreState>((set) => ({
  selectedMonth: 'Ianuarie',
  selectedYear: new Date().getFullYear(),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),
}));

export const monthToNumber = (month: Month): number => {
  const months: Month[] = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];
  return months.indexOf(month) + 1;
};
