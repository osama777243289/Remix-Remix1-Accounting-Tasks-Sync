import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit3, Trash2, UserPlus, Landmark } from 'lucide-react';
import { Client, Account as AccountType } from '../types';
import { toast } from 'sonner';
import { PermissionGuard } from '../lib/permissions';

interface ClientsManagementProps {
  clients: Client[];
  accounts: AccountType[];
  onSaveClient: (client: Partial<Client>, accountData?: any) => void;
  onDeleteClient: (id: string) => void;
  onViewStatement?: (accountId?: string, client?: Client) => void;
}

export default function ClientsManagement({ clients, accounts, onSaveClient, onDeleteClient, onViewStatement }: ClientsManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    linkedAccountId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.phone.trim()) {
      toast.error("عذراً، يرجى إدخال رقم الجوال لحفظ العميل!");
      return;
    }
    onSaveClient(editingClient ? { ...formData, id: editingClient.id } : formData);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      linkedAccountId: ''
    });
    setEditingClient(null);
  };

  const filteredClients = clients.filter(c => 
    (c.name || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
    (c.phone || "").includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-indigo-500" />
            إدارة بيانات العملاء
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">سجل شامل للعملاء وربطهم بالحسابات المالية</p>
        </div>
        
        <PermissionGuard permission="create-client">
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm"
          >
            <UserPlus className="h-4 w-4" />
            إضافة عميل جديد
          </button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <motion.div 
            layout
            key={client.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-xl transition-all group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
            
            <div className="flex items-start justify-between relative">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xl">
                {client.name.charAt(0)}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <PermissionGuard permission="edit-client">
                  <button 
                    onClick={() => { setEditingClient(client); setFormData(client); setShowModal(true); }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </PermissionGuard>
                <PermissionGuard permission="delete-client">
                  <button 
                    onClick={() => onDeleteClient(client.id)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </PermissionGuard>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">{client.name}</h3>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                رقم الحساب: {accounts.find(a => a.id === client.linkedAccountId)?.code || 'جاري الربط...'}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-xs">
                <Phone className="h-4 w-4 text-indigo-400" />
                <span className="font-bold">{client.phone}</span>
              </div>
              {client.email && (
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-xs">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-xs">
                  <MapPin className="h-4 w-4 text-indigo-400" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">تاريخ التسجيل: {new Date(client.createdAt).toLocaleDateString('ar-EG')}</span>
              <button 
                onClick={() => onViewStatement && onViewStatement(client.linkedAccountId, client)}
                className="text-[10px] font-black py-1 px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"
              >
                عرض الكشف
              </button>
            </div>
          </motion.div>
        ))}

        {filteredClients.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
              <Users className="h-10 w-10" />
            </div>
            <p className="text-slate-500 font-bold">لا يوجد عملاء مطابقين للبحث</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">{editingClient ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}</h3>
                  <p className="text-white/80 text-xs font-medium">سيتم إنشاء حساب مالي تلقائياً في شجرة الحسابات</p>
                </div>
                <Users className="h-10 w-10 opacity-40" />
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">اسم العميل بالكامل</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: محمد حسين الغزالي"
                    value={formData.name || ""}
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">رقم الهاتف</label>
                    <input 
                      type="tel"
                      required
                      placeholder="770000000"
                      value={formData.phone || ""}
                      onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 text-right font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">البريد الإلكتروني (اختياري)</label>
                    <input 
                      type="email"
                      placeholder="example@mail.com"
                      value={formData.email || ""}
                      onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">العنوان</label>
                  <input 
                    type="text"
                    placeholder="مثال: صنعاء، حارة جمال"
                    value={formData.address || ""}
                    onChange={e => setFormData(p => ({...p, address: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>

                {!editingClient && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">
                      💡 ملاحظة: عند حفظ البيانات، سيتم توليد ذمة مالية للعميل في نظام "ذمم العملاء" تلقائياً ليسهل عليك متابعة المديونيات.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    حفظ البيانات
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
