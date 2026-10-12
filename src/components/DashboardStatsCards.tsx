import React, { useState, useMemo } from 'react';
import { Booking, Hall, StandardCostTemplate } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Activity,
  CalendarDays,
  CheckCircle,
  Clock,
  CheckSquare,
  CalendarX,
  Percent,
  Coins,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Target
} from 'lucide-react';

interface DashboardStatsCardsProps {
  bookings: Booking[];
  halls: Hall[];
  globalCurrencySymbol: string;
  onPreviewBooking?: (bookingId: string) => void;
  currentDate?: Date;
  selectedStatType?: 'confirmed' | 'pending' | 'completed' | 'empty' | 'occupancy' | 'collected' | 'remaining' | null;
  onSelectedStatTypeChange?: (type: 'confirmed' | 'pending' | 'completed' | 'empty' | 'occupancy' | 'collected' | 'remaining' | null) => void;
  depositFilter?: 'all' | 'with' | 'without';
  onDepositFilterChange?: (filter: 'all' | 'with' | 'without') => void;
  standardCosts?: StandardCostTemplate[];
  defaultExpanded?: boolean;
}

export default function DashboardStatsCards({
  bookings,
  halls,
  globalCurrencySymbol,
  onPreviewBooking,
  currentDate = new Date(),
  selectedStatType: externalSelectedStatType,
  onSelectedStatTypeChange,
  depositFilter: externalDepositFilter,
  onDepositFilterChange,
  standardCosts = [],
  defaultExpanded = true,
}: DashboardStatsCardsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [internalSelectedStatType, setInternalSelectedStatType] = useState<'confirmed' | 'pending' | 'completed' | 'empty' | 'occupancy' | 'collected' | 'remaining' | null>(null);
  const [internalDepositFilter, setInternalDepositFilter] = useState<'all' | 'with' | 'without'>('all');

  const selectedStatType = onSelectedStatTypeChange !== undefined ? externalSelectedStatType : internalSelectedStatType;
  const depositFilter = onDepositFilterChange !== undefined ? externalDepositFilter : internalDepositFilter;

  const setDepositFilter = (filter: 'all' | 'with' | 'without') => {
    if (onDepositFilterChange) {
      onDepositFilterChange(filter);
    } else {
      setInternalDepositFilter(filter);
    }
  };

  const setSelectedStatType = (type: any) => {
    setDepositFilter('all');
    if (onSelectedStatTypeChange) {
      onSelectedStatTypeChange(type);
    } else {
      setInternalSelectedStatType(type);
    }
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const thisMonthBookings = useMemo(() => {
    return bookings.filter(b => {
      // If the whole booking is cancelled, ignore it
      if (b.status === 'cancelled') return false;
      
      const dates = new Set<string>();
      // Only consider days that are NOT cancelled
      if (b.days) {
        b.days
          .filter(d => d.status !== 'cancelled')
          .forEach(d => dates.add(d.date));
      }
      
      // Also check top-level eventDate if no days exist (legacy support)
      if (dates.size === 0 && (b as any).eventDate) {
        dates.add((b as any).eventDate);
      }
      
      let inMonth = false;
      dates.forEach(d => {
        const dateObj = new Date(d);
        if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
          inMonth = true;
        }
      });
      return inMonth;
    });
  }, [bookings, currentMonth, currentYear]);

  const stats = useMemo(() => {
    const countDaysByStatus = (status: string) => {
      let count = 0;
      thisMonthBookings.forEach(b => {
        if (b.status === status) {
          const dates = (b.days || []).filter(d => d.status !== 'cancelled').map(d => d.date);
          
          dates.forEach(d => {
            const dateObj = new Date(d);
            if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
              count++;
            }
          });
        }
      });
      return count;
    };

    const countDaysByStatusAndDeposit = (status: string, hasDeposit: boolean) => {
      let count = 0;
      thisMonthBookings.forEach(b => {
        const matchesStatus = b.status === status;
        const depositAmount = b.paidAmount || 0;
        const matchesDeposit = hasDeposit ? (depositAmount > 0) : (depositAmount === 0);
        
        if (matchesStatus && matchesDeposit) {
          const dates = (b.days || []).filter(d => d.status !== 'cancelled').map(d => d.date);
          
          dates.forEach(d => {
            const dateObj = new Date(d);
            if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
              count++;
            }
          });
        }
      });
      return count;
    };

    const confirmedCount = countDaysByStatus('confirmed');
    const pendingCount = countDaysByStatus('pending');
    const completedCount = countDaysByStatus('completed');

    const confirmedWithDeposit = countDaysByStatusAndDeposit('confirmed', true);
    const confirmedWithoutDeposit = countDaysByStatusAndDeposit('confirmed', false);
    const pendingWithDeposit = countDaysByStatusAndDeposit('pending', true);
    const pendingWithoutDeposit = countDaysByStatusAndDeposit('pending', false);
    
    // Total collected amount for bookings in this month
    const totalCollected = thisMonthBookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalRemaining = thisMonthBookings.reduce((sum, b) => sum + ((b.totalPrice || 0) - (b.paidAmount || 0)), 0);

    // Calculate Occupancy
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalAvailableDays = daysInMonth * halls.length;
    
    const bookedDaysSet = new Set<string>();
    thisMonthBookings.forEach(b => {
      const dates = (b.days || []).filter(d => d.status !== 'cancelled').map(d => d.date);
      
      dates.forEach(d => {
        const dateObj = new Date(d);
        if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
          bookedDaysSet.add(`${b.hallId}-${d}`);
        }
      });
    });

    const bookedDaysCount = bookedDaysSet.size;
    const emptyDaysCount = Math.max(0, totalAvailableDays - bookedDaysCount);
    const occupancyRate = totalAvailableDays > 0 ? (bookedDaysCount / totalAvailableDays) * 100 : 0;

    return {
      confirmedCount,
      pendingCount,
      completedCount,
      emptyDaysCount,
      totalCollected,
      totalRemaining,
      confirmedWithDeposit,
      confirmedWithoutDeposit,
      pendingWithDeposit,
      pendingWithoutDeposit,
      occupancyRate: occupancyRate.toFixed(1)
    };
  }, [thisMonthBookings, halls, currentMonth, currentYear]);



  return (
    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/50 dark:border-slate-800/50 shadow-premium overflow-hidden flex flex-col mb-2 sm:mb-4 mt-1 sm:mt-2 transition-all duration-500">
      <div 
        className="p-2.5 sm:p-3.5 md:p-4 flex justify-between items-center cursor-pointer hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all duration-300 group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0 group-hover:scale-105 transition-transform duration-500">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm md:text-base text-slate-900 dark:text-white tracking-tight">إحصائيات شهر {currentDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">تحليل الأداء اليومي والتدفقات النقدية</p>
          </div>
        </div>
        <button className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all duration-300 flex items-center justify-center">
          {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-2.5 sm:p-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-1.5 sm:gap-2">
              
              <motion.div 
                whileHover={{ y: -2 }}
                className="group relative bg-white/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-row items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-md w-full"
                onClick={() => setSelectedStatType('confirmed')}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase truncate w-full">مؤكدة</span>
                  <div className="text-base font-display font-black text-slate-900 dark:text-white">{stats.confirmedCount}</div>
                </div>
                <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-emerald-500" />
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="group relative bg-white/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-row items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-md w-full"
                onClick={() => setSelectedStatType('pending')}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase truncate w-full">مبدئية</span>
                  <div className="text-base font-display font-black text-slate-900 dark:text-white">{stats.pendingCount}</div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="group relative bg-white/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-row items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-md w-full"
                onClick={() => setSelectedStatType('completed')}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase truncate w-full">مكتملة</span>
                  <div className="text-base font-display font-black text-slate-900 dark:text-white">{stats.completedCount}</div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="group relative bg-white/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-row items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-md w-full"
                onClick={() => setSelectedStatType('empty')}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
                  <CalendarX className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase truncate w-full">فارغة</span>
                  <div className="text-base font-display font-black text-slate-900 dark:text-white">{stats.emptyDaysCount}</div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="group relative bg-white/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-row items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-md w-full"
                onClick={() => setSelectedStatType('occupancy')}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase truncate w-full">الإشغال</span>
                  <div className="text-base font-display font-black text-slate-900 dark:text-white" dir="ltr">{stats.occupancyRate}%</div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="group relative bg-white/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-row items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-md w-full"
                onClick={() => setSelectedStatType('collected')}
              >
                <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4 text-violet-500" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase truncate w-full">المحصل</span>
                  <div className="text-base font-display font-black text-slate-900 dark:text-white truncate w-full">
                    {stats.totalCollected.toLocaleString()}
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -2 }}
                className="group relative bg-white/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 flex flex-row items-center gap-3 cursor-pointer transition-all duration-300 hover:shadow-md w-full"
                onClick={() => setSelectedStatType('remaining')}
              >
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase truncate w-full">المتبقي</span>
                  <div className="text-base font-display font-black text-slate-900 dark:text-white truncate w-full">
                    {stats.totalRemaining.toLocaleString()}
                  </div>
                </div>
              </motion.div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStatType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {selectedStatType === 'confirmed' ? 'الحجوزات المؤكدة' :
                   selectedStatType === 'pending' ? 'الحجوزات المبدئية' :
                   selectedStatType === 'completed' ? 'الحجوزات المكتملة' :
                   selectedStatType === 'collected' ? 'المبالغ المحصلة' :
                   selectedStatType === 'remaining' ? 'المبالغ المتبقية' :
                   selectedStatType === 'empty' ? 'الأيام الفارغة' :
                   'إشغال القاعات'}
                </h3>
                <button 
                  onClick={() => setSelectedStatType(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <CalendarX className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Filter bar for deposits (if not empty / occupancy) */}
              {selectedStatType && selectedStatType !== 'empty' && selectedStatType !== 'occupancy' && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex gap-2">
                  <button
                    onClick={() => setDepositFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${depositFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setDepositFilter('with')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${depositFilter === 'with' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    بعربون
                  </button>
                  <button
                    onClick={() => setDepositFilter('without')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${depositFilter === 'without' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    بدون عربون
                  </button>
                </div>
              )}

              <div className="p-4 overflow-y-auto flex-1">
                {selectedStatType === 'empty' || selectedStatType === 'occupancy' ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>تفاصيل الأيام الفارغة والإشغال تظهر بشكل مرئي في التقويم الذكي أسفل هذه البطاقة.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {thisMonthBookings
                      .filter(b => {
                        if (selectedStatType === 'confirmed') return b.status === 'confirmed';
                        if (selectedStatType === 'pending') return b.status === 'pending';
                        if (selectedStatType === 'completed') return b.status === 'completed';
                        if (selectedStatType === 'collected') return (b.paidAmount || 0) > 0;
                        if (selectedStatType === 'remaining') return ((b.totalPrice || 0) - (b.paidAmount || 0)) > 0;
                        return false;
                      })
                      .filter(b => {
                        if (depositFilter === 'all') return true;
                        const hasDeposit = (b.paidAmount || 0) > 0;
                        if (depositFilter === 'with') return hasDeposit;
                        if (depositFilter === 'without') return !hasDeposit;
                        return true;
                      })
                      .map(booking => (
                        <div key={booking.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 gap-4">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white mb-1">{booking.customerName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                              <span>{halls.find(h => h.id === booking.hallId)?.name || 'قاعة غير معروفة'}</span>
                              <span>•</span>
                              {(() => {
                                const dates = (booking.eventDates && booking.eventDates.length > 0)
                                  ? booking.eventDates
                                  : (booking.days && booking.days.length > 0)
                                    ? booking.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                                    : (booking as any).eventDate ? [(booking as any).eventDate] : [];
                                if (dates.length <= 1) {
                                  return <span>{dates[0] || 'غير محدد'}</span>;
                                }
                                return (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">({dates.length} أيام):</span>
                                    <span>{dates.join(' | ')}</span>
                                  </span>
                                );
                              })()}
                              <span>•</span>
                              {(booking.paidAmount || 0) > 0 ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded border border-emerald-100 dark:border-emerald-900/30">
                                  بعربون ({(booking.paidAmount || 0).toLocaleString()})
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded border border-amber-100 dark:border-amber-900/30">
                                  بدون عربون
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                            {selectedStatType === 'collected' ? (
                              <div className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                                {(booking.paidAmount || 0).toLocaleString()} {booking.currency || globalCurrencySymbol}
                              </div>
                            ) : selectedStatType === 'remaining' ? (
                              <div className="text-rose-600 dark:text-rose-400 font-bold font-mono">
                                {((booking.totalPrice || 0) - (booking.paidAmount || 0)).toLocaleString()} {booking.currency || globalCurrencySymbol}
                              </div>
                            ) : (
                              <div className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                                {(booking.totalPrice || 0).toLocaleString()} {booking.currency || globalCurrencySymbol}
                              </div>
                            )}

                            {onPreviewBooking && (
                              <button 
                                onClick={() => {
                                  onPreviewBooking(booking.id);
                                }}
                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                              >
                                عرض العقد
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {thisMonthBookings
                        .filter(b => {
                          if (selectedStatType === 'confirmed') return b.status === 'confirmed';
                          if (selectedStatType === 'pending') return b.status === 'pending';
                          if (selectedStatType === 'completed') return b.status === 'completed';
                          if (selectedStatType === 'collected') return (b.paidAmount || 0) > 0;
                          if (selectedStatType === 'remaining') return ((b.totalPrice || 0) - (b.paidAmount || 0)) > 0;
                          return false;
                        })
                        .filter(b => {
                          if (depositFilter === 'all') return true;
                          const hasDeposit = (b.paidAmount || 0) > 0;
                          if (depositFilter === 'with') return hasDeposit;
                          if (depositFilter === 'without') return !hasDeposit;
                          return true;
                        }).length === 0 && (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          لا توجد حجوزات تطابق هذا التصنيف
                        </div>
                      )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
