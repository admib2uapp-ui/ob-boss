// Firestore Schema Definitions & Shared Types

export type LeadStatus =
  | 'new'
  | 'invoice_sent'
  | 'paid'
  | 'visit_scheduled'
  | 'measured'
  | 'quoted'
  | 'won'
  | 'lost';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

export interface Visit {
  id: string;
  scheduledDate: string; // ISO string
  completed: boolean;
  measurements?: string; // Markdown or JSON string of measurements
  sitePhotos?: string[]; // URLs
}

export interface GeneratedDesign {
  id: string;
  sketchUrl: string; // The base sketch
  renderedUrl: string; // The AI result
  prompt: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  customerName: string;
  whatsappNumber: string;
  location: GeoPoint;
  addressLabel: string; // Human readable address or "Pin Location"
  status: LeadStatus;
  createdAt: string;
  initialImages?: string[]; // URLs
  generatedDesigns?: GeneratedDesign[];
  notes: Note[];
  visitChargeInvoice?: {
    amount: number;
    paid: boolean;
    paidAt?: string;
  };
  preferredVisitDate?: string; // YYYY-MM-DD
  visits: Visit[];
  createdBy?: string;
  quote?: {
    items: { name: string; price: number }[];
    total: number;
    accessories: string[];
    generatedAt: string;
  };
}

export interface RouteCluster {
  id: string;
  name: string;
  leadIds: string[];
  totalDistanceKm: number; // Estimated
  savings: string; // "High", "Medium", "Low"
  suggestedDate: string;
}

export type UserRole = 'admin' | 'staff' | 'installer';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  whatsappNumber?: string;
  role: UserRole;
  createdAt: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}