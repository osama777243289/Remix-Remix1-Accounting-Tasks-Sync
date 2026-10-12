import React, { useState, useMemo } from 'react';
import { Account, Transaction, Currency, AccountType } from '../types';
import { FileText, Download, BarChart3, TrendingUp, PieChart, Info, CheckSquare } from 'lucide-react';
import { PermissionGuard } from '../lib/permissions';

interface FinancialReportsProps {
  accounts: Account[];
  transactions: Transaction[];
  currencies: Currency[];
  globalCurrencyCode: string;
  users?: any[];
  bookings?: any[];
  clients?: any[];
  services?: any[];
  vouchers?: any[];
}

export default function FinancialReports({ accounts, transactions, currencies, globalCurrencyCode, users = [], bookings = [], clients = [], services = [], vouchers = [] }: FinancialReportsProps) {
  const [activeTab, setActiveTab] = useState<'trial_balance' | 'income_statement' | 'balance_sheet' | 'journal_entries'>('trial_balance');

  const selectedGlobalCurrencyObj = currencies.find(c => c.code === globalCurrencyCode) || { symbol: "$" };

  // Helper formatting function to exclude decimal zeros but keep significant cents
  const formatReportAmount = (val: number | undefined | null) => {
    if (val === undefined || val === null || Math.abs(val) < 0.005) return '-';
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const formatDebitBalance = (val: number | undefined | null) => {
    if (val === undefined || val === null || val <= 0.005) return '-';
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const formatCreditBalance = (val: number | undefined | null) => {
    if (val === undefined || val === null || val >= -0.005) return '-';
    return Math.abs(val).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  const formatMovementAmount = (val: number | undefined | null) => {
    if (val === undefined || val === null || val <= 0.005) return '-';
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Helper: Get transaction amount in global currency using its historical rate
  const getTxAmountInGlobal = (tx: any): number => {
    // 1. Calculate amount in BASE currency
    let amountInBase = tx.baseAmount;
    if (amountInBase === undefined) {
      amountInBase = tx.amount * (tx.rate || 1);
    }
    
    // 2. Convert from BASE currency to GLOBAL currency
    const toCurr = currencies.find(c => c.code === globalCurrencyCode);
    if (!toCurr || toCurr.rateToBase === 1) return amountInBase;
    
    return amountInBase / toCurr.rateToBase;
  };

  // Function to calculate balance at a specific date
  const getBalanceAtDate = (accountId: string, date: string) => {
      const acc = accounts.find(a => a.id === accountId);
      if (!acc) return 0;
      
      const relatedTx = (transactions || []).filter(t => (t.debitAccountId === accountId || t.creditAccountId === accountId) && t.date < date);
      let totalDebit = 0;
      let totalCredit = 0;
      
      relatedTx.forEach(tx => {
        if (tx.debitAccountId === accountId) {
          totalDebit += getTxAmountInGlobal(tx);
        }
        if (tx.creditAccountId === accountId) {
          totalCredit += getTxAmountInGlobal(tx);
        }
      });
      
      const balance = (acc.type === 'asset' || acc.type === 'expense') 
          ? (totalDebit - totalCredit) 
          : (totalCredit - totalDebit);
          
      return balance;
  };

  // Analytical View State
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [analyticalDimension, setAnalyticalDimension] = useState<'client' | 'date' | 'month' | 'user' | 'service' | 'event'>('client');
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMode, setReportMode] = useState<'balance' | 'movement'>('balance');
  const [hideZero, setHideZero] = useState(true);
  const [accountLevel, setAccountLevel] = useState<'all' | 'main' | 'sub'>('all');

  // Trial Balance calculation
  const trialBalanceData = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    
    const filteredTransactions = (transactions || []).filter(t => t.date >= startDate && t.date <= endDate);

    // Using filtered transactions
    const balances = accounts.map(acc => {
      // 1. Opening Balance (Date < startDate)
      const openingTx = (transactions || []).filter(t => t.date < startDate && (t.debitAccountId === acc.id || t.creditAccountId === acc.id));
      let openDebit = 0;
      let openCredit = 0;
      openingTx.forEach(tx => {
        if (tx.debitAccountId === acc.id) openDebit += getTxAmountInGlobal(tx);
        if (tx.creditAccountId === acc.id) openCredit += getTxAmountInGlobal(tx);
      });
      const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';
      const openingBalance = isDebitNormal ? (openDebit - openCredit) : (openCredit - openDebit);

      // 2. Period Movements (startDate <= Date <= endDate)
      const periodTx = filteredTransactions.filter(t => t.debitAccountId === acc.id || t.creditAccountId === acc.id);
      let movementDebit = 0;
      let movementCredit = 0;
      periodTx.forEach(tx => {
        if (tx.debitAccountId === acc.id) movementDebit += getTxAmountInGlobal(tx);
        if (tx.creditAccountId === acc.id) movementCredit += getTxAmountInGlobal(tx);
      });

      // 3. Closing Balance
      const movementNet = isDebitNormal ? (movementDebit - movementCredit) : (movementCredit - movementDebit);
      const endBalance = openingBalance + movementNet;
      
      const debit = isDebitNormal ? (endBalance > 0 ? endBalance : 0) : (endBalance < 0 ? Math.abs(endBalance) : 0);
      const credit = isDebitNormal ? (endBalance < 0 ? Math.abs(endBalance) : 0) : (endBalance > 0 ? endBalance : 0);

      return {
        ...acc,
        beginBalance: openingBalance,
        movementDebit,
        movementCredit,
        endBalance,
        debit,
        credit,
        hasActivity: (periodTx.length > 0 || Math.abs(openingBalance) > 0.01)
      };
    });
    
    // Build hierarchy
    const buildTree = (flatBalances: any[]) => {
        const map: Record<string, any> = {};
        const root: any[] = [];
        
        flatBalances.forEach(acc => {
            map[acc.id] = { ...acc, children: [] };
        });
        
        flatBalances.forEach(acc => {
            if (acc.parentId && map[acc.parentId]) {
                map[acc.parentId].children.push(map[acc.id]);
            } else {
                root.push(map[acc.id]);
            }
        });
        
        // Compute Aggregated Balances
        const computeAggregates = (node: any) => {
            const isDebitNormal = node.type === 'asset' || node.type === 'expense';
            
            node.beginDebitAgg = isDebitNormal ? (node.beginBalance > 0 ? node.beginBalance : 0) : (node.beginBalance < 0 ? Math.abs(node.beginBalance) : 0);
            node.beginCreditAgg = isDebitNormal ? (node.beginBalance < 0 ? Math.abs(node.beginBalance) : 0) : (node.beginBalance > 0 ? node.beginBalance : 0);
            node.moveDebitAgg = node.movementDebit;
            node.moveCreditAgg = node.movementCredit;
            node.endDebitAgg = node.debit;
            node.endCreditAgg = node.credit;
            
            node.children.forEach((child: any) => {
                computeAggregates(child);
                node.beginDebitAgg += child.beginDebitAgg;
                node.beginCreditAgg += child.beginCreditAgg;
                node.moveDebitAgg += child.moveDebitAgg;
                node.moveCreditAgg += child.moveCreditAgg;
                node.endDebitAgg += child.endDebitAgg;
                node.endCreditAgg += child.endCreditAgg;
            });
        };
        root.forEach(computeAggregates);
        
        const filterTree = (nodes: any[]): any[] => {
            return nodes.filter(node => {
                if (accountLevel === 'main' && node.parentId) return false;
                if (accountLevel === 'sub' && !node.parentId) return false;

                node.children = filterTree(node.children);

                // Activity: Movements or non-zero opening/closing
                const hasActivity = (
                    Math.abs(node.moveDebitAgg) > 0.01 || 
                    Math.abs(node.moveCreditAgg) > 0.01 || 
                    Math.abs(node.beginDebitAgg) > 0.01 || 
                    Math.abs(node.beginCreditAgg) > 0.01 ||
                    Math.abs(node.endDebitAgg) > 0.01 ||
                    Math.abs(node.endCreditAgg) > 0.01
                );
                
                return (!hideZero || hasActivity);
            });
        }
        
        // Sort by type order
        const typeOrder: Record<string, number> = { asset: 1, liability: 2, equity: 3, revenue: 4, expense: 5 };
        
        return filterTree(root).sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    }
    
    const hierarchicalBalances = buildTree(balances);
    
    let totalBeginDebit = 0;
    let totalBeginCredit = 0;
    let totalMoveDebit = 0;
    let totalMoveCredit = 0;
    let totalEndDebit = 0;
    let totalEndCredit = 0;

    hierarchicalBalances.forEach(node => {
        totalBeginDebit += node.beginDebitAgg;
        totalBeginCredit += node.beginCreditAgg;
        totalMoveDebit += node.moveDebitAgg;
        totalMoveCredit += node.moveCreditAgg;
        totalEndDebit += node.endDebitAgg;
        totalEndCredit += node.endCreditAgg;
    });

    return { 
        hierarchicalBalances, 
        balances,
        totalBeginDebit,
        totalBeginCredit,
        totalMoveDebit,
        totalMoveCredit,
        totalEndDebit,
        totalEndCredit
    };
  }, [accounts, transactions, currencies, globalCurrencyCode, startDate, endDate, hideZero, accountLevel]);


  const analyticalData = useMemo(() => {
    if (!expandedAccountId) return [];
    
    const acc = accounts.find(a => a.id === expandedAccountId);
    if (!acc) return [];

    const relatedTx = (transactions || []).filter(t => 
        (t.debitAccountId === expandedAccountId || t.creditAccountId === expandedAccountId) &&
        t.date >= startDate && t.date <= endDate
    );
    
    const groups: Record<string, { label: string, debit: number, credit: number }> = {};

    relatedTx.forEach(tx => {
      let key = 'Other';
      let label = 'غير محدد';
      const txDesc = tx.description || '';

      // Find related booking if exists
      let booking = bookings.find(b => tx.sourceId && (tx.sourceId === b.id || tx.sourceId.startsWith(`${b.id}-`)));
      
      // Look up voucher if tx is associated with a voucher
      const voucher = vouchers.find(v => tx.sourceId && v.id === tx.sourceId);
      if (!booking && voucher && voucher.linkedBookingId) {
         booking = bookings.find(b => b.id === voucher.linkedBookingId);
      }

      // Robust client matching: check by ID, name, or phone of the booking
      let client = booking ? clients.find(c => 
         c.id === (booking as any).clientId || 
         c.name === booking.customerName || 
         c.phone === booking.customerPhone
      ) : null;

      // Try matching by name in description or voucher details if still no client is found
      if (!client) {
         const searchString = `${txDesc} ${voucher?.customerName || ''} ${voucher?.description || ''} ${booking?.customerName || ''}`.toLowerCase();
         client = clients.find(c => c.name && searchString.includes(c.name.trim().toLowerCase())) || null;
      }

      if (analyticalDimension === 'client') {
         if (client) {
            key = client.id;
            label = client.name;
         } else if (booking) {
            key = booking.customerPhone || booking.customerName || booking.id;
            label = booking.customerName || 'عميل غير محدد';
         } else if (voucher && voucher.customerName) {
            key = voucher.customerName;
            label = voucher.customerName;
         } else {
            // Try extracting client name from the transaction or voucher description
            const clientMatch = txDesc.match(/العميل:\s*([^-\n]+)/) || voucher?.description?.match(/العميل:\s*([^-\n]+)/);
            if (clientMatch && clientMatch[1]) {
               const extractedName = clientMatch[1].trim();
               key = extractedName;
               label = extractedName;
            } else {
               key = 'manual';
               label = txDesc || 'عملية يدوية';
            }
         }
      } else if (analyticalDimension === 'date') {
         // Booking event date or transaction date
         const date = (booking && booking.days && booking.days[0]?.date) ? booking.days[0].date : (booking?.eventDate || tx.date);
         key = date;
         label = date;
      } else if (analyticalDimension === 'month') {
         const date = (booking && booking.days && booking.days[0]?.date) ? booking.days[0].date : (booking?.eventDate || tx.date);
         key = date.substring(0, 7); // YYYY-MM
         label = date.substring(0, 7);
      } else if (analyticalDimension === 'user') {
         key = tx.createdBy || 'system';
         label = tx.createdBy || 'النظام';
      } else if (analyticalDimension === 'service') {
         if (booking) {
            const isServices = tx.sourceId?.includes('-accrue-services') || txDesc.includes('خدمات إضافية');
            const isHallRent = tx.sourceId?.includes('-accrue-hall') || txDesc.includes('إيجار قاعة');
            
            if (isServices) {
               const services = booking.additionalServices || (booking as any).services || [];
               if (services.length > 0) {
                  key = booking.id + '-services';
                  label = services.map((s: any) => s.name).join(' + ');
               } else {
                  key = booking.id + '-services';
                  label = 'خدمات إضافية (غير مفصلة)';
               }
            } else if (isHallRent) {
               key = booking.id + '-hall';
               label = 'إيجار القاعة';
            } else {
               key = tx.sourceId || 'manual';
               label = txDesc || 'عملية يدوية';
            }
         } else {
            key = 'manual';
            label = txDesc || 'عملية يدوية';
         }
      } else if (analyticalDimension === 'event') {
         if (booking) {
            const date = (booking && booking.days && booking.days[0]?.date) ? booking.days[0].date : (booking?.eventDate || '');
            key = booking.id;
            const customerName = client ? client.name : (booking.customerName || 'عميل غير محدد');
            label = `فعالية: ${booking.eventType || 'حجز'} - ${customerName} - ${date}`;
         } else {
            key = 'manual';
            label = txDesc || 'عملية يدوية';
         }
      }

      if (!groups[key]) groups[key] = { label, debit: 0, credit: 0 };
      
      // Use baseAmount if available
      const convertedAmount = getTxAmountInGlobal(tx);
      if (tx.debitAccountId === expandedAccountId) groups[key].debit += convertedAmount;
      if (tx.creditAccountId === expandedAccountId) groups[key].credit += convertedAmount;
    });

    return Object.values(groups).sort((a, b) => b.debit + b.credit - (a.debit + a.credit));
  }, [expandedAccountId, analyticalDimension, transactions, accounts, bookings, clients, services, vouchers]);

  // Income Statement Calculation
  const incomeStatementData = useMemo(() => {
    let totalRevenue = 0;
    let totalExpense = 0;
    
    // Filter out accounts with zero balance (absolute end balance > 0.005)
    const revenues = trialBalanceData.balances.filter(a => a.type === 'revenue' && Math.abs(a.endBalance) > 0.005);
    const expenses = trialBalanceData.balances.filter(a => a.type === 'expense' && Math.abs(a.endBalance) > 0.005);
    
    revenues.forEach(r => totalRevenue += r.credit - r.debit);
    expenses.forEach(e => totalExpense += e.debit - e.credit);
    
    const netIncome = totalRevenue - totalExpense;
    
    return { revenues, expenses, totalRevenue, totalExpense, netIncome };
  }, [trialBalanceData]);

  // Balance Sheet Calculation
  const balanceSheetData = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    // Filter out accounts with zero balance (absolute end balance > 0.005)
    const assets = trialBalanceData.balances.filter(a => a.type === 'asset' && Math.abs(a.endBalance) > 0.005);
    const liabilities = trialBalanceData.balances.filter(a => a.type === 'liability' && Math.abs(a.endBalance) > 0.005);
    const equity = trialBalanceData.balances.filter(a => a.type === 'equity' && Math.abs(a.endBalance) > 0.005);
    
    assets.forEach(a => totalAssets += a.debit - a.credit);
    liabilities.forEach(l => totalLiabilities += l.credit - l.debit);
    equity.forEach(e => totalEquity += e.credit - e.debit);
    
    // Add Net Income to Equity
    const finalEquity = totalEquity + incomeStatementData.netIncome;
    const totalLiabilitiesAndEquity = totalLiabilities + finalEquity;
    
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, finalEquity, totalLiabilitiesAndEquity };
  }, [trialBalanceData, incomeStatementData]);


  return (
    <div className="space-y-6 text-right animate-fade-in relative pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <PieChart className="h-7 w-7 text-indigo-600 dark:text-indigo-500" />
            التقارير المالية والحسابات الختامية
          </h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            استعراض ميزان المراجعة، الأرباح والخسائر، والميزانية العمومية للشركة بشكل لحظي. 
            يتم التقييم بناءً على العملة الاساسية الحالية: <strong className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-1">{globalCurrencyCode}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-xl transition shadow-sm text-sm cursor-pointer">
            <Download className="h-4 w-4" />
            تصدير كـ PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'trial_balance' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          ميزان المراجعة
        </button>
        <button
          onClick={() => setActiveTab('income_statement')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'income_statement' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          قائمة الدخل (الأرباح والخسائر)
        </button>
        <button
          onClick={() => setActiveTab('balance_sheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'balance_sheet' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          الميزانية العمومية
        </button>
        <button
          onClick={() => setActiveTab('journal_entries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'journal_entries' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          قيود اليومية
        </button>
      </div>

      {activeTab === 'trial_balance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-slideup">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">ميزان المراجعة بالأرصدة (التحليلي)</h3>
              <p className="text-xs text-slate-500 mt-1">انقر على الحساب لعرض التفاصيل التحليلية بحسب المعيار المختار.</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm max-w-full">
               <button 
                 onClick={() => setReportMode('balance')}
                 className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                   reportMode === 'balance' 
                     ? 'bg-indigo-600 text-white shadow-sm' 
                     : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                 }`}
               >
                 الأرصدة
               </button>
               <button 
                 onClick={() => setReportMode('movement')}
                 className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                   reportMode === 'movement' 
                     ? 'bg-indigo-600 text-white shadow-sm' 
                     : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                 }`}
               >
                 التحليلي / الحركة
               </button>
               <button 
                 onClick={() => setHideZero(!hideZero)}
                 className={`px-2 py-1 rounded text-[10px] font-bold ${hideZero ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
               >
                 {hideZero ? 'ذات حركة فقط (إخفاء الصفرية)' : 'عرض الحسابات الصفرية'}
               </button>
               <select value={accountLevel} onChange={e => setAccountLevel(e.target.value as any)} className="bg-slate-50 border-none rounded p-1 text-[10px]">
                   <option value="all">الكل</option>
                   <option value="main">رئيسية</option>
                   <option value="sub">فرعية</option>
               </select>
               <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
               <div className="flex items-center gap-1">
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-[9px] w-20 bg-slate-50 dark:bg-slate-700 border-none rounded p-0.5" />
                 <span className="text-[9px] text-slate-400">لـ</span>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-[9px] w-20 bg-slate-50 dark:bg-slate-700 border-none rounded p-0.5" />
               </div>
               <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
               {[
                 { id: 'client', label: 'العميل' },
                 { id: 'date', label: 'التاريخ' },
                 { id: 'month', label: 'الشهر' },
                 { id: 'user', label: 'المستخدم' },
                 { id: 'service', label: 'الخدمة' },
                 { id: 'event', label: 'الفعالية' }
               ].map(dim => (
                 <button
                   key={dim.id}
                   onClick={() => setAnalyticalDimension(dim.id as any)}
                   className={`px-1.5 py-1 rounded text-[9px] font-black transition-all whitespace-nowrap ${
                     analyticalDimension === dim.id 
                       ? 'bg-indigo-600 text-white' 
                       : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                   }`}
                 >
                   {dim.label}
                 </button>
               ))}
            </div>
          </div>
          <div className="w-full text-[7px] sm:text-[9px] md:text-xs overflow-hidden">
            <table className="w-full text-right border-collapse border border-slate-200 dark:border-slate-800 table-fixed">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[6px] sm:text-[8px] md:text-[9px] text-center">
                <tr>
                  <th className="p-0.5 md:px-1 md:py-2 w-16 sm:w-20 border-l border-slate-200 dark:border-slate-700 leading-tight" rowSpan={2}>رقم</th>
                  <th className="p-0.5 md:px-2 md:py-2 w-[28%] md:w-auto border-l border-slate-200 dark:border-slate-700 leading-tight" rowSpan={2}>اسم الحساب</th>
                  {reportMode === 'movement' && (
                    <>
                      <th className="p-0.5 md:px-1 md:py-2 border-l border-slate-200 dark:border-slate-700 leading-tight" colSpan={2}>رصيد بداية</th>
                      <th className="p-0.5 md:px-1 md:py-2 border-l border-slate-200 dark:border-slate-700 leading-tight" colSpan={2}>فترة</th>
                    </>
                  )}
                  <th className="p-0.5 md:px-1 md:py-2 leading-tight" colSpan={2}>رصيد نهاية</th>
                </tr>
                <tr>
                  {reportMode === 'movement' && (
                    <>
                      <th className="p-0.5 md:px-1 md:py-1 border-l border-slate-200 dark:border-slate-700 leading-tight">مدين</th>
                      <th className="p-0.5 md:px-1 md:py-1 border-l border-slate-200 dark:border-slate-700 leading-tight">دائن</th>
                      <th className="p-0.5 md:px-1 md:py-1 border-l border-slate-200 dark:border-slate-700 leading-tight">مدين</th>
                      <th className="p-0.5 md:px-1 md:py-1 border-l border-slate-200 dark:border-slate-700 leading-tight">دائن</th>
                    </>
                  )}
                  <th className="p-0.5 md:px-1 md:py-1 border-l border-slate-200 dark:border-slate-700 leading-tight">مدين</th>
                  <th className="p-0.5 md:px-1 md:py-1 leading-tight">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trialBalanceData?.hierarchicalBalances?.map(acc => {
                    const renderRow = (acc: any, depth: number = 0): any[] => {
                        // Strict check: if hideZero is true, show only if activity exists
                        const hasActivity = Math.abs(acc.beginDebitAgg || 0) > 0.01 || Math.abs(acc.beginCreditAgg || 0) > 0.01 || Math.abs(acc.endDebitAgg || 0) > 0.01 || Math.abs(acc.endCreditAgg || 0) > 0.01 || Math.abs(acc.moveDebitAgg || 0) > 0.01 || Math.abs(acc.moveCreditAgg || 0) > 0.01;
                        if (hideZero && !hasActivity) return [];

                        const rows = [
                            <tr 
                                key={acc.id}
                                onClick={() => setExpandedAccountId(expandedAccountId === acc.id ? null : acc.id)}
                                className={`${depth === 0 ? 'bg-slate-50 dark:bg-slate-800 font-black' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group text-[6px] sm:text-[8px] md:text-[10px] text-center`}
                            >
                                <td className="p-0.5 md:px-1 md:py-2 w-16 sm:w-20 font-mono whitespace-nowrap leading-tight text-slate-700 dark:text-slate-300 font-bold border-l border-slate-200 dark:border-slate-800" style={{ paddingRight: `${depth * 10 + 4}px` }}>{acc.code}</td>
                                <td className="p-0.5 md:px-2 md:py-2 font-bold break-words whitespace-normal leading-tight text-slate-900 dark:text-slate-100 text-right">
                                    {acc.name}
                                </td>
                                {reportMode === 'movement' && (
                                  <>
                                    <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-bold text-emerald-700 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-800">{formatMovementAmount(acc.beginDebitAgg)}</td>
                                    <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-bold text-rose-700 dark:text-rose-400 border-l border-slate-200 dark:border-slate-800">{formatMovementAmount(acc.beginCreditAgg)}</td>
                                    <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-bold text-emerald-700 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-800">{formatMovementAmount(acc.moveDebitAgg)}</td>
                                    <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-bold text-rose-700 dark:text-rose-400 border-l border-slate-200 dark:border-slate-800">{formatMovementAmount(acc.moveCreditAgg)}</td>
                                  </>
                                )}
                                <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-bold text-emerald-700 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-800">{formatMovementAmount(acc.endDebitAgg)}</td>
                                <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-bold text-rose-700 dark:text-rose-400">{formatMovementAmount(acc.endCreditAgg)}</td>
                            </tr>
                        ];
                        
                        // Render analytical details if this account is expanded
                        if (expandedAccountId === acc.id && analyticalData && analyticalData.length > 0) {
                            analyticalData.forEach((item, idx) => {
                                const isDebitNormal = acc.type === 'asset' || acc.type === 'expense';
                                const netMove = isDebitNormal ? (item.debit - item.credit) : (item.credit - item.debit);
                                const itemDebitEnd = isDebitNormal ? (netMove > 0.005 ? netMove : 0) : (netMove < -0.005 ? Math.abs(netMove) : 0);
                                const itemCreditEnd = isDebitNormal ? (netMove < -0.005 ? Math.abs(netMove) : 0) : (netMove > 0.005 ? netMove : 0);

                                rows.push(
                                    <tr 
                                        key={`analytic-${acc.id}-${idx}`}
                                        className="bg-amber-50/50 dark:bg-amber-900/10 text-[6px] sm:text-[8px] md:text-[9px] hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition italic"
                                    >
                                        <td className="p-0.5 md:px-1 md:py-1.5 break-all leading-tight text-slate-400 font-mono text-center border-l border-slate-200 dark:border-slate-800">-</td>
                                        <td className="p-0.5 md:px-4 md:py-1.5 text-slate-500 text-right pr-6 border-l border-slate-200 dark:border-slate-800 flex items-center gap-1">
                                            <span className="text-amber-500 font-bold">•</span>
                                            <span>{item.label}</span>
                                        </td>
                                        {reportMode === 'movement' && (
                                            <>
                                                <td className="p-0.5 md:px-1 md:py-1.5 break-all leading-tight text-slate-400 border-l border-slate-200 dark:border-slate-800 text-center">-</td>
                                                <td className="p-0.5 md:px-1 md:py-1.5 break-all leading-tight text-slate-400 border-l border-slate-200 dark:border-slate-800 text-center">-</td>
                                                <td className="p-0.5 md:px-1 md:py-1.5 break-all leading-tight text-emerald-600 border-l border-slate-200 dark:border-slate-800 font-sans font-medium text-center">{formatMovementAmount(item.debit)}</td>
                                                <td className="p-0.5 md:px-1 md:py-1.5 break-all leading-tight text-rose-600 border-l border-slate-200 dark:border-slate-800 font-sans font-medium text-center">{formatMovementAmount(item.credit)}</td>
                                            </>
                                        )}
                                        <td className="p-0.5 md:px-1 md:py-1.5 break-all leading-tight text-emerald-600 border-l border-slate-200 dark:border-slate-800 font-sans font-medium text-center">{itemDebitEnd > 0.005 ? formatDebitBalance(itemDebitEnd) : '-'}</td>
                                        <td className="p-0.5 md:px-1 md:py-1.5 break-all leading-tight text-rose-600 font-sans font-medium text-center">{itemCreditEnd > 0.005 ? formatDebitBalance(itemCreditEnd) : '-'}</td>
                                    </tr>
                                );
                            });
                        }

                        acc.children.forEach((child: any) => {
                            rows.push(...renderRow(child, depth + 1));
                        });
                        return rows;
                    };
                    return renderRow(acc);
                })}
              </tbody>
              <tfoot className="bg-indigo-50 dark:bg-indigo-900/30 font-black border-t border-indigo-100 dark:border-indigo-800 text-[10px]">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-left text-indigo-800 dark:text-indigo-300 border-l border-indigo-100 dark:border-indigo-800">الإجمالي:</td>
                  {reportMode === 'movement' && (
                    <>
                      <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-semibold text-indigo-700 dark:text-indigo-400 border-l border-indigo-100 dark:border-indigo-800">{trialBalanceData?.totalBeginDebit > 0 ? trialBalanceData.totalBeginDebit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '-'}</td>
                      <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-semibold text-indigo-700 dark:text-indigo-400 border-l border-indigo-100 dark:border-indigo-800">{trialBalanceData?.totalBeginCredit > 0 ? trialBalanceData.totalBeginCredit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '-'}</td>
                      <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-semibold text-indigo-700 dark:text-indigo-400 border-l border-indigo-100 dark:border-indigo-800">{trialBalanceData?.totalMoveDebit > 0 ? trialBalanceData.totalMoveDebit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '-'}</td>
                      <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-semibold text-indigo-700 dark:text-indigo-400 border-l border-indigo-100 dark:border-indigo-800">{trialBalanceData?.totalMoveCredit > 0 ? trialBalanceData.totalMoveCredit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '-'}</td>
                    </>
                  )}
                  <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-semibold text-indigo-700 dark:text-indigo-400 border-l border-indigo-100 dark:border-indigo-800">{trialBalanceData?.totalEndDebit > 0 ? trialBalanceData.totalEndDebit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '-'}</td>
                  <td className="p-0.5 md:px-1 md:py-2 font-sans break-all leading-tight font-semibold text-indigo-700 dark:text-indigo-400">{trialBalanceData?.totalEndCredit > 0 ? trialBalanceData.totalEndCredit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '-'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'income_statement' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-slideup p-6">
           <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 text-center">
            <h3 className="font-black text-slate-800 dark:text-white text-xl">قائمة الدخل (الأرباح والخسائر)</h3>
            <p className="text-sm text-slate-500 mt-1">للفترة المنتهية حتى تاريخه</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {/* Revenues */}
            <div>
              <h4 className="font-bold text-indigo-700 dark:text-indigo-400 mb-3 text-lg border-b border-indigo-100 dark:border-indigo-900/50 pb-2">الإيرادات (Revenues)</h4>
              <div className="space-y-2">
                {incomeStatementData.revenues.map(acc => (
                  <div key={acc.id} className="flex justify-between items-center text-sm py-1">
                    <span className="text-slate-700 dark:text-slate-300">{acc.name}</span>
                    <span className="font-sans font-bold text-slate-900 dark:text-white">{formatReportAmount(acc.credit - acc.debit)}</span>
                  </div>
                ))}
                {incomeStatementData.revenues.length === 0 && <div className="text-slate-400 text-sm py-2">لا توجد حركات مؤكدة</div>}
                <div className="flex justify-between items-center text-sm font-black pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-800 dark:text-slate-200">إجمالي الإيرادات</span>
                  <span className="font-sans text-indigo-600 dark:text-indigo-400">{formatReportAmount(incomeStatementData.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <h4 className="font-bold text-rose-700 dark:text-rose-400 mb-3 text-lg border-b border-rose-100 dark:border-rose-900/50 pb-2">المصروفات (Expenses)</h4>
              <div className="space-y-2">
                {incomeStatementData.expenses.map(acc => (
                  <div key={acc.id} className="flex justify-between items-center text-sm py-1">
                    <span className="text-slate-700 dark:text-slate-300">{acc.name}</span>
                    <span className="font-sans font-bold text-slate-900 dark:text-white">{formatReportAmount(acc.debit - acc.credit)}</span>
                  </div>
                ))}
                {incomeStatementData.expenses.length === 0 && <div className="text-slate-400 text-sm py-2">لا توجد حركات مؤكدة</div>}
                <div className="flex justify-between items-center text-sm font-black pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-800 dark:text-slate-200">إجمالي المصروفات</span>
                  <span className="font-sans text-rose-600 dark:text-rose-400">({formatReportAmount(incomeStatementData.totalExpense)})</span>
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className={`mt-8 p-5 rounded-xl border-2 flex justify-between items-center ${incomeStatementData.netIncome >= 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'}`}>
              <span className={`text-xl font-black ${incomeStatementData.netIncome >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'}`}>
                {incomeStatementData.netIncome >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
              </span>
              <span className={`text-2xl font-black font-sans ${incomeStatementData.netIncome >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {formatReportAmount(incomeStatementData.netIncome)} {selectedGlobalCurrencyObj.symbol}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'balance_sheet' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-slideup p-6">
           <div className="mb-8 pb-4 border-b border-slate-100 dark:border-slate-800 text-center">
            <h3 className="font-black text-slate-800 dark:text-white text-xl">الميزانية العمومية (المركز المالي)</h3>
            <p className="text-sm text-slate-500 mt-1">كما في تاريخ اليوم</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assets Side */}
            <div className="space-y-6">
               <h4 className="font-black text-emerald-700 dark:text-emerald-400 mb-4 text-xl border-b-2 border-emerald-500 pb-2">الأصول (Assets)</h4>
               
               <div className="space-y-3">
                 {balanceSheetData.assets.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-700 dark:text-slate-300">{acc.name}</span>
                      <span className="font-sans font-bold text-slate-900 dark:text-white">{formatReportAmount(acc.debit - acc.credit)}</span>
                    </div>
                 ))}
                 {balanceSheetData.assets.length === 0 && <div className="text-slate-400 text-sm py-2">لا توجد حركات مؤكدة</div>}
               </div>

               <div className="flex justify-between items-center p-3 mt-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl font-black text-lg">
                  <span className="text-slate-800 dark:text-slate-200">إجمالي الأصول</span>
                  <span className="font-sans text-emerald-600 dark:text-emerald-400">{formatReportAmount(balanceSheetData.totalAssets)}</span>
               </div>
            </div>

            {/* Liabilities & Equity Side */}
            <div className="space-y-6">
               <h4 className="font-black text-rose-700 dark:text-rose-400 mb-4 text-xl border-b-2 border-rose-500 pb-2">الخصوم (Liabilities)</h4>
               
               <div className="space-y-3">
                 {balanceSheetData.liabilities.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-700 dark:text-slate-300">{acc.name}</span>
                      <span className="font-sans font-bold text-slate-900 dark:text-white">{formatReportAmount(acc.credit - acc.debit)}</span>
                    </div>
                 ))}
                 {balanceSheetData.liabilities.length === 0 && <div className="text-slate-400 text-sm py-2">لا توجد حركات مؤكدة</div>}
               </div>

                <div className="flex justify-between items-center p-2 text-sm font-bold border-b-2 border-slate-200 dark:border-slate-700 mb-4 pb-3">
                  <span className="text-slate-700 dark:text-slate-300">إجمالي الخصوم</span>
                  <span className="font-sans text-rose-600 dark:text-rose-400">{formatReportAmount(balanceSheetData.totalLiabilities)}</span>
               </div>

               <h4 className="font-black text-blue-700 dark:text-blue-400 mt-6 mb-4 text-xl border-b-2 border-blue-500 pb-2">حقوق الملكية (Equity)</h4>
               <div className="space-y-3">
                 {balanceSheetData.equity.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-700 dark:text-slate-300">{acc.name}</span>
                      <span className="font-sans font-bold text-slate-900 dark:text-white">{formatReportAmount(acc.credit - acc.debit)}</span>
                    </div>
                 ))}

                  <div className="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-700 dark:text-slate-300 font-bold italic">صافي أرباح (خسائر) الفترة المضافة</span>
                    <span className={`font-sans font-bold ${incomeStatementData.netIncome >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatReportAmount(incomeStatementData.netIncome)}</span>
                  </div>
               </div>

               <div className="flex justify-between items-center p-3 mt-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl font-black text-lg text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-900">
                  <span>إجمالي الخصوم وحقوق الملكية</span>
                  <span className="font-sans">{formatReportAmount(balanceSheetData.totalLiabilitiesAndEquity)}</span>
               </div>
            </div>
          </div>

          {/* Validation Footnote */}
          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
            {Math.abs(balanceSheetData.totalAssets - balanceSheetData.totalLiabilitiesAndEquity) < 0.1 ? (
              <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full text-sm">
                <CheckSquare className="h-5 w-5" />
                الميزانية متوازنة بنجاح (Balanced)
              </span>
            ) : (
              <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/30 px-4 py-2 rounded-full text-sm">
                <Info className="h-5 w-5" />
                الميزانية غير متوازنة، يجب مراجعة القيود - الفارق: {formatReportAmount(Math.abs(balanceSheetData.totalAssets - balanceSheetData.totalLiabilitiesAndEquity))}
              </span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'journal_entries' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-slideup p-6">
          <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 text-center">
            <h3 className="font-black text-slate-800 dark:text-white text-xl">قيود اليومية</h3>
            <p className="text-sm text-slate-500 mt-1">كشف بجميع القيود المحاسبية المسجلة</p>
          </div>
          <div className="hidden md:block overflow-x-auto">
             <table className="w-full text-sm text-right">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                   <tr>
                     <th className="px-4 py-3">التاريخ</th>
                     <th className="px-4 py-3">البيان</th>
                     <th className="px-4 py-3">مدين</th>
                     <th className="px-4 py-3">دائن</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(transactions || []).map((tx, idx) => (
                      <tr key={tx.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 text-slate-500 font-mono">{tx.date}</td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{tx.description}</td>
                        <td className="px-4 py-3 font-sans font-bold text-emerald-600">{formatReportAmount(tx.amount)}</td>
                        <td className="px-4 py-3 font-sans font-bold text-rose-600">{formatReportAmount(tx.amount)}</td>
                      </tr>
                    ))}
                </tbody>
             </table>
          </div>

          {/* Mobile View: Flexible Grid for Journal Entries */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(transactions || []).map((tx, idx) => (
              <div key={tx.id || idx} className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{tx.date}</span>
                  <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">قيد محاسبي</span>
                </div>
                <p className="text-xs font-black text-slate-800 dark:text-white leading-relaxed line-clamp-2">{tx.description}</p>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">مدين (+)</span>
                    <span className="text-xs font-black text-emerald-600 font-sans">{formatReportAmount(tx.amount)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">دائن (-)</span>
                    <span className="text-xs font-black text-rose-600 font-sans">{formatReportAmount(tx.amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
