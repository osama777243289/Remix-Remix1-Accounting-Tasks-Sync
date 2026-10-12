/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { 
  Undo2, CheckCircle, XCircle, Plus, Search, FileText, 
  Calendar, User, Check, X, Coins, Clock, AlertTriangle, 
  HelpCircle, Building, ShieldCheck, CornerUpLeft, Phone
} from "lucide-react";
import { usePermissions } from "../lib/permissions";
import { 
  addDepositRefundRequest, updateDepositRefundRequest, deleteDepositRefundRequest,
  updateBooking, addTransactionWithDoubleEntry, addVoucher
} from "../lib/dbService";
import { Booking, Hall, DepositRefundRequest, Currency, Account, BookingSettings, Transaction, LinkedAccounts } from "../types";

interface DepositRefundRequestsProps {
  bookings: Booking[];
  halls: Hall[];
  depositRefundRequests: DepositRefundRequest[];
  currencies: Currency[];
  accounts: Account[];
  globalCurrencySymbol: string;
  bookingSettings: BookingSettings | null;
  linkedAccounts?: LinkedAccounts | null;
  highlightId?: string | null;
  onClearHighlight?: () => void;
}

export default function DepositRefundRequests({
  bookings,
  halls,
  depositRefundRequests,
  currencies,
  accounts,
  globalCurrencySymbol,
  bookingSettings,
  linkedAccounts,
  highlightId,
  onClearHighlight,
}: DepositRefundRequestsProps) {
  const { currentUser, hasPermission } = usePermissions();

  // Determine if current user is the authorized manager (e.g. has manage-users permission)
  const isManager = hasPermission("manage-users") || hasPermission("view-company");

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "refunded">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<DepositRefundRequest | null>(null);

  React.useEffect(() => {
    if (highlightId && depositRefundRequests.length > 0) {
      const found = depositRefundRequests.find(r => r.id === highlightId || r.sequenceCode === highlightId);
      if (found) {
        setStatusFilter("all");
        setSearchTerm(found.sequenceCode || found.bookingCode || found.customerName);
        if (onClearHighlight) {
          onClearHighlight();
        }
      }
    }
  }, [highlightId, depositRefundRequests, onClearHighlight]);

  // Form State for Specialist
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [requestedAmount, setRequestedAmount] = useState<number>(0);
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [refundableAmount, setRefundableAmount] = useState<number>(0);
  const [cancelBooking, setCancelBooking] = useState<boolean>(true);
  const [cancelledDayDates, setCancelledDayDates] = useState<string[]>([]);
  const [cancelledServices, setCancelledServices] = useState<{ serviceName: string; dates: string[] }[]>([]);
  const [justification, setJustification] = useState("");

  // Form State for Manager Action
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [managerNotes, setManagerNotes] = useState("");

  // Helper to calculate remaining refundable deposit for a booking
  const getRemainingDeposit = (b: Booking) => {
    const totalPaid = b.paidAmount || 0;
    
    // Sum of all non-rejected requests for this booking
    // For pending: take requestedAmount + fineAmount
    // For approved: take approvedAmount + fineAmount
    const allocatedAmount = depositRefundRequests
      .filter(r => r.bookingId === b.id && r.status !== 'rejected')
      .reduce((sum, r) => {
        const amount = r.status === 'approved' ? (r.approvedAmount || 0) : (r.requestedAmount || 0);
        const fine = r.fineAmount || 0;
        return sum + amount + fine;
      }, 0);

    return Math.max(0, totalPaid - allocatedAmount);
  };

  // Filter bookings available for refund requests
  // Eligible if:
  // 1. Has non-cancelled days
  // 2. OR has remaining refundable deposit amount
  // 3. AND does not have an active pending request
  const eligibleBookings = bookings.filter(b => {
    if (b.paidAmount <= 0) return false;
    
    // Check if there is already a PENDING refund request for this booking
    const hasPending = depositRefundRequests.some(r => r.bookingId === b.id && r.status === 'pending');
    if (hasPending) return false;

    const hasActiveDays = (b.days || []).some(d => d.status !== 'cancelled');
    const remainingDeposit = getRemainingDeposit(b);
    
    return hasActiveDays || remainingDeposit > 0;
  });

  const handleBookingChange = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      const remaining = getRemainingDeposit(booking);
      setRequestedAmount(remaining);
      setFineAmount(0);
      setRefundableAmount(remaining);
      setCancelBooking(true);
      setCancelledDayDates([]);
      setCancelledServices([]);
    } else {
      setRequestedAmount(0);
      setFineAmount(0);
      setRefundableAmount(0);
      setCancelBooking(true);
      setCancelledDayDates([]);
      setCancelledServices([]);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) {
      toast.error("يرجى اختيار الحجز المطلوب.");
      return;
    }

    const booking = bookings.find(b => b.id === selectedBookingId);
    if (!booking) {
      toast.error("الحجز غير موجود.");
      return;
    }

    if (requestedAmount <= 0) {
      toast.error("مبلغ الارتجاع يجب أن يكون أكبر من الصفر.");
      return;
    }

    const remainingDeposit = getRemainingDeposit(booking);
    if (Number(refundableAmount) + Number(fineAmount) > remainingDeposit + 0.1) {
      toast.error(`مجموع مبلغ الارتجاع (${refundableAmount.toLocaleString()}) ومبلغ الغرامة (${fineAmount.toLocaleString()}) لا يمكن أن يتجاوز العربون المتبقي (${remainingDeposit.toLocaleString()}).`);
      return;
    }

    if (!justification.trim()) {
      toast.error("يرجى توضيح مبررات طلب رد العربون.");
      return;
    }

    try {
      const specialistName = currentUser?.username || currentUser?.name || "مختص";
      const hall = halls.find(h => h.id === booking.hallId);

      await addDepositRefundRequest({
        bookingId: booking.id,
        bookingCode: booking.sequenceCode || "-",
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        hallId: booking.hallId,
        depositAmount: booking.paidAmount,
        requestedAmount: Number(refundableAmount), // amount they want back
        fineAmount: Number(fineAmount), // amount taken as fine
        refundableAmount: Number(refundableAmount),
        cancelBooking: cancelBooking,
        cancelledDayDates: cancelledDayDates,
        cancelledServices: cancelledServices,
        justification: justification.trim(),
        status: "pending",
        createdBy: specialistName,
        createdAt: new Date().toISOString(),
      });

      toast.success("تم تقديم طلب رد العربون بنجاح بانتظار موافقة صاحب الصلاحية.");
      setShowAddModal(false);
      setSelectedBookingId("");
      setRequestedAmount(0);
      setJustification("");
    } catch (err: any) {
      toast.error(`فشل تقديم الطلب: ${err.message || err}`);
    }
  };

  const handleManagerAction = async (status: "approved" | "rejected") => {
    if (!showActionModal) return;

    if (status === "approved") {
      if (approvedAmount < 0) {
        toast.error("يرجى تحديد مبلغ صحيح للموافقة عليه.");
        return;
      }
      
      const totalAllocated = Number(approvedAmount) + Number(showActionModal.fineAmount || 0);
      if (totalAllocated > showActionModal.depositAmount + 1) { // small buffer for decimals if any
         toast.error(`المجموع (المبلغ المعتمد + الغرامة) لا يمكن أن يتجاوز العربون الأصلي (${showActionModal.depositAmount.toLocaleString()}).`);
         return;
      }
    }

    try {
      const managerName = currentUser?.username || currentUser?.name || "المدير";
      const now = new Date().toISOString();
      const booking = bookings.find(b => b.id === showActionModal.bookingId);
      
      const isZeroRefund = status === "approved" && Number(approvedAmount) === 0;

      await updateDepositRefundRequest(showActionModal.id, {
        status,
        approvedAmount: status === "approved" ? Number(approvedAmount) : 0,
        refunded: isZeroRefund,
        managerNotes: managerNotes.trim(),
        approvedBy: managerName,
        approvedAt: now,
        updatedAt: now,
      });

      if (status === "approved") {
        // 1. Cancel booking if requested OR cancel specific days
        if (booking) {
          const zeroDepositUpdate = isZeroRefund ? { depositRefunded: true } : {};
          if (showActionModal.cancelBooking) {
            await updateBooking(booking.id, { 
              status: 'cancelled',
              ...zeroDepositUpdate,
              updatedBy: managerName,
              updatedAt: now
            });
          } else if (
            (showActionModal.cancelledDayDates && showActionModal.cancelledDayDates.length > 0) ||
            (showActionModal.cancelledServices && showActionModal.cancelledServices.length > 0)
          ) {
            // Partial cancellation: mark specific days or services as cancelled
            let cancelledNetValue = 0;
            let cancelledDiscountValue = 0;
            
            const updatedDays = (booking.days || []).map(day => {
              if (showActionModal.cancelledDayDates?.includes(day.date)) {
                // Calculate the value of this day (price - discount)
                cancelledNetValue += (Number(day.price) || 0) - (Number(day.discount) || 0);
                cancelledDiscountValue += (Number(day.discount) || 0);
                return { ...day, status: 'cancelled' as const };
              }
              return day;
            });

            const updatedServices = (booking.additionalServices || []).map(srv => {
              const cancellation = showActionModal.cancelledServices?.find(c => c.serviceName === srv.name);
              if (cancellation) {
                const activeBookingDays = (booking.days || []).filter(d => d.status !== 'cancelled').map(d => d.date);
                const originalDates = srv.appliedDates && srv.appliedDates.length > 0 
                  ? srv.appliedDates 
                  : activeBookingDays;
                
                const cancelledCount = cancellation.dates.length;
                const dailyCost = Number(srv.cost) || 0;
                const reduction = dailyCost * cancelledCount;
                cancelledNetValue += reduction;
                
                const newAppliedDates = originalDates.filter(d => !cancellation.dates.includes(d));
                const isFullyCancelled = newAppliedDates.length === 0;
                
                return { 
                  ...srv, 
                  status: isFullyCancelled ? ('cancelled' as const) : srv.status,
                  appliedDates: newAppliedDates
                };
              }
              return srv;
            });
            
            // Recalculate totalPrice and totalDiscount
            const newTotalPrice = Math.max(0, (Number(booking.totalPrice) || 0) - cancelledNetValue);
            const newTotalDiscount = Math.max(0, (Number((booking as any).totalDiscount) || 0) - cancelledDiscountValue);

            // Sync with eventDates if it exists
            const updatedEventDates = (booking as any).eventDates?.filter((d: string) => !showActionModal.cancelledDayDates?.includes(d));
            
            // If all days are now cancelled, update booking status too
            const allDaysCancelled = updatedDays.length > 0 && updatedDays.every(d => d.status === 'cancelled');
            
            await updateBooking(booking.id, {
              days: updatedDays,
              additionalServices: updatedServices,
              eventDates: updatedEventDates,
              totalPrice: newTotalPrice,
              totalDiscount: newTotalDiscount,
              status: allDaysCancelled ? 'cancelled' : booking.status,
              ...zeroDepositUpdate,
              updatedBy: managerName,
              updatedAt: now
            });
            toast.success("تم إلغاء البنود المحددة وتحديث بيانات الحجز بنجاح.");
          } else if (isZeroRefund) {
            await updateBooking(booking.id, {
              depositRefunded: true,
              updatedBy: managerName,
              updatedAt: now
            });
          }
        }

        // 2. Generate Fine Transaction if fineAmount > 0
        const fineAmount = showActionModal.fineAmount || 0;
        const finesAccountId = linkedAccounts?.finesAccountId || (bookingSettings as any)?.finesAccountId || "40104";
        const accountsReceivableId = linkedAccounts?.accountsReceivableId || (bookingSettings as any)?.accountsReceivableId || "1010301";

        if (fineAmount > 0 && finesAccountId && accountsReceivableId) {
          const description = `قيد غرامة إلغاء حجز: ${showActionModal.customerName} - رقم الحجز: ${showActionModal.bookingCode}`;
          
          const voucherData = {
            type: "journal" as const,
            date: now.split("T")[0],
            amount: fineAmount,
            currency: booking?.currency || "YER",
            description,
            linkedBookingId: showActionModal.bookingId,
            createdBy: managerName,
            createdAt: now,
            entries: [
              { accountId: accountsReceivableId, debit: fineAmount, credit: 0, description },
              { accountId: finesAccountId, debit: 0, credit: fineAmount, description }
            ]
          };

          const voucherId = await addVoucher(voucherData);
          
          const currency = currencies.find((c) => c.code === voucherData.currency);
          const rate = currency ? currency.rateToBase : 1;

          // Debit Entry (Customer)
          await addTransactionWithDoubleEntry({
            date: voucherData.date,
            description,
            amount: fineAmount,
            currency: voucherData.currency,
            rate: rate,
            sourceId: voucherId,
            sourceType: "voucher",
            debitAccountId: accountsReceivableId,
            creditAccountId: finesAccountId,
            createdBy: managerName
          }, currencies, accounts);

          toast.success("تم توليد قيد الغرامة المحاسبي بنجاح.");
        }
      }

      toast.success(status === "approved" ? "تمت الموافقة على طلب رد العربون بنجاح." : "تم رفض الطلب.");
      setShowActionModal(null);
      setApprovedAmount(0);
      setManagerNotes("");
    } catch (err: any) {
      toast.error(`فشل تعديل الطلب: ${err.message || err}`);
    }
  };

  // Filter requests
  const filteredRequests = depositRefundRequests.filter(req => {
    const booking = bookings.find(b => b.id === req.bookingId);
    const hall = halls.find(h => h.id === req.hallId);
    
    // Search filter
    const matchesSearch = 
      req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.bookingCode && req.bookingCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.customerPhone && req.customerPhone.includes(searchTerm)) ||
      (hall && hall.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && req.status === statusFilter;
  });

  // Calculate stats
  const pendingCount = depositRefundRequests.filter(r => r.status === "pending").length;
  const approvedCount = depositRefundRequests.filter(r => r.status === "approved").length;
  const rejectedCount = depositRefundRequests.filter(r => r.status === "rejected").length;
  const refundedCount = depositRefundRequests.filter(r => r.status === "approved" && r.refunded).length;

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Stat Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            🔑 إدارة طلبات رد العربون (Deposit Refunds)
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            تقديم طلبات استرجاع دفعات العربون من قبل المختص، ومراجعتها واعتمادها من قبل صاحب الصلاحية.
          </p>
        </div>

        {/* Action Button for Specialists */}
        <button
          onClick={() => {
            if (eligibleBookings.length === 0) {
              toast.info("لا توجد حجوزات مؤهلة لتقديم طلب رد عربون لها حالياً (يجب أن تحتوي على عربون مدفوع وغير مسترجع).");
            }
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>تقديم طلب رد عربون جديد</span>
        </button>
      </div>

      {/* 2. Quick Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-slate-900/40 dark:to-slate-900/60 p-4 rounded-2xl border border-amber-200/50 dark:border-slate-800/80 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">طلبات قيد الانتظار</span>
            <span className="text-2xl font-black text-amber-900 dark:text-amber-300 font-mono">
              {pendingCount}
            </span>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center text-lg">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Approved Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 dark:from-slate-900/40 dark:to-slate-900/60 p-4 rounded-2xl border border-emerald-200/50 dark:border-slate-800/80 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">معتمدة وبانتظار الرد</span>
            <span className="text-2xl font-black text-emerald-900 dark:text-emerald-300 font-mono">
              {approvedCount - refundedCount}
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center text-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Refunded Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 dark:from-slate-900/40 dark:to-slate-900/60 p-4 rounded-2xl border border-indigo-200/50 dark:border-slate-800/80 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 block">تم رد العربون لها</span>
            <span className="text-2xl font-black text-indigo-900 dark:text-indigo-300 font-mono">
              {refundedCount}
            </span>
          </div>
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-lg">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Rejected Card */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 dark:from-slate-900/40 dark:to-slate-900/60 p-4 rounded-2xl border border-rose-200/50 dark:border-slate-800/80 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">طلبات مرفوضة</span>
            <span className="text-2xl font-black text-rose-900 dark:text-rose-300 font-mono">
              {rejectedCount}
            </span>
          </div>
          <div className="w-10 h-10 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center text-lg">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filtering & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {([
            { id: "all", label: "الكل" },
            { id: "pending", label: "قيد الانتظار" },
            { id: "approved", label: "الموافق عليها" },
            { id: "rejected", label: "المرفوضة" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم العميل، رقم الهاتف أو الرمز..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>
      </div>

      {/* 4. Requests List / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {filteredRequests.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Undo2 className="h-8 w-8" />
            </div>
            <h3 className="font-black text-sm text-slate-700 dark:text-white">لا توجد طلبات رد عربون</h3>
            <p className="text-xs text-slate-400 mt-1">يرجى تغيير فلاتر البحث أو تقديم طلب جديد.</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:hidden">
              {filteredRequests.map((req) => {
                const b = bookings.find(x => x.id === req.bookingId);
                const h = halls.find(x => x.id === req.hallId);
                const isRowHighlighted = !!(highlightId && (req.id === highlightId || req.sequenceCode === highlightId));

                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isRowHighlighted
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md font-extrabold"
                        : "bg-slate-50/40 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-bold block w-fit mb-1">
                          {req.sequenceCode || req.id.substring(0, 8)}
                        </span>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                          {req.customerName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                          <Building className="w-3 h-3 text-indigo-500" />
                          <span>{h?.name}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono">{req.bookingCode}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        {req.status === "pending" && (
                          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[8px] font-black px-2 py-0.5 rounded-full">قيد الانتظار</span>
                        )}
                        {req.status === "approved" && !req.refunded && (
                          <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full">مقبول</span>
                        )}
                        {req.status === "approved" && req.refunded && (
                          <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded-full">تم الرد</span>
                        )}
                        {req.status === "rejected" && (
                          <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 text-[8px] font-black px-2 py-0.5 rounded-full">مرفوض</span>
                        )}
                        <span className="text-[9px] text-slate-400 font-bold">
                          {new Date(req.createdAt).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/40 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                        <span className="text-[8px] text-slate-400 block mb-0.5">العربون الأصلي</span>
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                          {req.depositAmount.toLocaleString()} {b?.currency || "YER"}
                        </span>
                      </div>
                      <div className="bg-indigo-50/30 dark:bg-indigo-950/20 p-2 rounded-xl border border-indigo-100/30 dark:border-indigo-900/30">
                        <span className="text-[8px] text-indigo-400 block mb-0.5">المبلغ المطلوب</span>
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                          {req.requestedAmount.toLocaleString()} {b?.currency || "YER"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100/40 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100/50 dark:border-slate-800/50 line-clamp-2 italic mb-3">
                      "{req.justification}"
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-500">بواسطة: {req.createdBy}</span>
                        </div>
                        {req.approvedBy && (
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span className="text-[9px] font-bold text-slate-500">الاعتماد: {req.approvedBy}</span>
                          </div>
                        )}
                      </div>
                      
                      {req.status === "pending" && isManager ? (
                        <button
                          onClick={() => {
                            setShowActionModal(req);
                            setApprovedAmount(req.requestedAmount);
                            setManagerNotes("");
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          إجراء
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowActionModal(req)}
                          className="text-indigo-600 dark:text-indigo-400 text-[9px] font-black flex items-center gap-1"
                        >
                          عرض
                          <CornerUpLeft className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-4">رمز الطلب (ID)</th>
                    <th className="p-4">الحجز والعميل</th>
                    <th className="p-4">العربون الأصلي</th>
                    <th className="p-4">المبلغ المطلوب</th>
                    <th className="p-4">توضيح المبررات</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">المسؤول</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold">
                   {filteredRequests.map((req) => {
                    const b = bookings.find(x => x.id === req.bookingId);
                    const h = halls.find(x => x.id === req.hallId);
                    const isRowHighlighted = !!(highlightId && (req.id === highlightId || req.sequenceCode === highlightId));
                    
                    return (
                      <motion.tr
                        key={req.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`transition duration-150 ${
                          isRowHighlighted 
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/50 font-extrabold shadow-md" 
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                        }`}
                      >
                        <td className="p-4">
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 font-bold block w-fit">
                            {req.sequenceCode || req.id.substring(0, 8)}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">
                            {new Date(req.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <div className="text-slate-900 dark:text-white font-black text-xs">
                              {req.customerName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span className="text-indigo-600 dark:text-indigo-400">{h?.name}</span>
                              <span>•</span>
                              <span className="font-mono">{req.bookingCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-700 dark:text-slate-300 font-black">
                          {req.depositAmount.toLocaleString()} {b?.currency || "YER"}
                        </td>
                        <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400 font-black">
                          {req.requestedAmount.toLocaleString()} {b?.currency || "YER"}
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-relaxed line-clamp-2" title={req.justification}>
                            {req.justification}
                          </p>
                        </td>
                        <td className="p-4">
                          {req.status === "pending" && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200/20">
                              <Clock className="w-3 h-3" />
                              <span>قيد الانتظار</span>
                            </span>
                          )}
                          {req.status === "approved" && !req.refunded && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-200/20">
                              <CheckCircle className="w-3 h-3" />
                              <span>مقبول بانتظار الرد</span>
                            </span>
                          )}
                          {req.status === "approved" && req.refunded && (
                            <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-indigo-200/20">
                              <Coins className="w-3 h-3" />
                              <span>تم رد العربون</span>
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-200/20">
                              <XCircle className="w-3 h-3" />
                              <span>مرفوض</span>
                            </span>
                          )}

                          {req.status === "approved" && req.approvedAmount !== undefined && (
                            <span className="block text-[9px] text-slate-400 font-extrabold mt-1">
                              المبلغ المعتمد: {req.approvedAmount.toLocaleString()} {b?.currency || "YER"}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-[10px]">
                          <div className="space-y-0.5 text-slate-500">
                            <div>
                              <span className="text-slate-400">بواسطة:</span> {req.createdBy}
                            </div>
                            {req.approvedBy && (
                              <div>
                                <span className="text-slate-400">الاعتماد:</span> {req.approvedBy}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {req.status === "pending" && isManager ? (
                            <button
                              onClick={() => {
                                setShowActionModal(req);
                                setApprovedAmount(req.requestedAmount);
                                setManagerNotes("");
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-3 py-1.5 rounded-xl cursor-pointer shadow-sm shadow-indigo-600/10"
                            >
                              اتخاذ إجراء / مراجعة
                            </button>
                          ) : req.status === "pending" ? (
                            <span className="text-[10px] font-black text-amber-500 dark:text-amber-400">
                              بانتظار المدير...
                            </span>
                          ) : (
                            <div className="text-[10px] text-slate-400 max-w-[150px] mx-auto truncate font-medium" title={req.managerNotes}>
                              {req.managerNotes || "-"}
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden grid grid-cols-1 gap-4 p-4">
               {filteredRequests.map((req) => {
                const b = bookings.find(x => x.id === req.bookingId);
                const h = halls.find(x => x.id === req.hallId);
                const isRowHighlighted = !!(highlightId && (req.id === highlightId || req.sequenceCode === highlightId));
                
                return (
                  <div key={req.id} className={`p-4 rounded-2xl border transition-all space-y-4 ${
                    isRowHighlighted 
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 shadow-md ring-1 ring-indigo-500/20" 
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">رمز الطلب</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          {req.sequenceCode || req.id.substring(0, 8)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">الحالة</span>
                         {req.status === "pending" && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200/20">
                              <Clock className="w-3 h-3" />
                              <span>قيد الانتظار</span>
                            </span>
                          )}
                          {req.status === "approved" && !req.refunded && (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200/20">
                              <CheckCircle className="w-3 h-3" />
                              <span>موافق عليه</span>
                            </span>
                          )}
                          {req.status === "approved" && req.refunded && (
                            <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200/20">
                              <Coins className="w-3 h-3" />
                              <span>تم الرد</span>
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200/20">
                              <XCircle className="w-3 h-3" />
                              <span>مرفوض</span>
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block">العميل والحجز</span>
                       <div className="text-xs font-black text-slate-900 dark:text-white">{req.customerName}</div>
                       <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="text-indigo-600 dark:text-indigo-400">{h?.name}</span>
                          <span>•</span>
                          <span className="font-mono">{req.bookingCode}</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50 dark:border-slate-800/50">
                       <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">العربون الأصلي</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono">
                            {req.depositAmount.toLocaleString()} {b?.currency || "YER"}
                          </span>
                       </div>
                       <div className="text-left">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-left">المبلغ المطلوب</span>
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {req.requestedAmount.toLocaleString()} {b?.currency || "YER"}
                          </span>
                       </div>
                    </div>

                    <div>
                       <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">توضيح المبررات</span>
                       <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{req.justification}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800/50">
                       <div className="text-[9px] text-slate-400 space-y-0.5">
                          <div>بواسطة: {req.createdBy}</div>
                          {req.approvedBy && <div>الاعتماد: {req.approvedBy}</div>}
                       </div>
                       {req.status === "pending" && isManager ? (
                          <button
                            onClick={() => {
                              setShowActionModal(req);
                              setApprovedAmount(req.requestedAmount);
                              setManagerNotes("");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-4 py-2 rounded-xl cursor-pointer"
                          >
                            اتخاذ إجراء
                          </button>
                        ) : null}
                    </div>
                  </div>
                );
               })}
            </div>
          </>
        )}
      </div>

      {/* --- Overlay Modal: Create Request (Specialist Form) --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <form onSubmit={handleCreateRequest} className="flex flex-col h-full max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl">
                      <Undo2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-md font-black text-slate-900 dark:text-white">تقديم طلب رد عربون</h3>
                      <p className="text-[10px] font-bold text-slate-400">تقديم تبرير لرد العربون لاعتماده من المدير</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                  {/* Select Booking */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                      الحجز المطلوب رد عربونه
                    </label>
                    <select
                      value={selectedBookingId}
                      onChange={(e) => handleBookingChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    >
                      <option value="">-- اختر حجزاً يحتوي على عربون --</option>
                      {eligibleBookings.map((b) => {
                        const h = halls.find((x) => x.id === b.hallId);
                        return (
                          <option key={b.id} value={b.id}>
                            {b.customerName} - {h?.name || "قاعة"} - (المتبقي: {getRemainingDeposit(b).toLocaleString()} / {b.paidAmount.toLocaleString()} {b.currency}) [رمز: {b.sequenceCode || b.id.substring(0, 5)}]
                          </option>
                        );
                      })}
                    </select>
                  </div>

                      {selectedBookingId && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Info card 1 */}
                            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[9px] font-black text-slate-400 block mb-1">العميل</span>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                {bookings.find((b) => b.id === selectedBookingId)?.customerName}
                              </span>
                            </div>
                            {/* Info card 2 */}
                            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[9px] font-black text-slate-400 block mb-1">العربون المتبقي القابل للرد</span>
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                {getRemainingDeposit(bookings.find((b) => b.id === selectedBookingId)!).toLocaleString()} {bookings.find((b) => b.id === selectedBookingId)?.currency}
                              </span>
                            </div>
                          </div>

                      {/* Cancellation Toggle */}
                      <div className="flex flex-col gap-4 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <div>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">إلغاء الحجز بالكامل</span>
                              <span className="text-[9px] text-slate-500 font-bold">سيتم تغيير حالة الحجز إلى "ملغي" تماماً</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newCancel = !cancelBooking;
                              setCancelBooking(newCancel);
                              if (newCancel) {
                                setCancelledDayDates([]);
                                setCancelledServices([]);
                              }
                            }}
                            className={`w-12 h-6 rounded-full transition-colors relative ${cancelBooking ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${cancelBooking ? 'left-1' : 'left-7'}`} />
                          </button>
                        </div>
  
                          {!cancelBooking && (
                            <>
                              {bookings.find(b => b.id === selectedBookingId)?.days && (bookings.find(b => b.id === selectedBookingId)?.days?.length || 0) > 1 && (
                                <div className="pt-3 border-t border-amber-100 dark:border-amber-900/40">
                                  <span className="text-[10px] font-black text-slate-500 block mb-3 uppercase">أو اختر أياماً محددة لإلغائها:</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {bookings.find(b => b.id === selectedBookingId)?.days?.filter(d => d.status !== 'cancelled').map((day, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          if (cancelledDayDates.includes(day.date)) {
                                            setCancelledDayDates(cancelledDayDates.filter(d => d !== day.date));
                                          } else {
                                            setCancelledDayDates([...cancelledDayDates, day.date]);
                                          }
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-xl border text-[10px] font-bold transition-all ${
                                          cancelledDayDates.includes(day.date)
                                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600'
                                        }`}
                                      >
                                        <span>{day.date}</span>
                                        {cancelledDayDates.includes(day.date) && <CheckCircle className="h-3 w-3" />}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
  
                              {bookings.find(b => b.id === selectedBookingId)?.additionalServices?.some(s => s.status !== 'cancelled') && (
                                <div className="pt-3 border-t border-amber-100 dark:border-amber-900/40 mt-3">
                                  <span className="text-[10px] font-black text-slate-500 block mb-3 uppercase">إلغاء خدمات إضافية (أو أيام منها):</span>
                                  <div className="space-y-4">
                                    {bookings.find(b => b.id === selectedBookingId)?.additionalServices?.filter(s => s.status !== 'cancelled').map((service, idx) => {
                                      const activeDates = service.appliedDates && service.appliedDates.length > 0 
                                        ? service.appliedDates 
                                        : (bookings.find(b => b.id === selectedBookingId)?.days?.filter(d => d.status !== 'cancelled').map(d => d.date) || []);
                                      
                                      const currentSrvSelection = cancelledServices.find(s => s.serviceName === service.name);
                                      const isAllCancelled = currentSrvSelection && currentSrvSelection.dates.length === activeDates.length;

                                      return (
                                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <FileText className="w-3 h-3 text-slate-400" />
                                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{service.name}</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (isAllCancelled) {
                                                  setCancelledServices(cancelledServices.filter(s => s.serviceName !== service.name));
                                                } else {
                                                  const otherServices = cancelledServices.filter(s => s.serviceName !== service.name);
                                                  setCancelledServices([...otherServices, { serviceName: service.name, dates: [...activeDates] }]);
                                                }
                                              }}
                                              className={`text-[9px] font-black px-2 py-1 rounded-lg border transition-all ${
                                                isAllCancelled 
                                                  ? 'bg-rose-50 border-rose-100 text-rose-600'
                                                  : 'bg-slate-50 border-slate-100 text-slate-500'
                                              }`}
                                            >
                                              {isAllCancelled ? 'إلغاء الخدمة بالكامل' : 'إلغاء الكل'}
                                            </button>
                                          </div>

                                          <div className="flex flex-wrap gap-1.5">
                                            {activeDates.map((date) => {
                                              const isDateCancelled = currentSrvSelection?.dates.includes(date);
                                              return (
                                                <button
                                                  key={date}
                                                  type="button"
                                                  onClick={() => {
                                                    const existing = cancelledServices.find(s => s.serviceName === service.name);
                                                    const otherServices = cancelledServices.filter(s => s.serviceName !== service.name);
                                                    
                                                    if (existing) {
                                                      if (existing.dates.includes(date)) {
                                                        const newDates = existing.dates.filter(d => d !== date);
                                                        if (newDates.length === 0) {
                                                          setCancelledServices(otherServices);
                                                        } else {
                                                          setCancelledServices([...otherServices, { ...existing, dates: newDates }]);
                                                        }
                                                      } else {
                                                        setCancelledServices([...otherServices, { ...existing, dates: [...existing.dates, date] }]);
                                                      }
                                                    } else {
                                                      setCancelledServices([...otherServices, { serviceName: service.name, dates: [date] }]);
                                                    }
                                                  }}
                                                  className={`px-2 py-1 rounded-lg border text-[9px] font-bold transition-all ${
                                                    isDateCancelled
                                                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
                                                  }`}
                                                >
                                                  {date}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                      </div>

                      {/* Request Amount Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                            مبلغ الغرامة المستقطع
                          </label>
                          <input
                            type="number"
                            value={fineAmount}
                            onChange={(e) => {
                              const fine = Number(e.target.value);
                              const booking = bookings.find(b => b.id === selectedBookingId);
                              if (booking) {
                                const remaining = getRemainingDeposit(booking);
                                setFineAmount(fine);
                                // If total exceeds remaining deposit, adjust refund
                                if (fine + refundableAmount > remaining) {
                                  setRefundableAmount(Math.max(0, remaining - fine));
                                }
                              }
                            }}
                            placeholder="0.00"
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-rose-500 transition-all outline-none font-mono text-rose-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                            المبلغ الصافي المسترد للعميل
                          </label>
                          <input
                            type="number"
                            value={refundableAmount}
                            onChange={(e) => {
                              const refund = Number(e.target.value);
                              const booking = bookings.find(b => b.id === selectedBookingId);
                              if (booking) {
                                const remaining = getRemainingDeposit(booking);
                                setRefundableAmount(refund);
                                // If total exceeds remaining deposit, adjust fine
                                if (refund + fineAmount > remaining) {
                                  setFineAmount(Math.max(0, remaining - refund));
                                }
                              }
                            }}
                            placeholder="0.00"
                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-emerald-500 transition-all outline-none font-mono text-emerald-600"
                          />
                        </div>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500">المتبقي من الرصيد الحالي (بعد الغرامة والرد):</span>
                        <span className={`text-xs font-mono font-black ${
                          getRemainingDeposit(bookings.find(b => b.id === selectedBookingId)!) - (Number(fineAmount) + Number(refundableAmount)) < 0
                            ? 'text-rose-500'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {Math.max(0, getRemainingDeposit(bookings.find(b => b.id === selectedBookingId)!) - (Number(fineAmount) + Number(refundableAmount))).toLocaleString()} {bookings.find(b => b.id === selectedBookingId)?.currency}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-extrabold mr-1">
                        * يتم استقطاع الغرامة مباشرة من مبلغ العربون، والمبلغ الصافي هو ما سيتم رده فعلياً للعميل. يمكنك رد مبلغ أقل من المتبقي.
                      </p>

                      {/* Justification Textarea */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                          توضيح المبررات والمسوغات لطلب الاسترداد (مطلوب)
                        </label>
                        <textarea
                          rows={4}
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          placeholder="يرجى كتابة أسباب ومبررات إلغاء الحجز أو رد العربون بالتفصيل..."
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none leading-relaxed"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedBookingId}
                    className={`flex-[2] px-6 py-3.5 ${
                      selectedBookingId ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    } text-white font-black rounded-2xl text-xs shadow-lg shadow-indigo-600/15 transition-all cursor-pointer`}
                  >
                    تقديم الطلب للاعتماد
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Overlay Modal: Manager Actions (Approval / Rejection Form) --- */}
      <AnimatePresence>
        {showActionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl">
                    <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-md font-black text-slate-900 dark:text-white">مراجعة واعتماد طلب رد العربون</h3>
                    <p className="text-[10px] font-bold text-slate-400">اتخاذ قرار مالي وتحديد المبلغ الموافق على إرجاعه</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowActionModal(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 max-h-[70vh]">
                {/* Details card */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3 border border-slate-100 dark:border-slate-800 text-xs font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">مقدم الطلب:</span>
                    <span className="text-slate-800 dark:text-slate-200">{showActionModal.createdBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">العميل:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-black">{showActionModal.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">العربون الأصلي:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono">
                      {showActionModal.depositAmount.toLocaleString()} {bookings.find(b => b.id === showActionModal.bookingId)?.currency}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2">
                    <span className="text-slate-400">مبلغ الغرامة المستقطع:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-black font-mono">
                      {(showActionModal.fineAmount || 0).toLocaleString()} {bookings.find(b => b.id === showActionModal.bookingId)?.currency}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2 bg-indigo-50/50 dark:bg-indigo-950/20 -mx-4 px-4 py-2">
                    <span className="text-indigo-900 dark:text-indigo-300 font-black">الصافي المطلوب ردّه للعميل:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black font-mono">
                      {showActionModal.requestedAmount.toLocaleString()} {bookings.find(b => b.id === showActionModal.bookingId)?.currency}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800/80 pt-2 text-[10px]">
                    <span className="text-slate-400 font-bold">إلغاء الحجز عند الاعتماد:</span>
                    <span className={`font-black ${showActionModal.cancelBooking ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {showActionModal.cancelBooking ? "نعم (تلقائي)" : "لا"}
                    </span>
                  </div>
                  {showActionModal.cancelledDayDates && showActionModal.cancelledDayDates.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">الأيام المطلوب إلغاؤها:</span>
                      <div className="flex flex-wrap gap-1">
                        {showActionModal.cancelledDayDates.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-100 dark:border-rose-900/40 rounded text-[9px] font-black">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {showActionModal.cancelledServices && showActionModal.cancelledServices.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1">الخدمات الإضافية المطلوب إلغاؤها (جزئياً أو كلياً):</span>
                      <div className="space-y-2">
                        {showActionModal.cancelledServices.map((srv, i) => (
                          <div key={i} className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/40">
                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 block mb-1">{srv.serviceName}</span>
                            <div className="flex flex-wrap gap-1">
                              {srv.dates.map((date, di) => (
                                <span key={di} className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/50 rounded text-[8px] font-bold text-amber-600">
                                  {date}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Justification View */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 mr-1">
                    تبريرات ومسوغات المختص:
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    {showActionModal.justification}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-4">
                  {/* Approved Amount Input */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                      تحديد المبلغ الموافق على إرجاعه (المبلغ المعتمد) *
                    </label>
                    <input
                      type="number"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(Number(e.target.value))}
                      placeholder="أدخل المبلغ المعتمد..."
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-mono text-emerald-600"
                    />
                    <span className="text-[9px] text-slate-400 font-extrabold block mt-1.5 mr-1">
                      * يتيح النظام للمدير الموافقة على نفس المبلغ المطلوب، أو تخفيضه بناءً على شروط العقد وبنود الإلغاء.
                    </span>
                  </div>

                  {/* Manager notes */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                      ملاحظات أو توجيهات المدير (اختياري)
                    </label>
                    <textarea
                      rows={3}
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      placeholder="اكتب أي ملاحظات أو شروط للاعتماد..."
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleManagerAction("rejected")}
                  className="px-6 py-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-black rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>رفض الطلب بالكامل</span>
                </button>
                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowActionModal(null)}
                    className="flex-1 px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs transition-all cursor-pointer text-center"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManagerAction("approved")}
                    className="flex-[2] px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-lg shadow-emerald-600/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>موافقة واعتِماد الرد</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
