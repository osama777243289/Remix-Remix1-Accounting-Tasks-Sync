import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Currency } from '../types';
import { DollarSign, Plus, Edit3, Trash2, Globe, TrendingUp } from 'lucide-react';

interface CurrenciesManagementProps {
  currencies: Currency[];
  onSave?: (curr: Partial<Currency>) => void;
  onDelete?: (id: string) => void;
}

export default function CurrenciesManagement({ currencies, onSave, onDelete }: CurrenciesManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [formData, setFormData] = useState<Partial<Currency>>({
    code: '',
    name: '',
    symbol: '',
    rateToBase: 1,
    isBase: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    
    try {
      await onSave(editingCurrency ? { ...formData, id: editingCurrency.id } : formData);
      setShowModal(false);
      setFormData({ code: '', name: '', symbol: '', rateToBase: 1, isBase: false });
      setEditingCurrency(null);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه العملة؟")) {
      if (onDelete) onDelete(id);
    }
  };

  const baseCurrency = currencies.find(c => c.isBase);
  const baseCode = baseCurrency?.code || 'BASE';

  return (
    <div className="space-y-6 text-right">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
             <Globe className="h-8 w-8 text-indigo-500" />
            إدارة العملات والتحويلات
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">ضبط أسعار الصرف والعملة الأساسية للنظام</p>
        </div>
        
        <button 
          onClick={() => { 
            setEditingCurrency(null); 
            setFormData({ code: '', name: '', symbol: '', rateToBase: 1, isBase: false });
            setShowModal(true); 
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm"
        >
          <Plus className="h-4 w-4" />
          إضافة عملة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currencies.map((curr) => (
          <motion.div 
            layout
            key={curr.id}
            className={`p-6 rounded-3xl border-2 transition-all relative overflow-hidden group ${curr.isBase ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-500' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
          >
            {curr.isBase && (
              <div className="absolute top-3 left-3">
                <span className="bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Base</span>
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl font-black text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-700">
                {curr.symbol}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{curr.code}</span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{curr.name}</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-400">سعر الصرف</span>
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  1 {curr.code} = {curr.rateToBase.toLocaleString()} <span className="text-[10px] text-slate-400">{baseCode}</span>
                </div>
              </div>


              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingCurrency(curr); setFormData(curr); setShowModal(true); }}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white text-slate-600 dark:text-slate-400 text-xs font-black py-2 rounded-xl transition-all"
                >
                  تعديل
                </button>
                {!curr.isBase && (
                  <button 
                    onClick={() => handleDelete(curr.id)}
                    className="p-2 hover:bg-rose-500 hover:text-white text-slate-400 dark:text-slate-600 rounded-xl transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
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
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-indigo-600 p-6 text-white">
                <h3 className="text-xl font-black">{editingCurrency ? 'تعديل العملة' : 'إضافة عملة جديدة'}</h3>
                <p className="text-white/80 text-xs font-medium">تأكد من دقة سعر الصرف مقابل العملة الأساسية</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">كود العملة</label>
                    <input 
                      type="text"
                      required
                      placeholder="USD, SAR, SYP..."
                      value={formData.code || ""}
                      onChange={e => setFormData(p => ({...p, code: e.target.value.toUpperCase()}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">الرمز</label>
                    <input 
                      type="text"
                      required
                      placeholder="$, SR, £..."
                      value={formData.symbol || ""}
                      onChange={e => setFormData(p => ({...p, symbol: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">اسم العملة بالكامل</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: ريال يمني"
                    value={formData.name || ""}
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">سعر الصرف (مقابل 1 {baseCode})</label>
                  <input 
                    type="number"
                    required
                    step="0.000001"
                    value={formData.rateToBase || ""}
                    onChange={e => setFormData(p => ({...p, rateToBase: parseFloat(e.target.value) || 0}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-lg font-black focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-not-allowed opacity-50">
                  <input 
                    type="checkbox" 
                    checked={formData.isBase} 
                    disabled 
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">تعيين كعملة أساسية (يتطلب صلاحية مدير)</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    حفظ التغييرات
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
