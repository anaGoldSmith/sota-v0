export interface ApparatusBase {
  id: string;
  code: string;
  name: string;
  description: string;
  symbol_image: string | null;
  value: number;
}

export interface ApparatusControl {
  id: string;
  code: string;
  Cr1V: string | null;
  Cr2H: string | null;
  Cr3L: string | null;
  Cr7R: string | null;
  Cr4F: string | null;
  Cr5W: string | null;
  Cr6DB: string | null;
}

export interface Criterion {
  id: string;
  code: string;
  name: string;
  description: string;
  symbol_image: string | null;
}

export interface CombinedApparatusData {
  id: string;
  code: string;
  description: string;
  symbol_image: string | null;
  value: number;
  criteria: {
    Cr1V: string | null;
    Cr2H: string | null;
    Cr3L: string | null;
    Cr7R: string | null;
    Cr4F: string | null;
    Cr5W: string | null;
    Cr6DB: string | null;
  };
}

export interface SelectedApparatusElement extends CombinedApparatusData {
  selectedAt: Date;
}

export type ApparatusType = 'hoop' | 'ball' | 'clubs' | 'ribbon';

export const CRITERIA_CODES = ['Cr1V', 'Cr2H', 'Cr3L', 'Cr7R', 'Cr4F', 'Cr5W', 'Cr6DB'] as const;
export type CriteriaCode = typeof CRITERIA_CODES[number];
