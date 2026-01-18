export interface DAElement {
  id: string;
  code: string;
  name: string;
  description: string;
  value: number;
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
  name: string;
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

// Core apparatus types with DA support
export type DAApparatusType = 'hoop' | 'ball' | 'clubs' | 'ribbon';

// All apparatus types including those without DA support
export type ApparatusType = DAApparatusType | 'rope' | 'wa' | 'gala' | 'other';

// Helper to check if an apparatus supports DA
export const isDAApparatus = (apparatus: ApparatusType | null): apparatus is DAApparatusType => {
  return apparatus !== null && ['hoop', 'ball', 'clubs', 'ribbon'].includes(apparatus);
};

export const CRITERIA_CODES = ['Cr1V', 'Cr2H', 'Cr3L', 'Cr7R', 'Cr4F', 'Cr5W', 'Cr6DB'] as const;
export type CriteriaCode = typeof CRITERIA_CODES[number];
