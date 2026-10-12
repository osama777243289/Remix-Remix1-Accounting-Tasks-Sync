import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Save, Upload, MapPin, Phone, Mail, Globe, Hash, FileText } from 'lucide-react';
import { CompanySettings as CompanyType } from '../types';

interface CompanySettingsProps {
  settings: CompanyType | null;
  onSave: (data: Partial<CompanyType>) => void;
}

export default function CompanySettings({ settings, onSave }: CompanySettingsProps) {
  const [formData, setFormData] = useState<Partial<CompanyType>>(settings || {
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxNumber: '',
    crNumber: '',
    notes: '',
    logo: '',
    offlineAllowedTasks: []
  });

  const availableTasks = [
    { id: 'BookingCollections', label: 'إدارة الحجوزات' },
    { id: 'ReceiptsPayments', label: 'سندات القبض والصرف' },
    { id: 'ClientsManagement', label: 'إدارة العملاء' },
    { id: 'TasksGrid', label: 'المهام' },
  ];
  
  const toggleTask = (taskId: string) => {
    setFormData(p => {
      const currentTasks = p.offlineAllowedTasks || [];
      const newTasks = currentTasks.includes(taskId)
        ? currentTasks.filter(t => t !== taskId)
        : [...currentTasks, taskId];
      return { ...p, offlineAllowedTasks: newTasks };
    });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <Building2 className="h-8 w-8 text-indigo-500" />
          بيانات الشركة والملف التعريفي
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">هذه البيانات ستظهر في جميع التقارير وسندات القبض والصرف الرسمية</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-500" />
              شعار الشركة (Logo)
            </h3>
            
            <div className="flex flex-col items-center">
              <div className="w-40 h-40 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden mb-4 group relative">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                ) : (
                  <Building2 className="h-16 w-16 text-slate-300 dark:text-slate-600" />
                )}
                <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer">
                  <span className="text-white text-[10px] font-black uppercase">تغيير الشعار</span>
                </div>
              </div>
              <input 
                type="text" 
                placeholder="رابط الشعار (URL)" 
                value={formData.logo}
                onChange={e => setFormData(p => ({...p, logo: e.target.value}))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 text-center font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-2 text-center">يفضل استخدام شعار بخلفية شفافة (PNG) وبدقة عالية</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">اسم المؤسسة / الشركة</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    value={formData.name || ""}
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: شركة النور لتنظيم الفعاليات"
                  />
                  <Building2 className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">رقم الهاتف / الجوال</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={formData.phone || ""}
                    onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-left"
                    placeholder="+967 770 000 000"
                  />
                  <Phone className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">البريد الإلكتروني</label>
                <div className="relative">
                  <input 
                    type="email"
                    value={formData.email || ""}
                    onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-left"
                    placeholder="info@company.com"
                  />
                  <Mail className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">الرقم الضريبي</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={formData.taxNumber || ""}
                    onChange={e => setFormData(p => ({...p, taxNumber: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    placeholder="300000000000003"
                  />
                  <Hash className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">رقم السجل التجاري</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={formData.crNumber || ""}
                    onChange={e => setFormData(p => ({...p, crNumber: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    placeholder="1010000000"
                  />
                  <FileText className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">الموقع الإلكتروني</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={formData.website || ""}
                    onChange={e => setFormData(p => ({...p, website: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-left"
                    placeholder="www.company.com"
                  />
                  <Globe className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">العنوان بالتفصيل</label>
                <div className="relative">
                  <textarea 
                    rows={3}
                    value={formData.address || ""}
                    onChange={e => setFormData(p => ({...p, address: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="الجمهورية اليمنية، صنعاء، حي حدة..."
                  />
                  <MapPin className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="md:col-span-2 mt-4 bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                <label className="text-xs font-black text-slate-800 dark:text-white block mb-4">بداية تسلسل أرقام المستندات:</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-2">عقود الحجوزات (BOK)</label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.sequenceStarts?.booking || 1}
                      onChange={e => setFormData(p => ({
                        ...p, 
                        sequenceStarts: { ...p.sequenceStarts, booking: parseInt(e.target.value) || 1 } as any
                      }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-2">سندات القبض (REC)</label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.sequenceStarts?.receipt || 1}
                      onChange={e => setFormData(p => ({
                        ...p, 
                        sequenceStarts: { ...p.sequenceStarts, receipt: parseInt(e.target.value) || 1 } as any
                      }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-2">سندات الصرف (PAY)</label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.sequenceStarts?.payment || 1}
                      onChange={e => setFormData(p => ({
                        ...p, 
                        sequenceStarts: { ...p.sequenceStarts, payment: parseInt(e.target.value) || 1 } as any
                      }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 block mb-2">قيود اليومية (JRN)</label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.sequenceStarts?.journal || 1}
                      onChange={e => setFormData(p => ({
                        ...p, 
                        sequenceStarts: { ...p.sequenceStarts, journal: parseInt(e.target.value) || 1 } as any
                      }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 mt-4 bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl">
                <label className="text-xs font-black text-slate-800 dark:text-white block mb-4">المهام المسموح بها في الوضع المحلي (Offline):</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {availableTasks.map(task => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className={`p-4 rounded-xl text-xs font-bold transition-all border ${
                        (formData.offlineAllowedTasks || []).includes(task.id)
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {task.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
               <motion.button 
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isSaving}
                className={`flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ بيانات الشركة'}
                <Save className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
