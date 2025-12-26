# Cabinex Operations App - Concept & Architecture

## 1. Overview
Cabinex is an end-to-end mobile-first web application designed for a Cabinet Design Business in Colombo, Sri Lanka. It streamlines the chaotic process of managing leads, scheduling measurements, designing cabinets, and collecting payments.

**Core Philosophy:** "Efficiency through AI & Location Intelligence."

## 2. Key Modules

### A. Lead Management (The Pipeline)
*   **Intake:** Capture customer details, WhatsApp numbers, and GPS locations (via Geocoding or Manual Pin).
*   **Tracking:** Status flow from `New` -> `Invoice Sent` -> `Paid` -> `Measured` -> `Won/Lost`.
*   **Site Data:** Upload site photos directly to Firebase Storage.

### B. AI Design Studio (Gemini)
*   **Visual Intelligence:** Users upload a rough pencil sketch or a site photo.
*   **Generative AI:** The app uses `Gemini 2.5 Flash Image` to convert sketches into photorealistic renders based on text prompts (e.g., "Modern teak finish with marble top").
*   **Gallery:** Generated designs are saved to the customer's profile for easy sharing via WhatsApp.

### C. Route Optimizer (The Cost Saver)
*   **Problem:** Fuel is expensive. Visiting one customer at a time is wasteful.
*   **Solution:** The app analyzes "Paid" customers waiting for measurements.
*   **AI Logic:** Gemini acts as a logistics planner. It groups customers by GPS proximity and Preferred Date to create a cohesive daily route, minimizing travel time in Colombo traffic.

### D. The "AI Boss" (Chat Assistant)
*   **Persona:** A strict but helpful Shop Manager.
*   **Functionality:**
    *   **Drafting:** writes professional WhatsApp messages for invoices and scheduling.
    *   **Oversight:** Analyzes leads and suggests next steps.
    *   **Data Entry:** Users can chat naturally ("Add new lead John at ...") and the AI executes database tools.

## 3. Technical Architecture

### Frontend
*   **Framework:** React 18 (via ES Modules).
*   **Styling:** Tailwind CSS.
*   **Icons:** Lucide React.
*   **Map:** Google Maps Embed API.

### Backend (Serverless)
*   **Database:** Firebase Firestore (Real-time NoSQL).
*   **Storage:** Firebase Storage (Images/Renders).
*   **AI Engine:** Google Gemini API (Multimodal: Text, Images, Function Calling).

### Data Flow
1.  **User Action:** User inputs data or asks Chatbot.
2.  **State:** React updates local state.
3.  **Persistence:** `store.ts` syncs directly with Firestore `leads` collection.
4.  **AI Layer:** `geminiService.ts` handles image generation and logic, returning JSON or text to update the UI.
5.  **External:** WhatsApp Deep Links are used to communicate with customers.

## 4. User Journey Example
1.  **Lead Entry:** Shop owner adds "Mr. Perera" with a rough location "Nugegoda".
2.  **Invoicing:** AI drafts a Visit Charge invoice message; Owner sends via WhatsApp.
3.  **Payment:** Mr. Perera pays. Owner marks lead as "Paid".
4.  **Design:** Owner uploads a sketch. AI generates a 3D-style render.
5.  **Routing:** On Friday morning, Owner clicks "Plan Route". AI groups Mr. Perera with 2 other leads in Nugegoda/Maharagama.
6.  **Visit:** Measurement team visits all 3 in one trip.