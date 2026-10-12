import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Plus, Edit3, Trash2, FolderTree } from 'lucide-react';

// For this simple prototype, we can use a hardcoded list, but normally 
// this would be fetched from Firebase or a database.
const initialClassifications = [
  { id: 'cashbox', name: 'صندوق' },
  { id: 'client', name: 'عميل' },
  { id: 'supplier', name: 'مورد' },
  { id: 'employee', name: 'موظف' },
  { id: 'operating_expense', name: 'مصروفات تشغيلية' },
  { id: 'general_expense', name: 'مصروفات عامة' },
  { id: 'cost', name: 'تكاليف' },
  { id: 'revenue', name: 'إيرادات' },
  { id: 'general', name: 'عام' },
];

export default function AccountClassificationsManagement() {
  const [classifications, setClassifications] = useState(initialClassifications);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{id: string, name: string} | null>(null);
  const [formData, setFormData] = useState({ id: '', name: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      setClassifications(prev => prev.map(item => item.id === editingItem.id ? { ...item, name: formData.name } : item));
    } else {
      setClassifications(prev => [...prev, { id: formData.id, name: formData.name }]);
    }
    setShowModal(false);
    setFormData({ id: '', name: '' });
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
      setClassifications(prev => prev.filter(item => item.id !== id));
    }
  };

  return (
    <div className="space-y-6 text-right p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Tag className="h-8 w-8 text-indigo-500" />
            إدارة تصنيفات الحسابات
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">إضافة وتعديل التصنيفات المستخدمة في دليل الحسابات</p>
        </div>
        
        <button 
          onClick={() => { 
            setEditingItem(null); 
            setFormData({ id: '', name: '' });
            setShowModal(true); 
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm"
        >
          <Plus className="h-4 w-4" />
          إضافة تصنيف
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classifications.map((item) => (
          <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.id}</p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{item.name}</h3>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => { setEditingItem(item); setFormData(item); setShowModal(true); }}
                className="p-2 hover:bg-indigo-500 hover:text-white text-slate-400 dark:text-slate-600 rounded-lg transition-all"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleDelete(item.id)}
                className="p-2 hover:bg-rose-500 hover:text-white text-slate-400 dark:text-slate-600 rounded-lg transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
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
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">
                {editingItem ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">المعرف البرمجي (ID)</label>
                  <input 
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={formData.id}
                    onChange={e => setFormData(p => ({...p, id: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">اسم التصنيف (للمستخدم)</label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95">حفظ</button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
