
export type UnitType = 'u' | 'm' | 'kg' | 'cm';
export type DeliveryType = 'immediate' | 'import';

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  quantity: number;
  unit: UnitType;
  netPrice: number;
  deliveryType: DeliveryType;
  deliveryDays?: number;
}

export interface QuoteInfo {
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  customerRut: string;
  customerGiro: string;
  quoteNumber: string;
  date: string;
  ivaRate: number;
}

export interface ProductData {
  name: string;
  brand: string;
  description: string;
  suggestedUnit: UnitType;
  specDetails?: string; // Diferencia específica (ej: "16A", "4mm2", "3000K")
}

export interface ExtractionResult {
  multipleModelsFound: boolean;
  products: ProductData[];
}

export interface SavedQuote {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerCompany: string;
  date: string;
  products: Product[];
  info: QuoteInfo;
  total: number;
}
