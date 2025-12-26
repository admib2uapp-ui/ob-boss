import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { Lead } from '../types';

const API_KEY = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- SYSTEM INSTRUCTIONS ---
const BOSS_SYSTEM_INSTRUCTION = `
You are the Shop Manager of "Cabinex" in Colombo, Sri Lanka.
Your job is to manage leads, schedule measurements, and optimize costs.

RULES:
1. **Orchestration**: Do NOT perform database actions directly. Instead, call the appropriate 'proposal' tool.
2. **Widgets**: When a user wants to create a lead, invoice, or update status, call the tool. The UI will render a widget for the user to Confirm/Modify.
3. **Route Logic**: 
   - Travel speed in Colombo is approx 20km/h.
   - Each measurement takes 20 minutes.
   - Total daily work limit is 8 hours.
   - If a lead has a 'preferredVisitDate', prioritize that date.
4. **Tone**: Professional, efficiency-focused, slightly strict but helpful.
5. **Context**: You know the geography of Colombo (Colombo 1-15, Suburbs).

When the user provides an image:
- Analyze it for cabinet requirements.
- If it's a site photo, suggest logging it to the specific lead.
`;

// --- TOOL DEFINITIONS ---

const proposeLeadTool: FunctionDeclaration = {
  name: 'propose_lead',
  description: 'Propose creating a new customer lead. Returns a widget for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING },
      whatsappNumber: { type: Type.STRING },
      addressLabel: { type: Type.STRING },
      initialNote: { type: Type.STRING, description: "Any details from chat to save as a note" }
    },
    required: ['customerName', 'addressLabel']
  }
};

const proposeInvoiceTool: FunctionDeclaration = {
  name: 'propose_invoice',
  description: 'Propose generating a Visit Charge Invoice. Returns a widget for user confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      leadId: { type: Type.STRING },
      amount: { type: Type.NUMBER, description: "Default is 2500 LKR" },
      description: { type: Type.STRING }
    },
    required: ['leadId', 'amount']
  }
};

const proposeStatusUpdateTool: FunctionDeclaration = {
  name: 'propose_status_update',
  description: 'Propose changing the status of a lead (e.g., mark as paid, lost, etc).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      leadId: { type: Type.STRING },
      newStatus: { type: Type.STRING, enum: ['invoice_sent', 'paid', 'visit_scheduled', 'measured', 'won', 'lost'] },
      reason: { type: Type.STRING }
    },
    required: ['leadId', 'newStatus']
  }
};

// --- SERVICES ---

export const analyzeRoutes = async (leads: Lead[]) => {
  if (leads.length === 0) return "No leads to analyze.";

  const leadsData = leads.map(l => ({
    name: l.customerName,
    id: l.id,
    address: l.addressLabel,
    lat: l.location.lat,
    lng: l.location.lng,
    preferredDate: l.preferredVisitDate || 'Any'
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        Plan a day route for Colombo.
        Assumptions: 
        - Start point: Colombo Fort (6.9319, 79.8478).
        - Speed: 20 km/h.
        - Service time per stop: 20 mins.
        - Max day: 8 hours (480 mins).
        
        Leads: ${JSON.stringify(leadsData)}

        Task:
        1. Group leads by their Preferred Date if set. If 'Any', fit them into the most efficient route.
        2. Calculate available free slots (time windows) in the route for new ad-hoc visits.

        Output JSON:
        {
          "route": [
             { "leadId": "...", "travelTimeMins": 15, "serviceTimeMins": 20, "arrivalTime": "09:00", "date": "YYYY-MM-DD" }
          ],
          "availableSlots": [
             { "startTime": "11:00", "endTime": "13:00", "location": "Near Kollupitiya" }
          ],
          "totalTimeMins": 120,
          "isFeasible": true,
          "summary": "Short text summary"
        }
      `,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    return response.text;
  } catch (error) {
    console.error("Route Analysis Failed:", error);
    return null;
  }
};

// Main Chat Function
export const chatWithBoss = async (
  history: {role: string, parts: {text?: string, inlineData?: any, functionCall?: any, functionResponse?: any}[]}[], 
  newMessage: string, 
  imagePart: string | null, // base64
  currentLeads: Lead[]
) => {
  
  const leadContext = currentLeads.map(l => 
    `ID: ${l.id} | Name: ${l.customerName} | Status: ${l.status} | Addr: ${l.addressLabel} | PrefDate: ${l.preferredVisitDate || 'None'}`
  ).join('\n');

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `${BOSS_SYSTEM_INSTRUCTION}\n\nCURRENT DB STATE:\n${leadContext}`,
        tools: [{ functionDeclarations: [proposeLeadTool, proposeInvoiceTool, proposeStatusUpdateTool] }],
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const parts: any[] = [{ text: newMessage }];
    if (imagePart) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: imagePart } });
    }

    const result = await chat.sendMessage({ message: { parts } });
    return result; 

  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const geocodeAddress = async (address: string): Promise<{lat: number, lng: number, formatted: string} | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Geocode this Colombo/Sri Lanka address: "${address}". 
      Return JSON: { "lat": number, "lng": number, "formatted": string }.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return null;
  }
}

export const draftWhatsAppMessage = async (lead: Lead, type: 'invoice' | 'schedule' | 'followup') => {
    const prompt = `Draft a whatsapp message for ${type} for customer ${lead.customerName}.`;
    const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    return res.text;
}

export const identifyImage = async (base64Data: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: "Analyze this image for a kitchen cabinet or interior design project. Identify key elements, colors, materials, and any potential measurements or constraints visible." }
        ]
      }
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Image analysis failed", error);
    return "Analysis failed.";
  }
}