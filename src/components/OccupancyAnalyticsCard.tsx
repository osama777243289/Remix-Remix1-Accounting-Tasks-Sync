import React, { useState, useMemo } from 'react';
import { Booking, Hall } from '../types';
import { CalendarDays, BarChart3, PieChart, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OccupancyAnalyticsCardProps {
  bookings: Booking[];
  halls: Hall[];
}

export default function OccupancyAnalyticsCard({ bookings, halls }: OccupancyAnalyticsCardProps) {
  const [calendarType, setCalendarType] = useState<'gregorian' | 'hijri'>('gregorian');
  const [isExpanded, setIsExpanded] = useState(false);

  const { years, months, matrix } = useMemo(() => {
    const locale = 'ar-SA-u-nu-latn';
    const calType = calendarType === 'hijri' ? 'islamic-umalqura' : 'gregory';
    
    const yearFormatter = new Intl.DateTimeFormat(`${locale}-ca-${calType}`, { year: 'numeric' });
    const monthFormatter = new Intl.DateTimeFormat(`${locale}-ca-${calType}`, { month: 'long' });
    const monthIndexFormatter = new Intl.DateTimeFormat(`en-US-u-ca-${calType}`, { month: 'numeric' });

    const rawMatrix: Record<string, Record<string, Set<string>>> = {};
    const yearSet = new Set<string>();
    
    // To reliably get all 12 month names for the selected calendar
    const allMonths = new Map<string, string>();
    let tempDate = new Date(2024, 0, 1); // Start of a gregorian year
    for (let i = 0; i < 380; i += 15) { // step by 15 days to guarantee hitting every month
        const d = new Date(tempDate.getTime() + i * 24 * 60 * 60 * 1000);
        const mIdx = monthIndexFormatter.format(d);
        const mName = monthFormatter.format(d);
        allMonths.set(mIdx, mName);
    }

    bookings.forEach(b => {
      if (b.status === 'cancelled') return;
      
      const allDates = new Set<string>();
      if (b.days) {
        b.days.forEach(d => allDates.add(d.date));
      }
      if ((b as any).eventDates) {
        (b as any).eventDates.forEach((d: string) => allDates.add(d));
      }
      if ((b as any).eventDate) {
        allDates.add((b as any).eventDate);
      }
      
      Array.from(allDates).forEach(dateStr => {
        const bDate = new Date(dateStr);
        if (isNaN(bDate.getTime())) return;
        const year = yearFormatter.format(bDate);
        const monthIndex = monthIndexFormatter.format(bDate);
        
        yearSet.add(year);
        
        if (!rawMatrix[year]) rawMatrix[year] = {};
        if (!rawMatrix[year][monthIndex]) rawMatrix[year][monthIndex] = new Set<string>();
        
        rawMatrix[year][monthIndex].add(`${b.hallId}-${dateStr}`);
      });
    });

    let sortedYears = Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
    if (sortedYears.length === 0) {
       sortedYears = [yearFormatter.format(new Date())];
    }

    // Ensure all 12 months are listed in order
    const sortedMonths = Array.from({length: 12}, (_, i) => {
        const idx = (i + 1).toString();
        return {
            index: idx,
            name: allMonths.get(idx) || `شهر ${idx}`
        };
    });

    const finalMatrix: Record<string, Record<string, { booked: number, free: number }>> = {};
    const totalHalls = halls.length || 1;

    sortedYears.forEach(year => {
        finalMatrix[year] = {};
        sortedMonths.forEach(m => {
            const booked = rawMatrix[year]?.[m.index]?.size || 0;
            // Approximate capacity per month is ~30 days * total halls
            const capacity = 30 * totalHalls;
            const free = Math.max(0, capacity - booked);
            finalMatrix[year][m.index] = { booked, free };
        });
    });

    return { years: sortedYears, months: sortedMonths, matrix: finalMatrix };
  }, [bookings, halls, calendarType]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col mb-3 sm:mb-6">
      {/* Header & Controls */}
      <div 
        className="p-3 sm:p-5 border-b border-slate-100 dark:border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-4 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
            <BarChart3 className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-xs sm:text-lg font-black text-slate-900 dark:text-white">مؤشرات الإشغال والفراغ (العدد)</h3>
            <p className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5 sm:mt-1">مقارنة عدد أيام الحجز وأيام الفراغ للأشهر والسنوات</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end">
          {/* Calendar Type */}
          <div 
            className="flex items-center bg-white dark:bg-slate-950 rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-slate-200 dark:border-slate-800 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCalendarType('gregorian')}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg transition-all ${calendarType === 'gregorian' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
            >
              ميلادي
            </button>
            <button
              onClick={() => setCalendarType('hijri')}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg transition-all ${calendarType === 'hijri' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}
            >
              هجري
            </button>
          </div>
          <button className="p-1.5 sm:p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content - Data Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-0 border-t border-slate-100 dark:border-slate-800">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-max">
                  <thead>
                    <tr>
                      <th className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-l border-slate-200 dark:border-slate-700 text-xs md:text-sm font-black text-slate-700 dark:text-slate-300 w-24 md:w-48 text-center sticky right-0 z-20 backdrop-blur-md">
                        الشهر / السنة
                      </th>
                      {years.map(year => (
                        <th key={year} className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-l last:border-l-0 border-slate-200 dark:border-slate-700 text-base md:text-lg font-black text-slate-900 dark:text-white text-center">
                          {year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((month, rowIndex) => (
                      <tr key={month.index} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 md:p-4 border-b border-l border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/95 text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 text-center shadow-[inset_-1px_0_0_0_#f1f5f9] dark:shadow-[inset_-1px_0_0_0_#1e293b] sticky right-0 z-10 backdrop-blur-md">
                          {month.name}
                        </td>
                        {years.map(year => {
                          const data = matrix[year][month.index];
                          const hasBookings = data.booked > 0;
                          return (
                            <td key={year} className="p-2 md:p-3 border-b border-l last:border-l-0 border-slate-100 dark:border-slate-800 text-center">
                              <div className="flex flex-col gap-1.5 items-center justify-center">
                                <div className={`flex items-center justify-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 rounded-lg w-20 md:w-32 ${hasBookings ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                                  <span className="text-xs md:text-sm font-black">{data.booked}</span>
                                  <span className="text-[9px] md:text-[10px] whitespace-nowrap">يوم محجوز</span>
                                </div>
                                <div className="flex items-center justify-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 rounded-lg w-20 md:w-32 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold">
                                  <span className="text-xs md:text-sm font-black">{data.free}</span>
                                  <span className="text-[9px] md:text-[10px] whitespace-nowrap">يوم فارغ</span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Grid View */}
              <div className="md:hidden p-4 grid grid-cols-1 gap-6">
                {years.map(year => (
                  <div key={year} className="space-y-3">
                    <h4 className="text-lg font-black text-slate-800 dark:text-white border-b-2 border-indigo-500 pb-1 w-fit">{year}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {months.map(month => {
                        const data = matrix[year][month.index];
                        const hasBookings = data.booked > 0;
                        return (
                          <div key={month.index} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 block text-center mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">
                              {month.name}
                            </span>
                            <div className="space-y-1.5">
                              <div className={`flex flex-col items-center justify-center py-1.5 rounded-xl ${hasBookings ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white/50 dark:bg-slate-900/50 text-slate-400'}`}>
                                <span className="text-sm font-black leading-none">{data.booked}</span>
                                <span className="text-[8px] font-bold uppercase mt-0.5">محجوز</span>
                              </div>
                              <div className="flex flex-col items-center justify-center py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                <span className="text-sm font-black leading-none">{data.free}</span>
                                <span className="text-[8px] font-bold uppercase mt-0.5">فارغ</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
