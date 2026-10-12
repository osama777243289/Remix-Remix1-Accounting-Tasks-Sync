import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Plus, Search, Tag, DollarSign, Edit3, Trash2, Box, Package } from 'lucide-react';
import { Service, Currency } from '../types';
import { PermissionGuard } from '../lib/permissions';

interface ServicesManagementProps {
  services: Service[];
  currencies: Currency[];
  onSaveService: (service: Partial<Service>) => void;
  onDeleteService: (id: string) => void;
}

export default function ServicesManagement({ services, currencies, onSaveService, onDeleteService }: ServicesManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    description: '',
    price: 0,
    standardCost: 0,
    currency: 'USD',
    category: 'قاعات'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveService(editingService ? { ...formData, id: editingService.id } : formData);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      standardCost: 0,
      currency: 'USD',
      category: 'قاعات'
    });
    setEditingService(null);
  };

  const filteredServices = services.filter(s => 
    (s.name || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
    (s.category || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-amber-500" />
            إدارة الخدمات والتسعير
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic">تجهيز الخدمات الإضافية وتسعيرها لكل الفعاليات</p>
        </div>
        
        <PermissionGuard permission="create-service">
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-amber-600/20 transition-all active:scale-95 text-sm"
          >
            <Plus className="h-4 w-4" />
            إضافة خدمة جديدة
          </button>
        </PermissionGuard>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="البحث باسم الخدمة أو التصنيف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 text-right"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-4 gap-4">
          {filteredServices.map((service) => (
            <motion.div 
              layout
              key={service.id}
              className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 relative group border border-transparent hover:border-amber-500/30 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg text-[10px] font-black text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                  {service.category}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PermissionGuard permission="edit-service">
                    <button 
                      onClick={() => { setEditingService(service); setFormData(service); setShowModal(true); }}
                      className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-amber-500"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGuard>
                  <PermissionGuard permission="delete-service">
                    <button 
                      onClick={() => onDeleteService(service.id)}
                      className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGuard>
                </div>
              </div>

              <h4 className="font-black text-slate-800 dark:text-white text-base mb-1">{service.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">{service.description}</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400">سعر البيع:</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                    {service.price.toLocaleString()}
                    <span className="text-[9px] text-amber-500">{service.currency}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400">التكلفة المعيارية:</span>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    {(service.standardCost || 0).toLocaleString()}
                    <span className="text-[9px] text-slate-400">{service.currency}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between bg-amber-50/30 dark:bg-amber-950/10 p-2.5 rounded-xl border border-amber-100/40 dark:border-amber-900/10">
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">الربح المتوقع:</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    {(service.price - (service.standardCost || 0)).toLocaleString()}
                    <span className="text-[9px] text-emerald-500">{service.currency}</span>
                    <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-normal">
                      {service.price > 0 ? (((service.price - (service.standardCost || 0)) / service.price) * 100).toFixed(0) : 0}%
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <Package className="h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-bold">لا يوجد خدمات مضافة</p>
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
              <div className="bg-amber-600 p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">{editingService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}</h3>
                  <p className="text-white/80 text-xs font-medium italic">سيتم عرض هذه الخدمات ضمن خيارات الحجز لعملاء القاعات</p>
                </div>
                <Briefcase className="h-10 w-10 opacity-40" />
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">اسم الخدمة</label>
                    <input 
                      type="text"
                      required
                      placeholder="مثال: بوفيه مفتوح (VIP)"
                      value={formData.name}
                      onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">التصنيف</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData(p => ({...p, category: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="قاعات">تجهيز قاعات</option>
                      <option value="ضيافة">ضيافة وبوفيه</option>
                      <option value="تصوير">تصوير ومونتاج</option>
                      <option value="صوت">أنظمة صوت وإضاءة</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">سعر البيع</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.price || ""}
                        onChange={e => setFormData(p => ({...p, price: parseFloat(e.target.value) || 0}))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 pl-10 text-sm focus:ring-2 focus:ring-amber-500 font-black text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">التكلفة المعيارية</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.standardCost || ""}
                        onChange={e => setFormData(p => ({...p, standardCost: parseFloat(e.target.value) || 0}))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 pl-10 text-sm focus:ring-2 focus:ring-amber-500 font-black text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">العملة</label>
                    <select 
                      required
                      value={formData.currency}
                      onChange={e => setFormData(p => ({...p, currency: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 font-bold"
                    >
                      {currencies.map(cur => (
                        <option key={cur.id} value={cur.code}>{cur.code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">وصف الخدمة</label>
                  <textarea 
                    rows={3}
                    placeholder="اكتب هنا تفاصيل الخدمة وما تشتمل عليه..."
                    value={formData.description}
                    onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 text-right"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    حفظ الخدمة
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
