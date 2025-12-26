import { Lead } from '../types';
import { db, storage } from './firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, doc, 
  query, orderBy, Timestamp, setDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';

const COLLECTION_NAME = 'leads';

class StoreService {
  private leads: Lead[] = [];
  private listeners: ((leads: Lead[]) => void)[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.leads = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          // Convert Firestore Timestamps to ISO strings for the frontend
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        } as Lead;
      });
      this.notify();
    });
  }

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

  async addLead(lead: Lead) {
    // We let Firestore generate ID, or if ID is provided (like from manual creation with Date.now), we can use it.
    // However, clean usage is to let Firestore generate. But our app assigns IDs in UI.
    // Let's check if lead.id starts with 'l-' (our manual ID). 
    // Ideally, we treat the local ID as temporary or just use addDoc which returns a ref with new ID.
    // But to keep it simple with existing code that might rely on the object passed:
    
    const { id, ...leadData } = lead;
    
    // Use Firestore timestamp
    const dataToSave = {
        ...leadData,
        createdAt: Timestamp.now()
    };

    if (id && id.startsWith('l-')) {
         // Create a new doc, ignoring the client-side ID to avoid collisions, 
         // OR use the client ID as the doc ID. Using client ID 'l-...' is fine.
         await setDoc(doc(db, COLLECTION_NAME, id), dataToSave);
    } else {
         await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    }
  }

  async updateLead(id: string, updates: Partial<Lead>) {
    const leadRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(leadRef, updates);
  }

  async addNote(leadId: string, text: string) {
    const lead = this.getLeadById(leadId);
    if(lead) {
      const newNote = { 
        id: Date.now().toString(), 
        text, 
        createdAt: new Date().toISOString(), 
        author: 'user' 
      };
      const notes = [...(lead.notes || []), newNote];
      await this.updateLead(leadId, { notes });
    }
  }
  
  // --- Storage Helpers ---

  async uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  async uploadBase64(dataUrl: string, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  }
}

export const store = new StoreService();