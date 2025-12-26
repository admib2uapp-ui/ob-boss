import React, { useState, useEffect } from 'react';
import { store } from '../services/store';
import { Lead } from '../types';
import { geocodeAddress } from '../services/geminiService';
import { Plus, Search, MapPin, Phone, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatusBadge: React.FC<{ status: Lead['status'] }> = ({ status }) => {
  const colors = {
    new: 'bg-blue-100 text-blue-800',
    invoice_sent: 'bg-amber-100 text-amber-800',
    paid: 'bg-emerald-100 text-emerald-800',
    visit_scheduled: 'bg-purple-100 text-purple-800',
    measured: 'bg-indigo-100 text-indigo-800',
    quoted: 'bg-pink-100 text-pink-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-gray-100 text-gray-800',
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

  useEffect(() => {
    return store.subscribe(setLeads);
  }, []);

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation) {
      alert("Please search for the address to set the location first.");
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

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-md active:scale-95 transition-transform"
        >
          <Plus size={16} className="mr-1" /> New Lead
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Add New Customer</h2>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                <input required value={newPhone} onChange={e => setNewPhone(e.target.value)} type="tel" className="w-full border border-gray-300 rounded-lg p-2.5" placeholder="15551234567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Address</label>
                <div className="flex">
                  <input 
                    required 
                    value={newAddress} 
                    onChange={e => setNewAddress(e.target.value)} 
                    className="w-full border border-gray-300 rounded-l-lg p-2.5" 
                    placeholder="Type address & tap search..." 
                  />
                  <button 
                    type="button" 
                    onClick={handleAddressSearch}
                    disabled={isSearchingAddr}
                    className="bg-blue-600 border border-l-0 border-blue-600 rounded-r-lg px-3 text-white hover:bg-blue-700 disabled:opacity-70"
                  >
                    {isSearchingAddr ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                  </button>
                </div>
                {newLocation ? (
                   <p className="text-xs text-emerald-600 mt-1 flex items-center">
                     <MapPin size={12} className="mr-1" />
                     Location verified: {newLocation.lat.toFixed(4)}, {newLocation.lng.toFixed(4)}
                   </p>
                ) : (
                   <p className="text-xs text-amber-600 mt-1">Please search address to confirm location.</p>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                <button 
                  type="submit" 
                  disabled={!newLocation}
                  className="px-4 py-2 bg-black text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {leads.map(lead => (
          <div 
            key={lead.id} 
            onClick={() => navigate(`/leads/${lead.id}`)}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{lead.customerName}</h3>
                <div className="flex items-center text-gray-500 text-xs mt-1">
                   <MapPin size={12} className="mr-1" />
                   {lead.addressLabel}
                </div>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
               <span className="text-xs text-gray-400">ID: {lead.id}</span>
               <div className="flex space-x-3 text-gray-400">
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