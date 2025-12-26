import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { store } from '../services/store';
import { Lead } from '../types';
import { draftWhatsAppMessage, identifyImage } from '../services/geminiService';
import { ArrowLeft, MessageCircle, FileText, CheckCircle, Upload, Camera, Calendar } from 'lucide-react';

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | undefined>(store.getLeads().find(l => l.id === id));
  const [drafting, setDrafting] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState('');
  const [prefDate, setPrefDate] = useState(lead?.preferredVisitDate || '');

  useEffect(() => {
    const unsub = store.subscribe((leads) => {
      setLead(leads.find(l => l.id === id));
    });
    return unsub;
  }, [id]);

  if (!lead) return <div className="p-4 text-center dark:text-white">Loading...</div>;

  const handleStatusChange = (status: Lead['status']) => {
    store.updateLead(lead.id, { status });
  };

  const savePrefDate = () => {
    if (prefDate) {
      store.updateLead(lead.id, { preferredVisitDate: prefDate });
    }
  };

  const generateDraft = async (type: 'invoice' | 'schedule' | 'followup') => {
    setDrafting(type);
    setDraftContent('Generating draft with Gemini...');
    const text = await draftWhatsAppMessage(lead, type);
    setDraftContent(text);
  };

  const sendWhatsApp = () => {
    const url = `https://wa.me/${lead.whatsappNumber}?text=${encodeURIComponent(draftContent)}`;
    window.open(url, '_blank');
    setDrafting(null);
    if (drafting === 'invoice') handleStatusChange('invoice_sent');
    if (drafting === 'schedule') handleStatusChange('visit_scheduled');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingImage(true);
    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const analysis = await identifyImage(base64);
      setImageAnalysis(analysis);
      setAnalyzingImage(false);
      // Save image to lead (mock)
      store.updateLead(lead.id, { initialImages: [...(lead.initialImages || []), reader.result as string] });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pb-24 transition-colors duration-200">
      <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center z-10">
        <button onClick={() => navigate(-1)} className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-white">{lead.customerName}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{lead.status.toUpperCase()}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => generateDraft('invoice')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-colors ${
              lead.status === 'new' 
                ? 'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200' 
                : 'border-gray-100 bg-gray-50 text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-500'
            }`}
          >
            <FileText size={24} />
            <span className="text-xs font-semibold">Send Invoice</span>
          </button>
          
          <button 
            onClick={() => store.updateLead(lead.id, { status: 'paid' })}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 transition-colors ${
              lead.status === 'invoice_sent' 
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200' 
                : 'border-gray-100 bg-gray-50 text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-500'
            }`}
          >
            <CheckCircle size={24} />
            <span className="text-xs font-semibold">Mark Paid</span>
          </button>
        </div>

        {/* Visit Preference Logic (Shown if Paid) */}
        {(lead.status === 'paid' || lead.status === 'visit_scheduled') && (
           <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-4">
             <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200 mb-2 flex items-center">
               <Calendar size={16} className="mr-2" /> 
               Visit Scheduling
             </h3>
             <p className="text-xs text-purple-800 dark:text-purple-300 mb-3">
               Select the customer's preferred date. The Route Optimizer will use this to group visits.
             </p>
             <div className="flex space-x-2">
               <input 
                 type="date" 
                 value={prefDate}
                 onChange={(e) => setPrefDate(e.target.value)}
                 className="flex-1 border border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
               />
               <button 
                 onClick={savePrefDate}
                 className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold shadow-md"
               >
                 Save
               </button>
             </div>
           </div>
        )}

        {/* Gemini Drafter */}
        {drafting && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-blue-900 dark:text-blue-200 font-bold text-sm mb-2 flex items-center">
              <MessageCircle size={16} className="mr-2" />
              AI Drafted Message
            </h3>
            <textarea 
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full p-3 text-sm rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white mb-3 h-32 focus:ring-blue-500"
            />
            <div className="flex space-x-2">
              <button onClick={() => setDrafting(null)} className="flex-1 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg">Cancel</button>
              <button onClick={sendWhatsApp} className="flex-1 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg">Open WhatsApp</button>
            </div>
          </div>
        )}

        {/* Site Details & Upload */}
        <section>
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">Site Details</h3>
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
             <div className="flex items-center justify-between mb-4">
               <span className="text-sm text-gray-600 dark:text-gray-400">Reference Photos</span>
               <label className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 shadow-sm px-3 py-1.5 rounded-lg text-xs font-medium flex items-center cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                 <Camera size={14} className="mr-1.5" />
                 Add Photo
                 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
               </label>
             </div>
             
             {analyzingImage && <div className="text-xs text-blue-600 dark:text-blue-400 animate-pulse mb-2">Gemini is analyzing the photo...</div>}
             {imageAnalysis && (
               <div className="bg-white dark:bg-slate-900 p-3 rounded-lg text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 mb-3">
                 <strong>AI Analysis:</strong> {imageAnalysis}
               </div>
             )}

             <div className="grid grid-cols-3 gap-2">
               {lead.initialImages?.map((img, i) => (
                 <img key={i} src={img} alt="site" className="w-full h-24 object-cover rounded-lg bg-gray-200 dark:bg-slate-700" />
               ))}
               {(!lead.initialImages || lead.initialImages.length === 0) && (
                 <div className="col-span-3 text-center py-6 text-gray-400 dark:text-gray-500 text-xs italic">No photos uploaded yet</div>
               )}
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};