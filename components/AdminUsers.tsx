import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { UserProfile, UserRole } from '../types.ts';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Users, Plus, UserPlus, Mail, Phone, Shield, Loader2, X, Check } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    whatsappNumber: '',
    role: 'staff' as UserRole
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authService.addUser(newUser);
      setShowAddModal(false);
      setNewUser({ email: '', name: '', whatsappNumber: '', role: 'staff' });
    } catch (error) {
      alert("Failed to add user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto mt-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-blue-600" /> User Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Manage team members and their roles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.uid} className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-500 font-bold text-lg">
                {u.name[0]}
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                u.role === 'staff' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                }`}>
                {u.role}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">{u.name}</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 italic truncate"><Mail size={14} /> {u.email}</div>
              {u.whatsappNumber && <div className="flex items-center gap-2 truncate"><Phone size={14} /> {u.whatsappNumber}</div>}
              <div className="flex items-center gap-2 text-[10px] uppercase font-semibold text-slate-400 mt-2"><Shield size={12} /> Joined {new Date(u.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" /> Invite Team Member
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl px-4 py-2.5 dark:text-white"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl px-4 py-2.5 dark:text-white"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@cabinex.com"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">WhatsApp Number</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl px-4 py-2.5 dark:text-white"
                  value={newUser.whatsappNumber}
                  onChange={e => setNewUser({ ...newUser, whatsappNumber: e.target.value })}
                  placeholder="+94 77 123 4567"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'staff', 'installer'] as UserRole[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role: r })}
                      className={`py-2 rounded-lg text-xs font-bold capitalize border transition-all ${newUser.role === r
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <> <Check size={18} /> Send Invitation </>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
