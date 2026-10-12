import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sliders, Save, Clock, Plus, Trash2, Layers, DollarSign, 
  Settings2, HelpCircle, FileText, CheckCircle, ChevronDown, PlusCircle
} from 'lucide-react';
import { BookingSettings as BookingSettingsType, BookingPeriod, Account } from '../types';
import { toast } from 'sonner';

interface BookingSettingsProps {
  settings: BookingSettingsType | null;
  onSave: (data: Partial<BookingSettingsType>) => Promise<void>;
  currencies: Array<{ code: string; name: string; symbol: string }>;
  accounts: Account[];
}

const HOURS_LIST = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

export default function BookingSettings({ settings, onSave, currencies, accounts }: BookingSettingsProps) {
  // Ensure default state exists
  const [formData, setFormData] = useState<BookingSettingsType>(() => {
    if (settings) {
      return { 
        ...settings,
        eventTypes: (settings.eventTypes && settings.eventTypes.length > 0)
          ? Array.from(new Set([
              "غداء ومقيل", "مقيل وسمر", "عرس بنت", "غداء ومقيل وسمر", "إحتفالات",
              ...settings.eventTypes
            ]))
          : [
              "غداء ومقيل", "مقيل وسمر", "عرس بنت", "غداء ومقيل وسمر", "إحتفالات",
              "زواج", "زواج (رجال)", "زواج (نساء)", "زواج (عريس)", "زواج (عروسة)", "عزاء", "خطوبة", "تخرج", "عيد ميلاد"
            ]
      };
    }
    return {
      id: 'default-settings',
      periods: [
        { id: "morning", name: "الفترة الصباحية", startTime: "09:00", endTime: "15:00" },
        { id: "evening", name: "الفترة المسائية", startTime: "16:00", endTime: "23:00" },
        { id: "night", name: "الفترة الليلية", startTime: "01:00", endTime: "08:00" }
      ],
      defaultServices: [
        { name: "ضيافة شاي وقهوة", cost: 15000 },
        { name: "بخور وعطور فاخرة", cost: 10000 },
        { name: "تجهيز صوتيات وشاشات", cost: 25000 },
        { name: "تنظيف وتعقيم الصالة", cost: 12000 }
      ],
      defaultStatus: "pending",
      defaultCurrency: "YER",
      policyNotes: [
        "يحق للطرف الأول إلغاء الحجز في حال عدم استكمال الدفعات قبل موعد الفعالية بـ 72 ساعة.",
        "لا تقع المسؤولية على الطرف الأول عن فقدان الممتلكات الشخصية لرواد الفعالية أو المدعوين.",
        "يعتبر التوقيت والجدولة الزمنية المتفق عليها معتمداً ونهائياً للطرفين."
      ],
      eventTypes: [
        "غداء ومقيل", "مقيل وسمر", "عرس بنت", "غداء ومقيل وسمر", "إحتفالات",
        "زواج", "زواج (رجال)", "زواج (نساء)", "زواج (عريس)", "زواج (عروسة)", "عزاء", "خطوبة", "تخرج", "عيد ميلاد"
      ],
      updatedAt: new Date().toISOString()
    };
  });

  const [isSaving, setIsSaving] = useState(false);

  // New period form local state
  const [newPeriod, setNewPeriod] = useState<Omit<BookingPeriod, 'id'>>({
    name: '',
    startTime: '09:00',
    endTime: '15:00'
  });

  // New service form local state
  const [newService, setNewService] = useState({
    name: '',
    cost: 0
  });

  // New policy note state
  const [newPolicyNote, setNewPolicyNote] = useState('');

  // New event type state
  const [newEventValue, setNewEventValue] = useState('');

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        updatedAt: new Date().toISOString()
      });
      toast.success('تم حفظ إعدادات الحجوزات بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  // Periods Management
  const handleAddPeriod = () => {
    if (!newPeriod.name.trim()) {
      toast.error('يرجى إدخال اسم الفترة');
      return;
    }
    const newId = `period-${Date.now()}`;
    const periodToAdd: BookingPeriod = {
      id: newId,
      ...newPeriod
    };
    setFormData(prev => ({
      ...prev,
      periods: [...prev.periods, periodToAdd]
    }));
    setNewPeriod({ name: '', startTime: '09:00', endTime: '15:00' });
    toast.success('تمت إضافة الفترة الافتراضية');
  };

  const handleRemovePeriod = (id: string) => {
    setFormData(prev => ({
      ...prev,
      periods: prev.periods.filter(p => p.id !== id)
    }));
    toast.success('تم حذف الفترة');
  };

  const handleUpdatePeriod = (id: string, field: keyof BookingPeriod, value: string) => {
    setFormData(prev => ({
      ...prev,
      periods: prev.periods.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  // Services Management
  const handleAddService = () => {
    if (!newService.name.trim()) {
      toast.error('يرجى إدخال اسم الخدمة');
      return;
    }
    setFormData(prev => ({
      ...prev,
      defaultServices: [...prev.defaultServices, { ...newService }]
    }));
    setNewService({ name: '', cost: 0 });
    toast.success('تمت إضافة الخدمة الافتراضية');
  };

  const handleRemoveService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      defaultServices: prev.defaultServices.filter((_, idx) => idx !== index)
    }));
    toast.success('تم حذف الخدمة');
  };

  const handleUpdateService = (index: number, field: 'name' | 'cost', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      defaultServices: prev.defaultServices.map((s, idx) => idx === index ? { ...s, [field]: value } : s)
    }));
  };

  // Policy Notes Management
  const handleAddPolicyNote = () => {
    if (!newPolicyNote.trim()) return;
    setFormData(prev => ({
      ...prev,
      policyNotes: [...(prev.policyNotes || []), newPolicyNote.trim()]
    }));
    setNewPolicyNote('');
    toast.success('تمت إضافة الشرط/البند');
  };

  const handleRemovePolicyNote = (index: number) => {
    setFormData(prev => ({
      ...prev,
      policyNotes: (prev.policyNotes || []).filter((_, idx) => idx !== index)
    }));
    toast.success('تم حذف البند');
  };

  const handleUpdatePolicyNote = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      policyNotes: (prev.policyNotes || []).map((n, idx) => idx === index ? value : n)
    }));
  };

  // Event Types Management
  const handleAddEventType = () => {
    if (!newEventValue.trim()) return;
    const trimmed = newEventValue.trim();
    const currentTypes = formData.eventTypes || [];
    if (currentTypes.includes(trimmed)) {
      toast.error('نوع الفعالية مضاف بالفعل');
      return;
    }
    setFormData(prev => ({
      ...prev,
      eventTypes: [...currentTypes, trimmed]
    }));
    setNewEventValue('');
    toast.success('تمت إضافة نوع الفعالية الجديد');
  };

  const handleRemoveEventType = (typeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      eventTypes: (prev.eventTypes || []).filter(t => t !== typeToRemove)
    }));
    toast.success('تم حذف نوع الفعالية');
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Sliders className="h-8 w-8 text-indigo-500" />
            إعدادات واجهة الحجوزات المسبقة
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
            تحديد الفترات والخدمات الافتراضية لتسهيل الحجز السريع وتخصيص شاشات الحجز
          </p>
        </div>

        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveAll}
          disabled={isSaving}
          className={`flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات الافتراضية'}
          <Save className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: General Configuration & Printing Rules */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* General Rules Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-black text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-indigo-500" />
              خيارات الحجز الأساسية
            </h3>

            {/* Default Status Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">الحالة الافتراضية للحجز الجديد</label>
              <select
                value={formData.defaultStatus}
                onChange={e => setFormData(p => ({ ...p, defaultStatus: e.target.value as any }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pending">مبدئي / قيد الانتظار (Pending)</option>
                <option value="confirmed">مؤكد تلقائياً (Confirmed)</option>
              </select>
            </div>

              {/* Default Currency Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">العملة الافتراضية الافتتاحية</label>
              <select
                value={formData.defaultCurrency}
                onChange={e => setFormData(p => ({ ...p, defaultCurrency: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
              >
                {currencies.map((curr, idx) => (
                  <option key={`${curr.code}-${idx}`} value={curr.code}>
                    {curr.name} ({curr.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Printing Contract Rules & Policy Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-black text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              شروط وأحكام العقد (تظهر في الفاتورة المطبوعة)
            </h3>

            {/* Current terms list */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {(formData.policyNotes || []).map((note, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 bg-slate-200 dark:bg-slate-700 w-5 h-5 flex items-center justify-center rounded-full shrink-0 mt-0.5">{idx + 1}</span>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={e => handleUpdatePolicyNote(idx, e.target.value)}
                    className="w-full bg-transparent border-none text-xs font-medium focus:ring-0 p-0 resize-none dark:text-slate-300"
                  />
                  <button 
                    onClick={() => handleRemovePolicyNote(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {(formData.policyNotes || []).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 font-medium">لا توجد بنود مضافة لعقد الحجز</p>
              )}
            </div>

            {/* Add new rule form */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="أضف بنداً أو شرطاً جديداً لعقد الحجز..."
                value={newPolicyNote}
                onChange={e => setNewPolicyNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddPolicyNote(); }}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 font-bold"
              />
              <button
                onClick={handleAddPolicyNote}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-3 rounded-xl transition-colors shrink-0 text-indigo-600 dark:text-indigo-400"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* New Controls Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-black text-slate-800 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-rose-500" />
              الضوابط والقيود (Security Controls)
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer group">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">منع تعديل تاريخ العملية الافتراضي</span>
                  <span className="text-[10px] text-slate-400 font-medium italic">يمنع المستخدم من تغيير تاريخ السند أو القيد لغير التاريخ الحالي</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.lockTransactionDate || false}
                  onChange={e => setFormData(p => ({ ...p, lockTransactionDate: e.target.checked }))}
                  className="w-5 h-5 rounded-lg border-slate-300 text-rose-600 focus:ring-rose-500" 
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer group">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">منع تعديل مبالغ الحجز (الخصم، التأمين، العربون)</span>
                  <span className="text-[10px] text-slate-400 font-medium italic">قفل حقول المبالغ المالية لمنع التلاعب بعد الاتفاق الأول</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.lockBookingAmounts || false}
                  onChange={e => setFormData(p => ({ ...p, lockBookingAmounts: e.target.checked }))}
                  className="w-5 h-5 rounded-lg border-slate-300 text-rose-600 focus:ring-rose-500" 
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer group">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">منع تعديل تفاصيل الحجز بعد الحفظ الأول</span>
                  <span className="text-[10px] text-slate-400 font-medium italic">يمنع تعديل أي بيانات في الحجز (مثل القاعة، التاريخ، العميل) بعد الحفظ</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={formData.lockBookingDetailsAfterSave || false}
                  onChange={e => setFormData(p => ({ ...p, lockBookingDetailsAfterSave: e.target.checked }))}
                  className="w-5 h-5 rounded-lg border-slate-300 text-rose-600 focus:ring-rose-500" 
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Columns: Periods Setup & Default Services */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Default Booking Periods Configuration */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" />
                  إعداد فترات وساعات الحجز الافتراضية
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  حدد الساعات الافتراضية لكل فترة من فترات الحجز اليومية (نظام ساعات كاملة دون دقائق)
                </p>
              </div>
            </div>

            {/* Existing periods form list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.periods.map((period) => (
                <div key={period.id} className="relative bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  {/* Delete button */}
                  <button
                    onClick={() => handleRemovePeriod(period.id)}
                    className="absolute top-4 left-4 p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="space-y-3">
                    {/* Period name */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">اسم الفترة</label>
                      <input
                        type="text"
                        value={period.name}
                        onChange={e => handleUpdatePeriod(period.id, 'name', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-indigo-500"
                        placeholder="مثال: الفترة الصباحية"
                      />
                    </div>

                    {/* Time fields (hours only) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">وقت البدء (ساعة)</label>
                        <select
                          value={period.startTime}
                          onChange={e => handleUpdatePeriod(period.id, 'startTime', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-indigo-500 text-center font-mono"
                        >
                          {HOURS_LIST.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">وقت الانتهاء (ساعة)</label>
                        <select
                          value={period.endTime}
                          onChange={e => handleUpdatePeriod(period.id, 'endTime', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-indigo-500 text-center font-mono"
                        >
                          {HOURS_LIST.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add custom period row */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 space-y-4">
              <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                إضافة فترة مخصصة جديدة
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-[10px] font-bold text-indigo-900/60 dark:text-indigo-300 block mb-1">اسم الفترة</label>
                  <input
                    type="text"
                    value={newPeriod.name}
                    onChange={e => setNewPeriod(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: فترة مابعد الظهر"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-900/60 dark:text-indigo-300 block mb-1">ساعة البدء</label>
                  <select
                    value={newPeriod.startTime}
                    onChange={e => setNewPeriod(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    {HOURS_LIST.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-900/60 dark:text-indigo-300 block mb-1">ساعة الانتهاء</label>
                  <select
                    value={newPeriod.endTime}
                    onChange={e => setNewPeriod(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    {HOURS_LIST.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAddPeriod}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة الفترة للخيارات
                </button>
              </div>
            </div>
          </div>

          {/* Custom Event Types Configuration */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-indigo-500" />
                إدارة أنواع الفعاليات والمناسبات المتاحة
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                قم بإدخال وتعديل مسميات أنواع الفعاليات (مثل: زواج، عزاء، تخرج، رجال، نساء...) لتسهيل اختيارها عند إنشاء حجز جديد وظهورها بشكل منسق في عقد الطباعة
              </p>
            </div>

            {/* Current Event Types List */}
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
              {(formData.eventTypes || []).map((type, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 text-xs font-black"
                >
                  <span>{type}</span>
                  <button 
                    type="button"
                    onClick={() => handleRemoveEventType(type)}
                    className="text-indigo-400 hover:text-rose-500 transition-colors text-sm font-extrabold focus:outline-none"
                    title="حذف نوع الفعالية"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {(formData.eventTypes || []).length === 0 && (
                <span className="text-xs text-slate-400 font-bold p-1">لا توجد أنواع فعاليات مضافة حالياً. يرجى إضافة نوع فعالية أدناه.</span>
              )}
            </div>

            {/* Add New Event Type Form */}
            <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-5 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/20 space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">اسم نوع المناسبة / الفعالية الجديد</label>
                  <input
                    type="text"
                    value={newEventValue}
                    onChange={e => setNewEventValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEventType(); } }}
                    placeholder="مثال: حفل تكريم ومهرجان، أو زواج (نساء)..."
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddEventType}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة للخيارات
                </button>
              </div>
            </div>
          </div>

          {/* Default Additional Services Configuration */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" />
                الخدمات الإضافية الافتراضية
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                الخدمات التي تظهر تلقائياً كخيارات سريعة قابلة للتحديد أثناء إنشاء حجز جديد
              </p>
            </div>

            {/* Current services list table */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4">اسم الخدمة التلقائية</th>
                    <th className="p-4 w-40 text-center">التكلفة المقدرة</th>
                    <th className="p-4 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {formData.defaultServices.map((service, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-4">
                        <input
                          type="text"
                          value={service.name}
                          onChange={e => handleUpdateService(idx, 'name', e.target.value)}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-700 dark:text-slate-200 font-bold"
                          placeholder="مثال: خدمة ضيافة"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 mx-auto w-32 font-mono">
                          <input
                            type="number"
                            value={service.cost}
                            onChange={e => handleUpdateService(idx, 'cost', parseFloat(e.target.value) || 0)}
                            className="bg-transparent border-none p-0 text-center focus:ring-0 w-full text-slate-700 dark:text-slate-200 font-black text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-black">﷼</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleRemoveService(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.defaultServices.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400 font-medium">
                        لا توجد خدمات افتراضية مضافة حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add new default service form */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-indigo-500" />
                إضافة خدمة تلقائية جديدة
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">اسم الخدمة</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={e => setNewService(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: خدمة تصوير وتغطية فيديو"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">التكلفة (﷼)</label>
                  <input
                    type="number"
                    value={newService.cost || ''}
                    onChange={e => setNewService(p => ({ ...p, cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 font-mono text-left"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAddService}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة الخدمة للخيارات
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
