import React, { useState } from 'react';
import { Booking, Hall } from '../types';
import { ChevronLeft, ChevronRight, CalendarDays, Calendar, Sun, Moon, Coffee, X, Clock, MapPin, Phone, User, Building, Receipt, CheckCircle2, FileText, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OfficialVoucherPrintModal from './OfficialVoucherPrintModal';
import { usePermissions } from '../lib/permissions';

interface SmartCalendarProps {
  bookings: Booking[];
  halls: Hall[];
  vouchers?: any[];
  accounts?: any[];
  currencies?: any[];
  company?: any;
  currentUser?: any;
  currentDate?: Date;
  onMonthChange?: (date: Date) => void;
  onDateSelect?: (dates: string[]) => void;
  onDateDoubleClick?: (date: string) => void;
  onUpdateBookingStatus?: (bookingId: string, newStatus: "pending" | "confirmed" | "completed" | "cancelled") => void;
  onPreviewBooking?: (booking: Booking) => void;
  onEditBooking?: (booking: Booking) => void;
  onPrintVoucher?: (voucher: any, booking?: Booking) => void;
  selectedBooking?: Booking | null;
  onSelectedBookingChange?: (booking: Booking | null) => void;
  selectedDayDetails?: {date: string, bookings: Booking[]} | null;
  onSelectedDayDetailsChange?: (details: {date: string, bookings: Booking[]} | null) => void;
}

export default function SmartCalendar({ 
  bookings, 
  halls, 
  vouchers = [],
  accounts = [],
  currencies = [],
  company,
  currentUser,
  currentDate: propCurrentDate, 
  onMonthChange, 
  onDateSelect, 
  onDateDoubleClick, 
  onUpdateBookingStatus, 
  onPreviewBooking, 
  onEditBooking,
  onPrintVoucher,
  selectedBooking: propSelectedBooking,
  onSelectedBookingChange,
  selectedDayDetails: propSelectedDayDetails,
  onSelectedDayDetailsChange
}: SmartCalendarProps) {
  const { currentUser: authUser } = usePermissions();
  const effectiveUser = currentUser || authUser;
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<any | null>(null);
  const [selectedBookingForVoucherPrint, setSelectedBookingForVoucherPrint] = useState<Booking | null>(null);
  const [isOfficialVoucherModalOpen, setIsOfficialVoucherModalOpen] = useState(false);
  const [internalDate, setInternalDate] = useState(new Date());
  const currentDate = propCurrentDate || internalDate;

  const handleMonthChange = (newDate: Date) => {
    if (!propCurrentDate) {
      setInternalDate(newDate);
    }
    if (onMonthChange) {
      onMonthChange(newDate);
    }
  };

  const [internalSelectedDayDetails, setInternalSelectedDayDetails] = useState<{date: string, bookings: Booking[]} | null>(null);
  const [internalSelectedBooking, setInternalSelectedBooking] = useState<Booking | null>(null);

  const selectedDayDetails = onSelectedDayDetailsChange !== undefined ? propSelectedDayDetails : internalSelectedDayDetails;
  const [activeDayBookingId, setActiveDayBookingId] = useState<string | null>(null);
  const setSelectedDayDetails = (val: {date: string, bookings: Booking[]} | null) => {
    setActiveDayBookingId(null);
    if (onSelectedDayDetailsChange) onSelectedDayDetailsChange(val);
    else setInternalSelectedDayDetails(val);
  };

  const activeDayBooking = selectedDayDetails?.bookings && selectedDayDetails.bookings.length > 0
    ? ((activeDayBookingId ? selectedDayDetails.bookings.find(b => b.id === activeDayBookingId) : null) || selectedDayDetails.bookings[0])
    : null;

  const selectedBooking = onSelectedBookingChange !== undefined ? propSelectedBooking : internalSelectedBooking;
  const setSelectedBooking = (val: Booking | null) => {
    if (onSelectedBookingChange) onSelectedBookingChange(val);
    else setInternalSelectedBooking(val);
  };

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [calendarSystem, setCalendarSystem] = useState<'gregorian' | 'hijri'>('gregorian');
  const [dayDisplayInfo, setDayDisplayInfo] = useState<'periods' | 'renter' | 'remaining' | 'eventType'>('periods');

  // Helper to check and convert Gregorian date to Hijri parts
  const getHijriMonthAndYear = (date: Date) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
        month: 'numeric',
        year: 'numeric'
      }).formatToParts(date);
      const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);
      const year = parseInt(parts.find(p => p.type === 'year')?.value || '1447', 10);
      return { month, year };
    } catch (e) {
      return { month: 1, year: 1447 };
    }
  };

  const getGregorianDateOfHijriDay1 = (date: Date, targetMonth: number, targetYear: number) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric' }).formatToParts(date);
      const hijriDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
      
      let current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      current.setDate(current.getDate() - (hijriDay - 1));
      
      for (let i = 0; i < 15; i++) {
        const p = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(current);
        const d = parseInt(p.find(pt => pt.type === 'day')?.value || '1', 10);
        const m = parseInt(p.find(pt => pt.type === 'month')?.value || '1', 10);
        const y = parseInt(p.find(pt => pt.type === 'year')?.value || '1447', 10);
        
        if (d === 1 && m === targetMonth && y === targetYear) {
          return current;
        }
        
        if (y < targetYear || (y === targetYear && m < targetMonth)) {
          current.setDate(current.getDate() + 1);
        } else if (y > targetYear || (y === targetYear && m > targetMonth)) {
          current.setDate(current.getDate() - 1);
        } else {
          current.setDate(current.getDate() - (d - 1));
        }
      }
      return current;
    } catch (e) {
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
  };

  const generateHijriMonthDays = (firstDayGregorian: Date, targetMonth: number) => {
    const daysList: { day: number; dateObj: Date; dateStr: string; mainLabel: string; subLabel: string }[] = [];
    let current = new Date(firstDayGregorian.getFullYear(), firstDayGregorian.getMonth(), firstDayGregorian.getDate());
    
    for (let i = 1; i <= 31; i++) {
      let d = 1;
      let m = targetMonth;
      try {
        const p = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).formatToParts(current);
        d = parseInt(p.find(pt => pt.type === 'day')?.value || '1', 10);
        m = parseInt(p.find(pt => pt.type === 'month')?.value || '1', 10);
      } catch (e) {
        break;
      }
      
      if (m !== targetMonth) {
        break;
      }
      
      const yearStr = current.getFullYear();
      const monthStr = (current.getMonth() + 1).toString().padStart(2, '0');
      const dayStr = current.getDate().toString().padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      
      let gregSub = '';
      try {
        const parts = new Intl.DateTimeFormat('ar-SA', {
          day: 'numeric',
          month: 'long'
        }).formatToParts(current);
        const gd = parts.find(p => p.type === 'day')?.value || '';
        const gm = parts.find(p => p.type === 'month')?.value || '';
        gregSub = `${gd} ${gm}`;
      } catch (e) {
        // fallback
      }

      daysList.push({
        day: d,
        dateObj: new Date(current),
        dateStr,
        mainLabel: d.toString(),
        subLabel: gregSub,
      });
      
      current.setDate(current.getDate() + 1);
    }
    return daysList;
  };

  // Generate days based on calendar system
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  let daysData: { day: number; dateObj: Date; dateStr: string; mainLabel: string; subLabel: string }[] = [];
  let offset = 0;

  if (calendarSystem === 'gregorian') {
    offset = getFirstDayOfMonth(currentDate);
    daysData = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => {
      const day = i + 1;
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      let hijriSub = '';
      try {
        const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
          day: 'numeric',
          month: 'long'
        }).formatToParts(dateObj);
        const hd = parts.find(p => p.type === 'day')?.value || '';
        const hm = parts.find(p => p.type === 'month')?.value || '';
        hijriSub = `${hd} ${hm}`;
      } catch (e) {
        // fallback
      }

      return {
        day,
        dateObj,
        dateStr,
        mainLabel: day.toString(),
        subLabel: hijriSub,
      };
    });
  } else {
    const { month, year } = getHijriMonthAndYear(currentDate);
    const firstDayGregorian = getGregorianDateOfHijriDay1(currentDate, month, year);
    offset = firstDayGregorian.getDay();
    daysData = generateHijriMonthDays(firstDayGregorian, month);
  }

  const getDayBookingsByDate = (dateStr: string) => {
    return bookings.filter(b => {
      // If days array exists, it should be the source of truth for cancellations
      const hasDays = b.days && b.days.length > 0;
      const matchesInDays = hasDays && b.days!.some(d => d.date === dateStr && d.status !== 'cancelled');
      
      // Fallback to eventDates/eventDate only if not explicitly cancelled in days (or if days doesn't exist)
      const matchesInLegacy = !hasDays && (
        ((b as any).eventDates || []).includes(dateStr) || 
        ((b as any).eventDate === dateStr)
      );

      // If we found a match in days, or if we didn't have days but found a match in legacy
      const matchesDate = matchesInDays || matchesInLegacy;
      
      const matchesStatus = activeFilter === 'all' || b.status === activeFilter;
      return matchesDate && matchesStatus && b.status !== 'cancelled';
    });
  };

  const handleDayClick = (dayData: { dateStr: string; day: number }) => {
    const dayBookings = getDayBookingsByDate(dayData.dateStr);
    if (onDateSelect) {
      onDateSelect([dayData.dateStr]);
    }
    setSelectedDayDetails({
      date: dayData.dateStr,
      bookings: dayBookings
    });
  };

  const handleDayDoubleClick = (dayData: { dateStr: string } | string | number) => {
    if (onDateDoubleClick) {
      if (typeof dayData === 'object' && dayData !== null && 'dateStr' in dayData) {
        onDateDoubleClick(dayData.dateStr);
      } else if (typeof dayData === 'string') {
        onDateDoubleClick(dayData);
      } else {
        const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${dayData.toString().padStart(2, '0')}`;
        onDateDoubleClick(dateStr);
      }
    }
  };

  const handleHijriMonthChange = (direction: 'next' | 'prev') => {
    const { month, year } = getHijriMonthAndYear(currentDate);
    const day1 = getGregorianDateOfHijriDay1(currentDate, month, year);
    const nextDate = new Date(day1);
    if (direction === 'next') {
      nextDate.setDate(nextDate.getDate() + 30);
    } else {
      nextDate.setDate(nextDate.getDate() - 15);
    }
    handleMonthChange(nextDate);
  };

  const handlePrevMonth = () => {
    if (calendarSystem === 'hijri') {
      handleHijriMonthChange('prev');
    } else {
      handleMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (calendarSystem === 'hijri') {
      handleHijriMonthChange('next');
    } else {
      handleMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const getCalendarTitle = () => {
    if (calendarSystem === 'hijri') {
      try {
        const hijriName = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
          month: 'long',
          year: 'numeric'
        }).format(currentDate);
        return hijriName;
      } catch (e) {
        return `شهر هجري`;
      }
    } else {
      return currentDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
    }
  };

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const pendingCount = activeBookings.filter(b => b.status === 'pending').length;
  const confirmedCount = activeBookings.filter(b => b.status === 'confirmed').length;
  const completedCount = activeBookings.filter(b => b.status === 'completed').length;
  const totalCount = activeBookings.length;

  const getMonthBookings = () => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const list = bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      
      const hasDateInMonth = (b.days || []).some(d => {
        if (!d.date || d.status === 'cancelled') return false;
        const dDate = new Date(d.date);
        if (isNaN(dDate.getTime())) return false;
        return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
      });
      
      const hasEventDateInMonth = ((b as any).eventDates || []).some((dateStr: string) => {
        if (!dateStr) return false;
        const dDate = new Date(dateStr);
        if (isNaN(dDate.getTime())) return false;
        return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
      });
      
      const isSingleEventInMonth = (b as any).eventDate ? (() => {
        const dDate = new Date((b as any).eventDate);
        if (isNaN(dDate.getTime())) return false;
        return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
      })() : false;
      
      return hasDateInMonth || hasEventDateInMonth || isSingleEventInMonth;
    });

    return [...list].sort((a, b) => {
      const dateA = a.days?.find(d => d.status !== 'cancelled')?.date || (a as any).eventDate || '';
      const dateB = b.days?.find(d => d.status !== 'cancelled')?.date || (b as any).eventDate || '';
      return dateA.localeCompare(dateB);
    });
  };

  const monthBookings = getMonthBookings();

  return (
    <>
      <div className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white dark:border-slate-800 p-2.5 sm:p-4 md:p-6 rounded-xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-2.5 sm:space-y-4 md:space-y-6" dir="rtl">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 pb-2 md:pb-4">
          <div className="flex gap-1 md:gap-2 order-2 md:order-1">
            <button onClick={handlePrevMonth} className="p-1.5 sm:p-2 md:p-3 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl md:rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-800 transition-all cursor-pointer">
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </button>
            <button onClick={handleNextMonth} className="p-1.5 sm:p-2 md:p-3 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl md:rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-800 transition-all cursor-pointer">
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </button>
          </div>
          <h2 className="text-sm sm:text-lg md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-1.5 sm:gap-3 order-1 md:order-2">
            {getCalendarTitle()}
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 md:h-7 md:w-7 text-indigo-500" />
          </h2>
        </div>

        {/* Unified Single-Row Controls Bar (فلاتر الحالة + خيارات التقويم والتفاصيل في صف واحد بخط عريض) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">تصفية الأيام بحسب الحالة:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'الكل', count: totalCount, color: 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50' },
                { id: 'pending', label: 'مبدئي', count: pendingCount, color: 'border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/50' },
                { id: 'confirmed', label: 'مؤكد', count: confirmedCount, color: 'border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/50' },
                { id: 'completed', label: 'مكتمل', count: completedCount, color: 'border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/50' },
              ].map(filter => {
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all border cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      isActive 
                        ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white border-indigo-600 scale-95 shadow-md' 
                        : 'hover:shadow-sm'
                    } ${!isActive ? filter.color : ''}`}
                  >
                    <span className="font-black">{filter.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono'}`}>{filter.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display & System Options */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">عرض التقويم:</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCalendarSystem('gregorian')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${calendarSystem === 'gregorian' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  ميلادي
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSystem('hijri')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${calendarSystem === 'hijri' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  هجري
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">عرض التفاصيل بالأيام:</span>
              <select
                value={dayDisplayInfo}
                onChange={(e) => setDayDisplayInfo(e.target.value as any)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs font-black shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="periods">أيقونات الفترات فقط</option>
                <option value="renter">اسم المستأجر</option>
                <option value="remaining">المبلغ المتبقي</option>
                <option value="eventType">نوع الفعالية</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-3">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
            <div key={day} className="text-center font-bold text-[10px] md:text-sm text-slate-500 truncate mb-2">{day}</div>
          ))}
          
          {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}

          {daysData.map(dayItem => {
            const dayBookings = getDayBookingsByDate(dayItem.dateStr);
            const hasMorning = dayBookings.some(b => b.period === 'morning' || b.period?.includes('صباح'));
            const hasEvening = dayBookings.some(b => b.period === 'evening' || b.period?.includes('مساء') || (!b.period?.includes('صباح') && !b.period?.includes('ليل') && b.period !== 'morning' && b.period !== 'night'));
            const hasNight = dayBookings.some(b => b.period === 'night' || b.period?.includes('ليل'));
            
            const hasPending = dayBookings.some(b => b.status === 'pending');
            const hasConfirmed = dayBookings.some(b => b.status === 'confirmed');
            const hasCompleted = dayBookings.some(b => b.status === 'completed');

            const isToday = new Date().getDate() === dayItem.dateObj.getDate() && 
                            new Date().getMonth() === dayItem.dateObj.getMonth() && 
                            new Date().getFullYear() === dayItem.dateObj.getFullYear();
            const hasAnyBooking = dayBookings.length > 0;

            let cellBg = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md';
            if (hasAnyBooking) {
              if (hasConfirmed && hasPending) {
                cellBg = 'bg-gradient-to-br from-indigo-50 to-amber-50 dark:from-indigo-900/30 dark:to-amber-900/30 border-indigo-400 dark:border-indigo-500 shadow-sm hover:shadow-md';
              } else if (hasConfirmed) {
                cellBg = 'bg-indigo-50/90 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500 shadow-sm hover:shadow-md hover:border-indigo-500';
              } else if (hasPending) {
                cellBg = 'bg-amber-50/90 dark:bg-amber-900/30 border-amber-400 dark:border-amber-500 shadow-sm hover:shadow-md hover:border-amber-500';
              } else if (hasCompleted) {
                cellBg = 'bg-emerald-50/90 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-500 shadow-sm hover:shadow-md hover:border-emerald-500';
              } else {
                cellBg = 'bg-slate-100 dark:bg-slate-800/80 border-slate-350 dark:border-slate-600 shadow-sm hover:shadow-md hover:border-slate-400';
              }
            } else if (isToday) {
              cellBg = 'bg-slate-50 dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 shadow-md ring-1 ring-indigo-500';
            }

            const getStatusLabel = () => {
              if (hasConfirmed && hasPending) return 'مؤكد/مبدئي';
              if (hasConfirmed) return 'مؤكد';
              if (hasPending) return 'مبدئي';
              if (hasCompleted) return 'مكتمل';
              return '';
            };

            return (
              <div 
                key={dayItem.dateStr} 
                onClick={() => handleDayClick(dayItem)}
                onDoubleClick={() => handleDayDoubleClick(dayItem)}
                className={`p-1.5 md:p-3 rounded-2xl flex flex-col items-center justify-between gap-1 md:gap-2 cursor-pointer transition-all min-h-[60px] md:min-h-[110px] border-2 ${cellBg} ${isToday && hasAnyBooking ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
              >
                <div className="flex flex-col items-center gap-1 w-full">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`font-black text-base md:text-xl leading-none ${isToday && !hasAnyBooking ? 'text-indigo-600 dark:text-indigo-400' : hasAnyBooking ? 'text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                      {dayItem.mainLabel}
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-bold leading-none select-none text-center">
                      {dayItem.subLabel}
                    </span>
                  </div>
                  {hasAnyBooking && (
                    <span className={`text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none text-center ${
                      hasConfirmed && hasPending ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/45' :
                      hasConfirmed ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-950/30' :
                      hasPending ? 'text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/30' :
                      hasCompleted ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/30' :
                      'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {getStatusLabel()}
                    </span>
                  )}
                </div>

                {hasAnyBooking && dayDisplayInfo !== 'periods' ? (
                  <div className="flex flex-col gap-0.5 md:gap-1 w-full mt-auto max-h-[60px] overflow-y-auto no-scrollbar">
                    {dayBookings.map((b, idx) => {
                      let text = '';
                      if (dayDisplayInfo === 'renter') {
                        text = b.customerName;
                      } else if (dayDisplayInfo === 'remaining') {
                        const totalPaid = (b.paidAmount || 0) + (b.subsequentPayments || 0);
                        if (b.days && b.days.length > 0) {
                          const dayEntry = b.days.find(d => d.date === dayItem.dateStr);
                          if (dayEntry) {
                            const dayPrice = dayEntry.price - (dayEntry.discount || 0);
                            const activeDays = b.days
                              .filter(d => d.status !== 'cancelled')
                              .sort((x, y) => x.date.localeCompare(y.date));
                            const targetIdx = activeDays.findIndex(d => d.date === dayItem.dateStr);
                            if (targetIdx !== -1) {
                              const costBefore = activeDays.slice(0, targetIdx).reduce((sum, d) => sum + (d.price - (d.discount || 0)), 0);
                              const amountAvailableForThisDay = Math.max(0, totalPaid - costBefore);
                              const remainingForThisDay = Math.max(0, dayPrice - amountAvailableForThisDay);
                              text = remainingForThisDay > 0 ? remainingForThisDay.toLocaleString() : 'مدفوع';
                            } else {
                              text = '0';
                            }
                          } else {
                            text = '0';
                          }
                        } else {
                          const dates = [...new Set([...(b.eventDates || []), b.eventDate].filter(Boolean) as string[])].sort();
                          const targetIdx = dates.indexOf(dayItem.dateStr);
                          if (targetIdx !== -1) {
                            const costPerDay = (b.totalPrice || 0) / Math.max(1, dates.length);
                            const costBefore = costPerDay * targetIdx;
                            const amountAvailableForThisDay = Math.max(0, totalPaid - costBefore);
                            const remainingForThisDay = Math.max(0, costPerDay - amountAvailableForThisDay);
                            text = remainingForThisDay > 0 ? remainingForThisDay.toLocaleString() : 'مدفوع';
                          } else {
                            const remaining = (b.totalPrice || 0) - totalPaid;
                            text = remaining > 0 ? remaining.toLocaleString() : 'مدفوع';
                          }
                        }
                      } else if (dayDisplayInfo === 'eventType') {
                        text = b.eventType || 'فعالية';
                      }

                      const isMorning = b.period === 'morning' || b.period?.includes('صباح');
                      const isNight = b.period === 'night' || b.period?.includes('ليل');
                      
                      let periodColor = 'bg-indigo-100/60 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-250 dark:border-indigo-800/40';
                      if (isMorning) {
                        periodColor = 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-250 dark:border-amber-800/40';
                      } else if (isNight) {
                        periodColor = 'bg-slate-100/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-750';
                      }

                      const totalPaidMonth = (b.paidAmount || 0) + (b.subsequentPayments || 0);
                      const remainingMonth = Math.max(0, b.totalPrice - totalPaidMonth);

                      return (
                        <div 
                          key={b.id || idx} 
                          className={`text-[5px] sm:text-[6px] md:text-[7px] font-black px-0.5 py-0.5 rounded border whitespace-normal break-words max-w-full text-center leading-[0.9] flex items-center justify-center ${periodColor}`}
                          title={`${b.customerName} - ${b.eventType || 'فعالية'} - مسدد: ${totalPaidMonth.toLocaleString()} - متبقي: ${remainingMonth.toLocaleString()}`}
                        >
                          {text}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 md:gap-1.5 items-center justify-center w-full mt-auto">
                    {dayBookings.map((b, idx) => {
                      const isMorning = b.period === 'morning' || b.period?.includes('صباح');
                      const isNight = b.period === 'night' || b.period?.includes('ليل');
                      
                      return (
                        <div 
                          key={b.id || idx}
                          title={`${b.customerName} (${isMorning ? 'صباح' : isNight ? 'ليل' : 'مساء'})`}
                          className={`p-1 rounded-full transition-transform hover:scale-125 ${
                            isMorning 
                              ? 'text-amber-500 bg-amber-500/10' 
                              : isNight 
                                ? 'text-indigo-400 bg-indigo-500/10' 
                                : 'text-indigo-600 bg-indigo-600/10'
                          }`}
                        >
                          {isMorning ? (
                            <Sun className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          ) : isNight ? (
                            <Moon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          ) : (
                            <Moon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

        {/* أجندة حجوزات الشهر - لحل مشكلة صغر الشاشة في الجوال واستعراض البيانات كاملة */}
        <div className="border-t border-slate-150/60 dark:border-slate-800/80 pt-6 mt-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-indigo-500">📋</span>
              <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-white">
                أجندة وتفاصيل حجوزات هذا الشهر ({getCalendarTitle()})
              </h3>
              <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] md:text-xs px-2 py-0.5 rounded-full">
                {monthBookings.length} حجز نشط
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
              * يعرض هذا القسم جميع تفاصيل المستأجرين والمبالغ المتبقية بوضوح تام، خاصة على الهواتف المحمولة.
            </p>
          </div>

          {monthBookings.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-bold border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10">
              لا توجد حجوزات نشطة في هذا الشهر حتى الآن.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {monthBookings.map(b => {
                const hall = halls.find(h => h.id === b.hallId);
                const totalPaidSoFar = (b.paidAmount || 0) + (b.subsequentPayments || 0);
                const remaining = Math.max(0, b.totalPrice - totalPaidSoFar);
                const isMorning = b.period === 'morning' || b.period?.includes('صباح');
                const isNight = b.period === 'night' || b.period?.includes('ليل');
                
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      const firstActiveDay = b.days?.find(d => d.status !== 'cancelled');
                      setSelectedDayDetails({
                        date: firstActiveDay?.date || (b as any).eventDate || '',
                        bookings: bookings.filter(book => book.id === b.id)
                      });
                    }}
                    className="p-4 bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800/80 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-800/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)] group relative overflow-hidden"
                  >
                    {/* Line period indicator */}
                    <div className={`absolute top-0 right-0 w-1.5 h-full ${isMorning ? 'bg-amber-400' : isNight ? 'bg-slate-500' : 'bg-indigo-400'}`} />

                    <div className="flex justify-between items-start mr-2">
                      <div className="space-y-1">
                        {(() => {
                          const bDates = (b.days && b.days.length > 0)
                            ? b.days.filter(d => d.status !== 'cancelled').map(d => d.date)
                            : (b.eventDates && b.eventDates.length > 0)
                              ? b.eventDates
                              : (b as any).eventDate
                                ? [(b as any).eventDate]
                                : [];
                          const isMultiDay = bDates.length > 1;

                          return (
                            <div className="flex flex-wrap items-center gap-1">
                              {isMultiDay ? (
                                <>
                                  <span className="text-[9px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                                    متعدد ({bDates.length} أيام)
                                  </span>
                                  {bDates.map((d, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className="text-[10px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/45 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40"
                                    >
                                      {d}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                <span className="text-[10px] font-mono font-extrabold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/45 px-1.5 py-0.5 rounded">
                                  {bDates[0] || 'تاريخ غير محدد'}
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  b.status === 'confirmed'
                                    ? 'bg-indigo-100/50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                                    : b.status === 'pending'
                                      ? 'bg-amber-100/50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                      : 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                }`}
                              >
                                {b.status === 'confirmed'
                                  ? 'مؤكد'
                                  : b.status === 'pending'
                                    ? 'مبدئي'
                                    : 'مكتمل'}
                              </span>
                            </div>
                          );
                        })()}
                        <h4 className="font-black text-[10px] md:text-xs text-slate-800 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors whitespace-normal leading-tight">
                          {b.customerName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                          <span>{hall?.name || 'قاعة غير حددة'}</span>
                          <span>•</span>
                          <span>{b.eventType || 'فعالية'}</span>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {b.totalPrice.toLocaleString()} {b.currency}
                        </div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block">مبلغ العقد</span>
                      </div>
                    </div>

                    <div className="mr-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] md:text-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">
                          المسدد: {totalPaidSoFar.toLocaleString()} {b.currency}
                        </span>
                        {(b.subsequentPayments || 0) > 0 && (
                          <span className="text-[9px] text-indigo-500 font-bold">
                            (عربون: {(b.paidAmount || 0).toLocaleString()} + دفعات: {(b.subsequentPayments || 0).toLocaleString()})
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <span className={`font-black ${remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          المتبقي: {remaining > 0 ? `${remaining.toLocaleString()} ${b.currency}` : 'مسدد بالكامل ✓'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      <AnimatePresence>
        {selectedDayDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSelectedDayDetails(null)}
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">تفاصيل الحجوزات</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1" dir="ltr">
                    {(() => {
                      if (!selectedDayDetails.date) return 'تاريخ غير محدد';
                      const dObj = new Date(selectedDayDetails.date);
                      if (isNaN(dObj.getTime())) return selectedDayDetails.date;
                      try {
                        return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full' }).format(dObj);
                      } catch (e) {
                        return selectedDayDetails.date;
                      }
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayDetails(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {selectedDayDetails.bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarDays className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد حجوزات</h4>
                    <p className="text-sm text-slate-500 mt-2">لا يوجد أي حجوزات مسجلة في هذا اليوم.</p>
                  </div>
                ) : (
                  selectedDayDetails.bookings.map(booking => {
                    const hall = halls.find(h => h.id === booking.hallId);
                    return (
                      <div 
                        key={booking.id} 
                        onClick={() => {
                          setActiveDayBookingId(booking.id);
                          setSelectedBooking(booking);
                        }}
                        className={`bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border space-y-3 relative overflow-hidden cursor-pointer hover:shadow-md transition-all ${
                          activeDayBooking?.id === booking.id && selectedDayDetails.bookings.length > 1
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                            : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/50'
                        }`}
                      >
                        <div className={`absolute top-0 right-0 w-2 h-full ${
                          (booking.period === 'morning' || (booking.period as any)?.includes('صباح')) ? 'bg-amber-400' :
                          (booking.period === 'evening' || (booking.period as any)?.includes('مساء')) ? 'bg-indigo-400' : 'bg-slate-600'
                        }`} />
                        
                        <div className="flex justify-between items-start mr-3">
                          <div>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md mb-2 inline-block">
                              {booking.id}
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <Building className="w-4 h-4 text-slate-400" />
                              {hall?.name || 'قاعة غير معروفة'}
                            </h4>
                          </div>
                          <div className={`flex flex-col items-end gap-1.5`}>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs ${
                              (booking.period === 'morning' || (booking.period as any)?.includes('صباح')) ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                              (booking.period === 'evening' || (booking.period as any)?.includes('مساء')) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' :
                              'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}>
                              {(booking.period === 'morning' || (booking.period as any)?.includes('صباح')) && <Sun className="w-4 h-4" />}
                              {(booking.period === 'evening' || (booking.period as any)?.includes('مساء')) && <Moon className="w-4 h-4" />}
                              {(booking.period === 'night' || (booking.period as any)?.includes('ليل')) && <Coffee className="w-4 h-4" />}
                              {(booking.period === 'morning' || (booking.period as any)?.includes('صباح')) ? 'صباحي' : (booking.period === 'evening' || (booking.period as any)?.includes('مساء')) ? 'مسائي' : 'ليلي'}
                            </div>
                            <div className="flex gap-1 flex-wrap justify-end">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                booking.status === 'confirmed' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400' :
                                booking.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                                booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {booking.status === 'confirmed' ? 'مؤكد' : booking.status === 'pending' ? 'مبدئي' : booking.status === 'completed' ? 'مكتمل' : 'ملغي'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                (booking.paidAmount || 0) > 0 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' 
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
                              }`}>
                                {(booking.paidAmount || 0) > 0 ? 'بعربون' : 'بدون عربون'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mr-3 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          {(() => {
                            const bDates = (booking.days && booking.days.length > 0)
                              ? booking.days.filter(d => d.status !== 'cancelled').map(d => d.date)
                              : (booking.eventDates && booking.eventDates.length > 0)
                                ? booking.eventDates
                                : (booking as any).eventDate
                                  ? [(booking as any).eventDate]
                                  : [];
                            const isMultiDay = bDates.length > 1;

                            return (
                              <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{isMultiDay ? `أيام الحجز (${bDates.length} أيام):` : 'تاريخ الحجز:'}</span>
                                  </div>
                                  {isMultiDay && (
                                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold px-1.5 py-0.2 rounded-full">
                                      حجز متعدد الأيام
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {bDates.map((d, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border transition-all ${
                                        d === selectedDayDetails.date
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                          : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                      }`}
                                      title={d === selectedDayDetails.date ? 'اليوم المفتوح حالياً' : ''}
                                    >
                                      {d}
                                      {d === selectedDayDetails.date && ' (المحدد)'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <User className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{booking.customerName}</span>
                          </div>
                          {booking.customerPhone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                              <span dir="ltr">{booking.customerPhone}</span>
                            </div>
                          )}
                          {booking.eventType && (
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <span className="w-4 h-4 flex items-center justify-center text-slate-400 shrink-0">💍</span>
                              <span>{booking.eventType}</span>
                            </div>
                          )}
                          
                          {(() => {
                            // Find any payment vouchers associated with this booking
                            const bookingVouchers = (vouchers || []).filter((v: any) => {
                              const bId = v.linkedBookingId || v.bookingId;
                              return Boolean(bId) && (bId === booking.id || (Boolean(booking.sequenceCode) && bId === booking.sequenceCode)) && v.type === 'receipt';
                            });

                            // Calculate subsequent payments from vouchers or booking record
                            const subsequentFromVouchers = bookingVouchers
                              .filter((v: any) => !((v.description || "") + (v.note || "")).includes("عربون"))
                              .reduce((sum: number, v: any) => sum + (Number(v.amount) || 0), 0);

                            const subsequentPaid = Math.max(Number(booking.subsequentPayments) || 0, subsequentFromVouchers);
                            const depositPaid = Number(booking.paidAmount) || 0;
                            const totalPaid = depositPaid + subsequentPaid;
                            const totalPrice = Number(booking.totalPrice) || 0;
                            const remaining = Math.max(0, totalPrice - totalPaid);
                            const progressPercent = totalPrice > 0 ? Math.min(100, Math.round((totalPaid / totalPrice) * 100)) : 0;

                            return (
                              <div className="space-y-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                {/* Summary Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                                  <div className="bg-slate-100/70 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold block">إجمالي العقد</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono">{totalPrice.toLocaleString()} {booking.currency}</span>
                                  </div>
                                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                                    <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold block">العربون</span>
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">{depositPaid.toLocaleString()} {booking.currency}</span>
                                  </div>
                                  <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40">
                                    <span className="text-[9px] text-indigo-700 dark:text-indigo-400 font-bold block">الدفعات المحصلة</span>
                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">{subsequentPaid.toLocaleString()} {booking.currency}</span>
                                  </div>
                                  <div className={`p-2 rounded-xl border ${remaining > 0 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40' : 'bg-emerald-100/60 dark:bg-emerald-900/40 border-emerald-300'}`}>
                                    <span className={`text-[9px] font-bold block ${remaining > 0 ? 'text-amber-800 dark:text-amber-400' : 'text-emerald-800 dark:text-emerald-300'}`}>المتبقي الفعلي</span>
                                    <span className={`text-xs font-black font-mono ${remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      {remaining > 0 ? `${remaining.toLocaleString()} ${booking.currency}` : 'مسدد بالكامل ✓'}
                                    </span>
                                  </div>
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                    <span>نسبة السداد: {progressPercent}%</span>
                                    <span>إجمالي المسدد: <strong className="text-emerald-600 font-mono">{totalPaid.toLocaleString()} {booking.currency}</strong></span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Vouchers List (if any vouchers exist) */}
                                {bookingVouchers.length > 0 && (
                                  <div className="bg-slate-100/60 dark:bg-slate-900/40 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-black text-slate-700 dark:text-slate-300">
                                      <div className="flex items-center gap-1.5">
                                        <Receipt className="w-3 h-3 text-indigo-500" />
                                        <span>سندات القبض المسجلة ({bookingVouchers.length} سند):</span>
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-normal">انقر على السند للمعاينة والطباعة</span>
                                    </div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                      {bookingVouchers.map((v: any, vIdx: number) => {
                                        const isDep = ((v.description || "") + (v.note || "")).includes("عربون");
                                        return (
                                          <div
                                            key={v.id || vIdx}
                                            onClick={() => {
                                              setSelectedVoucherForPrint(v);
                                              setSelectedBookingForVoucherPrint(booking);
                                              setIsOfficialVoucherModalOpen(true);
                                              if (onPrintVoucher) onPrintVoucher(v, booking);
                                            }}
                                            className="flex justify-between items-center text-[10px] bg-white dark:bg-slate-800 hover:bg-indigo-50/50 dark:hover:bg-slate-700/60 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700/50 transition-all cursor-pointer group shadow-2xs"
                                            title="انقر لمعاينة وطباعة سند القبض الرسمي"
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <span className={`px-1 rounded text-[8px] font-bold ${isDep ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {isDep ? 'عربون' : 'دفعة'}
                                              </span>
                                              <span className="font-mono text-slate-500">{(v.voucherDate || v.date || "").split("T")[0]}</span>
                                              {v.manualNumber && (
                                                <span className="text-[9px] text-slate-400">سند يدوي: {v.manualNumber}</span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono font-black text-emerald-600">
                                                {Number(v.amount).toLocaleString()} {v.currency || booking.currency}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedVoucherForPrint(v);
                                                  setSelectedBookingForVoucherPrint(booking);
                                                  setIsOfficialVoucherModalOpen(true);
                                                  if (onPrintVoucher) onPrintVoucher(v, booking);
                                                }}
                                                className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white rounded text-[9px] font-black transition-all cursor-pointer shadow-2xs"
                                                title="معاينة وطباعة السند الرسمي"
                                              >
                                                <Printer className="w-2.5 h-2.5" />
                                                <span>طباعة</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-2">
                 <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap w-full">
                   {activeDayBooking && onPreviewBooking && (
                     <button 
                       onClick={() => {
                         onPreviewBooking(activeDayBooking);
                       }}
                       className="flex-1 px-2.5 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1 shadow-xs"
                     >
                       <FileText className="w-3.5 h-3.5 shrink-0" />
                       <span>معاينة العقد</span>
                     </button>
                   )}
                   {activeDayBooking && (
                     <button 
                       onClick={() => {
                         setSelectedBooking(activeDayBooking);
                         setSelectedDayDetails(null);
                       }}
                       className="flex-1 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center"
                     >
                       <span>معاينة الحجز</span>
                     </button>
                   )}
                   <button 
                     onClick={() => {
                       setSelectedDayDetails(null);
                       handleDayDoubleClick(parseInt(selectedDayDetails.date.split('-')[2], 10));
                     }}
                     className="flex-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center"
                   >
                     <span>إضافة حجز في هذا اليوم</span>
                   </button>
                 </div>
                 <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">يمكنك النقر المزدوج على اليوم مباشرة لإضافة حجز</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedBooking(null)}
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">تفاصيل وحالة الحجز</h3>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">تعديل حالة الحجز</label>
                  <select 
                    value={selectedBooking.status}
                    onChange={(e) => {
                      if (onUpdateBookingStatus && selectedBooking.id) {
                        onUpdateBookingStatus(selectedBooking.id, e.target.value as any);
                        setSelectedBooking({ ...selectedBooking, status: e.target.value as any });
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">مبدئي (Pending)</option>
                    <option value="confirmed">مؤكد (Confirmed)</option>
                    <option value="completed">مكتمل (Completed)</option>
                    <option value="cancelled">ملغي (Cancelled)</option>
                  </select>
                </div>
                {(() => {
                  const bVouchers = (vouchers || []).filter((v: any) => {
                    const bId = v.linkedBookingId || v.bookingId;
                    return Boolean(bId) && (bId === selectedBooking.id || (Boolean(selectedBooking.sequenceCode) && bId === selectedBooking.sequenceCode)) && v.type === 'receipt';
                  });
                  const subsequentFromVouchers = bVouchers
                    .filter((v: any) => !((v.description || "") + (v.note || "")).includes("عربون"))
                    .reduce((sum: number, v: any) => sum + (Number(v.amount) || 0), 0);

                  const subsequentPaid = Math.max(Number(selectedBooking.subsequentPayments) || 0, subsequentFromVouchers);
                  const depositPaid = Number(selectedBooking.paidAmount) || 0;
                  const totalPaid = depositPaid + subsequentPaid;
                  const totalPrice = Number(selectedBooking.totalPrice) || 0;
                  const remaining = Math.max(0, totalPrice - totalPaid);

                  return (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span className="font-bold">رقم الحجز:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedBooking.sequenceCode || selectedBooking.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">اسم العميل:</span>
                        <span>{selectedBooking.customerName}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>تصنيف العقد:</span>
                        <span className={depositPaid > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                          {depositPaid > 0 ? "عقد بعربون" : "عقد بدون عربون"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold">القيمة الإجمالية:</span>
                        <span className="font-black text-slate-900 dark:text-white">{totalPrice.toLocaleString()} {selectedBooking.currency}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>العربون المسدد:</span>
                        <span>{depositPaid.toLocaleString()} {selectedBooking.currency}</span>
                      </div>
                      {subsequentPaid > 0 && (
                        <div className="flex justify-between text-indigo-600 font-bold">
                          <span>الدفعات المحصلة:</span>
                          <span>{subsequentPaid.toLocaleString()} {selectedBooking.currency}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black border-t border-slate-200 dark:border-slate-700 pt-1 text-slate-800 dark:text-slate-200">
                        <span>إجمالي المسدد:</span>
                        <span className="text-emerald-600">{totalPaid.toLocaleString()} {selectedBooking.currency}</span>
                      </div>
                      <div className="flex justify-between text-amber-600 font-black">
                        <span>المبلغ المتبقي:</span>
                        <span>{remaining > 0 ? `${remaining.toLocaleString()} ${selectedBooking.currency}` : 'مسدد بالكامل ✓'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 flex-wrap">
                <button 
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 md:px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors text-sm"
                >
                  إغلاق
                </button>
                {onPreviewBooking && (
                  <button 
                    onClick={() => {
                      onPreviewBooking(selectedBooking);
                    }}
                    className="px-4 md:px-6 py-2 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    معاينة العقد
                  </button>
                )}
                {onEditBooking && (selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                  <button 
                    onClick={() => {
                      onEditBooking(selectedBooking);
                      setSelectedBooking(null);
                    }}
                    className="px-4 md:px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
                  >
                    تعديل العقد
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Official Voucher Print Modal - Al-Zain Grand Hall Design */}
      <OfficialVoucherPrintModal
        isOpen={isOfficialVoucherModalOpen}
        voucher={selectedVoucherForPrint}
        booking={selectedBookingForVoucherPrint}
        company={company}
        accounts={accounts}
        currencies={currencies}
        currentUser={effectiveUser}
        onClose={() => {
          setIsOfficialVoucherModalOpen(false);
          setSelectedVoucherForPrint(null);
          setSelectedBookingForVoucherPrint(null);
        }}
      />
    </>
  );
}


