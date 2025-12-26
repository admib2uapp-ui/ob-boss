import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { store } from '../services/store';
import { Lead } from '../types';
import { draftWhatsAppMessage, identifyImage, generateDesignRender, geocodeAddress } from '../services/geminiService';
import { ArrowLeft, MessageCircle, FileText, CheckCircle, Upload, Camera, Calendar, Phone, MapPin, PenTool, Sparkles, X, Save, Search, AlertCircle, ChevronRight } from 'lucide-react';

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | undefined>(store.getLeads().find(l => l.id === id));
  
  // Feature States
  const [drafting, setDrafting] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState('');
  
  const [prefDate, setPrefDate] = useState(lead?.preferredVisitDate || '');

  // Design Studio State
  const [showDesignStudio, setShowDesignStudio] = useState(false);
  const [sketch, setSketch] = useState<string | null>(null);
  const [designPrompt, setDesignPrompt] = useState('Modern minimal kitchen, teak wood finish, marble countertop');
  const [isRendering, setIsRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState<string | null>(null);

  // Map Edit State
  const [isEditingMap, setIsEditingMap] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editLocation, setEditLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const unsub = store.subscribe((leads) => {
      const l = leads.find(l => l.id === id);
      setLead(l);
      if (l && !editLocation) {
         setEditLocation(l.location);
         setEditAddress(l.addressLabel);
      }
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
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const analysis = await identifyImage(base64);
      setImageAnalysis(analysis);
      setAnalyzingImage(false);
      store.updateLead(lead.id, { initialImages: [...(lead.initialImages || []), reader.result as string] });
    };
    reader.readAsDataURL(file);
  };

  // --- Design Studio Handlers ---

  const handleSketchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onloadend = () => setSketch(reader.result as string);
       reader.readAsDataURL(file);
     }
  };

  const handleGenerateRender = async () => {
    if (!sketch) return;
    setIsRendering(true);
    const base64Sketch = sketch.split(',')[1];
    const resultUrl = await generateDesignRender(base64Sketch, designPrompt);
    if (resultUrl) {
       setRenderedImage(resultUrl);
    } else {
       alert("Failed to generate render. Try again.");
    }
    setIsRendering(false);
  };

  const saveRenderToLead = () => {
    if (renderedImage && sketch) {
       const newDesign = {
          id: Date.now().toString(),
          sketchUrl: sketch,
          renderedUrl: renderedImage,
          prompt: designPrompt,
          createdAt: new Date().toISOString()
       };
       store.updateLead(lead.id, { generatedDesigns: [...(lead.generatedDesigns || []), newDesign] });
       setShowDesignStudio(false);
       setSketch(null);
       setRenderedImage(null);
    }
  };

  // --- Map Edit Handlers ---
  const handleMapSearch = async () => {
      const res = await geocodeAddress(editAddress);
      if (res) {
          setEditLocation({lat: res.lat, lng: res.lng});
          setEditAddress(res.formatted);
      }
  };
  
  const saveMapUpdate = () => {
      if (editLocation) {
          store.updateLead(lead.id, { location: editLocation, addressLabel: editAddress });
          setIsEditingMap(false);
      }
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pb-24 transition-colors duration-200">
      <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-white">{lead.customerName}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{lead.status.toUpperCase()}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Contact & Map Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden relative group">
           {/* Edit Button for Map */}
           {!isEditingMap && (
               <button 
                 onClick={() => setIsEditingMap(true)}
                 className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow text-gray-600 dark:text-gray-300 hover:text-blue-600"
               >
                  <PenTool size={14} />
               </button>
           )}

           {isEditingMap ? (
               <div className="p-4 bg-gray-50 dark:bg-slate-900">
                   <div className="flex justify-between items-center mb-3">
                       <h3 className="font-bold text-gray-900 dark:text-white text-sm">Edit Location</h3>
                       <button onClick={() => setIsEditingMap(false)}><X size={16} className="text-gray-500"/></button>
                   </div>
                   
                   <div className="flex space-x-2 mb-3">
                       <input 
                         value={editAddress} 
                         onChange={(e) => setEditAddress(e.target.value)}
                         className="flex-1 text-xs p-2 rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                         placeholder="Search address..."
                       />
                       <button onClick={handleMapSearch} className="bg-blue-600 text-white p-2 rounded"><Search size={14}/></button>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-2 mb-3">
                       <div>
                           <label className="text-[10px] text-gray-500">Latitude</label>
                           <input 
                               type="number" step="any"
                               value={editLocation?.lat}
                               onChange={(e) => setEditLocation(prev => ({...prev!, lat: parseFloat(e.target.value)}))}
                               className="w-full text-xs p-2 rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                           />
                       </div>
                       <div>
                           <label className="text-[10px] text-gray-500">Longitude</label>
                           <input 
                               type="number" step="any"
                               value={editLocation?.lng}
                               onChange={(e) => setEditLocation(prev => ({...prev!, lng: parseFloat(e.target.value)}))}
                               className="w-full text-xs p-2 rounded border dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                           />
                       </div>
                   </div>

                   <button onClick={saveMapUpdate} className="w-full bg-black dark:bg-white text-white dark:text-black py-2 rounded text-xs font-bold">
                       Save Location
                   </button>
               </div>
           ) : (
             <div className="h-48 w-full bg-gray-200 dark:bg-slate-700 relative">
               <iframe
                 width="100%"
                 height="100%"
                 frameBorder="0"
                 scrolling="no"
                 marginHeight={0}
                 marginWidth={0}
                 title="map"
                 src={`https://maps.google.com/maps?q=${lead.location.lat},${lead.location.lng}&z=15&output=embed`}
                 className="opacity-90 hover:opacity-100 transition-opacity"
               ></iframe>
               <a 
                 href={`https://www.google.com/maps/search/?api=1&query=${lead.location.lat},${lead.location.lng}`}
                 target="_blank"
                 rel="noreferrer"
                 className="absolute bottom-2 right-2 bg-white dark:bg-slate-800 text-xs px-2 py-1 rounded shadow text-blue-600 dark:text-blue-400 font-bold"
               >
                 Open in Google Maps
               </a>
             </div>
           )}
           
           {!isEditingMap && (
             <div className="p-4">
               <div className="flex items-center text-sm text-gray-800 dark:text-gray-200 mb-2">
                  <MapPin size={16} className="mr-2 text-gray-400" />
                  {lead.addressLabel}
               </div>
               <div className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                  <Phone size={16} className="mr-2 text-gray-400" />
                  {lead.whatsappNumber}
               </div>
             </div>
           )}
        </div>

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

        {/* Gemini Design Studio Button */}
        <button 
          onClick={() => setShowDesignStudio(!showDesignStudio)}
          className="w-full p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-lg flex items-center justify-between"
        >
           <div className="flex items-center">
             <Sparkles className="mr-3" />
             <div className="text-left">
               <div className="font-bold text-sm">AI Design Studio</div>
               <div className="text-[10px] opacity-80">Sketch to Render</div>
             </div>
           </div>
           <ChevronRight size={18} />
        </button>

        {/* Design Studio Panel */}
        {showDesignStudio && (
          <div className="bg-white dark:bg-slate-800 border border-violet-100 dark:border-violet-900 rounded-xl p-4 animate-in slide-in-from-top-4">
             {!renderedImage ? (
               <div className="space-y-4">
                 <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center">
                    {sketch ? (
                      <img src={sketch} alt="sketch" className="max-h-40 mx-auto rounded shadow-sm" />
                    ) : (
                      <label className="cursor-pointer block">
                         <Upload className="mx-auto text-gray-400 mb-2" />
                         <span className="text-xs text-gray-500">Upload rough sketch</span>
                         <input type="file" accept="image/*" className="hidden" onChange={handleSketchUpload} />
                      </label>
                    )}
                 </div>
                 
                 <div>
                   <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Design Prompt</label>
                   <textarea 
                     value={designPrompt}
                     onChange={(e) => setDesignPrompt(e.target.value)}
                     className="w-full mt-1 p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                     rows={3}
                   />
                 </div>

                 <button 
                   onClick={handleGenerateRender}
                   disabled={!sketch || isRendering}
                   className="w-full py-3 bg-violet-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 flex justify-center items-center"
                 >
                   {isRendering ? <Sparkles className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                   Generate Render
                 </button>
               </div>
             ) : (
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                       <div className="text-[10px] text-gray-500 mb-1">Original</div>
                       <img src={sketch!} className="w-full rounded-lg opacity-80" />
                     </div>
                     <div>
                       <div className="text-[10px] text-violet-500 mb-1 font-bold">AI Render</div>
                       <img src={renderedImage} className="w-full rounded-lg shadow-md border-2 border-violet-500" />
                     </div>
                  </div>
                  <div className="flex space-x-2">
                     <button onClick={() => setRenderedImage(null)} className="flex-1 py-2 border dark:border-slate-600 rounded-lg text-xs">Try Again</button>
                     <button onClick={saveRenderToLead} className="flex-1 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold">Save to Gallery</button>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Generated Designs Gallery */}
        {lead.generatedDesigns && lead.generatedDesigns.length > 0 && (
          <section>
             <h3 className="font-bold text-gray-900 dark:text-white mb-3">Design Concepts</h3>
             <div className="grid grid-cols-2 gap-3">
               {lead.generatedDesigns.map(design => (
                 <div key={design.id} className="relative group">
                    <img src={design.renderedUrl} className="w-full h-32 object-cover rounded-xl shadow-sm" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                       <p className="text-white text-[10px] px-2 text-center">{design.prompt}</p>
                    </div>
                 </div>
               ))}
             </div>
          </section>
        )}

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