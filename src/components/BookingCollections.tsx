import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Search, Calendar, User, DollarSign, ArrowRight, CheckCircle2, AlertCircle, Receipt, Printer, Tag } from 'lucide-react';
import { Booking, Hall, Account } from '../types';
import { usePermissions, PermissionGuard } from '../lib/permissions';

interface BookingCollectionsProps {
  bookings: Booking[];
  halls: Hall[];
  accounts: Account[];
  onCollectPayment: (
    bookingId: string, 
    amount: number, 
    accountId: string, 
    creditAccountId?: string, 
    date?: string, 
    manualNumber?: string,
    collectionType?: "deposit" | "payment"
  ) => void;
  onPrintInvoice?: (bookingId: string) => void;
}

export default function BookingCollections({ bookings, halls, accounts, onCollectPayment, onPrintInvoice }: BookingCollectionsProps) {
  const { currentUser, canAccessAccount } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [amount, setAmount] = useState(0);
  const [targetAccountId, setTargetAccountId] = useState(() => currentUser?.defaultCashboxId || '');
  const [manualNumber, setManualNumber] = useState('');
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [collectionType, setCollectionType] = useState<"deposit" | "payment">("payment");

  // Auto-select user's default cashbox if not selected
  useEffect(() => {
    if (!targetAccountId && currentUser?.defaultCashboxId) {
      setTargetAccountId(currentUser.defaultCashboxId);
    }
  }, [currentUser, targetAccountId]);

  const filteredBookings = bookings.filter(b => 
    b.status !== 'completed' && b.status !== 'cancelled' &&
    ((b.customerName || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
     (b.customerPhone || "").includes(searchTerm) ||
     (b.manualNumber && b.manualNumber.includes(searchTerm)) ||
     (b.sequenceCode && b.sequenceCode.toLowerCase().includes((searchTerm || "").toLowerCase())))
  );

  const handleSelectBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    const totalPaidSoFar = (booking.paidAmount || 0) + (booking.subsequentPayments || 0);
    const remaining = Math.max(0, booking.totalPrice - totalPaidSoFar);
    
    // If no deposit was paid yet, default to deposit, otherwise payment
    const isZeroDeposit = (booking.paidAmount || 0) === 0;
    setCollectionType(isZeroDeposit ? "deposit" : "payment");
    setAmount(remaining);
    setManualNumber('');
    setVoucherDate(new Date().toISOString().split("T")[0]);
    
    if (currentUser?.defaultCashboxId) {
      setTargetAccountId(currentUser.defaultCashboxId);
    }
  };

  const handleCollect = () => {
    if (selectedBooking && amount > 0 && targetAccountId) {
      onCollectPayment(
        selectedBooking.id, 
        amount, 
        targetAccountId, 
        undefined, 
        voucherDate, 
        manualNumber.trim() || "",
        collectionType
      );
      setSelectedBooking(null);
      setAmount(0);
      setManualNumber('');
    }
  };

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-emerald-500" />
            تحصيلات دفعات الحجوزات
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">متابعة المبالغ المستلمة والمتبقية لكل حجز</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="البحث باسم العميل أو رقم الهاتف أو رقم السند اليدوي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 text-right"
              />
            </div>

            <div className="space-y-3">
              {filteredBookings.map(booking => {
                const hall = halls.find(h => h.id === booking.hallId);
                const totalPaidSoFar = (booking.paidAmount || 0) + (booking.subsequentPayments || 0);
                const remaining = Math.max(0, booking.totalPrice - totalPaidSoFar);
                const progress = booking.totalPrice > 0 ? (totalPaidSoFar / booking.totalPrice) * 100 : 0;
                const bookingDate = (booking.eventDates && booking.eventDates.length > 0) 
                  ? booking.eventDates.join("، ") 
                  : (booking.days?.[0]?.date || booking.eventDate || "-");

                return (
                  <motion.div 
                    key={booking.id}
                    onClick={() => handleSelectBooking(booking)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                      selectedBooking?.id === booking.id 
                        ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-800 dark:text-white text-base">{booking.customerName}</h4>
                          {booking.manualNumber && (
                            <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800" title="رقم الحجز / السند اليدوي">
                              يدوي: {booking.manualNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="font-mono">{bookingDate}</span>
                          </span>
                          <span className="text-[11px] font-black text-indigo-500">{hall?.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black font-mono text-slate-900 dark:text-white">
                          <span className="text-[10px] text-slate-400 font-sans ml-1">{booking.currency}</span>
                          {remaining.toLocaleString('en-US')}
                        </div>
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter">متبقي</div>
                      </div>
                    </div>

                    <div className="mt-3 overflow-hidden h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="absolute h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                );
              })}

              {filteredBookings.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase italic tracking-widest bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  لا يوجد حجوزات نشطة بانتظار التحصيل
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedBooking ? (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl sticky top-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    collectionType === 'deposit' 
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' 
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  }`}>
                    {collectionType === 'deposit' ? <Tag className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white">
                      {collectionType === 'deposit' ? 'تحصيل عربون الحجز' : 'تحصيل دفعة من المتبقي'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 font-mono">
                      {collectionType === 'deposit' ? 'سند قبض عربون' : 'سند قبض دفعة'} #{selectedBooking.sequenceCode || (selectedBooking.id || '').slice(-6)}
                    </p>
                  </div>
                </div>

                {/* Collection Type Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionType('deposit');
                      // If deposit is 0 or user wants to set deposit, let them enter amount
                    }}
                    className={`py-2 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      collectionType === 'deposit'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    تحصيل عربون
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionType('payment')}
                    className={`py-2 px-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      collectionType === 'payment'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    تحصيل دفعة
                  </button>
                </div>

                {/* Financial Summary */}
                <div className="space-y-3 mb-6 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-600 font-bold">المبلغ الإجمالي:</span>
                    <span className="text-slate-900 dark:text-white font-black font-mono">
                      <span className="text-xs text-slate-400 font-sans ml-1">{selectedBooking.currency}</span>
                      {selectedBooking.totalPrice.toLocaleString('en-US')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">• العربون المسدد:</span>
                    <span className="text-indigo-700 dark:text-indigo-300 font-black font-mono">
                      <span className="text-xs text-slate-400 font-sans ml-1">{selectedBooking.currency}</span>
                      {(selectedBooking.paidAmount || 0).toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">• الدفعات اللاحقة:</span>
                    <span className="text-emerald-600 dark:text-emerald-300 font-black font-mono">
                      <span className="text-xs text-slate-400 font-sans ml-1">{selectedBooking.currency}</span>
                      {(selectedBooking.subsequentPayments || 0).toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-700 dark:text-slate-300 font-bold">إجمالي المدفوع:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-black font-mono">
                      <span className="text-xs text-slate-400 font-sans ml-1">{selectedBooking.currency}</span>
                      {((selectedBooking.paidAmount || 0) + (selectedBooking.subsequentPayments || 0)).toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-base pt-2 border-t-2 border-dashed border-emerald-300 dark:border-emerald-800/80">
                    <span className="text-emerald-800 dark:text-emerald-300 font-black">المتبقي المطلوب:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black font-mono text-lg">
                      <span className="text-sm text-slate-400 font-sans ml-1">{selectedBooking.currency}</span>
                      {Math.max(0, selectedBooking.totalPrice - ((selectedBooking.paidAmount || 0) + (selectedBooking.subsequentPayments || 0))).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Amount Input */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">
                      {collectionType === 'deposit' ? 'مبلغ العربون المراد تحصيله' : 'مبلغ الدفعة الحالية'}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="number"
                        step="any"
                        dir="ltr"
                        placeholder="0.00"
                        value={amount || ""}
                        onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3.5 pl-10 text-xl font-mono font-black focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 text-center tracking-wider"
                      />
                    </div>
                  </div>

                  {/* Voucher Date Input */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">
                      📅 تاريخ السند / التحصيل
                    </label>
                    <input 
                      type="date"
                      value={voucherDate}
                      onChange={e => setVoucherDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 text-center cursor-pointer"
                    />
                  </div>

                  {/* Manual Voucher Number Input */}
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 block mb-1 uppercase tracking-wider">
                      🔢 رقم سند التحصيل اليدوي (أرقام فقط - اختياري)
                    </label>
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="أدخل رقم السند الورقي (مثال: 1045)"
                      value={manualNumber}
                      onChange={e => setManualNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 text-center"
                    />
                  </div>

                  {/* Target Account (Cashbox / Bank) Selector */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1 uppercase tracking-wider">
                      التحصيل إلى حساب (الصندوق / البنك)
                    </label>
                    <select 
                      value={targetAccountId}
                      onChange={e => setTargetAccountId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">اختر الصندوق / البنك...</option>
                      {accounts
                        .filter(a => a.type === 'asset' && a.isTransactional && canAccessAccount(a.id) && (
                          a.classification === 'cashbox' ||
                          a.id === currentUser?.defaultCashboxId ||
                          a.code === '1101' || a.code === '1010101' ||
                          a.name?.includes('صندوق') || a.name?.includes('نقدية') || a.name?.includes('بنك')
                        ))
                        .map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} {acc.id === currentUser?.defaultCashboxId ? '⭐ (صندوقك الافتراضي)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <PermissionGuard permission="collect-booking-payment">
                    <button 
                      onClick={handleCollect}
                      disabled={!targetAccountId || amount <= 0}
                      className={`w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-4 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer ${
                        collectionType === 'deposit'
                          ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      }`}
                    >
                      {collectionType === 'deposit' ? 'تأكيد تحصيل العربون' : 'تأكيد تحصيل الدفعة'}
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </PermissionGuard>

                  <button 
                    onClick={() => onPrintInvoice && onPrintInvoice(selectedBooking.id)}
                    className="w-full border-2 border-indigo-600/30 hover:border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-3 cursor-pointer"
                  >
                    طباعة عقد الحجز
                    <Printer className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full bg-slate-50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl shadow-sm flex items-center justify-center text-slate-300 mb-4 rotate-12">
                  <Receipt className="h-8 w-8 text-slate-400 opacity-20" />
                </div>
                <h4 className="text-slate-400 font-black text-sm mb-2">اضغط على حجز من القائمة للبدء</h4>
                <p className="text-[10px] text-slate-400 font-bold max-w-xs uppercase leading-relaxed">
                  سيتم هنا عرض تفاصيل الحجز، تاريخ السند، حساب الصندوق، وإمكانية تحصيل العربون أو الدفعات
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
