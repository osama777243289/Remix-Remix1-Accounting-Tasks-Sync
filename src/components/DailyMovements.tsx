import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Search, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  Receipt,
  Download,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  RotateCcw,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Transaction, Account, Currency, Booking, DepositRefundRequest, BookingAmendmentRequest } from "../types";
import { usePermissions, PermissionGuard } from "../lib/permissions";
import OfficialVoucherPrintModal from "./OfficialVoucherPrintModal";

interface DailyMovementsProps {
  transactions: Transaction[];
  accounts: Account[];
  currencies: Currency[];
  users: any[];
  globalCurrencyCode: string;
  companySettings?: any;
  setPrintData: (data: any) => void;
  bookings: Booking[];
  onUpdateTransaction: (id: string, updates: any) => Promise<void>;
  currentUser: any;
  lockedDates: any[];
  onLockDay: (dateId: string, lockedBy: string) => Promise<void>;
  onUnlockDay: (dateId: string) => Promise<void>;
  depositRefundRequests?: DepositRefundRequest[];
  bookingAmendmentRequests?: BookingAmendmentRequest[];
  vouchers?: any[];
}

export default function DailyMovements({
  transactions,
  accounts,
  currencies,
  users,
  globalCurrencyCode,
  companySettings,
  setPrintData,
  bookings,
  onUpdateTransaction,
  currentUser,
  lockedDates,
  onLockDay,
  onUnlockDay,
  depositRefundRequests = [],
  bookingAmendmentRequests = [],
  vouchers = []
}: DailyMovementsProps) {
  const { hasPermission } = usePermissions();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<any | null>(null);
  const [isOfficialVoucherModalOpen, setIsOfficialVoucherModalOpen] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditNotes, setAuditNotes] = useState("");

  const selectedDateId = selectedDate.toISOString().split('T')[0];
  const isLocked = lockedDates.some(ld => ld.id === selectedDateId && ld.isLocked);
  const lockInfo = lockedDates.find(ld => ld.id === selectedDateId);

  const getAccountName = (id: string) => {
    return accounts.find(a => a.id === id)?.name || id;
  };

  // Filter transactions for the selected day
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Helper to identify Cash/Bank accounts - avoid treating Booking accounts as cash
  const cashAccountIds = useMemo(() => {
    return accounts
      .filter(a => 
        a.type === 'asset' && 
        a.isTransactional && 
        (a.name.includes('صندوق') || a.name.includes('بنك') || a.name.includes('نقدية')) &&
        !a.name.includes('زبائن') && 
        !a.name.includes('عملاء')
      )
      .map(a => a.id);
  }, [accounts]);

  const dailyTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= dayStart && txDate <= dayEnd;
    });
  }, [transactions, dayStart, dayEnd]);

  // Daily Bookings created today
  const dailyBookings = useMemo(() => {
    return bookings.filter(b => {
      const bDateStr = b.createdAt || b.eventDate;
      const bDate = bDateStr ? new Date(bDateStr) : new Date();
      return bDate >= dayStart && bDate <= dayEnd;
    });
  }, [bookings, dayStart, dayEnd]);

  const dailyMortgageMovements = useMemo(() => {
    return bookings.filter(b => {
      const updatedDate = b.updatedAt ? new Date(b.updatedAt) : null;
      const createdDate = b.createdAt ? new Date(b.createdAt) : null;
      const isToday = (updatedDate && updatedDate >= dayStart && updatedDate <= dayEnd) || 
                      (createdDate && createdDate >= dayStart && createdDate <= dayEnd);
      const hasMortgage = (b.mortgageAmount && b.mortgageAmount > 0) || 
                         (b.mortgageStatus && b.mortgageStatus !== 'returned') ||
                         (b.pledgeStatus && b.pledgeStatus !== 'returned');
      return isToday && hasMortgage;
    });
  }, [bookings, dayStart, dayEnd]);

  const dailyAmendments = useMemo(() => {
    return (bookingAmendmentRequests || []).filter(r => {
      const rDate = new Date(r.createdAt);
      return rDate >= dayStart && rDate <= dayEnd;
    });
  }, [bookingAmendmentRequests, dayStart, dayEnd]);

  const dailyCancellations = useMemo(() => {
    return (depositRefundRequests || []).filter(r => {
      const rDate = new Date(r.createdAt);
      return rDate >= dayStart && rDate <= dayEnd;
    });
  }, [depositRefundRequests, dayStart, dayEnd]);

  const totalReservedDays = useMemo(() => {
    return dailyBookings.reduce((sum, b) => {
      const datesCount = b.eventDates ? b.eventDates.length : (b.eventDate ? 1 : 0);
      return sum + datesCount;
    }, 0);
  }, [dailyBookings]);

  // Exclusive filtering to avoid overlaps
  const receiptsTxs = dailyTransactions.filter(tx => 
    tx.sourceType === 'receipt' || 
    (tx.sourceType === 'voucher' && cashAccountIds.includes(tx.debitAccountId) && !cashAccountIds.includes(tx.creditAccountId))
  );

  const allDisbursements = dailyTransactions.filter(tx => 
    tx.sourceType === 'payment' || 
    (tx.sourceType === 'voucher' && cashAccountIds.includes(tx.creditAccountId) && !cashAccountIds.includes(tx.debitAccountId))
  );

  // Sub-classify disbursements
  const bookingDisbursements = allDisbursements.filter(tx => 
    tx.description?.includes('حجز') || 
    tx.sourceType === 'booking' || 
    tx.sourceId?.startsWith('BOK') ||
    (tx as any).reference?.includes('BOK')
  );
  
  const otherDisbursements = allDisbursements.filter(tx => !bookingDisbursements.includes(tx));

  const bookingsTxs = dailyTransactions.filter(tx => tx.sourceType === 'booking' && !receiptsTxs.includes(tx) && !allDisbursements.includes(tx));
  
  const otherTxs = dailyTransactions.filter(tx => {
    const isReceipt = receiptsTxs.includes(tx);
    const isPayment = allDisbursements.includes(tx);
    const isBooking = bookingsTxs.includes(tx);
    return !isReceipt && !isPayment && !isBooking;
  });

  const getConvertedAmount = (amount: number, fromCurrency: string) => {
    const fromRate = currencies.find(c => c.code === fromCurrency)?.rateToBase || 1;
    const targetRate = currencies.find(c => c.code === globalCurrencyCode)?.rateToBase || 1;
    return (amount * fromRate) / targetRate;
  };

  const getConvertedTotal = (txs: Transaction[]) => {
    return txs.reduce((sum, tx) => sum + getConvertedAmount(tx.amount || 0, tx.currency), 0);
  };

  // Balances calculation for Cash Accounts using converted amounts
  const calculateConvertedBalance = (txs: Transaction[]) => {
    return txs.reduce((sum, tx) => {
      const converted = getConvertedAmount(tx.amount || 0, tx.currency);
      let change = 0;
      if (cashAccountIds.includes(tx.debitAccountId)) change += converted;
      if (cashAccountIds.includes(tx.creditAccountId)) change -= converted;
      return sum + change;
    }, 0);
  };

  const openingBalance = useMemo(() => {
    const historicalTxs = transactions.filter(tx => new Date(tx.date) < dayStart);
    return calculateConvertedBalance(historicalTxs);
  }, [transactions, dayStart, cashAccountIds, currencies, globalCurrencyCode]);

  const dayMovement = calculateConvertedBalance(dailyTransactions);
  const closingBalance = openingBalance + dayMovement;


  const filterBySearch = (txs: Transaction[]) => {
    if (!searchTerm.trim()) return txs;
    const term = searchTerm.toLowerCase();
    return txs.filter(tx => 
      tx.description.toLowerCase().includes(term) || 
      tx.id.toLowerCase().includes(term) ||
      tx.sequenceCode?.toLowerCase().includes(term)
    );
  };

  const filteredReceipts = filterBySearch(receiptsTxs);
  const filteredBookingDisbursements = filterBySearch(bookingDisbursements);
  const filteredOtherDisbursements = filterBySearch(otherDisbursements);
  const filteredBookings = filterBySearch(bookingsTxs);
  const filteredOthers = filterBySearch(otherTxs);

  const getAuditBadge = (tx: any, isPrint = false) => {
    const status = tx.status;
    const notes = tx.auditNotes;
    const auditedBy = tx.auditedBy;
    
    const sizeClasses = isPrint ? "text-[6px] sm:text-[7px]" : "text-[6px] sm:text-[7px]";
    const iconSize = isPrint ? "w-2 h-2" : "w-2.5 h-2.5";

    switch (status) {
      case 'audited':
        return (
          <div className="flex flex-col items-center gap-1 group relative">
            <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ${sizeClasses} font-black`}>
              <CheckCircle className={iconSize}/> معتمد
            </span>
            {!isPrint && notes && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-right shadow-xl border border-slate-700">
                <p className="font-bold border-b border-slate-700 pb-1 mb-1">ملاحظات التدقيق:</p>
                <p className="text-slate-300 leading-tight">{notes}</p>
                {auditedBy && <p className="mt-1 text-[8px] text-slate-400 font-mono">بواسطة: {auditedBy}</p>}
              </div>
            )}
          </div>
        );
      case 'rejected':
        return (
          <div className="flex flex-col items-center gap-1 group relative">
            <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-rose-100 text-rose-700 ${sizeClasses} font-black`}>
              <XCircle className={iconSize}/> مرفوض
            </span>
            {!isPrint && notes && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-right shadow-xl border border-slate-700">
                <p className="font-bold border-b border-slate-700 pb-1 mb-1">سبب الرفض:</p>
                <p className="text-slate-300 leading-tight">{notes}</p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-amber-50 text-amber-600 ${sizeClasses} font-black border border-amber-100`}>
            <Clock className={iconSize}/> بانتظار التدقيق
          </span>
        );
    }
  };

  const handlePrintDailyReport = () => {
    setPrintData({
      title: "تقرير الحركة اليومية التفصيلي",
      subtitle: `بتاريخ ${selectedDate.toLocaleDateString('ar-EG')}`,
      documentNumber: `DR-${selectedDate.toISOString().split('T')[0]}`,
      date: selectedDate.toLocaleDateString('ar-EG'),
      content: (
        <div className="border border-slate-800 p-6 bg-white space-y-6 text-right text-xs" dir="rtl">
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <h1 className="text-xl font-black text-center text-slate-900">تقرير الحركة اليومية</h1>
            <p className="text-center text-sm text-slate-600 mt-1">تاريخ التقرير: {selectedDate.toLocaleDateString('ar-EG')}</p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="border border-slate-300 rounded-sm p-3 bg-slate-50">
              <p className="text-[10px] text-slate-500 font-bold">رصيد أول المدة</p>
              <p className="text-sm font-black text-slate-900">{(openingBalance || 0).toLocaleString()} {globalCurrencyCode}</p>
            </div>
            <div className="border border-slate-300 rounded-sm p-3 bg-emerald-50">
              <p className="text-[10px] text-emerald-600 font-bold">إجمالي المقبوضات</p>
              <p className="text-sm font-black text-emerald-900">+{getConvertedTotal(filteredReceipts).toLocaleString()} {globalCurrencyCode}</p>
            </div>
            <div className="border border-slate-300 rounded-sm p-3 bg-rose-50">
              <p className="text-[10px] text-rose-600 font-bold">إجمالي المدفوعات</p>
              <p className="text-sm font-black text-rose-900">-{getConvertedTotal(allDisbursements).toLocaleString()} {globalCurrencyCode}</p>
            </div>
            <div className="border border-slate-300 rounded-sm p-3 bg-indigo-50">
              <p className="text-[10px] text-indigo-600 font-bold">رصيد آخر المدة</p>
              <p className="text-sm font-black text-indigo-900">{(closingBalance || 0).toLocaleString()} {globalCurrencyCode}</p>
            </div>
          </div>

          <div className="space-y-6">
            {[
              { title: "سندات القبض (المقبوضات)", items: filteredReceipts },
              { title: "مدفوعات الحجوزات والعملاء", items: filteredBookingDisbursements },
              { title: "سندات الصرف الأخرى", items: filteredOtherDisbursements },
              { title: "قيود وحركات محاسبية أخرى", items: filteredBookings.concat(filteredOthers) },
              { title: "الحجوزات والتعاقدات الجديدة اليوم", items: dailyBookings, isBooking: true }
            ].filter(section => section.items.length > 0).map((section, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="font-bold border-b border-slate-900 pb-1 text-sm">{section.title}</h3>
                <table className="w-full border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-[10px]">
                      <th className="p-2 border border-slate-300 w-16 text-center">المستخدم</th>
                      <th className="p-2 border border-slate-300 w-20 text-center">رقم السند</th>
                      <th className="p-2 border border-slate-300">{section.isBooking ? 'العميل' : 'البيان والشرح'}</th>
                      <th className="p-2 border border-slate-300">{section.isBooking ? 'المناسبة' : 'المدين'}</th>
                      <th className="p-2 border border-slate-300">{section.isBooking ? 'تاريخ الفعالية' : 'الدائن'}</th>
                      {section.isBooking && (
                        <>
                          <th className="p-2 border border-slate-300">قبل الخصم</th>
                          <th className="p-2 border border-slate-300">الخصم</th>
                        </>
                      )}
                      <th className="p-2 border border-slate-300">المبلغ</th>
                      <th className="p-2 border border-slate-300">التدقيق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item: any) => {
                      const discount = section.isBooking ? (item.totalDiscount || 0) : 0;
                      const totalBefore = section.isBooking ? (item.totalPrice || 0) + discount : 0;
                      return (
                        <tr key={item.id} className="text-[7px] sm:text-[8px]">
                          <td className="p-1 border text-center font-bold">{item.createdBy || item.userId || "النظام"}</td>
                          <td className="p-1 border text-center font-mono whitespace-nowrap">{(item.sequenceCode || item.id.substring(0,6)).toUpperCase()}</td>
                          <td className="p-1 border font-black text-slate-950 text-[6px] sm:text-[7px]">{section.isBooking ? item.customerName : item.description}</td>
                          <td className="p-1 border">{section.isBooking ? item.eventType : getAccountName(item.debitAccountId)}</td>
                          <td className="p-1 border text-center">
                            {section.isBooking 
                              ? (() => {
                                  const dates = (item.eventDates && item.eventDates.length > 0)
                                    ? item.eventDates
                                    : (item.days && item.days.length > 0)
                                      ? item.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                                      : item.eventDate ? [item.eventDate] : [];
                                  if (dates.length === 0) return 'غير محدد';
                                  return dates.map((d: any) => !isNaN(new Date(d).getTime()) ? new Date(d).toLocaleDateString('ar-EG') : d).join(' | ');
                                })()
                              : getAccountName(item.creditAccountId)}
                          </td>
                          {section.isBooking && (
                            <>
                              <td className="p-1 border text-center font-mono">{totalBefore.toLocaleString()}</td>
                              <td className="p-1 border text-center font-mono text-rose-600">{discount > 0 ? `-${discount.toLocaleString()}` : '0'}</td>
                            </>
                          )}
                          <td className="p-1 border text-center font-black font-mono text-slate-950">
                            {section.isBooking 
                              ? (item.totalPrice || 0).toLocaleString() 
                              : getConvertedAmount(item.amount || 0, item.currency).toLocaleString()}
                          </td>
                          <td className="p-1 border text-center">{getAuditBadge(item, true)}</td>
                        </tr>
                      );
                    })}
                    {!section.isBooking && (
                      <tr className="bg-slate-50 font-black">
                        <td colSpan={5} className="p-1 border text-left pr-2">الإجمالي ({globalCurrencyCode})</td>
                        <td className="p-1 border text-center font-mono">{getConvertedTotal(section.items as any).toLocaleString()}</td>
                        <td className="p-1 border"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )
    });
  };

  const handlePrintTransaction = (tx: any) => {
    if (tx.sourceType === 'voucher' || tx.sourceType === 'receipt' || tx.sourceType === 'payment') {
      const vMatch = (vouchers || []).find((v: any) => v.id === tx.sourceId || v.id === tx.id || v.sequenceCode === tx.sequenceCode);
      const linkedB = bookings.find(b => b.id === (tx.linkedBookingId || tx.bookingId) || b.sequenceCode === (tx.linkedBookingId || tx.bookingId));
      setSelectedVoucherForPrint(vMatch || {
        id: tx.sourceId || tx.id,
        type: tx.sourceType === 'payment' ? 'payment' : 'receipt',
        sequenceCode: tx.sequenceCode,
        manualNumber: tx.manualNumber,
        date: tx.date,
        voucherDate: tx.voucherDate || tx.date,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        customerName: tx.customerName || (linkedB ? linkedB.customerName : ''),
        fromToAccountId: tx.creditAccountId,
        cashBankAccountId: tx.debitAccountId,
        linkedBookingId: tx.linkedBookingId || tx.bookingId
      });
      setIsOfficialVoucherModalOpen(true);
      return;
    }

    setPrintData({
      title: tx.sourceType === 'receipt' ? "سند قبض" : tx.sourceType === 'payment' ? "سند صرف" : "قيد محاسبي",
      subtitle: `رقم المرجع: ${tx.sequenceCode || tx.id.substring(0, 8).toUpperCase()}`,
      documentNumber: tx.sequenceCode || tx.id.substring(0, 8).toUpperCase(),
      date: tx.date,
      content: (
        <div className="space-y-6 text-right" dir="rtl">
          <div className="flex justify-between items-start border-b pb-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-500">من حساب (المدين):</p>
              <p className="text-lg font-black text-slate-900">{getAccountName(tx.debitAccountId)}</p>
            </div>
            <div className="text-left space-y-1">
              <p className="text-sm font-bold text-slate-500">التاريخ والوقت:</p>
              <p className="text-md font-mono">{new Date(tx.date).toLocaleString('ar-EG')}</p>
            </div>
          </div>

          <div className="flex justify-between items-start border-b pb-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-500">إلى حساب (الدائن):</p>
              <p className="text-lg font-black text-slate-900">{getAccountName(tx.creditAccountId)}</p>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-500">المبلغ:</p>
              <p className="text-2xl font-black text-indigo-600 font-mono">{(tx.amount || 0).toLocaleString()} {tx.currency}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-sm font-bold text-slate-500 mb-1">البيان والشرح:</p>
            <p className="text-md leading-relaxed">{tx.description}</p>
          </div>

          {tx.status === 'audited' && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-sm mb-2">
                <CheckCircle className="w-4 h-4" />
                تم التدقيق والاعتماد
              </div>
              <p className="text-xs text-emerald-600 mb-1">ملاحظات المدير المالي: {tx.auditNotes || 'تمت الموافقة'}</p>
              <div className="flex justify-between text-[10px] text-emerald-500 mt-2">
                <span>المعتمد: {tx.auditedBy}</span>
                <span>تاريخ الاعتماد: {tx.auditedAt ? new Date(tx.auditedAt).toLocaleString('ar-EG') : '-'}</span>
              </div>
            </div>
          )}
        </div>
      )
    });
  };

  const TableHeader = () => (
    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
      <tr>
        <th className="px-1 py-1.5 text-right text-[7px] sm:text-[8px] font-black text-slate-400 uppercase w-14 sm:w-18">المبلغ</th>
        <th className="px-1 py-1.5 text-right text-[7px] sm:text-[8px] font-black text-slate-400 uppercase w-14 sm:w-18">رقم السند</th>
        <th className="px-1 py-1.5 text-right text-[7px] sm:text-[8px] font-black text-slate-400 uppercase w-14 sm:w-18">رقم الحجز</th>
        <th className="px-2 py-1.5 text-right text-[7px] sm:text-[8px] font-black text-slate-400 uppercase">الحساب (مدين / دائن)</th>
        <th className="px-2 py-1.5 text-right text-[7px] sm:text-[8px] font-black text-slate-400 uppercase">البيان والشرح (أيام الحجز)</th>
        <th className="px-1 py-1.5 text-right text-[7px] sm:text-[8px] font-black text-slate-400 uppercase w-12 sm:w-14">المستخدم</th>
        <th className="px-1 py-1.5 text-center text-[7px] sm:text-[8px] font-black text-slate-400 uppercase w-12 sm:w-14">التدقيق</th>
        <th className="px-1 py-1.5 text-center text-[7px] sm:text-[8px] font-black text-slate-400 uppercase w-10 sm:w-12">العمليات</th>
      </tr>
    </thead>
  );

  const TableRow = ({ tx }: { tx: any; [key: string]: any }) => {
    const isBase = tx.currency === globalCurrencyCode;
    const converted = getConvertedAmount(tx.amount, tx.currency);

    // Determine prefix REC- for receipt or PAY- for payment
    let docPrefix = tx.sourceType === 'receipt' || tx.type === 'receipt' ? 'REC' : tx.sourceType === 'payment' || tx.type === 'payment' ? 'PAY' : 'JRN';
    if (tx.sequenceCode && (tx.sequenceCode.startsWith('REC-') || tx.sequenceCode.startsWith('PAY-') || tx.sequenceCode.startsWith('JRN-'))) {
      docPrefix = ''; // already has prefix
    }
    const displaySequenceCode = tx.sequenceCode 
      ? `${docPrefix && !tx.sequenceCode.startsWith(docPrefix) ? docPrefix + '-' : ''}${tx.sequenceCode}`
      : `${docPrefix}-${tx.id.substring(0, 6).toUpperCase()}`;

    // Find linked booking if any
    const voucherMatch = tx.sourceType === 'voucher' ? (vouchers || []).find((v: any) => v.id === tx.sourceId) : null;
    const linkedBookingId = tx.linkedBookingId || tx.bookingId || (voucherMatch ? (voucherMatch.linkedBookingId || voucherMatch.bookingId) : null);
    const linkedBooking = linkedBookingId ? bookings.find((b: any) => b.id === linkedBookingId || b.sequenceCode === linkedBookingId) : null;
    const bookingCode = linkedBooking ? (linkedBooking.sequenceCode || linkedBooking.id.substring(0, 6).toUpperCase()) : '-';

    // Account name
    const accountDisplay = `${getAccountName(tx.debitAccountId)} ➔ ${getAccountName(tx.creditAccountId)}`;

    // Get event dates if linked booking exists
    let eventDatesStr = "";
    if (linkedBooking) {
      const dates = (linkedBooking.eventDates && linkedBooking.eventDates.length > 0)
        ? linkedBooking.eventDates
        : (linkedBooking.days && linkedBooking.days.length > 0)
          ? linkedBooking.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
          : linkedBooking.eventDate ? [linkedBooking.eventDate] : [];
      if (dates.length > 0) {
        eventDatesStr = ` (أيام الحجز: ${dates.map((d: any) => !isNaN(new Date(d).getTime()) ? new Date(d).toLocaleDateString('ar-EG') : d).join(' ، ')})`;
      }
    }

    return (
      <tr className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
        <td className="px-1 py-1">
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] sm:text-[10px] font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">{converted.toLocaleString()}</span>
            <span className="text-[6px] sm:text-[7px] font-black text-slate-400 uppercase">{globalCurrencyCode}</span>
          </div>
        </td>
        <td className="px-1 py-1">
          <span className="text-[7px] sm:text-[8px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1 py-0.5 rounded font-mono whitespace-nowrap">
            {displaySequenceCode}
          </span>
        </td>
        <td className="px-1 py-1">
          <span className="text-[7px] sm:text-[8px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1 py-0.5 rounded font-mono whitespace-nowrap">
            {bookingCode}
          </span>
        </td>
        <td className="px-2 py-1 text-[7px] sm:text-[8px] font-bold text-slate-700 dark:text-slate-300">
          {accountDisplay}
        </td>
        <td className="px-2 py-1">
          <div className="flex flex-col">
            <span className="text-[7px] sm:text-[8px] font-black text-slate-950 dark:text-white line-clamp-2 leading-tight">
              {tx.description}
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{eventDatesStr}</span>
            </span>
            {!isBase && (
              <span className="text-[6px] sm:text-[7px] font-bold text-slate-400 italic">
                ( {tx.amount.toLocaleString()} {tx.currency} )
              </span>
            )}
          </div>
        </td>
        <td className="px-1 py-1 text-[7px] sm:text-[8px] text-slate-500 font-bold truncate max-w-[40px] sm:max-w-none">
          {tx.createdBy || tx.userId || "النظام"}
        </td>
        <td className="px-1 py-1 text-center">
          {getAuditBadge(tx)}
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setSelectedTx(tx)}
              className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded transition-colors"
              title="معاينة"
            >
              <FileText className="w-3 h-3" />
            </button>
            <button 
              onClick={() => handlePrintTransaction(tx)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded transition-colors"
              title="طباعة"
            >
              <Receipt className="w-3 h-3" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const MovementCard = ({ tx }: { tx: any; key?: any }) => {
    const isBase = tx.currency === globalCurrencyCode;
    const converted = getConvertedAmount(tx.amount, tx.currency);

    return (
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 relative overflow-hidden group">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">رقم السند</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-lg font-mono">
              {tx.sequenceCode || tx.id.substring(0, 6).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 text-left">المبلغ</span>
             <div className="flex items-baseline gap-1">
               <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight">{converted.toLocaleString()}</span>
               <span className="text-[10px] font-black text-slate-400">{globalCurrencyCode}</span>
             </div>
             {!isBase && (
               <span className="text-[8px] font-bold text-slate-400 italic mt-0.5">
                 ( {tx.amount.toLocaleString()} {tx.currency} )
               </span>
             )}
          </div>
        </div>

        <div className="space-y-1 py-2 border-y border-slate-50 dark:border-slate-800/50">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">البيان والشرح</span>
          <p className="text-[11px] font-black text-slate-950 dark:text-white leading-relaxed">{tx.description}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500">
               {(tx.createdBy || tx.userId || "S").charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] text-slate-500 font-bold">{tx.createdBy || tx.userId || "النظام"}</span>
          </div>
          <div className="flex items-center gap-2">
            {getAuditBadge(tx)}
            <div className="flex gap-1">
              <button 
                onClick={() => setSelectedTx(tx)}
                className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handlePrintTransaction(tx)}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors"
              >
                <Receipt className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ id, title, icon: Icon, count, total, colorClass }: { id: string, title: string, icon: any, count: number, total: number, colorClass: string }) => {
    const isExpanded = expandedSections[id];
    const toggle = () => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

    return (
      <button 
        onClick={toggle}
        className="w-full flex items-center justify-between px-2 py-1 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm border-y border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-1">
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.2 }}
            className="text-slate-400"
          >
            <Download className="w-2.5 h-2.5 rotate-90" />
          </motion.div>
          <div className={`p-1 rounded-md ${colorClass}`}>
            <Icon className="w-2.5 h-2.5" />
          </div>
          <h3 className="text-[9px] font-black text-slate-900 dark:text-white">{title}</h3>
          <span className="bg-slate-200 dark:bg-slate-700 text-[7px] px-1 py-0.5 rounded-full font-black text-slate-600 dark:text-slate-400">
            {count}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[6px] font-black text-slate-400 uppercase leading-none">إجمالي القسم</span>
          <span className={`text-[8px] sm:text-[9px] font-black font-mono ${colorClass.replace('bg-', 'text-').replace('-100', '-600')}`}>
            {(total || 0).toLocaleString()} {globalCurrencyCode}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">
      {/* Header & Controls - More Compact */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">الحركة اليومية للمنشأة</h1>
              <p className="text-[10px] text-slate-500 font-bold">ملخص دقيق لكافة الحركات والتعاقدات لليوم المختار</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-visible p-0.5">
              {isLocked ? (
                <button
                  onClick={() => onUnlockDay(selectedDateId)}
                  className="flex items-center gap-1 px-2 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                  title={`مقفل بواسطة ${lockInfo?.lockedBy}`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black">إلغاء القفل</span>
                </button>
              ) : (
                <button
                  onClick={() => onLockDay(selectedDateId, currentUser?.username || 'المسؤول')}
                  className="flex items-center gap-1 px-2 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black">قفل اليوم</span>
                </button>
              )}
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <div className="relative">
                <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : new Date())}
                  className="pl-2 pr-7 py-1 bg-transparent border-none text-[11px] font-black text-slate-700 dark:text-slate-300 outline-none w-28 sm:w-32"
                />
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3 pr-9 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow placeholder:text-slate-400 w-28 sm:w-40"
              />
            </div>

            <button
              onClick={handlePrintDailyReport}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تقرير اليوم</span>
              <span className="sm:hidden">تقرير</span>
            </button>
          </div>
        </div>

        {/* Balance Cards - Ultra Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">رصيد أول المدة</span>
            <p className="text-[11px] font-black text-slate-900 dark:text-white font-mono">{(openingBalance || 0).toLocaleString()} <span className="text-[8px] font-normal opacity-50">{globalCurrencyCode}</span></p>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase block mb-0.5">المقبوضات (+)</span>
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono">+{getConvertedTotal(filteredReceipts).toLocaleString()} {globalCurrencyCode}</p>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-900/10 p-2 rounded-xl border border-rose-100 dark:border-rose-900/20">
            <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase block mb-0.5">المدفوعات (-)</span>
            <p className="text-[11px] font-black text-rose-700 dark:text-rose-300 font-mono">-{getConvertedTotal(allDisbursements).toLocaleString()} {globalCurrencyCode}</p>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase block mb-0.5">رصيد آخر المدة</span>
            <p className="text-[11px] font-black text-indigo-900 dark:text-white font-mono">{(closingBalance || 0).toLocaleString()} <span className="text-[8px] font-normal opacity-50">{globalCurrencyCode}</span></p>
          </div>
        </div>
      </div>

      {/* Daily New Bookings Section */}
      {dailyBookings.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
          <button 
            onClick={() => setExpandedSections(prev => ({ ...prev, 'daily-bookings': !prev['daily-bookings'] }))}
            className="w-full px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between hover:bg-amber-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: expandedSections['daily-bookings'] ? 0 : 180 }}
                transition={{ duration: 0.2 }}
                className="text-amber-600"
              >
                <Download className="w-2.5 h-2.5 rotate-90" />
              </motion.div>
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-black text-amber-900 dark:text-amber-100">الحجوزات والتعاقدات الجديدة لليوم</h2>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 rounded-full text-amber-700 dark:text-amber-300" title="عدد الحجوزات">
                  {dailyBookings.length} حجز
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full text-indigo-700 dark:text-indigo-300" title="عدد الأيام المحجوزة">
                  {totalReservedDays} يوم محجوز
                </span>
              </div>
            </div>
          </button>
          
          {expandedSections['daily-bookings'] && (
            <div className="animate-in fade-in slide-in-from-top-1">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase">العميل</th>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase">نوع المناسبة</th>
                      <th className="px-3 py-2 text-center text-[10px] font-black text-slate-400 uppercase">تاريخ الفعالية</th>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase">إجمالي العقد (قبل الخصم)</th>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase">مبلغ الخصم</th>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase">الصافي</th>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase">المبلغ المدفوع</th>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-slate-400 uppercase">المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyBookings.map(b => {
                      const discount = b.totalDiscount || 0;
                      const totalBefore = (b.totalPrice || 0) + discount;
                      const paid = (b.paidAmount || 0) + (b.subsequentPayments || 0);
                      const remaining = (b.totalPrice || 0) - paid;
                      
                      return (
                        <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/40 transition-colors">
                          <td className="px-3 py-2 text-[9px] font-black text-slate-800 dark:text-slate-200 whitespace-normal break-words leading-tight">{b.customerName}</td>
                          <td className="px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">{b.eventType}</td>
                          <td className="px-3 py-2 text-center text-[9px] font-mono text-slate-500">
                            {(() => {
                              const dates = (b.eventDates && b.eventDates.length > 0)
                                ? b.eventDates
                                : (b.days && b.days.length > 0)
                                  ? b.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                                  : b.eventDate ? [b.eventDate] : [];
                              if (dates.length === 0) return 'غير محدد';
                              return dates.map((d: any) => !isNaN(new Date(d).getTime()) ? new Date(d).toLocaleDateString('ar-EG') : d).join(' | ');
                            })()}
                          </td>
                          <td className="px-3 py-2 text-[10px] font-black text-slate-900 dark:text-white font-mono tracking-tight">{totalBefore.toLocaleString()}</td>
                          <td className="px-3 py-2 text-[10px] font-black text-rose-600 font-mono tracking-tight">{discount > 0 ? `-${discount.toLocaleString()}` : '0'}</td>
                          <td className="px-3 py-2 text-[10px] font-black text-indigo-600 font-mono tracking-tight">{(b.totalPrice || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-[10px] font-black text-emerald-600 font-mono tracking-tight">{paid.toLocaleString()}</td>
                          <td className="px-3 py-2 text-[10px] font-black text-rose-600 font-mono tracking-tight">{remaining.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dailyBookings.map(b => {
                  const discount = b.totalDiscount || 0;
                  const totalBefore = (b.totalPrice || 0) + discount;
                  const paid = (b.paidAmount || 0) + (b.subsequentPayments || 0);
                  const remaining = (b.totalPrice || 0) - paid;
                  return (
                    <div key={b.id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-900 dark:text-white block whitespace-normal break-words leading-tight">{b.customerName}</span>
                          <span className="text-[10px] font-bold text-slate-500">{b.eventType}</span>
                        </div>
                        <div className="text-left">
                           <span className="text-[9px] font-black text-indigo-600 font-mono">{(b.totalPrice || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          {(() => {
                            const dates = (b.eventDates && b.eventDates.length > 0)
                              ? b.eventDates
                              : (b.days && b.days.length > 0)
                                ? b.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                                : b.eventDate ? [b.eventDate] : [];
                            return (
                              <>
                                <span className="text-[8px] font-black text-slate-400 block">
                                  {dates.length > 1 ? `التواريخ (${dates.length})` : 'التاريخ'}
                                </span>
                                <span className="text-[9px] font-bold">
                                  {dates.length > 0
                                    ? dates.map((d: any) => !isNaN(new Date(d).getTime()) ? new Date(d).toLocaleDateString('ar-EG') : d).join(' | ')
                                    : 'غير محدد'}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <div className="text-left">
                          <span className="text-[8px] font-black text-slate-400 block">المتبقي</span>
                          <span className="text-[9px] font-black text-rose-600">{remaining.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Tables Container - COMPACT HEIGHTS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Physical Mortgage Movements Section */}
        {dailyMortgageMovements.length > 0 && (
          <>
            <SectionHeader 
              id="mortgage-movements"
              title="حركة الرهن العيني" 
              icon={Package} 
              count={dailyMortgageMovements.length} 
              total={dailyMortgageMovements.reduce((sum, b) => sum + (b.mortgageAmount || 0), 0)}
              colorClass="bg-purple-100 text-purple-600"
            />
            {expandedSections['mortgage-movements'] && (
              <div className="animate-in fade-in slide-in-from-top-1">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto max-h-[160px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">العميل</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">الرهن</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">الحالة</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase font-mono">القيمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyMortgageMovements.map(b => (
                        <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/40">
                          <td className="px-3 py-2 text-[10px] font-black">{b.customerName}</td>
                          <td className="px-3 py-2 text-[9px] font-bold text-slate-500">{b.pledgesDescription || 'رهن مالي'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                              b.pledgeStatus === 'held' ? 'bg-amber-100 text-amber-600' :
                              (b.pledgeStatus as any) === 'released' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {b.pledgeStatus === 'held' ? 'محجوز' : (b.pledgeStatus as any) === 'released' ? 'محرر' : b.pledgeStatus || 'غير محدد'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[10px] font-black font-mono text-purple-600">{(b.mortgageAmount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                   {dailyMortgageMovements.map(b => (
                     <div key={b.id} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black">{b.customerName}</span>
                          <span className="text-[10px] font-black text-purple-600 font-mono">{(b.mortgageAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-500">{b.pledgesDescription || 'رهن مالي'}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                              b.pledgeStatus === 'held' ? 'bg-amber-100 text-amber-600' :
                              (b.pledgeStatus as any) === 'released' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {b.pledgeStatus === 'held' ? 'محجوز' : (b.pledgeStatus as any) === 'released' ? 'محرر' : b.pledgeStatus || 'غير محدد'}
                            </span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Amendment Requests Section */}
        {dailyAmendments.length > 0 && (
          <>
            <SectionHeader 
              id="amendment-requests"
              title="حركة طلبات التعديل" 
              icon={Edit3} 
              count={dailyAmendments.length} 
              total={0}
              colorClass="bg-blue-100 text-blue-600"
            />
            {expandedSections['amendment-requests'] && (
              <div className="animate-in fade-in slide-in-from-top-1">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto max-h-[160px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">رقم الطلب</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">العميل</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">نوع التعديل</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyAmendments.map(r => (
                        <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/40">
                          <td className="px-3 py-2 text-[9px] font-mono font-bold text-slate-500">#{r.id.slice(-6)}</td>
                          <td className="px-3 py-2 text-[10px] font-black">
                            {bookings.find(b => b.id === r.bookingId)?.customerName || 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-[9px] font-bold text-slate-500">{(r as any).amendmentType || 'تعديل حجز'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                              r.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {r.status === 'approved' ? 'تم الاعتماد' : r.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                   {dailyAmendments.map(r => (
                     <div key={r.id} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black">{bookings.find(b => b.id === r.bookingId)?.customerName || 'N/A'}</span>
                          <span className="text-[9px] font-mono font-bold text-slate-500">#{r.id.slice(-6)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-500">{(r as any).amendmentType || 'تعديل حجز'}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                              r.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {r.status === 'approved' ? 'تم الاعتماد' : r.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                            </span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Cancellation and Deposit Refund Section */}
        {dailyCancellations.length > 0 && (
          <>
            <SectionHeader 
              id="cancellation-requests"
              title="طلبات الإلغاء ورد العربون" 
              icon={RotateCcw} 
              count={dailyCancellations.length} 
              total={dailyCancellations.reduce((sum, r) => sum + (r.refundableAmount || (r as any).refundAmount || 0), 0)}
              colorClass="bg-rose-100 text-rose-600"
            />
            {expandedSections['cancellation-requests'] && (
              <div className="animate-in fade-in slide-in-from-top-1">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto max-h-[160px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">العميل</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">السبب</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase">الحالة</th>
                        <th className="px-3 py-1.5 text-right text-[10px] font-black text-slate-400 uppercase font-mono">المبلغ المرتجع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyCancellations.map(r => (
                        <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/40">
                          <td className="px-3 py-2 text-[10px] font-black">
                            {bookings.find(b => b.id === r.bookingId)?.customerName || 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-[9px] font-bold text-slate-500 truncate max-w-[120px]">{(r as any).reason || (r as any).notes || ''}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                              r.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {r.status === 'approved' ? 'مقبول' : r.status === 'rejected' ? 'مرفوض' : 'قيد المعالجة'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[10px] font-black font-mono text-rose-600">{(r.refundableAmount || (r as any).refundAmount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                   {dailyCancellations.map(r => (
                     <div key={r.id} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black">{bookings.find(b => b.id === r.bookingId)?.customerName || 'N/A'}</span>
                          <span className="text-[10px] font-black text-rose-600 font-mono">{(r.refundableAmount || (r as any).refundAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-500 truncate max-w-[150px]">{(r as any).reason || (r as any).notes || ''}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                              r.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {r.status === 'approved' ? 'مقبول' : r.status === 'rejected' ? 'مرفوض' : 'قيد المعالجة'}
                            </span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Receipts Section */}
        {filteredReceipts.length > 0 && (
          <>
            <SectionHeader 
              id="receipts"
              title="سندات القبض (المقبوضات)" 
              icon={ArrowDownLeft} 
              count={filteredReceipts.length} 
              total={getConvertedTotal(filteredReceipts)}
              colorClass="bg-emerald-100 text-emerald-600"
            />
            {expandedSections['receipts'] && (
              <div className="animate-in fade-in slide-in-from-top-1">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto max-h-[160px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <TableHeader />
                    <tbody>
                      {filteredReceipts.map(tx => <TableRow key={tx.id} tx={tx} />)}
                    </tbody>
                  </table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                   {filteredReceipts.map(tx => <MovementCard key={tx.id} tx={tx} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Booking Disbursements Section */}
        {filteredBookingDisbursements.length > 0 && (
          <>
            <SectionHeader 
              id="booking-payments"
              title="مدفوعات خاصة بالحجوزات" 
              icon={Calendar} 
              count={filteredBookingDisbursements.length} 
              total={getConvertedTotal(filteredBookingDisbursements)}
              colorClass="bg-amber-100 text-amber-600"
            />
            {expandedSections['booking-payments'] && (
              <div className="animate-in fade-in slide-in-from-top-1">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto max-h-[140px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <TableHeader />
                    <tbody>
                      {filteredBookingDisbursements.map(tx => <TableRow key={tx.id} tx={tx} />)}
                    </tbody>
                  </table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                   {filteredBookingDisbursements.map(tx => <MovementCard key={tx.id} tx={tx} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Other Disbursements Section */}
        {filteredOtherDisbursements.length > 0 && (
          <>
            <SectionHeader 
              id="other-payments"
              title="سندات الصرف الأخرى" 
              icon={ArrowUpRight} 
              count={filteredOtherDisbursements.length} 
              total={getConvertedTotal(filteredOtherDisbursements)}
              colorClass="bg-rose-100 text-rose-600"
            />
            {expandedSections['other-payments'] && (
              <div className="animate-in fade-in slide-in-from-top-1">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto max-h-[160px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <TableHeader />
                    <tbody>
                      {filteredOtherDisbursements.map(tx => <TableRow key={tx.id} tx={tx} />)}
                    </tbody>
                  </table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                   {filteredOtherDisbursements.map(tx => <MovementCard key={tx.id} tx={tx} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Other Movements Section */}
        {(filteredBookings.length + filteredOthers.length) > 0 && (
          <>
            <SectionHeader 
              id="other-movements"
              title="قيود وحركات مالية متنوعة" 
              icon={FileText} 
              count={filteredBookings.length + filteredOthers.length} 
              total={getConvertedTotal(filteredBookings.concat(filteredOthers))}
              colorClass="bg-slate-200 text-slate-600"
            />
            {expandedSections['other-movements'] && (
              <div className="animate-in fade-in slide-in-from-top-1">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto max-h-[140px] overflow-y-auto custom-scrollbar">
                  <table className="w-full border-collapse">
                    <TableHeader />
                    <tbody>
                      {filteredBookings.concat(filteredOthers).map(tx => <TableRow key={tx.id} tx={tx} />)}
                    </tbody>
                  </table>
                </div>
                {/* Mobile View */}
                <div className="md:hidden p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                   {filteredBookings.concat(filteredOthers).map(tx => <MovementCard key={tx.id} tx={tx} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Details Modal - COMPACT */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
              dir="rtl"
            >
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-[10px] font-black text-slate-900 dark:text-white">تفاصيل الحركة</h2>
                </div>
                <button 
                  onClick={() => setSelectedTx(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <XCircle className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-slate-400 uppercase">التاريخ والوقت</p>
                    <p className="text-[9px] font-black text-slate-700 dark:text-slate-300">
                      {new Date(selectedTx.date).toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="text-left space-y-0.5">
                    <p className="text-[8px] font-black text-slate-400 uppercase">الرقم المرجعي</p>
                    <p className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[10px]">
                      {selectedTx.sequenceCode || selectedTx.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-emerald-600 uppercase flex items-center gap-1">
                      <ArrowDownLeft className="w-2.5 h-2.5" /> من حساب (المدين)
                    </p>
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-none">{getAccountName(selectedTx.debitAccountId)}</p>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 space-y-0.5">
                    <p className="text-[8px] font-black text-rose-600 uppercase flex items-center gap-1">
                      <ArrowUpRight className="w-2.5 h-2.5" /> إلى حساب (الدائن)
                    </p>
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-none">{getAccountName(selectedTx.creditAccountId)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase">الالبيان والشرح</p>
                  <p className="text-[9px] text-slate-700 dark:text-slate-300 leading-normal bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    {selectedTx.description}
                  </p>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-slate-400 uppercase">المبلغ الإجمالي</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                        {getConvertedAmount(selectedTx.amount, selectedTx.currency).toLocaleString()}
                      </span>
                      <span className="text-[9px] font-bold text-indigo-600 uppercase">{globalCurrencyCode}</span>
                      {selectedTx.currency !== globalCurrencyCode && (
                        <span className="text-[9px] font-bold text-slate-400 mr-2 italic">
                          ( {selectedTx.amount.toLocaleString()} {selectedTx.currency} )
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left space-y-1">
                    <div className="flex items-center gap-1 justify-end leading-none">
                      <span className="text-[8px] font-bold text-slate-400 italic">بواسطة:</span>
                      <span className="text-[9px] font-black text-slate-700 dark:text-slate-300">{selectedTx.createdBy || 'النظام'}</span>
                    </div>
                    {getAuditBadge(selectedTx)}
                  </div>
                </div>

                {/* Audit Actions */}
                {selectedTx.status !== 'audited' && (
                  <PermissionGuard permission="audit-booking-transactions">
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      {!isAuditing ? (
                        <button
                          onClick={() => setIsAuditing(true)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          اعتماد وتدقيق هذه الحركة
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            placeholder="أدخل ملاحظات التدقيق أو سبب الرفض هنا..."
                            value={auditNotes}
                            onChange={(e) => setAuditNotes(e.target.value)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] outline-none focus:ring-2 focus:ring-indigo-500 h-16"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await onUpdateTransaction(selectedTx.id, {
                                    status: 'audited',
                                    auditNotes: auditNotes,
                                    auditedBy: currentUser?.username || 'المسؤول',
                                    auditedAt: new Date().toISOString()
                                  });
                                  toast.success("تم اعتماد الحركة بنجاح");
                                  setSelectedTx(null);
                                  setIsAuditing(false);
                                  setAuditNotes("");
                                } catch (e) {
                                  toast.error("فشل في اعتماد الحركة");
                                }
                              }}
                              className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black"
                            >
                              تأكيد الاعتماد
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await onUpdateTransaction(selectedTx.id, {
                                    status: 'rejected',
                                    auditNotes: auditNotes,
                                    auditedBy: currentUser?.username || 'المسؤول',
                                    auditedAt: new Date().toISOString()
                                  });
                                  toast.success("تم رفض الحركة");
                                  setSelectedTx(null);
                                  setIsAuditing(false);
                                  setAuditNotes("");
                                } catch (e) {
                                  toast.error("فشل العملية");
                                }
                              }}
                              className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black"
                            >
                              رفض الحركة
                            </button>
                            <button
                              onClick={() => setIsAuditing(false)}
                              className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </PermissionGuard>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
                <button
                  onClick={() => handlePrintTransaction(selectedTx)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black transition-all hover:opacity-90"
                >
                  <Receipt className="w-3 h-3" />
                  طباعة السند
                </button>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="flex-1 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black transition-all hover:bg-slate-100"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Printed Voucher Modal - Al-Zain Grand Hall Book Design */}
      <OfficialVoucherPrintModal
        isOpen={isOfficialVoucherModalOpen}
        voucher={selectedVoucherForPrint}
        booking={
          selectedVoucherForPrint
            ? bookings.find(
                (b) =>
                  b.id === (selectedVoucherForPrint.linkedBookingId || selectedVoucherForPrint.bookingId) ||
                  b.sequenceCode === (selectedVoucherForPrint.linkedBookingId || selectedVoucherForPrint.bookingId)
              )
            : null
        }
        company={companySettings || null}
        accounts={accounts}
        currencies={currencies}
        currentUser={currentUser}
        onClose={() => {
          setIsOfficialVoucherModalOpen(false);
          setSelectedVoucherForPrint(null);
        }}
      />
    </div>
  );
}
