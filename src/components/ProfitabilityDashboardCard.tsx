import React, { useState, useMemo } from 'react';
import { Booking, Hall, StandardCostTemplate, Service } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  Coins,
  Layers,
  Target,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';

interface ProfitabilityDashboardCardProps {
  bookings: Booking[];
  halls: Hall[];
  globalCurrencySymbol: string;
  onPreviewBooking?: (bookingId: string) => void;
  currentDate?: Date;
  standardCosts?: StandardCostTemplate[];
  services?: Service[];
  defaultExpanded?: boolean;
}

export default function ProfitabilityDashboardCard({
  bookings,
  halls,
  globalCurrencySymbol,
  onPreviewBooking,
  currentDate = new Date(),
  standardCosts = [],
  services = [],
  defaultExpanded = true,
}: ProfitabilityDashboardCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isExecutedView, setIsExecutedView] = useState(true); // true = Executed (Completed), false = Unexecuted (Confirmed / Pending)

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Retrieve bookings in the active month (excluding cancelled ones)
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

  const getBookingDaysCount = (b: Booking): number => {
    if (b.days && b.days.length > 0) {
      // Only count non-cancelled days
      return b.days.filter(d => d.status !== 'cancelled').length;
    }
    if (b.eventDates && b.eventDates.length > 0) {
      return b.eventDates.length;
    }
    return 1; // Default to 1 day
  };

  // Helper to find standard cost template for hall rental
  const getBookingStandardCost = (b: Booking) => {
    if (!standardCosts || standardCosts.length === 0) return 0;
    const tmpl = standardCosts.find(t => !t.serviceId && t.hallId === b.hallId && t.eventType === b.eventType) ||
                 standardCosts.find(t => !t.serviceId && t.eventType === b.eventType) ||
                 standardCosts.find(t => !t.serviceId && t.hallId === b.hallId) ||
                 standardCosts.find(t => !t.serviceId) ||
                 null;
    if (!tmpl) return 0;
    return tmpl.totalStandardCost * getBookingDaysCount(b);
  };

  // Helper to find services revenue
  const getBookingServicesRevenue = (b: Booking): number => {
    if (!b.additionalServices || b.additionalServices.length === 0) return 0;
    return b.additionalServices.reduce((sum, s) => sum + (s.cost || 0), 0);
  };

  // Helper to find services standard cost
  const getBookingServicesStandardCost = (b: Booking): number => {
    if (!b.additionalServices || b.additionalServices.length === 0) return 0;
    return b.additionalServices.reduce((sum, s) => {
      const matched = services.find(srv => srv.name === s.name);
      if (!matched) return sum;
      
      const serviceTemplate = standardCosts?.find(t => t.serviceId === matched.id);
      const standardCost = serviceTemplate ? serviceTemplate.totalStandardCost : (matched.standardCost || 0);
      
      return sum + (standardCost * getBookingDaysCount(b));
    }, 0);
  };

  // Filter bookings for profitability analysis based on toggle (Executed: Date < Today, Unexecuted: Date >= Today)
  const profitabilityBookings = useMemo(() => {
    return thisMonthBookings.filter(b => {
      // Extract dates
      const dates: Date[] = [];
      if (b.days) {
        b.days.filter(d => d.status !== 'cancelled').forEach(d => dates.push(new Date(d.date)));
      }
      if (dates.length === 0 && (b as any).eventDate) {
        dates.push(new Date((b as any).eventDate));
      }
      
      if (dates.length === 0) return false;
      
      // Sort dates to find the relevant one
      dates.sort((a,b) => a.getTime() - b.getTime());
      const eventDate = dates[0]; // First day
      
      // Normalize today
      const today = new Date(currentDate);
      today.setHours(0,0,0,0);
      
      const isPast = eventDate < today;

      if (isExecutedView) {
        return isPast;
      } else {
        return !isPast;
      }
    });
  }, [thisMonthBookings, isExecutedView, currentDate]);

  // Calculations for stats
  const profitabilityStats = useMemo(() => {
    let totalRevenue = 0;
    let totalStdCosts = 0;

    let totalRentRevenue = 0;
    let totalRentStdCosts = 0;

    let totalServicesRevenue = 0;
    let totalServicesStdCosts = 0;

    profitabilityBookings.forEach(b => {
      const bTotalPrice = b.totalPrice || 0;
      const bServicesRevenue = getBookingServicesRevenue(b);
      const bRentRevenue = Math.max(0, bTotalPrice - bServicesRevenue);

      const bRentStdCost = getBookingStandardCost(b);
      const bServicesStdCost = getBookingServicesStandardCost(b);

      totalRevenue += bTotalPrice;
      totalStdCosts += (bRentStdCost + bServicesStdCost);

      totalRentRevenue += bRentRevenue;
      totalRentStdCosts += bRentStdCost;

      totalServicesRevenue += bServicesRevenue;
      totalServicesStdCosts += bServicesStdCost;
    });

    const estProfit = totalRevenue - totalStdCosts;
    const marginPct = totalRevenue > 0 ? (estProfit / totalRevenue) * 100 : 0;

    const estRentProfit = totalRentRevenue - totalRentStdCosts;
    const rentMarginPct = totalRentRevenue > 0 ? (estRentProfit / totalRentRevenue) * 100 : 0;

    const estServicesProfit = totalServicesRevenue - totalServicesStdCosts;
    const servicesMarginPct = totalServicesRevenue > 0 ? (estServicesProfit / totalServicesRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalStdCosts,
      estProfit,
      marginPct: marginPct.toFixed(1),

      totalRentRevenue,
      totalRentStdCosts,
      estRentProfit,
      rentMarginPct: rentMarginPct.toFixed(1),

      totalServicesRevenue,
      totalServicesStdCosts,
      estServicesProfit,
      servicesMarginPct: servicesMarginPct.toFixed(1),
    };
  }, [profitabilityBookings, standardCosts, services]);

  return (
    <div id="profitability-dashboard-card" className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col mb-3 sm:mb-6 mt-2 sm:mt-4" dir="rtl">
      {/* Header section */}
      <div 
        id="profitability-card-header"
        className="p-3 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl sm:rounded-2xl">
            <Target className="h-4.5 w-4.5 sm:h-6 sm:w-6 text-indigo-500 animate-pulse" />
          </div>
          <div className="text-right">
            <h3 className="font-black text-xs sm:text-sm md:text-base text-slate-800 dark:text-white flex items-center gap-1.5">
              الأرباح التقديرية والتكاليف المعيارية للشهر
            </h3>
            <p className="text-[9px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              مقارنة الإيرادات مع التقديرات المعيارية للفعاليات ({isExecutedView ? 'المنفذة' : 'غير المنفذة'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick miniature status indicator */}
          <span className={`hidden sm:inline-flex text-[9px] sm:text-[11px] font-black px-2.5 py-1 rounded-full ${
            profitabilityStats.estProfit >= 0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-50 dark:bg-rose-950/20 dark:text-rose-400'
          }`}>
            الربح المتوقع: {profitabilityStats.estProfit.toLocaleString()} {globalCurrencySymbol}
          </span>
          <button 
            id="profitability-card-toggle-btn"
            className="p-1 sm:p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg sm:rounded-xl transition"
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable content area */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="profitability-card-expanded-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10"
          >
            <div id="profitability-card-inner-body" className="p-4 md:p-6 space-y-6 text-right">
              {/* Filter controls and layout header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h4 className="font-black text-xs text-slate-400 uppercase tracking-wide">نمط التصفية والعرض</h4>
                  <p className="text-[11px] text-slate-500">
                    تبديل العرض لمقارنة الفعاليات المنتهية بالفعاليات المؤكدة والمستقبلية.
                  </p>
                </div>

                {/* Switch button */}
                <div id="profitability-view-switcher" className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-xl shadow-sm shrink-0">
                  <button
                    id="switch-executed-btn"
                    onClick={() => setIsExecutedView(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      isExecutedView
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    الفعاليات المنفذة (مكتملة)
                  </button>
                  <button
                    id="switch-unexecuted-btn"
                    onClick={() => setIsExecutedView(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      !isExecutedView
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    الفعاليات التي لم تنفذ بعد
                  </button>
                </div>
              </div>

              {/* Stats overview bento items */}
              <div id="profitability-bento-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div id="bento-total-revenue" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-slate-400" />
                    إجمالي الإيرادات لشهر {currentMonth + 1} ({isExecutedView ? 'الفعلي' : 'المتوقع'})
                  </div>
                  <div className="text-lg md:text-xl font-black text-slate-800 dark:text-white font-mono">
                    {profitabilityStats.totalRevenue.toLocaleString()} {globalCurrencySymbol}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    بناءً على {profitabilityBookings.length} حجوزات {isExecutedView ? "منفذة" : "غير منفذة"}
                  </div>
                </div>

                <div id="bento-total-std-costs" className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    إجمالي التكاليف المعيارية المقدرة
                  </div>
                  <div className="text-lg md:text-xl font-black text-slate-800 dark:text-white font-mono">
                    {profitabilityStats.totalStdCosts.toLocaleString()} {globalCurrencySymbol}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    مستوحاة من قوالب ميزانيات المناسبات
                  </div>
                </div>

                <div id="bento-est-profit" className={`p-4 rounded-2xl border shadow-sm space-y-1 ${
                  profitabilityStats.estProfit >= 0
                    ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400"
                    : "bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-400"
                }`}>
                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    {profitabilityStats.estProfit >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    الأرباح التقديرية المتوقعة
                  </div>
                  <div className="text-lg md:text-xl font-black font-mono">
                    {profitabilityStats.estProfit.toLocaleString()} {globalCurrencySymbol}
                  </div>
                  <div className="text-[10px] font-bold flex items-center gap-1">
                    <span>هامش الربح المتوقع:</span>
                    <span className="font-black font-mono">{profitabilityStats.marginPct}%</span>
                  </div>
                </div>
              </div>

              {/* Split Profitability: Rental vs Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                {/* Rental Profitability Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-850 shadow-sm space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                      أرباح إيجار القاعات
                    </span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full font-mono">
                      هامش الربح: {profitabilityStats.rentMarginPct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block font-bold">إيراد الإيجار</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{profitabilityStats.totalRentRevenue.toLocaleString()} {globalCurrencySymbol}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block font-bold">تكاليف معيارية</span>
                      <span className="text-xs font-black text-slate-500 font-mono">{profitabilityStats.totalRentStdCosts.toLocaleString()} {globalCurrencySymbol}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block font-bold">الربح التقديري</span>
                      <span className={`text-xs font-black font-mono ${profitabilityStats.estRentProfit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {profitabilityStats.estRentProfit.toLocaleString()} {globalCurrencySymbol}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Services Profitability Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-850 shadow-sm space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      أرباح الخدمات الإضافية
                    </span>
                    <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full font-mono">
                      هامش الربح: {profitabilityStats.servicesMarginPct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block font-bold">إيراد الخدمات</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white font-mono">{profitabilityStats.totalServicesRevenue.toLocaleString()} {globalCurrencySymbol}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block font-bold">تكاليف معيارية</span>
                      <span className="text-xs font-black text-slate-500 font-mono">{profitabilityStats.totalServicesStdCosts.toLocaleString()} {globalCurrencySymbol}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block font-bold">الربح التقديري</span>
                      <span className={`text-xs font-black font-mono ${profitabilityStats.estServicesProfit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {profitabilityStats.estServicesProfit.toLocaleString()} {globalCurrencySymbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bookings details list */}
              <div id="profitability-details-list" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h5 className="text-xs font-black text-slate-700 dark:text-slate-300">تفاصيل الحجوزات والتكلفة المعيارية لكل فعالية</h5>
                  <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    {profitabilityBookings.length} حجوزات
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto custom-scrollbar">
                  {profitabilityBookings.map(b => {
                    const bTotalPrice = b.totalPrice || 0;
                    const bServicesRevenue = getBookingServicesRevenue(b);
                    const bRentRevenue = Math.max(0, bTotalPrice - bServicesRevenue);

                    const rentStdCost = getBookingStandardCost(b);
                    const servicesStdCost = getBookingServicesStandardCost(b);
                    const totalStdCost = rentStdCost + servicesStdCost;
                    const bProfit = bTotalPrice - totalStdCost;
                    const rentProfit = bRentRevenue - rentStdCost;
                    const servicesProfit = bServicesRevenue - servicesStdCost;
                    const hasTemplate = rentStdCost > 0;
                    
                    return (
                      <div key={b.id} className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition">
                        <div className="flex-1">
                          <div className="font-bold text-xs text-slate-900 dark:text-white mb-1">{b.customerName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                            <span className="font-black text-indigo-600 dark:text-indigo-400">{b.eventType}</span>
                            <span>•</span>
                            <span>{halls.find(h => h.id === b.hallId)?.name || "قاعة غير معروفة"}</span>
                            <span>•</span>
                            {(() => {
                              const dates = (b.eventDates && b.eventDates.length > 0)
                                ? b.eventDates
                                : (b.days && b.days.length > 0)
                                  ? b.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                                  : (b as any).eventDate ? [(b as any).eventDate] : [];
                              if (dates.length <= 1) {
                                return <span>{dates[0] || (b as any).eventDate || 'غير محدد'}</span>;
                              }
                              return (
                                <span className="inline-flex items-center gap-1 font-mono text-[9px]">
                                  {dates.join(' | ')}
                                </span>
                              );
                            })()}
                            <span>•</span>
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {getBookingDaysCount(b)} {getBookingDaysCount(b) === 1 ? 'يوم' : 'أيام'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-5 text-xs font-medium justify-between lg:justify-end">
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block font-bold">قيمة العقد</span>
                            <span className="font-black text-slate-800 dark:text-white font-mono">{bTotalPrice.toLocaleString()} YER</span>
                            <span className="text-[9px] text-slate-400 block font-normal">
                              (إيجار: {bRentRevenue.toLocaleString()} / خدمات: {bServicesRevenue.toLocaleString()})
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block font-bold">التكلفة المعيارية</span>
                            <span className="font-black text-slate-600 dark:text-slate-300 font-mono">{totalStdCost.toLocaleString()} YER</span>
                            <span className="text-[9px] text-slate-400 block font-normal">
                              (قاعة: {rentStdCost.toLocaleString()} / خدمات: {servicesStdCost.toLocaleString()})
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block font-bold">الربح المتوقع</span>
                            <span className={`font-black font-mono ${bProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                              {bProfit.toLocaleString()} YER
                            </span>
                            <span className="text-[9px] text-slate-400 block font-normal">
                              (إيجار: <span className={rentProfit >= 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>{rentProfit.toLocaleString()}</span> / 
                              خدمات: <span className={servicesProfit >= 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>{servicesProfit.toLocaleString()}</span>)
                            </span>
                          </div>

                          {onPreviewBooking && (
                            <button
                              onClick={() => onPreviewBooking(b.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer self-center"
                              title="عرض العقد"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {profitabilityBookings.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs font-bold space-y-1">
                      <Target className="h-8 w-8 text-slate-300 mx-auto" />
                      <p>لا توجد حجوزات في هذا الشهر تتطابق مع التصفية الحالية.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
