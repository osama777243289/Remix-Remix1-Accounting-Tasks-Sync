import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Booking, Hall, Transaction, Currency, BookingSettings, ReceiptPayment, Account, Client, LinkedAccounts 
} from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  FileText, Download, TrendingUp, Calendar, Users, 
  DollarSign, CheckCircle, Clock, Filter, Search, ChevronRight, Copy, PhoneCall, ListRestart
} from 'lucide-react';
import { motion } from 'motion/react';

interface AdvancedBookingReportsProps {
  bookings: Booking[];
  halls: Hall[];
  transactions: Transaction[];
  currencies: Currency[];
  globalCurrencyCode: string;
  settings: BookingSettings | null;
  linkedAccounts?: LinkedAccounts | null;
  vouchers?: ReceiptPayment[];
  accounts: Account[];
  clients: Client[];
  onViewAccountStatement?: (accountId: string, clientIds?: string[]) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AdvancedBookingReports({ 
  bookings, halls, transactions, currencies, globalCurrencyCode, settings, linkedAccounts, vouchers = [], accounts, clients, onViewAccountStatement
}: AdvancedBookingReportsProps) {
  const [filterHall, setFilterHall] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Booking preview state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const selectedGlobalCurrencyObj = currencies.find(c => c.code === globalCurrencyCode) || { symbol: "$" };

  // Helper to find client object
  const bookingClient = useMemo(() => {
    if (!selectedBooking || !clients) return null;
    const name = (selectedBooking.customerName || "").trim().toLowerCase();
    const phone = (selectedBooking.customerPhone || "").trim();
    
    return clients.find(c => 
      (name && (c.name || "").trim().toLowerCase() === name) || 
      (phone && (c.phone || "").trim() === phone) ||
      (phone.length >= 5 && (c.phone || "").includes(phone))
    ) || null;
  }, [selectedBooking, clients]);

  // Helper: Convert to base currency then to target currency
  const getConvertedAmount = (amount: number, fromCode: string, toCode: string): number => {
    if (!amount) return 0;
    if (fromCode === toCode) return amount;
    const fromCurr = currencies.find(c => c.code === fromCode);
    const toCurr = currencies.find(c => c.code === toCode);
    if (!fromCurr || !toCurr) return amount;
    
    const amountInBase = amount * fromCurr.rateToBase;
    return amountInBase / toCurr.rateToBase;
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchHall = filterHall === 'all' || b.hallId === filterHall;
      const matchStatus = filterStatus === 'all' || b.status === filterStatus;
      const matchSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.customerPhone.includes(searchTerm);
      return matchHall && matchStatus && matchSearch;
    });
  }, [bookings, filterHall, filterStatus, searchTerm]);

  // 1. Revenue by Hall Data
  const revenueByHallData = useMemo(() => {
    const data: Record<string, number> = {};
    bookings.forEach(b => {
      const hall = halls.find(h => h.id === b.hallId);
      const name = hall?.name || 'قاعة غير معروفة';
      const amount = getConvertedAmount(b.totalPrice, b.currency, globalCurrencyCode);
      data[name] = (data[name] || 0) + amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [bookings, halls, globalCurrencyCode]);

  // Find customer account for the statement
  const customerAccount = useMemo(() => {
    if (!selectedBooking || !accounts) return null;
    
    // 1. If we found a specific client, use their linked account if available
    if (bookingClient && bookingClient.linkedAccountId) {
      const acc = accounts.find(a => a.id === bookingClient.linkedAccountId);
      if (acc) return acc;
    }
    
    // 2. Fallback: Use the general Accounts Receivable account from linking settings
    // as requested by the user ("financial account for customers is the one in linking settings")
    const arId = linkedAccounts?.accountsReceivableId || (settings as any)?.accountsReceivableId || "1010301";
    if (arId) {
      const arAccount = accounts.find(a => a.id === arId);
      if (arAccount) return arAccount;
    }

    return null;
  }, [selectedBooking, accounts, bookingClient, settings, linkedAccounts]);

  // Persistent user table settings
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'customer', 'phone', 'event', 'hall', 'date', 'period', 'status', 
    'rent', 'services', 'total', 'paid', 'discount', 'insurance', 'mortgage', 
    'subsequent_collections', 'refunds', 'remaining_before', 'remaining_after', 'createdBy'
  ]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'customer', 'phone', 'hall', 'date', 'status', 
    'rent', 'services', 'total', 'paid', 'discount', 'insurance', 'mortgage', 
    'subsequent_collections', 'refunds', 'remaining_before', 'remaining_after'
  ]);
  const [rowHeight, setRowHeight] = useState('py-4'); // py-2, py-4, py-6
  const [frozenColumnsCount, setFrozenColumnsCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load persistent settings
  useEffect(() => {
    const savedOrder = localStorage.getItem('adv_booking_reports_column_order');
    const savedVisible = localStorage.getItem('adv_booking_reports_visible_columns');
    const savedFrozen = localStorage.getItem('adv_booking_reports_frozen_count');
    
    if (savedOrder) setColumnOrder(JSON.parse(savedOrder));
    if (savedVisible) setVisibleColumns(JSON.parse(savedVisible));
    if (savedFrozen) setFrozenColumnsCount(parseInt(savedFrozen));
  }, []);

  const saveSettings = () => {
    localStorage.setItem('adv_booking_reports_column_order', JSON.stringify(columnOrder));
    localStorage.setItem('adv_booking_reports_visible_columns', JSON.stringify(visibleColumns));
    localStorage.setItem('adv_booking_reports_frozen_count', frozenColumnsCount.toString());
    setIsSettingsOpen(false);
    toast.success("تم حفظ تفضيلاتك بنجاح");
  };

  // Helper to translate column keys
  const getColumnLabel = (key: string) => {
    switch (key) {
      case 'customer': return 'العميل';
      case 'phone': return 'الهاتف';
      case 'event': return 'نوع الحدث';
      case 'hall': return 'القاعة';
      case 'date': return 'التاريخ';
      case 'period': return 'الفترة';
      case 'status': return 'الحالة';
      case 'rent': return 'مبلغ الإيجار';
      case 'services': return 'مبلغ الخدمات';
      case 'total': return 'الإجمالي (قبل الخصم)';
      case 'paid': return 'المحصل الأولي';
      case 'discount': return 'الخصومات';
      case 'insurance': return 'مبلغ التأمين';
      case 'mortgage': return 'الرهن المالي';
      case 'subsequent_collections': return 'المحصل اللاحق';
      case 'refunds': return 'المرتجع والردود';
      case 'remaining_before': return 'المتبقي قبل الرهن والتأمين';
      case 'remaining_after': return 'المتبقي بعد الرهن والتأمين';
      case 'createdBy': return 'بواسطة';
      default: return key;
    }
  };

  const getColumnWidth = (c: string) => {
    switch (c) {
      case 'customer': return 180;
      case 'phone': return 140;
      case 'hall': return 140;
      case 'rent': return 120;
      case 'services': return 120;
      case 'subsequent_collections': return 160;
      case 'refunds': return 160;
      case 'remaining_before': return 180;
      case 'remaining_after': return 180;
      default: return 120;
    }
  };

  const getStickyStyles = (colIndex: number, visibleCols: string[]) => {
    if (colIndex >= frozenColumnsCount) return {};
    
    let rightOffset = 0;
    for (let i = 0; i < colIndex; i++) {
      rightOffset += getColumnWidth(visibleCols[i]);
    }
    
    return {
      position: 'sticky' as const,
      right: rightOffset,
      zIndex: 30,
    };
  };

  const currentVisibleColumns = useMemo(() => 
    columnOrder.filter(c => visibleColumns.includes(c)),
  [columnOrder, visibleColumns]);

  // Subsequent calculations
  const getRentAmount = (b: Booking) => {
    return getConvertedAmount(
      (b.days || [])
        .filter(d => d.status !== 'cancelled')
        .reduce((sum, d) => sum + d.price, 0), 
      b.currency, 
      globalCurrencyCode
    );
  };

  const getServicesAmount = (b: Booking) => {
    return getConvertedAmount((b.additionalServices || []).reduce((sum, s) => sum + s.cost, 0), b.currency, globalCurrencyCode);
  };

  const getGrossTotal = (b: Booking) => {
    return getRentAmount(b) + getServicesAmount(b);
  };

  const getSubsequentCollections = (b: Booking) => {
    if (!vouchers) return 0;
    const bookingVouchers = vouchers.filter(v => {
      const bId = v.linkedBookingId || (v as any).bookingId;
      return Boolean(bId) && (bId === b.id || (Boolean(b.sequenceCode) && bId === b.sequenceCode)) && v.type === 'receipt';
    });
    const totalReceipts = bookingVouchers.reduce((sum, v) => sum + getConvertedAmount(v.amount, v.currency, globalCurrencyCode), 0);
    
    // Subtract initial components as they have their own columns
    const initialPaid = getConvertedAmount(b.paidAmount || 0, b.currency, globalCurrencyCode);
    const insurance = getConvertedAmount(b.insuranceAmount || 0, b.currency, globalCurrencyCode);
    const mortgage = getConvertedAmount(b.mortgageAmount || 0, b.currency, globalCurrencyCode);
    
    const result = totalReceipts - initialPaid - insurance - mortgage;
    return Math.max(0, result);
  };

  const getRefunds = (b: Booking) => {
    if (!vouchers) return 0;
    const bookingVouchers = vouchers.filter(v => {
      const bId = v.linkedBookingId || (v as any).bookingId;
      return Boolean(bId) && (bId === b.id || (Boolean(b.sequenceCode) && bId === b.sequenceCode)) && v.type === 'payment';
    });
    return bookingVouchers.reduce((sum, v) => sum + getConvertedAmount(v.amount, v.currency, globalCurrencyCode), 0);
  };

  const getRemainingBefore = (b: Booking) => {
    const total = getConvertedAmount(b.totalPrice, b.currency, globalCurrencyCode);
    const initialPaid = getConvertedAmount(b.paidAmount, b.currency, globalCurrencyCode);
    const discount = getConvertedAmount(
      (b.days || [])
        .filter(d => d.status !== 'cancelled')
        .reduce((sum, d) => sum + d.discount, 0), 
      b.currency, 
      globalCurrencyCode
    );
    const subsequent = getSubsequentCollections(b);
    
    // Revenue Refunds = Total Payments - Insurance Returns - Mortgage Returns
    const totalRefunds = getRefunds(b);
    const insuranceReturned = b.insuranceRefunded ? getConvertedAmount(b.insuranceAmount || 0, b.currency, globalCurrencyCode) : 0;
    const mortgageReturned = b.mortgageStatus === 'returned' ? getConvertedAmount(b.mortgageAmount || 0, b.currency, globalCurrencyCode) : 0;
    
    const revenueRefunds = Math.max(0, totalRefunds - insuranceReturned - mortgageReturned);
    
    // Remaining = NetTotal - (Initial + Subsequent) + RevenueRefunds
    // NetTotal is stored in b.totalPrice
    return Math.max(0, total - (initialPaid + subsequent) + revenueRefunds);
  };

  const getRemainingAfter = (b: Booking) => {
    const remainingBefore = getRemainingBefore(b);
    
    // Deposits still outstanding (not yet refunded)
    const insuranceDue = b.insuranceRefunded ? 0 : getConvertedAmount(b.insuranceAmount || 0, b.currency, globalCurrencyCode);
    const mortgageDue = b.mortgageStatus === 'returned' ? 0 : getConvertedAmount(b.mortgageAmount || 0, b.currency, globalCurrencyCode);
    
    return remainingBefore - insuranceDue - mortgageDue;
  };

  // 2. Status Distribution
  const statusData = useMemo(() => {
    const data: Record<string, number> = {};
    const statusLabels: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    bookings.forEach(b => {
      const label = statusLabels[b.status] || b.status;
      data[label] = (data[label] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  // 3. Monthly Trend
  const monthlyTrendData = useMemo(() => {
    const data: Record<string, { total: number, count: number }> = {};
    bookings.forEach(b => {
      const date = new Date(b.createdAt);
      if (isNaN(date.getTime())) return;
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const amount = getConvertedAmount(b.totalPrice, b.currency, globalCurrencyCode);
      if (!data[monthYear]) data[monthYear] = { total: 0, count: 0 };
      data[monthYear].total += amount;
      data[monthYear].count += 1;
    });
    return Object.entries(data)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, stats]) => ({ 
        name, 
        revenue: Math.round(stats.total),
        bookings: stats.count 
      }));
  }, [bookings, globalCurrencyCode]);

  // 4. Financial Summary Cards
  const stats = useMemo(() => {
    let totalRev = 0;
    let totalPaid = 0;
    let totalMortgage = 0;
    let confirmedCount = 0;

    bookings.forEach(b => {
      totalRev += getConvertedAmount(b.totalPrice, b.currency, globalCurrencyCode);
      totalPaid += getConvertedAmount(b.paidAmount, b.currency, globalCurrencyCode);
      totalMortgage += getConvertedAmount(b.mortgageAmount || 0, b.currency, globalCurrencyCode);
      if (b.status === 'confirmed') confirmedCount++;
    });

    return { totalRev, totalPaid, totalMortgage, confirmedCount, totalCount: bookings.length };
  }, [bookings, globalCurrencyCode]);

  return (
    <div className="space-y-8 text-right animate-fade-in pb-20" dir="rtl">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-indigo-500" />
            تقارير الحجوزات المتقدمة
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
            تحليل شامل للأداء المالي، معدلات الإشغال، والتوجهات الشهرية للحجوزات.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black px-5 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-850 hover:bg-indigo-100 transition-all text-sm">
            <Download className="h-4 w-4" />
            تصدير تقرير PDF
          </button>
        </div>
      </div>

      {/* Bookings Detailed Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-500" />
            استعراض تفاصيل الحجوزات
          </h3>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                استعراض تفاصيل الحجوزات
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">إدارة وتحليل بيانات الفعاليات والعملاء</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث عن عميل..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pr-10 pl-4 py-2.5 text-xs font-black focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="flex gap-2">
                  <select onChange={e => setRowHeight(e.target.value)} value={rowHeight} className="bg-slate-100 dark:bg-slate-800 rounded-xl px-2 text-[10px] font-black">
                      <option value="py-1">ضيق</option>
                      <option value="py-3">متوسط</option>
                      <option value="py-5">عريض</option>
                  </select>
                  <button 
                    onClick={() => setIsSettingsOpen(true)} 
                    className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl px-3 py-2 text-[10px] font-black flex items-center gap-1 border border-indigo-100 dark:border-indigo-800/50"
                  >
                    <Filter className="h-3 w-3" />
                    إعدادات الأعمدة
                  </button>
              </div>
              
              <select 
                value={filterHall}
                onChange={e => setFilterHall(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">كل القاعات</option>
                {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            
            {/* Column Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsSettingsOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black mb-6">تخصيص أعمدة التقرير</h3>
                        <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
                            {columnOrder.map((col, index) => (
                                <div key={col} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={visibleColumns.includes(col)}
                                            onChange={e => {
                                                if (e.target.checked) setVisibleColumns([...visibleColumns, col]);
                                                else setVisibleColumns(visibleColumns.filter(c => c !== col));
                                            }}
                                            className="w-4 h-4 rounded text-indigo-600"
                                        />
                                        <span className="text-[10px] font-black">{getColumnLabel(col)}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button disabled={index === 0} onClick={() => {
                                            const newOrder = [...columnOrder];
                                            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                            setColumnOrder(newOrder);
                                        }} className="text-[10px] p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30">▲</button>
                                        <button disabled={index === columnOrder.length - 1} onClick={() => {
                                            const newOrder = [...columnOrder];
                                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                            setColumnOrder(newOrder);
                                        }} className="text-[10px] p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30">▼</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Frozen Columns Setting */}
                        <div className="mt-6 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                            <label className="text-[11px] font-black text-indigo-900 dark:text-indigo-300 block mb-2">تجميد الأعمدة (عند التمرير الأفقي):</label>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="5" 
                                    value={frozenColumnsCount} 
                                    onChange={(e) => setFrozenColumnsCount(parseInt(e.target.value))}
                                    className="flex-1 accent-indigo-600"
                                />
                                <span className="text-xs font-black text-indigo-600 w-8 text-center">{frozenColumnsCount}</span>
                            </div>
                            <p className="text-[8px] font-bold text-slate-500 mt-1">سيتم تجميد أول {frozenColumnsCount} أعمدة من ترتيبك المختار.</p>
                        </div>

                        <button onClick={saveSettings} className="mt-8 w-full bg-indigo-600 text-white font-black py-3.5 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">حفظ الإعدادات</button>
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="hidden md:block w-full">
            <table className="w-full border-collapse text-right min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                  {currentVisibleColumns.map((c, idx) => (
                    <th 
                      key={c} 
                      className={`p-3 sm:p-4 text-[10px] sm:text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 shadow-sm ${
                        ['rent', 'services', 'total', 'paid', 'discount', 'insurance', 'mortgage', 'subsequent_collections', 'refunds', 'remaining_before', 'remaining_after'].includes(c) ? 'text-left' : ''
                      } ${idx < frozenColumnsCount ? 'z-40' : ''}`}
                      style={{ 
                        minWidth: `${getColumnWidth(c)}px`,
                        ...getStickyStyles(idx, currentVisibleColumns)
                      }}
                    >
                      {getColumnLabel(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredBookings.map((b) => {
                  const subsequent = getSubsequentCollections(b);
                  const refunds = getRefunds(b);
                  const remBefore = getRemainingBefore(b);
                  const remAfter = getRemainingAfter(b);
                  
                  return (
                    <tr key={b.id} onClick={() => setSelectedBooking(b)} className="group hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500 bg-white dark:bg-slate-900">
                      {currentVisibleColumns.map((c, idx) => (
                        <td key={c} className={`p-2 sm:p-4 text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 font-medium ${rowHeight} ${idx < frozenColumnsCount ? 'bg-white dark:bg-slate-900 border-l border-l-slate-100 dark:border-l-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]' : ''}`} style={{
                          minWidth: `${getColumnWidth(c)}px`,
                          ...getStickyStyles(idx, currentVisibleColumns)
                        }}>
                          {c === 'customer' && (
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 dark:text-white whitespace-normal break-words text-[9px]">{b.customerName}</span>
                              <span className="text-[7px] text-slate-400 font-bold sm:hidden">#{b.id.slice(-4)}</span>
                            </div>
                          )}
                          {c === 'phone' && (
                            <div className="flex items-center gap-1 font-mono group/phone">
                              <span className="truncate">{b.customerPhone}</span>
                              <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(b.customerPhone); }} className="opacity-0 group-hover/phone:opacity-100 transition-opacity p-0.5 hover:bg-indigo-100 rounded">
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          )}
                          {c === 'event' && <span className="truncate block">{b.eventType || '-'}</span>}
                          {c === 'hall' && <span className="font-bold text-indigo-600 truncate block">{halls.find(h => h.id === b.hallId)?.name || '-'}</span>}
                          {c === 'date' && (
                            (() => {
                              const dates = (b.eventDates && b.eventDates.length > 0)
                                ? b.eventDates
                                : (b.days && b.days.length > 0)
                                  ? b.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                                  : (b as any).eventDate ? [(b as any).eventDate] : [];
                              if (dates.length <= 1) {
                                return <span className="font-mono text-[7.5px] sm:text-xs">{dates[0] || b.eventDate || '-'}</span>;
                              }
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[7px] text-indigo-600 font-bold">({dates.length} أيام)</span>
                                  <span className="font-mono text-[7px] sm:text-[10px] leading-tight text-slate-700 dark:text-slate-300">
                                    {dates.join(' | ')}
                                  </span>
                                </div>
                              );
                            })()
                          )}
                          {c === 'period' && <span className="opacity-60">{b.period === 'morning' ? 'صباحي' : b.period === 'evening' ? 'مسائي' : 'ليلي'}</span>}
                          {c === 'status' && (
                            <span className={`px-1 sm:px-2 sm:py-0.5 rounded-md text-[7px] sm:text-[9px] font-black ${
                              b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                              b.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {b.status === 'confirmed' ? 'مؤكد' : b.status === 'pending' ? 'انتظار' : 'ملغى'}
                            </span>
                          )}
                          {c === 'rent' && <div className="text-left font-mono font-bold text-slate-600">{getRentAmount(b).toLocaleString()}</div>}
                          {c === 'services' && <div className="text-left font-mono font-bold text-slate-600">{getServicesAmount(b).toLocaleString()}</div>}
                          {c === 'total' && <div className="text-left font-mono font-black text-slate-900 dark:text-white">{getGrossTotal(b).toLocaleString()}</div>}
                          {c === 'paid' && <div className="text-left font-mono font-bold text-emerald-600">{getConvertedAmount(b.paidAmount, b.currency, globalCurrencyCode).toLocaleString()}</div>}
                          {c === 'discount' && (
                            <div className="text-left font-mono text-amber-600">
                              {getConvertedAmount(
                                (b.days || [])
                                  .filter(d => d.status !== 'cancelled')
                                  .reduce((sum, d) => sum + d.discount, 0), 
                                b.currency, 
                                globalCurrencyCode
                              ).toLocaleString()}
                            </div>
                          )}
                          {c === 'insurance' && <div className="text-left font-mono font-bold text-indigo-500">{getConvertedAmount(b.insuranceAmount || 0, b.currency, globalCurrencyCode).toLocaleString()}</div>}
                          {c === 'mortgage' && <div className="text-left font-mono font-bold text-blue-500">{getConvertedAmount(b.mortgageAmount || 0, b.currency, globalCurrencyCode).toLocaleString()}</div>}
                          {c === 'subsequent_collections' && <div className={`text-left font-mono font-black ${subsequent > 0 ? 'text-indigo-600' : 'text-slate-300 opacity-30'}`}>{subsequent > 0 ? subsequent.toLocaleString() : '-'}</div>}
                          {c === 'refunds' && <div className={`text-left font-mono font-black ${refunds > 0 ? 'text-rose-600' : 'text-slate-300 opacity-30'}`}>{refunds > 0 ? refunds.toLocaleString() : '-'}</div>}
                          {c === 'remaining_before' && (
                            <div className={`text-left font-mono font-black px-1 rounded transition-colors ${remBefore > 0 ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/10' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10'}`}>
                              {remBefore.toLocaleString()}
                            </div>
                          )}
                          {c === 'remaining_after' && (
                            <div className={`text-left font-mono font-black px-1 rounded transition-colors ${remAfter > 0 ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/10' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10'}`}>
                              {remAfter.toLocaleString()}
                            </div>
                          )}
                          {c === 'createdBy' && <span className="opacity-50 text-[7px] sm:text-[9px] truncate block">{b.createdBy || '-'}</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary Row */}
              {filteredBookings.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 sticky bottom-0 border-t-2 border-slate-200 dark:border-slate-700 z-50">
                  <tr className="font-black text-slate-900 dark:text-white">
                    {currentVisibleColumns.map((c, idx) => {
                      const isNumeric = ['rent', 'services', 'total', 'paid', 'discount', 'insurance', 'mortgage', 'subsequent_collections', 'refunds', 'remaining_before', 'remaining_after'].includes(c);
                      let total = 0;
                      
                      if (isNumeric) {
                        total = filteredBookings.reduce((sum, b) => {
                          if (c === 'rent') return sum + getRentAmount(b);
                          if (c === 'services') return sum + getServicesAmount(b);
                          if (c === 'total') return sum + getGrossTotal(b);
                          if (c === 'paid') return sum + getConvertedAmount(b.paidAmount, b.currency, globalCurrencyCode);
                          if (c === 'discount') return sum + getConvertedAmount(
                            (b.days || [])
                              .filter(d => d.status !== 'cancelled')
                              .reduce((s, d) => s + d.discount, 0), 
                            b.currency, 
                            globalCurrencyCode
                          );
                          if (c === 'insurance') return sum + getConvertedAmount(b.insuranceAmount || 0, b.currency, globalCurrencyCode);
                          if (c === 'mortgage') return sum + getConvertedAmount(b.mortgageAmount || 0, b.currency, globalCurrencyCode);
                          if (c === 'subsequent_collections') return sum + getSubsequentCollections(b);
                          if (c === 'refunds') return sum + getRefunds(b);
                          if (c === 'remaining_before') return sum + getRemainingBefore(b);
                          if (c === 'remaining_after') return sum + getRemainingAfter(b);
                          return sum;
                        }, 0);
                      }

                      return (
                        <td key={`foot-${c}`} className={`p-4 text-xs ${isNumeric ? 'text-left font-mono' : ''} ${idx < frozenColumnsCount ? 'bg-slate-50 dark:bg-slate-800 z-40' : ''}`} style={{
                          minWidth: `${getColumnWidth(c)}px`,
                          ...getStickyStyles(idx, currentVisibleColumns)
                        }}>
                          {idx === 0 ? 'الإجمالي العام' : isNumeric ? total.toLocaleString() : ''}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden grid grid-cols-1 gap-4 p-4">
             {filteredBookings.map((b) => {
                const subsequent = getSubsequentCollections(b);
                const refunds = getRefunds(b);
                const remBefore = getRemainingBefore(b);
                const remAfter = getRemainingAfter(b);
                const hall = halls.find(h => h.id === b.hallId);

                return (
                  <div 
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 cursor-pointer hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">العميل</span>
                        <div className="text-sm font-black text-slate-900 dark:text-white leading-none">{b.customerName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{b.customerPhone}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">الحالة</span>
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                            b.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {b.status === 'confirmed' ? 'مؤكد' : b.status === 'pending' ? 'انتظار' : 'ملغى'}
                          </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-y border-slate-50 dark:border-slate-800/50 text-[11px]">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block mb-1">القاعة</span>
                        <span className="font-bold text-indigo-600">{hall?.name || '-'}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-black text-slate-400 block mb-1 text-left">التاريخ</span>
                        {(() => {
                          const dates = (b.eventDates && b.eventDates.length > 0)
                            ? b.eventDates
                            : (b.days && b.days.length > 0)
                              ? b.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                              : (b as any).eventDate ? [(b as any).eventDate] : [];
                          if (dates.length <= 1) {
                            return <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{dates[0] || b.eventDate || '-'}</span>;
                          }
                          return (
                            <div className="flex flex-wrap gap-1 justify-end">
                              {dates.map((d: string, idx: number) => (
                                <span key={idx} className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  {d}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block mb-1">الإجمالي</span>
                        <span className="font-black text-slate-900 dark:text-white">{getGrossTotal(b).toLocaleString()}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-black text-slate-400 block mb-1 text-left">المحصل الأولي</span>
                        <span className="font-black text-emerald-600">{getConvertedAmount(b.paidAmount, b.currency, globalCurrencyCode).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                       <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold text-right">المحصل اللاحق:</span>
                            <span className={`font-black ${subsequent > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{subsequent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold text-right">المرتجع:</span>
                            <span className={`font-black ${refunds > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{refunds.toLocaleString()}</span>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <div className="flex justify-between px-1 bg-rose-50 dark:bg-rose-900/10 rounded">
                            <span className="text-rose-600 font-bold text-right">المتبقي (قبل):</span>
                            <span className="font-black text-rose-600">{remBefore.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between px-1 bg-indigo-50 dark:bg-indigo-900/10 rounded">
                            <span className="text-indigo-600 font-bold text-right">المتبقي (بعد):</span>
                            <span className="font-black text-indigo-600">{remAfter.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800/50">
                       <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>بواسطة: {b.createdBy || '-'}</span>
                       </div>
                       <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                );
             })}
          </div>

          {filteredBookings.length === 0 && (
            <div className="py-20 text-center text-slate-400 font-black text-sm bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl mt-4 border-2 border-dashed border-slate-100 dark:border-slate-800">لا توجد نتائج مطابقة لمعايير البحث</div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي قيمة الحجوزات', value: stats.totalRev, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', currency: true },
          { label: 'إجمالي المبالغ المحصلة', value: stats.totalPaid, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', currency: true },
          { label: 'مبالغ التأمين المعلقة', value: stats.totalMortgage, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', currency: true },
          { label: 'عدد الحجوزات المؤكدة', value: stats.confirmedCount, icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', currency: false },
        ].map((item, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-indigo-500/50 transition-all"
          >
            <div className={`w-12 h-12 ${item.bg} dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</div>
            <div className="text-xl font-black text-slate-800 dark:text-white">
              {item.currency ? item.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : item.value}
              {item.currency && <span className="text-xs mr-1 text-slate-400">{selectedGlobalCurrencyObj.symbol}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Booking Preview Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
             <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white flex items-center justify-between">
                <span>تفاصيل الحجز الكاملة</span>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                  #{selectedBooking.id.slice(-8).toUpperCase()}
                </span>
             </h3>
             
             <div className="max-h-[75vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs sm:text-sm">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">المعلومات الأساسية</h4>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">اسم العميل:</span> 
                      <div className="font-black text-slate-900 dark:text-white">{selectedBooking.customerName}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">رقم الهاتف:</span> 
                      <div className="font-mono font-bold text-indigo-600">{selectedBooking.customerPhone}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">نوع الحدث:</span> 
                      <div className="font-bold">{selectedBooking.eventType || '-'}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">القاعة:</span> 
                      <div className="font-black text-indigo-500">{halls.find(h => h.id === selectedBooking.hallId)?.name || 'N/A'}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">الحالة:</span> 
                      <div className={`font-black ${
                        selectedBooking.status === 'confirmed' ? 'text-emerald-600' : 
                        selectedBooking.status === 'pending' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {selectedBooking.status === 'confirmed' ? 'مؤكد' : selectedBooking.status === 'pending' ? 'انتظار' : selectedBooking.status === 'cancelled' ? 'ملغي' : 'مكتمل'}
                      </div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">بواسطة:</span> 
                      <div className="font-bold">{selectedBooking.createdBy || 'System'}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">وقت العملية:</span> 
                      <div className="font-mono text-[10px]">{new Date(selectedBooking.createdAt).toLocaleString('ar-EG')}</div>
                    </div>
                  </div>

                  {/* Financials Summary */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">الملخص المالي ({globalCurrencyCode})</h4>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">إجمالي المبلغ:</span> 
                      <div className="font-black text-slate-900 dark:text-white">{getConvertedAmount(selectedBooking.totalPrice, selectedBooking.currency, globalCurrencyCode).toLocaleString()}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">المحصل الأولي:</span> 
                      <div className="font-bold text-emerald-600">{getConvertedAmount(selectedBooking.paidAmount, selectedBooking.currency, globalCurrencyCode).toLocaleString()}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">المتحصلات اللاحقة:</span> 
                      <div className="font-black text-indigo-600">{getSubsequentCollections(selectedBooking).toLocaleString()}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold text-amber-600">الخصم الممنوح:</span> 
                      <div className="font-black text-amber-600">
                        {getConvertedAmount(
                          (selectedBooking.days || [])
                            .filter(d => d.status !== 'cancelled')
                            .reduce((sum, d) => sum + d.discount, 0), 
                          selectedBooking.currency, 
                          globalCurrencyCode
                        ).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">المرتجع والردود:</span> 
                      <div className="font-black text-rose-600">{getRefunds(selectedBooking).toLocaleString()}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">مبلغ التأمين:</span> 
                      <div className="font-bold text-orange-600">{getConvertedAmount(selectedBooking.insuranceAmount || 0, selectedBooking.currency, globalCurrencyCode).toLocaleString()} {selectedBooking.insuranceRefunded && '(تم الرد)'}</div>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/50 pb-2">
                      <span className="text-slate-400 font-bold">الرهن المالي:</span> 
                      <div className="font-bold text-blue-600">{getConvertedAmount(selectedBooking.mortgageAmount || 0, selectedBooking.currency, globalCurrencyCode).toLocaleString()} {selectedBooking.mortgageStatus === 'returned' && '(تم الرد)'}</div>
                    </div>
                    <div className="flex justify-between bg-rose-50 dark:bg-rose-900/10 p-2 rounded-xl mb-1">
                      <span className="text-rose-600 font-black">المتبقي قبل الرهن والتأمين:</span> 
                      <div className="font-black text-rose-600">{getRemainingBefore(selectedBooking).toLocaleString()}</div>
                    </div>
                    <div className="flex justify-between bg-indigo-50 dark:bg-indigo-900/10 p-2 rounded-xl">
                      <span className="text-indigo-600 font-black">المتبقي بعد الرهن والتأمين:</span> 
                      <div className="font-black text-indigo-600">{getRemainingAfter(selectedBooking).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Booking Days Section */}
                  <div className="col-span-1 sm:col-span-2 mt-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      تفاصيل أيام الحجز والجدولة
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-right text-[10px] sm:text-xs">
                        <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 font-black">
                          <tr>
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">التوقيت</th>
                            <th className="p-3 text-left">السعر</th>
                            <th className="p-3 text-left">الخصم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {(selectedBooking.days || [])
                            .filter(d => d.status !== 'cancelled')
                            .map((day, idx) => (
                            <tr key={idx} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                              <td className="p-3 font-bold">{day.date}</td>
                              <td className="p-3 text-slate-500">{day.startTime} - {day.endTime}</td>
                              <td className="p-3 text-left font-mono font-bold text-slate-900 dark:text-white">
                                {getConvertedAmount(day.price, selectedBooking.currency, globalCurrencyCode).toLocaleString()}
                              </td>
                              <td className="p-3 text-left font-mono font-bold text-rose-500">
                                {getConvertedAmount(day.discount, selectedBooking.currency, globalCurrencyCode).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Additional Services Section */}
                  {selectedBooking.additionalServices && selectedBooking.additionalServices.length > 0 && (
                    <div className="col-span-1 sm:col-span-2 mt-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        الخدمات الإضافية المختارة
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedBooking.additionalServices.map((service, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{service.name}</span>
                            <span className="font-mono font-black text-indigo-600">
                              {getConvertedAmount(service.cost, selectedBooking.currency, globalCurrencyCode).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pledges & Collaterals Section */}
                  {selectedBooking.pledgesDescription && (
                    <div className="col-span-1 sm:col-span-2 mt-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">الرهونات والضمانات العينية</h4>
                      <div className="p-4 bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-amber-800 dark:text-amber-400 leading-relaxed italic">
                        {selectedBooking.pledgesDescription}
                      </div>
                    </div>
                  )}

                  {/* ID Details Section */}
                  {selectedBooking.customerIdNumber && (
                    <div className="col-span-1 sm:col-span-2 mt-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        بيانات هوية العميل
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-[8px] text-slate-400 font-bold mb-0.5">نوع الهوية</p>
                          <p className="text-[10px] font-black">{selectedBooking.customerIdType || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-400 font-bold mb-0.5">رقم الهوية</p>
                          <p className="text-[10px] font-mono font-black">{selectedBooking.customerIdNumber}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-400 font-bold mb-0.5">تاريخ الإصدار</p>
                          <p className="text-[10px] font-mono">{selectedBooking.customerIdIssueDate || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-400 font-bold mb-0.5">تاريخ الانتهاء</p>
                          <p className="text-[10px] font-mono">{selectedBooking.customerIdExpiryDate || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  {selectedBooking.notes && (
                    <div className="col-span-1 sm:col-span-2 mt-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ملاحظات الحجز</h4>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        {selectedBooking.notes}
                      </div>
                    </div>
                  )}
               </div>
             </div>
             
             <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => window.print()} 
                  className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Download className="h-5 w-5" />
                  طباعة التقرير
                </button>
                
                {onViewAccountStatement && (
                  <div className="flex-1">
                    {customerAccount ? (
                      <button 
                        onClick={() => {
                          onViewAccountStatement(customerAccount.id, bookingClient ? [bookingClient.id] : []);
                          setSelectedBooking(null);
                        }} 
                        className="w-full h-full bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        <ListRestart className="h-5 w-5" />
                        كشف حساب العميل
                      </button>
                    ) : (
                      <div className="w-full h-full bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black p-2 rounded-2xl flex items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-700">
                        الحساب المالي غير مربوط حالياً
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => setSelectedBooking(null)} 
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  إغلاق النافذة
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              نمو الإيرادات الشهرية
            </h3>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">آخر 12 شهر</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', background: '#fff' }}
                  labelStyle={{ fontWeight: 900, marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-indigo-500" />
              توزيع حالات الحجز
            </h3>
          </div>
          <div className="h-80 w-full flex flex-col md:flex-row items-center">
            <div className="h-full w-full md:w-2/3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/3 space-y-4">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{item.value} حجز</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue By Hall Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              الإيرادات حسب القاعة
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByHallData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} width={120} />
                <Tooltip 
                   cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
