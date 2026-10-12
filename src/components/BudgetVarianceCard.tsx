import React, { useMemo, useState } from "react";
import { TrendingUp, Target, AlertTriangle, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp } from "lucide-react";
import { Account, StandardCostTemplate, Transaction, Booking, Service } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface BudgetVarianceCardProps {
  accounts: Account[];
  standardCosts: StandardCostTemplate[];
  transactions: Transaction[];
  bookings: Booking[];
  services: Service[];
  defaultExpanded?: boolean;
}

export default function BudgetVarianceCard({
  accounts,
  standardCosts,
  transactions,
  bookings,
  services = [],
  currentDate,
  defaultExpanded = true,
}: BudgetVarianceCardProps & { currentDate: Date; defaultExpanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const varianceData = useMemo(() => {
    const accVariance: Record<string, { standard: number; actual: number }> = {};
    const targetMonth = currentDate.getMonth();
    const targetYear = currentDate.getFullYear();

    // 1. Standard Costs (aggregated from templates linked to bookings in the month)
    bookings.forEach(b => {
      if (b.status !== "confirmed" && b.status !== "completed") return;
      
      // Calculate days in month
      const daysInMonth = b.days ? b.days.filter(d => {
        if (d.status === 'cancelled') return false;
        const dDate = new Date(d.date);
        return dDate.getMonth() === targetMonth && dDate.getFullYear() === targetYear;
      }).length : 0;

      // Handle legacy bookings if b.days is empty
      const legacyDaysCount = (!b.days || b.days.length === 0) ? (() => {
        const bDate = new Date(b.eventDate || b.createdAt);
        if (bDate.getMonth() === targetMonth && bDate.getFullYear() === targetYear) return 1;
        return 0;
      })() : 0;

      const totalDaysInMonth = daysInMonth + legacyDaysCount;

      if (totalDaysInMonth > 0) {
        const tmpl = standardCosts.find((t) => !t.serviceId && t.hallId === b.hallId && t.eventType === b.eventType) ||
                     standardCosts.find((t) => !t.serviceId && t.eventType === b.eventType) ||
                     standardCosts.find((t) => !t.serviceId && t.hallId === b.hallId) ||
                     standardCosts.find((t) => !t.serviceId);
        
        if (tmpl) {
          tmpl.items.forEach(item => {
            if (item.accountId) {
              if (!accVariance[item.accountId]) accVariance[item.accountId] = { standard: 0, actual: 0 };
              accVariance[item.accountId].standard += (item.standardCost * totalDaysInMonth);
            }
          });
        }
      }

      // Add services standard cost
      b.additionalServices?.forEach(bs => {
        const srv = services.find(s => s.name === bs.name);
        if (srv) {
          const srvTmpl = standardCosts.find(t => t.serviceId === srv.id);
          
          let srvDaysInMonth = 0;
          if (bs.appliedDates && bs.appliedDates.length > 0) {
            srvDaysInMonth = bs.appliedDates.filter(d => {
               const dDate = new Date(d);
               return dDate.getMonth() === targetMonth && dDate.getFullYear() === targetYear;
            }).length;
          } else {
            srvDaysInMonth = totalDaysInMonth;
          }

          if (srvDaysInMonth > 0) {
            if (srvTmpl) {
              srvTmpl.items.forEach(item => {
                if (item.accountId) {
                  if (!accVariance[item.accountId]) accVariance[item.accountId] = { standard: 0, actual: 0 };
                  accVariance[item.accountId].standard += (item.standardCost * srvDaysInMonth);
                }
              });
            }
          }
        }
      });
    });

    // 2. Actual Costs (aggregated from transactions in the month for expense accounts)
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getMonth() !== targetMonth || txDate.getFullYear() !== targetYear) return;
      
      // We are looking for expense transactions (usually credit to expense account or debit to expense account)
      // Assuming expense accounts are of type 'expense'
      const debitAcc = accounts.find(a => a.id === tx.debitAccountId);
      const creditAcc = accounts.find(a => a.id === tx.creditAccountId);
      
      if (debitAcc?.type === 'expense') {
        if (!accVariance[debitAcc.id]) accVariance[debitAcc.id] = { standard: 0, actual: 0 };
        accVariance[debitAcc.id].actual += tx.amount;
      } else if (creditAcc?.type === 'expense') {
        if (!accVariance[creditAcc.id]) accVariance[creditAcc.id] = { standard: 0, actual: 0 };
        accVariance[creditAcc.id].actual += tx.amount;
      }
    });

    return Object.entries(accVariance).map(([accId, totals]) => {
      const acc = accounts.find(a => a.id === accId);
      return {
        accountId: accId,
        accountName: acc ? acc.name : "حساب غير معرف",
        standard: totals.standard,
        actual: totals.actual,
        variance: totals.standard - totals.actual,
      };
    }).filter(d => d.standard > 0 || d.actual > 0);
  }, [accounts, standardCosts, transactions, bookings, currentDate]);

  const totalStandard = varianceData.reduce((sum, d) => sum + d.standard, 0);
  const totalActual = varianceData.reduce((sum, d) => sum + d.actual, 0);
  const totalVariance = totalStandard - totalActual;

  return (
    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/50 dark:border-slate-800/50 shadow-premium overflow-hidden flex flex-col mb-2 sm:mb-3 transition-all duration-500">
      <div 
        className="p-2.5 sm:p-3.5 md:p-4 flex justify-between items-center cursor-pointer hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all duration-300 group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0 group-hover:scale-105 transition-transform duration-500">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm md:text-lg text-slate-900 dark:text-white tracking-tight">
              مقارنة التكاليف المعيارية والفعلية
            </h3>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5">تحليل الانحرافات التشغيلية</p>
          </div>
        </div>
        <button className="w-7 h-7 sm:w-8 sm:h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all duration-300 flex items-center justify-center">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-500" />
                    <span className="text-[8px] sm:text-[9px] text-indigo-600 dark:text-indigo-400 font-black uppercase">المعياري</span>
                  </div>
                  <div className="text-sm sm:text-base font-display font-black text-indigo-900 dark:text-indigo-200">{totalStandard.toLocaleString()}</div>
                </div>

                <div className="p-2 sm:p-3 bg-rose-50/50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500" />
                    <span className="text-[8px] sm:text-[9px] text-rose-600 dark:text-rose-400 font-black uppercase">الفعلي</span>
                  </div>
                  <div className="text-sm sm:text-base font-display font-black text-rose-900 dark:text-rose-200">{totalActual.toLocaleString()}</div>
                </div>

                <div className={`p-2 sm:p-3 rounded-xl border ${totalVariance >= 0 ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" : "bg-amber-50/50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20"}`}>
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <AlertTriangle className={`w-3 h-3 ${totalVariance >= 0 ? "text-emerald-500" : "text-amber-500"}`} />
                    <span className={`text-[9px] font-black uppercase ${totalVariance >= 0 ? "text-emerald-600" : "text-amber-600"}`}>الانحراف</span>
                  </div>
                  <div className={`text-base font-display font-black ${totalVariance >= 0 ? "text-emerald-900 dark:text-emerald-200" : "text-amber-900 dark:text-amber-200"}`}>
                    {totalVariance >= 0 ? "+" : ""}{totalVariance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {varianceData.map(d => (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={d.accountId} 
                    className="group flex flex-row items-center justify-between p-2.5 bg-white/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300 gap-2"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${d.variance >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600"}`}>
                        {d.accountName.substring(0, 1)}
                      </div>
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{d.accountName}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[9px] font-black shrink-0">
                      <div className="flex flex-col items-end leading-tight">
                        <span className="text-slate-400">م: {d.standard.toLocaleString()}</span>
                        <span className="text-slate-400">ف: {d.actual.toLocaleString()}</span>
                      </div>
                      <div className={`min-w-[60px] px-2 py-1 rounded-lg flex items-center justify-center gap-1 border ${d.variance >= 0 ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border-emerald-100 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 border-rose-100 dark:border-rose-800"}`}>
                        <span className="font-display text-[10px]">{Math.abs(d.variance).toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {varianceData.length === 0 && (
                  <div className="text-center py-8 text-slate-400 font-medium bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-[10px]">لا توجد بيانات لهذا الشهر</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
