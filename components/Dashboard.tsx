import React, { useEffect, useState, useRef } from 'react';
import { store } from '../services/store';
import { Lead } from '../types';
import { chatWithBoss, geocodeAddress } from '../services/geminiService';
import { Send, Bot, X, Edit2, Share2, DollarSign, Camera, Check, Plus, Users, Map as MapIcon, RefreshCw, MapPin, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatItem {
  id: string;
  role: 'user' | 'model';
  text?: string;
  image?: string;
  toolCall?: any; 
  toolResponse?: string;
}

export const Dashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Ayubowan! I'm the Shop Manager. Upload site photos or tell me about new leads in Colombo.",
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return store.subscribe(setLeads);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, selectedImage]);

  // --- HANDLERS ---

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if ((!textToSend.trim() && !selectedImage) || isProcessing) return;

    const userMsg: ChatItem = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      image: selectedImage || undefined
    };

    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    const imgToSend = selectedImage ? selectedImage.split(',')[1] : null; 
    setSelectedImage(null);
    setIsProcessing(true);

    try {
      const apiHistory = [];
      for (const h of chatHistory) {
        if (h.role === 'user') {
          const parts: any[] = [];
          if (h.text) parts.push({ text: h.text });
          if (h.image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: h.image.split(',')[1] } });
          if (h.toolResponse && h.toolCall) {
            parts.push({ 
              functionResponse: { name: h.toolCall.name, response: { result: h.toolResponse } } 
            });
          }
          apiHistory.push({ role: 'user', parts });
        } else {
           const parts: any[] = [];
           if (h.text) parts.push({ text: h.text });
           if (h.toolCall) parts.push({ functionCall: h.toolCall });
           apiHistory.push({ role: 'model', parts });
        }
      }

      const result = await chatWithBoss(apiHistory, userMsg.text || "Analyze this image", imgToSend, leads);
      
      const content = result.candidates?.[0]?.content;
      const functionCalls = content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);
      const textResponse = content?.parts?.filter(p => p.text).map(p => p.text).join('') || '';

      if (functionCalls && functionCalls.length > 0) {
        const toolMsg: ChatItem = {
          id: Date.now().toString() + '_tool',
          role: 'model',
          text: textResponse, 
          toolCall: functionCalls[0] 
        };
        setChatHistory(prev => [...prev, toolMsg]);
      } else {
        setChatHistory(prev => [...prev, {
          id: Date.now().toString() + '_resp',
          role: 'model',
          text: textResponse || "I didn't understand that."
        }]);
      }

    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { id: Date.now() + 'err', role: 'model', text: "Connection error. Please try again." }]);
    }
    setIsProcessing(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- WIDGET ACTIONS ---

  const confirmToolAction = async (msgId: string, toolCall: any, modifiedData?: any) => {
    const args = modifiedData || toolCall.args;
    let successMsg = "Action Completed.";

    if (toolCall.name === 'propose_lead') {
      // Use the location from modifiedData if available (from map preview), otherwise geocode
      let geo = args.location;
      if (!geo) {
         geo = await geocodeAddress(args.addressLabel);
      }
      
      store.addLead({
        id: `l-${Date.now()}`,
        customerName: args.customerName,
        whatsappNumber: args.whatsappNumber || '',
        addressLabel: args.addressLabel,
        location: geo || { lat: 6.9271, lng: 79.8612 },
        status: 'new',
        createdAt: new Date().toISOString(),
        notes: args.initialNote ? [{ id: 'n1', text: args.initialNote, author: 'chat', createdAt: new Date().toISOString() }] : [],
        visits: []
      });
      successMsg = `Lead ${args.customerName} created successfully.`;
    }

    if (toolCall.name === 'propose_lead_update') {
      const updates: any = {};
      if (args.customerName) updates.customerName = args.customerName;
      if (args.whatsappNumber) updates.whatsappNumber = args.whatsappNumber;
      if (args.addressLabel) {
         updates.addressLabel = args.addressLabel;
         // Check if widget already geocoded it
         if (args.location) {
            updates.location = args.location;
         } else {
            const geo = await geocodeAddress(args.addressLabel);
            if (geo) updates.location = { lat: geo.lat, lng: geo.lng };
         }
      }
      store.updateLead(args.leadId, updates);
      if (args.noteToAdd) {
        store.addNote(args.leadId, args.noteToAdd);
      }
      successMsg = `Updated lead details successfully.`;
    }

    if (toolCall.name === 'propose_invoice') {
      const lead = store.getLeadById(args.leadId);
      if (lead) {
        store.updateLead(lead.id, { 
          visitChargeInvoice: { amount: args.amount, paid: false },
          status: 'invoice_sent' 
        });
        successMsg = `Invoice for LKR ${args.amount} attached to ${lead.customerName}.`;
      }
    }

    if (toolCall.name === 'propose_status_update') {
      store.updateLead(args.leadId, { status: args.newStatus });
      successMsg = `Status updated to ${args.newStatus}.`;
    }

    const responseMsg: ChatItem = {
      id: Date.now().toString() + '_tool_resp',
      role: 'user',
      text: "Action confirmed.",
      toolCall: toolCall, 
      toolResponse: successMsg
    };

    setChatHistory(prev => [...prev, responseMsg]);
  };

  const cancelToolAction = (toolCall: any) => {
    const responseMsg: ChatItem = {
      id: Date.now().toString() + '_tool_cancel',
      role: 'user',
      text: "Action cancelled.",
      toolCall: toolCall,
      toolResponse: "User cancelled the action."
    };
    setChatHistory(prev => [...prev, responseMsg]);
  };

  // --- RENDERERS ---

  const renderToolWidget = (msg: ChatItem) => {
    const isHandled = chatHistory.some(h => h.toolCall === msg.toolCall && h.role === 'user' && h.id !== msg.id);

    if (isHandled) {
      return (
         <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-lg text-xs text-gray-500 dark:text-gray-400 italic mt-2 border border-gray-200 dark:border-slate-700">
           Widget Action Completed.
         </div>
      );
    }

    const { name, args } = msg.toolCall;

    if (name === 'propose_lead') {
      return <LeadDraftWidget args={args} onConfirm={(d) => confirmToolAction(msg.id, msg.toolCall, d)} onCancel={() => cancelToolAction(msg.toolCall)} />;
    }
    if (name === 'propose_lead_update') {
      return <LeadUpdateWidget args={args} onConfirm={(d) => confirmToolAction(msg.id, msg.toolCall, d)} onCancel={() => cancelToolAction(msg.toolCall)} />;
    }
    if (name === 'propose_invoice') {
       return <InvoiceDraftWidget args={args} leads={leads} onConfirm={(d) => confirmToolAction(msg.id, msg.toolCall, d)} onCancel={() => cancelToolAction(msg.toolCall)} />;
    }
    if (name === 'propose_status_update') {
      const lead = leads.find(l => l.id === args.leadId);
      return (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mt-2 shadow-sm">
          <h4 className="font-bold text-orange-800 dark:text-orange-300 text-sm mb-2">Update Status?</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Change <strong>{lead?.customerName}</strong> to <span className="font-mono bg-white dark:bg-slate-700 px-1 rounded">{args.newStatus}</span>?
          </p>
          <div className="flex space-x-2">
            <button onClick={() => cancelToolAction(msg.toolCall)} className="flex-1 py-2 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs text-gray-700 dark:text-gray-300">Cancel</button>
            <button onClick={() => confirmToolAction(msg.id, msg.toolCall)} className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold">Confirm</button>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleQuickButton = (text: string) => {
    setInput(text);
    // Focus input? 
    const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
    if(inputEl) inputEl.focus();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 max-w-2xl mx-auto shadow-xl transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
         <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-full text-white mr-3 shadow-lg shadow-blue-500/30">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white leading-tight">Cabinex Boss</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Colombo Operations • Online</p>
            </div>
         </div>
         <div className="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-gray-500 dark:text-gray-300">
           {leads.length} Leads
         </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {(msg.text || msg.image) && (
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bl-none'
              }`}>
                {msg.image && (
                   <img src={msg.image} alt="upload" className="w-full h-32 object-cover rounded-lg mb-2" />
                )}
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            )}
            {msg.toolCall && msg.role === 'model' && (
              <div className="w-full max-w-[90%] mt-2">
                {renderToolWidget(msg)}
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center space-x-2 text-gray-400 text-xs ml-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
          </div>
        )}
      </div>

      {/* Quick Buttons */}
      <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 pt-2">
        <div className="flex space-x-2 overflow-x-auto pb-2 px-4 no-scrollbar">
          <button onClick={() => handleQuickButton("Add new lead: [Name], [Phone], [Address]")} className="flex-shrink-0 flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40">
            <Plus size={12} className="mr-1" /> New Lead
          </button>
          <button onClick={() => navigate('/leads')} className="flex-shrink-0 flex items-center bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-600">
            <Users size={12} className="mr-1" /> My Leads
          </button>
          <button onClick={() => handleQuickButton("Update customer [Name]: Change address to...")} className="flex-shrink-0 flex items-center bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 px-3 py-1.5 rounded-full text-xs font-medium border border-orange-100 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40">
            <Edit2 size={12} className="mr-1" /> Edit Lead
          </button>
          <button onClick={() => handleQuickButton("Optimize route for paid leads today.")} className="flex-shrink-0 flex items-center bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-3 py-1.5 rounded-full text-xs font-medium border border-purple-100 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40">
            <MapIcon size={12} className="mr-1" /> Plan Route
          </button>
        </div>

        {/* Input Area */}
        <div className="p-3">
          {selectedImage && (
            <div className="flex items-center bg-gray-100 dark:bg-slate-700 p-2 rounded-lg mb-2 w-max">
              <img src={selectedImage} className="w-8 h-8 rounded object-cover mr-2" />
              <span className="text-xs text-gray-500 dark:text-gray-300">Image attached</span>
              <button onClick={() => setSelectedImage(null)} className="ml-2 text-gray-400 hover:text-red-500"><X size={14} /></button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <label className="p-2 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors">
              <Camera size={22} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type message..."
              className="flex-1 bg-gray-100 dark:bg-slate-700 dark:text-white border-0 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400"
            />
            <button 
              onClick={() => handleSend()}
              disabled={(!input && !selectedImage) || isProcessing}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-600/20"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-WIDGET COMPONENTS ---

const LeadDraftWidget = ({ args, onConfirm, onCancel }: { args: any, onConfirm: (d: any) => void, onCancel: () => void }) => {
  const [data, setData] = useState(args);
  const [editing, setEditing] = useState(false);
  const [geoLoc, setGeoLoc] = useState<{lat: number, lng: number} | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);

  // Initial Geocode to show map preview
  useEffect(() => {
    const fetchGeo = async () => {
       setLoadingMap(true);
       const geo = await geocodeAddress(data.addressLabel);
       if (geo) setGeoLoc({ lat: geo.lat, lng: geo.lng });
       setLoadingMap(false);
    };
    fetchGeo();
  }, []); // Run once on mount based on initial args

  const handleReSearch = async () => {
    setLoadingMap(true);
    const geo = await geocodeAddress(data.addressLabel);
    if (geo) {
        setGeoLoc({ lat: geo.lat, lng: geo.lng });
        // Update data so when we confirm, it has the new address/loc
        setData({ ...data, addressLabel: geo.formatted, location: { lat: geo.lat, lng: geo.lng } });
    }
    setLoadingMap(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-md overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="bg-blue-50 dark:bg-slate-700 p-3 border-b border-blue-100 dark:border-slate-600 flex justify-between items-center">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm flex items-center">
           <Edit2 size={14} className="mr-2" /> Draft Lead
        </h3>
        <button onClick={() => setEditing(!editing)} className="text-xs text-blue-600 dark:text-blue-300 underline">
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      
      <div className="p-4 space-y-3 text-sm">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</label>
          {editing ? (
             <input className="w-full bg-gray-50 dark:bg-slate-900 border dark:border-slate-600 rounded p-1.5 mt-1 text-gray-900 dark:text-white" value={data.customerName} onChange={e => setData({...data, customerName: e.target.value})} />
          ) : (
             <p className="font-medium text-gray-900 dark:text-white">{data.customerName}</p>
          )}
        </div>

        {/* Address & Map */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Address / Location</label>
          {editing ? (
             <div className="flex mt-1">
                 <input 
                    className="flex-1 bg-gray-50 dark:bg-slate-900 border dark:border-slate-600 rounded-l p-1.5 text-gray-900 dark:text-white text-xs" 
                    value={data.addressLabel} 
                    onChange={e => setData({...data, addressLabel: e.target.value})} 
                 />
                 <button onClick={handleReSearch} className="bg-blue-600 text-white px-2 rounded-r flex items-center justify-center">
                    <Search size={12} />
                 </button>
             </div>
          ) : (
             <p className="text-gray-700 dark:text-gray-300">{data.addressLabel}</p>
          )}

          {/* Map Preview */}
          <div className="mt-2 h-32 w-full bg-gray-100 dark:bg-slate-900 rounded-lg overflow-hidden relative border border-gray-200 dark:border-slate-700">
             {loadingMap && (
                 <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10">
                     <Loader2 className="animate-spin text-blue-600" size={20} />
                 </div>
             )}
             {geoLoc ? (
                 <iframe
                   width="100%"
                   height="100%"
                   frameBorder="0"
                   scrolling="no"
                   marginHeight={0}
                   marginWidth={0}
                   src={`https://maps.google.com/maps?q=${geoLoc.lat},${geoLoc.lng}&z=14&output=embed`}
                   className="opacity-90"
                 />
             ) : (
                 <div className="flex items-center justify-center h-full text-xs text-gray-400">Map unavailable</div>
             )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-slate-700 p-3 flex space-x-2">
        <button onClick={onCancel} className="flex-1 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs font-medium">Cancel</button>
        {/* Pass geoLoc up if available so we don't re-geocode on confirm */}
        <button onClick={() => onConfirm({...data, location: geoLoc})} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex justify-center items-center shadow-lg shadow-blue-600/30">
          <Check size={14} className="mr-1" /> Create Lead
        </button>
      </div>
    </div>
  );
};

const LeadUpdateWidget = ({ args, onConfirm, onCancel }: { args: any, onConfirm: (d: any) => void, onCancel: () => void }) => {
    const [data, setData] = useState(args);
    return (
      <div className="bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-800 rounded-xl shadow-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-orange-50 dark:bg-orange-900/30 p-3 border-b border-orange-100 dark:border-orange-800">
          <h3 className="font-bold text-orange-900 dark:text-orange-200 text-sm flex items-center">
             <RefreshCw size={14} className="mr-2" /> Update Lead
          </h3>
        </div>
        <div className="p-4 space-y-3 text-sm">
           {data.customerName && <div className="text-gray-700 dark:text-gray-300"><span className="font-bold">Name:</span> {data.customerName}</div>}
           {data.whatsappNumber && <div className="text-gray-700 dark:text-gray-300"><span className="font-bold">WhatsApp:</span> {data.whatsappNumber}</div>}
           {data.addressLabel && <div className="text-gray-700 dark:text-gray-300"><span className="font-bold">Address:</span> {data.addressLabel}</div>}
           {data.noteToAdd && <div className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-900 p-2 rounded italic">"{data.noteToAdd}"</div>}
        </div>
        <div className="bg-gray-50 dark:bg-slate-700 p-3 flex space-x-2">
          <button onClick={onCancel} className="flex-1 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs font-medium">Cancel</button>
          <button onClick={() => onConfirm(data)} className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-600/30">
            Confirm Update
          </button>
        </div>
      </div>
    );
};

const InvoiceDraftWidget = ({ args, leads, onConfirm, onCancel }: { args: any, leads: Lead[], onConfirm: (d: any) => void, onCancel: () => void }) => {
  const lead = leads.find(l => l.id === args.leadId);
  if (!lead) return <div className="text-red-500 text-xs">Lead not found</div>;

  const whatsappLink = `https://wa.me/${lead.whatsappNumber}?text=${encodeURIComponent(`Hello ${lead.customerName}, please find the visit charge invoice for LKR ${args.amount}. Details: ${args.description || 'Consultation & Measurement'}`)}`;

  return (
    <div className="bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 rounded-xl shadow-md overflow-hidden mt-2">
      <div className="bg-green-50 dark:bg-green-900/30 p-3 border-b border-green-100 dark:border-green-800">
        <h3 className="font-bold text-green-900 dark:text-green-300 text-sm flex items-center">
           <DollarSign size={14} className="mr-2" /> Invoice Draft
        </h3>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{lead.customerName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Visit Charge</p>
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">LKR {args.amount}</p>
        </div>
        
        <a 
          href={whatsappLink} 
          target="_blank" 
          rel="noreferrer"
          className="w-full flex items-center justify-center p-2 mb-3 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-lg text-xs font-bold"
        >
          <Share2 size={14} className="mr-2" /> Preview WhatsApp Link
        </a>

        <div className="flex space-x-2">
           <button onClick={onCancel} className="flex-1 py-2 border dark:border-slate-600 dark:text-gray-300 rounded-lg text-xs">Cancel</button>
           <button onClick={() => onConfirm(args)} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-green-600/30">
             Confirm & Save
           </button>
        </div>
      </div>
    </div>
  );
};