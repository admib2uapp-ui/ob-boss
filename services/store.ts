import { Lead, RouteCluster } from '../types';

// Initial Mock Data - Colombo, Sri Lanka Context
const MOCK_LEADS: Lead[] = [
  {
    id: 'l-1',
    customerName: 'Silva Residences',
    whatsappNumber: '94771234567',
    location: { lat: 6.9147, lng: 79.8538 }, // Kollupitiya
    addressLabel: 'Galle Rd, Kollupitiya',
    status: 'paid',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    initialImages: ['https://picsum.photos/400/300?random=1'],
    notes: [{id: 'n1', text: 'Wants teak finish.', createdAt: new Date().toISOString(), author: 'user'}],
    visitChargeInvoice: { amount: 2500, paid: true, paidAt: new Date().toISOString() },
    visits: [],
  },
  {
    id: 'l-2',
    customerName: 'Perera Kitchens',
    whatsappNumber: '94777654321',
    location: { lat: 6.9271, lng: 79.8612 }, // Cinnamon Gardens
    addressLabel: 'Gregorys Road, Colombo 7',
    status: 'paid',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    notes: [],
    visitChargeInvoice: { amount: 2500, paid: true, paidAt: new Date().toISOString() },
    visits: [],
  },
  {
    id: 'l-3',
    customerName: 'Fernando Traders',
    whatsappNumber: '94711112222',
    location: { lat: 6.9405, lng: 79.8549 }, // Pettah
    addressLabel: 'Main Street, Pettah',
    status: 'new',
    createdAt: new Date().toISOString(),
    notes: [],
    visits: [],
  },
  {
    id: 'l-4',
    customerName: 'Dr. Gunawardena',
    whatsappNumber: '94779998888',
    location: { lat: 6.8969, lng: 79.8587 }, // Bambalapitiya
    addressLabel: 'Duplication Rd, Bamba',
    status: 'invoice_sent',
    createdAt: new Date().toISOString(),
    notes: [],
    visitChargeInvoice: { amount: 2500, paid: false },
    visits: [],
  },
];

class StoreService {
  private leads: Lead[] = MOCK_LEADS;
  private listeners: ((leads: Lead[]) => void)[] = [];

  getLeads(): Lead[] {
    return [...this.leads];
  }

  getLeadById(id: string): Lead | undefined {
    return this.leads.find(l => l.id === id);
  }

  subscribe(listener: (leads: Lead[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.leads);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l([...this.leads]));
  }

  addLead(lead: Lead) {
    this.leads = [lead, ...this.leads];
    this.notify();
  }

  updateLead(id: string, updates: Partial<Lead>) {
    this.leads = this.leads.map(l => l.id === id ? { ...l, ...updates } : l);
    this.notify();
  }

  addNote(leadId: string, text: string) {
    const lead = this.getLeadById(leadId);
    if(lead) {
      const newNote = { id: Date.now().toString(), text, createdAt: new Date().toISOString(), author: 'user' };
      this.updateLead(leadId, { notes: [...lead.notes, newNote] });
    }
  }

  // Helper to simulate "Filtering by status"
  getLeadsByStatus(status: Lead['status']): Lead[] {
    return this.leads.filter(l => l.status === status);
  }
}

export const store = new StoreService();