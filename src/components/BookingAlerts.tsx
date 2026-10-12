import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Bell, Calendar, User, Phone, CheckCircle2, ArrowRightLeft, Clock, ShieldAlert, Sparkles, ExternalLink, ChevronDown, ChevronUp, TrendingUp, ShieldCheck, Key } from 'lucide-react';
import { Booking, Hall } from '../types';

interface BookingAlertsProps {
  bookings: Booking[];
  halls: Hall[];
  onPreviewBooking: (bookingId: string) => void;
  globalCurrencySymbol: string;
  defaultCollapsed?: boolean;
}

export default function BookingAlerts({ bookings, halls, onPreviewBooking, globalCurrencySymbol, defaultCollapsed = false }: BookingAlertsProps) {
  const [activeTab, setActiveTab] = useState<'overdue' | 'approaching' | 'accrual' | 'insurance' | 'mortgages'>('overdue');
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Overdue bookings: Event date has passed, but still has a remaining balance, and status is confirmed or pending
  const overdueBookings = bookings.filter(b => {
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    const totalPaid = (b.paidAmount || 0) + (b.subsequentPayments || 0);
    const remaining = b.totalPrice - totalPaid;
    if (remaining <= 0) return false;
    if (!b.days || b.days.length === 0) return false;
    const firstDayStr = b.days[0].date;
    if (!firstDayStr) return false;
    const bDate = new Date(firstDayStr);
    if (isNaN(bDate.getTime())) return false;
    bDate.setHours(0, 0, 0, 0);
    return bDate < today;
  });

  // 2. Approaching bookings: Event date is today or in the next 7 days, and still has a remaining balance, and status is confirmed or pending
  const approachingUnpaidBookings = bookings.filter(b => {
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    const totalPaid = (b.paidAmount || 0) + (b.subsequentPayments || 0);
    const remaining = b.totalPrice - totalPaid;
    if (remaining <= 0) return false;
    if (!b.days || b.days.length === 0) return false;
    const firstDayStr = b.days[0].date;
    if (!firstDayStr) return false;
    const bDate = new Date(firstDayStr);
    if (isNaN(bDate.getTime())) return false;
    bDate.setHours(0, 0, 0, 0);
    if (bDate < today) return false; // That goes to overdue
    const diffTime = bDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  // 3. Need Accrual
  const needAccrualBookings = bookings.filter(b => {
    if (b.status === 'cancelled' || b.revenueAccrued) return false;
    if (!b.days || b.days.length === 0) return false;
    const lastDayStr = b.days[b.days.length - 1].date;
    const bDate = new Date(lastDayStr);
    bDate.setHours(0, 0, 0, 0);
    return bDate <= today;
  });

  // 4. Pending Insurance
  const pendingInsuranceBookings = bookings.filter(b => {
    if (b.status === 'cancelled' || b.insuranceRefunded) return false;
    if (!b.insuranceAmount || b.insuranceAmount <= 0) return false;
    if (!b.days || b.days.length === 0) return false;
    const lastDayStr = b.days[b.days.length - 1].date;
    const bDate = new Date(lastDayStr);
    bDate.setHours(0, 0, 0, 0);
    return bDate <= today;
  });

  // 5. Pending Mortgages (cash or physical)
  const pendingMortgageBookings = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    
    // Check if there is an unreturned cash mortgage
    const hasUnreturnedCash = b.mortgageAmount && b.mortgageAmount > 0 && b.mortgageStatus !== 'returned';
    
    // Check if there is an unreturned physical mortgage
    const hasUnreturnedPhysical = b.pledgesDescription && b.pledgesDescription.trim() !== '' && b.pledgeStatus !== 'returned';
    
    if (!hasUnreturnedCash && !hasUnreturnedPhysical) return false;
    
    // Only alert if the event date has arrived or passed (meaning the event has concluded or is active)
    if (!b.days || b.days.length === 0) return false;
    const lastDayStr = b.days[b.days.length - 1].date;
    const bDate = new Date(lastDayStr);
    bDate.setHours(0, 0, 0, 0);
    return bDate <= today;
  });

  const getOverdueDaysText = (dateStr: string) => {
    if (!dateStr) return 'تاريخ غير محدد';
    const bDate = new Date(dateStr);
    if (isNaN(bDate.getTime())) return 'تاريخ غير صالح';
    bDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - bDate.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (days === 0) return 'اليوم';
    if (days === 1) return 'منذ يوم (أمس)';
    if (days === 2) return 'منذ يومين';
    if (days > 2 && days <= 10) return `منذ ${days} أيام`;
    return `منذ ${days} يوماً`;
  };

  const getApproachingDaysText = (dateStr: string) => {
    if (!dateStr) return 'تاريخ غير محدد';
    const bDate = new Date(dateStr);
    if (isNaN(bDate.getTime())) return 'تاريخ غير صالح';
    bDate.setHours(0, 0, 0, 0);
    const diffTime = bDate.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (days === 0) return 'اليوم!';
    if (days === 1) return 'غداً';
    if (days === 2) return 'بعد يومين';
    if (days > 2 && days <= 10) return `بعد ${days} أيام`;
    return `بعد ${days} يوماً`;
  };

  const totalAlerts = overdueBookings.length + approachingUnpaidBookings.length + needAccrualBookings.length + pendingInsuranceBookings.length + pendingMortgageBookings.length;

  if (totalAlerts === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5 md:p-6 text-right relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/10 text-emerald-500 rounded-lg sm:rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm">
              ✅
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm text-slate-800 dark:text-white">
                جميع الحجوزات القادمة والسابقة مستوفية الدفع
              </h3>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                لا توجد قسائم حجوزات متأخرة أو قريبة غير مدفوعة حالياً.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-3xl border border-red-200/60 dark:border-red-950/40 shadow-sm shadow-red-500/5 text-right overflow-hidden relative">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section with Stats - Flexible Grid Cards */}
      <div className="p-3 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 mb-3 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-red-500/10 text-red-500 rounded-lg sm:rounded-2xl flex items-center justify-center animate-pulse shrink-0">
              <AlertTriangle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>🚨 مركز تنبيهات تحصيل مبالغ الحجوزات</span>
                <span className="bg-red-500 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full">
                  {totalAlerts} تنبيه
                </span>
              </h3>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 leading-relaxed">
                متابعة الحجوزات المتأخرة، الحجوزات القريبة، ترحيل الإيرادات، وتأمينات العملاء المعلقة.
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-sm self-end md:self-center"
          >
            <span>{isCollapsed ? "توسيع العرض" : "طي العرض"}</span>
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-3">
            <button
              onClick={() => setActiveTab('overdue')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all text-right flex flex-col justify-between h-20 sm:h-24 group ${
                activeTab === 'overdue'
                  ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-900/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`p-1.5 rounded-lg ${activeTab === 'overdue' ? 'bg-white/20' : 'bg-red-500/10 text-red-500'}`}>
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <span className="text-xl font-black font-mono">{overdueBookings.length}</span>
              </div>
              <span className="text-[10px] font-black leading-tight">حجوزات متأخرة الدفع</span>
            </button>

            <button
              onClick={() => setActiveTab('approaching')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all text-right flex flex-col justify-between h-20 sm:h-24 group ${
                activeTab === 'approaching'
                  ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                <span className={`p-1 sm:p-1.5 rounded-lg ${activeTab === 'approaching' ? 'bg-white/20' : 'bg-amber-500/10 text-amber-500'}`}>
                  <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="text-lg sm:text-xl font-black font-mono">{approachingUnpaidBookings.length}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black leading-tight">حجوزات تقترب مواعيدها</span>
            </button>

            <button
              onClick={() => setActiveTab('accrual')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all text-right flex flex-col justify-between h-20 sm:h-24 group ${
                activeTab === 'accrual'
                  ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                <span className={`p-1 sm:p-1.5 rounded-lg ${activeTab === 'accrual' ? 'bg-white/20' : 'bg-indigo-500/10 text-indigo-500'}`}>
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="text-lg sm:text-xl font-black font-mono">{needAccrualBookings.length}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black leading-tight">ترحيل الإيرادات المستحقة</span>
            </button>

            <button
              onClick={() => setActiveTab('insurance')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all text-right flex flex-col justify-between h-20 sm:h-24 group ${
                activeTab === 'insurance'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                <span className={`p-1 sm:p-1.5 rounded-lg ${activeTab === 'insurance' ? 'bg-white/20' : 'bg-rose-500/10 text-rose-500'}`}>
                  <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="text-lg sm:text-xl font-black font-mono">{pendingInsuranceBookings.length}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black leading-tight">رد تأمينات العملاء</span>
            </button>

            <button
              onClick={() => setActiveTab('mortgages')}
              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all text-right flex flex-col justify-between h-20 sm:h-24 group ${
                activeTab === 'mortgages'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-900/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-0.5 sm:mb-1">
                <span className={`p-1 sm:p-1.5 rounded-lg ${activeTab === 'mortgages' ? 'bg-white/20' : 'bg-amber-600/10 text-amber-600'}`}>
                  <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="text-lg sm:text-xl font-black font-mono">{pendingMortgageBookings.length}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black leading-tight">رد الرهونات النقدية</span>
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>

          {/* Booking Alert Lists */}
          <div className="p-5 relative z-10">
            <AnimatePresence mode="wait">
              {activeTab === 'overdue' && (
                <motion.div
                  key="overdue-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {overdueBookings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      لا توجد حجوزات متأخرة الدفع حالياً.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {overdueBookings.map(b => {
                        const remaining = Math.max(0, b.totalPrice - ((b.paidAmount || 0) + (b.subsequentPayments || 0)));
                        const hall = halls.find(h => h.id === b.hallId);
                        const overdueText = getOverdueDaysText(b.days[0]?.date);
                        return (
                          <div
                            key={b.id}
                            className="p-4 bg-red-50/20 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex flex-col justify-between gap-3 hover:border-red-300 dark:hover:border-red-800/40 transition-all group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-red-200/20 mb-2">
                                  🕒 متأخرة {overdueText}
                                </span>
                                <h4 className="font-black text-[10px] text-slate-800 dark:text-white whitespace-normal leading-tight">
                                  {b.customerName}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-extrabold text-indigo-500">{hall?.name || 'قاعة غير محددة'}</span>
                                  <span>•</span>
                                  <span>{b.days[0]?.date}</span>
                                </div>
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-black text-red-600 dark:text-red-400 block">
                                  {remaining.toLocaleString()} {b.currency}
                                </span>
                                <span className="text-[9px] text-slate-400 font-extrabold block">
                                  المبلغ المتأخر
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <a href={`tel:${b.customerPhone}`} className="hover:underline font-mono">
                                  {b.customerPhone}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPreviewBooking(b.id)}
                                className="text-red-600 dark:text-red-400 hover:underline font-black flex items-center gap-1 cursor-pointer"
                              >
                                <span>تسوية ومراجعة</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'approaching' && (
                <motion.div
                  key="approaching-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {approachingUnpaidBookings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      لا توجد حجوزات مستحقة قريباً دون سداد.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {approachingUnpaidBookings.map(b => {
                        const remaining = Math.max(0, b.totalPrice - ((b.paidAmount || 0) + (b.subsequentPayments || 0)));
                        const hall = halls.find(h => h.id === b.hallId);
                        const approachingText = getApproachingDaysText(b.days[0]?.date);
                        return (
                          <div
                            key={b.id}
                            className="p-4 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex flex-col justify-between gap-3 hover:border-amber-300 dark:hover:border-amber-800/40 transition-all group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-amber-200/20 mb-2">
                                  🔔 الفعالية {approachingText}
                                </span>
                                <h4 className="font-black text-[10px] text-slate-800 dark:text-white whitespace-normal leading-tight">
                                  {b.customerName}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-extrabold text-indigo-500">{hall?.name || 'قاعة غير محددة'}</span>
                                  <span>•</span>
                                  <span>{b.days[0]?.date}</span>
                                </div>
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-black text-amber-600 dark:text-amber-400 block">
                                  {remaining.toLocaleString()} {b.currency}
                                </span>
                                <span className="text-[9px] text-slate-400 font-extrabold block">
                                  المتبقي للدفع
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <a href={`tel:${b.customerPhone}`} className="hover:underline font-mono">
                                  {b.customerPhone}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPreviewBooking(b.id)}
                                className="text-amber-600 dark:text-amber-400 hover:underline font-black flex items-center gap-1 cursor-pointer"
                              >
                                <span>تسوية ومراجعة</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'accrual' && (
                <motion.div
                  key="accrual-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {needAccrualBookings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      لا توجد حجوزات تحتاج ترحيل إيراد حالياً.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {needAccrualBookings.map(b => {
                        const hall = halls.find(h => h.id === b.hallId);
                        return (
                          <div
                            key={b.id}
                            className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/20 rounded-2xl flex flex-col justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-800/40 transition-all group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-indigo-200/20 mb-2">
                                  📈 إيراد غير مرحل
                                </span>
                                <h4 className="font-black text-[10px] text-slate-800 dark:text-white whitespace-normal leading-tight">
                                  {b.customerName}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-extrabold text-indigo-500">{hall?.name || 'قاعة غير محددة'}</span>
                                  <span>•</span>
                                  <span>{b.days[0]?.date}</span>
                                </div>
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">
                                  {b.totalPrice.toLocaleString()} {b.currency}
                                </span>
                                <span className="text-[9px] text-slate-400 font-extrabold block">
                                  إجمالي العقد
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <a href={`tel:${b.customerPhone}`} className="hover:underline font-mono">
                                  {b.customerPhone}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPreviewBooking(b.id)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-black flex items-center gap-1 cursor-pointer"
                              >
                                <span>ترحيل الإيراد</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'insurance' && (
                <motion.div
                  key="insurance-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {pendingInsuranceBookings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      لا توجد تأمينات معلقة للرد حالياً.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pendingInsuranceBookings.map(b => {
                        const hall = halls.find(h => h.id === b.hallId);
                        return (
                          <div
                            key={b.id}
                            className="p-4 bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex flex-col justify-between gap-3 hover:border-rose-300 dark:hover:border-rose-800/40 transition-all group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-rose-200/20 mb-2">
                                  🛡️ تأمين لم يرد
                                </span>
                                <h4 className="font-black text-[10px] text-slate-800 dark:text-white whitespace-normal leading-tight">
                                  {b.customerName}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-extrabold text-indigo-500">{hall?.name || 'قاعة غير محددة'}</span>
                                  <span>•</span>
                                  <span>{b.days[0]?.date}</span>
                                </div>
                              </div>
                              <div className="text-left">
                                <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                                  {(b.insuranceAmount || 0).toLocaleString()} {b.currency}
                                </span>
                                <span className="text-[9px] text-slate-400 font-extrabold block">
                                  مبلغ التأمين
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <a href={`tel:${b.customerPhone}`} className="hover:underline font-mono">
                                  {b.customerPhone}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPreviewBooking(b.id)}
                                className="text-rose-600 dark:text-rose-400 hover:underline font-black flex items-center gap-1 cursor-pointer"
                              >
                                <span>رد التأمين</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'mortgages' && (
                <motion.div
                  key="mortgages-list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  {pendingMortgageBookings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      لا توجد رهونات معلقة للرد حالياً.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pendingMortgageBookings.map(b => {
                        const hall = halls.find(h => h.id === b.hallId);
                        const hasCash = b.mortgageAmount && b.mortgageAmount > 0 && b.mortgageStatus !== 'returned';
                        const hasPhysical = b.pledgesDescription && b.pledgesDescription.trim() !== '' && b.pledgeStatus !== 'returned';
                        
                        return (
                          <div
                            key={b.id}
                            className="p-4 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex flex-col justify-between gap-3 hover:border-amber-300 dark:hover:border-amber-800/40 transition-all group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-md border border-amber-200/20 mb-2">
                                  🔑 رهن معلق للرد
                                </span>
                                <h4 className="font-black text-[10px] text-slate-800 dark:text-white whitespace-normal leading-tight">
                                  {b.customerName}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span className="font-extrabold text-indigo-500">{hall?.name || 'قاعة غير محددة'}</span>
                                  <span>•</span>
                                  <span>{b.days[0]?.date}</span>
                                </div>
                              </div>
                              <div className="text-left shrink-0">
                                {hasCash && (
                                  <div className="mb-1">
                                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 block">
                                      {(b.mortgageAmount || 0).toLocaleString()} {b.currency}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-extrabold block">
                                      رهن نقدي
                                    </span>
                                  </div>
                                )}
                                {hasPhysical && (
                                  <div>
                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 block truncate max-w-[120px]" title={b.pledgesDescription}>
                                      {b.pledgesDescription}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-extrabold block">
                                      رهن عيني
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <a href={`tel:${b.customerPhone}`} className="hover:underline font-mono">
                                  {b.customerPhone}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPreviewBooking(b.id)}
                                className="text-amber-600 dark:text-amber-400 hover:underline font-black flex items-center gap-1 cursor-pointer"
                              >
                                <span>رد الرهن</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
