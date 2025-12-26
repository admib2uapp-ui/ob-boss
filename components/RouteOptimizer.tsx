import React, { useEffect, useState } from 'react';
import { store } from '../services/store';
import { Lead } from '../types';
import { analyzeRoutes } from '../services/geminiService';
import { Map, RefreshCw, Navigation, Share2, Clock, Calendar, ChevronRight } from 'lucide-react';

export const RouteOptimizer: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return store.subscribe(l => setLeads(l.filter(x => x.status === 'paid' || x.status === 'invoice_sent')));
  }, []);

  const runOptimization = async () => {
    setLoading(true);
    const result = await analyzeRoutes(leads);
    if (result) {
      try {
        const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || [null, result];
        const parsed = JSON.parse(jsonMatch[1] || result);
        setAnalysis(parsed);
      } catch (e) {
        setAnalysis({ efficiencyTips: result });
      }
    }
    setLoading(false);
  };

  const shareRouteOnWhatsApp = (route: any) => {
    // Basic construction for demo
    const message = `*Daily Route Plan*\n\n` + 
      route.route.map((r:any) => `- ${r.arrivalTime}: Stop (20mins)`).join('\n') +
      `\n\nTotal Time: ${route.totalTimeMins} mins`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 bg-gray-50 dark:bg-slate-900 min-h-screen transition-colors duration-200">
       <div className="flex justify-between items-end mb-6">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Route Planner</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Colombo Operations</p>
        </div>
        <button 
          onClick={runOptimization}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform disabled:opacity-70"
        >
          {loading ? <RefreshCw className="animate-spin" size={20} /> : <Navigation size={20} />}
        </button>
      </div>

      {!analysis && !loading && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl text-center border border-gray-200 dark:border-slate-700">
           <div className="flex justify-center space-x-4 text-gray-300 dark:text-gray-600 mb-4">
              <Map size={32} />
              <Clock size={32} />
           </div>
           <p className="text-gray-600 dark:text-gray-300 font-medium">Daily Logic:</p>
           <ul className="text-sm text-gray-500 dark:text-gray-400 mt-2 space-y-1">
             <li>• Max 8 hours/day</li>
             <li>• 20 mins per measurement</li>
             <li>• 20 km/h traffic speed</li>
             <li>• Prioritizes "Preferred Dates"</li>
           </ul>
        </div>
      )}

      {analysis && analysis.route && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* Calendar Slot Visualization */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Calendar size={18} className="mr-2" />
              Day Schedule Usage
            </h3>
            
            <div className="relative h-8 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden flex mb-2">
              {/* Render segments */}
              {analysis.route.map((stop: any, i: number) => (
                <div 
                  key={i}
                  style={{ width: `${(stop.serviceTimeMins / 480) * 100}%` }} 
                  className="bg-green-500 h-full border-r border-white dark:border-slate-800"
                  title="Measurement (20m)"
                />
              ))}
              {/* Travel time padding (simplified visual) */}
              <div 
                 style={{ width: `${((analysis.totalTimeMins - (analysis.route.length * 20)) / 480) * 100}%` }}
                 className="bg-blue-300 dark:bg-blue-700 h-full"
                 title="Travel Time"
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>08:00 AM</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {Math.floor(analysis.totalTimeMins / 60)}h {analysis.totalTimeMins % 60}m Used
              </span>
              <span>04:00 PM</span>
            </div>
          </div>

          {/* Route List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
             <div className="bg-gray-50 dark:bg-slate-700 p-3 border-b border-gray-100 dark:border-slate-600 font-bold text-sm text-gray-900 dark:text-white">
               Proposed Sequence
             </div>
             <div className="p-3 space-y-3">
               {analysis.route.map((stop: any, idx: number) => {
                 const l = leads.find(lead => lead.id === stop.leadId);
                 return (
                   <div key={idx} className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                     <div className="w-12 text-gray-400 dark:text-gray-500 font-mono text-xs text-right mr-3">{stop.arrivalTime}</div>
                     <div className="flex-1">
                       <p className="font-bold">{l?.customerName || 'Unknown'}</p>
                       <p className="text-xs text-gray-500 dark:text-gray-400">{l?.addressLabel}</p>
                       {stop.date && <p className="text-[10px] text-indigo-500">Scheduled: {stop.date}</p>}
                     </div>
                     <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">20m</span>
                   </div>
                 );
               })}
             </div>
             <button 
               onClick={() => shareRouteOnWhatsApp(analysis)}
               className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center transition-colors"
             >
               <Share2 size={16} className="mr-2" /> Send to Driver (WhatsApp)
             </button>
          </div>

          {/* Available Slots Suggestion */}
          {analysis.availableSlots && analysis.availableSlots.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
               <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm mb-3">AI Suggested Free Slots</h4>
               <div className="space-y-2">
                 {analysis.availableSlots.map((slot: any, i: number) => (
                   <div key={i} className="bg-white dark:bg-slate-800 border border-amber-100 dark:border-slate-700 p-2 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{slot.startTime} - {slot.endTime}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Near: {slot.location}</div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};