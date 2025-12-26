import React, { useState, useEffect } from 'react';
import { store } from '../services/store';
import { Lead } from '../types';
import { geocodeAddress } from '../services/geminiService';
import { Plus, Search, MapPin, Phone, ChevronRight, Loader2, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatusBadge: React.FC<{ status: Lead['status'] }> = ({ status }) => {
  const colors = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    invoice_sent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
    visit_scheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    measured: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
    quoted: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200',
    won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    lost: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${colors[status] || colors.new}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export const LeadManagement: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLocation, setNewLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSearchingAddr, setIsSearchingAddr] = useState(false);
  
  // Manual Override State
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  useEffect(() => {
    return store.subscribe(setLeads);
  }, []);

  // Update manual inputs when geocode updates
  useEffect(() => {
    if (newLocation) {
        setManualLat(newLocation.lat.toFixed(6));
        setManualLng(newLocation.lng.toFixed(6));
    }
  }, [newLocation]);

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation) {
      alert("Please search for the address or enter coordinates to set the location first.");
      return;
    }

    const newLead: Lead = {
      id: `l-${Date.now()}`,
      customerName: newName,
      whatsappNumber: newPhone,
      location: newLocation,
      addressLabel: newAddress,
      status: 'new',
      createdAt: new Date().toISOString(),
      notes: [],
      visits: []
    };
    store.addLead(newLead);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewLocation(null);
    setShowManualCoords(false);
  };

  const handleAddressSearch = async () => {
    if (!newAddress.trim()) return;
    setIsSearchingAddr(true);
    const result = await geocodeAddress(newAddress);
    if (result) {
      setNewLocation({ lat: result.lat, lng: result.lng });
      setNewAddress(result.formatted); // Update with clean address
    } else {
      alert("Could not find address. Please try again.");
    }
    setIsSearchingAddr(false);
  };

  const handleManualCoordChange = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
        setNewLocation({ lat, lng });
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 bg-gray-50 dark:bg-slate-900 min-h-screen transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-md active:scale-95 transition-transform"
        >
          <Plus size={16} className="mr-1" /> New Lead
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-auto">
            
            {/* Left Column: Inputs */}
            <div className="p-6 md:w-1/2 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Customer</h2>
                    <button onClick={resetForm} className="md:hidden text-gray-500"><X size={24}/></button>
                </div>
                
                <form id="createLeadForm" onSubmit={handleCreateLead} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Customer Name</label>
                    <input required value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white outline-none transition-all" placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">WhatsApp Number</label>
                    <input required value={newPhone} onChange={e => setNewPhone(e.target.value)} type="tel" className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white outline-none transition-all" placeholder="9477..." />
                  </div>
                  
                  {/* Address Section */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Location / Address</label>
                    <div className="flex">
                      <input 
                        required 
                        value={newAddress} 
                        onChange={e => setNewAddress(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())}
                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-l-lg p-3 text-sm focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white outline-none transition-all" 
                        placeholder="Search address..." 
                      />
                      <button 
                        type="button" 
                        onClick={handleAddressSearch}
                        disabled={isSearchingAddr}
                        className="bg-blue-600 border border-l-0 border-blue-600 rounded-r-lg px-4 text-white hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center transition-colors"
                      >
                        {isSearchingAddr ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                      </button>
                    </div>
                    
                    {/* Manual Override Toggle */}
                    <div className="mt-2 flex justify-between items-center">
                        {newLocation ? (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center font-medium">
                                <MapPin size={12} className="mr-1" />
                                Pin set at {newLocation.lat.toFixed(4)}, {newLocation.lng.toFixed(4)}
                            </p>
                        ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                Search or enter coordinates manually.
                            </p>
                        )}
                        <button 
                          type="button" 
                          onClick={() => setShowManualCoords(!showManualCoords)}
                          className="text-xs text-blue-600 dark:text-blue-400 underline"
                        >
                          {showManualCoords ? 'Hide Coords' : 'Wrong Pin? Edit'}
                        </button>
                    </div>

                    {/* Manual Inputs */}
                    {showManualCoords && (
                        <div className="mt-2 bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                             <div className="flex space-x-2">
                                 <div>
                                     <label className="text-[10px] text-gray-500">Latitude</label>
                                     <input 
                                       type="number" 
                                       step="any"
                                       value={manualLat} 
                                       onChange={e => { setManualLat(e.target.value); handleManualCoordChange(); }}
                                       onBlur={handleManualCoordChange}
                                       className="w-full p-1 text-xs border rounded dark:bg-slate-800 dark:text-white"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-[10px] text-gray-500">Longitude</label>
                                     <input 
                                       type="number" 
                                       step="any"
                                       value={manualLng} 
                                       onChange={e => { setManualLng(e.target.value); handleManualCoordChange(); }}
                                       onBlur={handleManualCoordChange}
                                       className="w-full p-1 text-xs border rounded dark:bg-slate-800 dark:text-white"
                                     />
                                 </div>
                             </div>
                             <p className="text-[10px] text-gray-400 mt-1 flex items-center"><AlertCircle size={10} className="mr-1"/> Adjusting these moves the map pin.</p>
                        </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button type="button" onClick={resetForm} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                <button 
                  type="submit" 
                  form="createLeadForm"
                  disabled={!newLocation}
                  className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg"
                >
                  Save Lead
                </button>
              </div>
            </div>

            {/* Right Column: Map Preview */}
            <div className="hidden md:block md:w-1/2 bg-gray-100 dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 relative">
               {newLocation ? (
                   <>
                       <iframe
                         width="100%"
                         height="100%"
                         frameBorder="0"
                         scrolling="no"
                         marginHeight={0}
                         marginWidth={0}
                         src={`https://maps.google.com/maps?q=${newLocation.lat},${newLocation.lng}&z=17&output=embed`}
                         className="absolute inset-0 w-full h-full opacity-100"
                       />
                       {/* Visual Crosshair for context if needed, though embed has a pin */}
                   </>
               ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-slate-600">
                      <MapPin size={48} className="mb-2 opacity-50" />
                      <span className="text-sm font-medium">Map Preview</span>
                   </div>
               )}
               {newLocation && (
                   <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-lg text-xs font-bold text-gray-700 dark:text-gray-200 pointer-events-none">
                       Preview Mode
                   </div>
               )}
            </div>
            {/* Mobile Map Preview (Small strip) */}
            {newLocation && (
                <div className="md:hidden h-32 bg-gray-100 relative shrink-0">
                     <iframe
                     width="100%"
                     height="100%"
                     frameBorder="0"
                     scrolling="no"
                     marginHeight={0}
                     marginWidth={0}
                     src={`https://maps.google.com/maps?q=${newLocation.lat},${newLocation.lng}&z=17&output=embed`}
                     className="absolute inset-0 w-full h-full opacity-100"
                   />
                </div>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {leads.map(lead => (
          <div 
            key={lead.id} 
            onClick={() => navigate(`/leads/${lead.id}`)}
            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 active:bg-gray-50 dark:active:bg-slate-700 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{lead.customerName}</h3>
                <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mt-1">
                   <MapPin size={12} className="mr-1" />
                   {lead.addressLabel}
                </div>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-slate-700">
               <span className="text-xs text-gray-400">ID: {lead.id}</span>
               <div className="flex space-x-3 text-gray-400 dark:text-gray-500">
                 <Phone size={16} />
                 <ChevronRight size={16} />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};