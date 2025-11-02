export interface DAElement {
  id: string;
  apparatus_type: ApparatusType;
  code: string;
  name: string;
  description: string;
  value: number;
  symbol_image: string | null;
  Cr1V: boolean;
  Cr2H: boolean;
  Cr3L: boolean;
  Cr7R: boolean;
  Cr4F: boolean;
  Cr5W: boolean;
  Cr6DB: boolean;
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
    Cr1V: boolean;
    Cr2H: boolean;
    Cr3L: boolean;
    Cr7R: boolean;
    Cr4F: boolean;
    Cr5W: boolean;
    Cr6DB: boolean;
  };
}

export interface SelectedApparatusElement extends CombinedApparatusData {
  selectedAt: Date;
}

export type ApparatusType = 'hoop' | 'ball' | 'clubs' | 'ribbon';

export const CRITERIA_CODES = ['Cr1V', 'Cr2H', 'Cr3L', 'Cr7R', 'Cr4F', 'Cr5W', 'Cr6DB'] as const;
export type CriteriaCode = typeof CRITERIA_CODES[number];
