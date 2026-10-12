import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Tag, Search, Calendar, User, CheckCircle2, XCircle, 
  Clock, Printer, AlertCircle, Building, Check, X, FileText, Plus 
} from 'lucide-react';
import { BookingDiscountRequest, Booking, Account, Currency, CompanySettings } from '../types';
import { 
  subscribeBookingDiscountRequests, 
  updateBookingDiscountRequest, 
  updateBooking, 
  subscribeBookings, 
  subscribeAccounts, 
  subscribeCurrencies 
} from '../lib/dbService';
import { usePermissions } from '../lib/permissions';
import OfficialDiscountPrintModal from './OfficialDiscountPrintModal';
import BookingDiscountModal from './BookingDiscountModal';

interface DiscountsManagementViewProps {
  company?: CompanySettings | null;
  currentUser?: any;
  highlightId?: string | null;
  onClearHighlight?: () => void;
}

export default function DiscountsManagementView({
  company,
  currentUser,
  highlightId,
  onClearHighlight
}: DiscountsManagementViewProps) {
  const { hasPermission } = usePermissions();
  const isManager = hasPermission("manage-users") || hasPermission("view-company") || hasPermission("allow-unlimited-discount");

  const [requests, setRequests] = useState<BookingDiscountRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  
  // Print Modal State
  const [selectedRequestForPrint, setSelectedRequestForPrint] = useState<BookingDiscountRequest | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // New Discount Request Flow
  const [isSelectBookingModalOpen, setIsSelectBookingModalOpen] = useState(false);
  const [bookingPickerSearch, setBookingPickerSearch] = useState('');
  const [selectedBookingForDiscount, setSelectedBookingForDiscount] = useState<Booking | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  useEffect(() => {
    const unsubReqs = subscribeBookingDiscountRequests(data => setRequests(data));
    const unsubBooks = subscribeBookings(data => setBookings(data));
    const unsubAccs = subscribeAccounts(data => setAccounts(data));
    const unsubCurr = subscribeCurrencies(data => setCurrencies(data));

    return () => {
      unsubReqs();
      unsubBooks();
      unsubAccs();
      unsubCurr();
    };
  }, []);

  useEffect(() => {
    if (highlightId && requests.length > 0) {
      const found = requests.find(r => r.id === highlightId || r.sequenceCode === highlightId);
      if (found) {
        setStatusTab(found.status === 'pending' ? 'pending' : found.status === 'approved' ? 'approved' : 'rejected');
        setSearchTerm(found.sequenceCode || found.customerName);
        if (onClearHighlight) onClearHighlight();
      }
    }
  }, [highlightId, requests, onClearHighlight]);

  const filteredRequests = requests.filter(r => {
    if (r.status !== statusTab) return false;
    const term = searchTerm.toLowerCase();
    return (
      (r.customerName || '').toLowerCase().includes(term) ||
      (r.sequenceCode || '').toLowerCase().includes(term) ||
      (r.bookingCode || '').toLowerCase().includes(term) ||
      (r.discountReason || '').toLowerCase().includes(term)
    );
  });

  const handleApprove = async (req: BookingDiscountRequest) => {
    try {
      const booking = bookings.find(b => b.id === req.bookingId);
      if (!booking) {
        toast.error('الحجز المرتبط بهذا الطلب غير موجود');
        return;
      }

      const rawBase = (booking.days || []).reduce((sum, d) => sum + Number(d.price || 0), 0) || booking.totalPrice;
      const newTotalPrice = Math.max(0, rawBase - req.totalDiscount);
      const updatedDays = (booking.days || []).map(d => {
        const matched = req.daysDiscounts.find(x => x.date === d.date);
        return { ...d, discount: matched ? matched.discount : (d.discount || 0) };
      });

      // 1. Update Booking
      await updateBooking(booking.id, {
        totalPrice: newTotalPrice,
        totalDiscount: req.totalDiscount,
        days: updatedDays,
        discountReason: req.discountReason,
        isDiscountApproved: true
      });

      // 2. Update Request Status
      await updateBookingDiscountRequest(req.id, {
        status: 'approved',
        approvedBy: currentUser?.name || currentUser?.username || 'المسؤول',
        approvedAt: new Date().toISOString()
      });

      toast.success('تم اعتماد الخصم وتحديث قيود الحجز بنجاح');
      
      // Open Print Notice immediately
      setSelectedRequestForPrint(req);
      setIsPrintModalOpen(true);
    } catch (err: any) {
      toast.error(`خطأ أثناء الاعتماد: ${err.message || err}`);
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      await updateBookingDiscountRequest(reqId, {
        status: 'rejected',
        approvedBy: currentUser?.name || currentUser?.username || 'المسؤول',
        approvedAt: new Date().toISOString()
      });
      toast.success('تم رفض طلب الخصم');
    } catch (err: any) {
      toast.error(`خطأ أثناء الرفض: ${err.message || err}`);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const targetBookingForPrint = selectedRequestForPrint
    ? bookings.find(b => b.id === selectedRequestForPrint.bookingId)
    : null;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Tag className="h-7 w-7 text-indigo-500" />
            إدارة واعتماد الخصومات
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 font-bold">
            مراجعة طلبات الخصومات الواردة من الموظفين، اعتمادها وترحيلها محاسبياً، وطباعة إشعارات الخصم الرسمية.
          </p>
        </div>

        {/* Header Actions: Tabs + New Request Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => setStatusTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                statusTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>قيد الانتظار</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${statusTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {pendingCount}
              </span>
            </button>
            <button
              onClick={() => setStatusTab('approved')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                statusTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>المعتمدة</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${statusTab === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {approvedCount}
              </span>
            </button>
            <button
              onClick={() => setStatusTab('rejected')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                statusTab === 'rejected'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>المرفوضة</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${statusTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
                {rejectedCount}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setBookingPickerSearch('');
              setIsSelectBookingModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>طلب خصم جديد</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="البحث برقم الطلب، اسم العميل، أو سبب الخصم..."
          className="w-full bg-transparent border-none text-xs font-bold focus:outline-none dark:text-white"
        />
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <span className="text-4xl">🏷️</span>
          <p className="text-sm font-bold">لا توجد طلبات خصم في هذه القائمة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map(req => {
            const booking = bookings.find(b => b.id === req.bookingId);
            return (
              <div 
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 relative overflow-hidden"
              >
                {/* Status Indicator Bar */}
                <div className={`absolute top-0 right-0 w-2 h-full ${
                  req.status === 'approved' ? 'bg-emerald-500' : req.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />

                <div className="space-y-3 mr-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                        #{req.sequenceCode || req.id.slice(-6)}
                      </span>
                      <h3 className="text-base font-black text-slate-800 dark:text-white mt-1">
                        العميل: {req.customerName}
                      </h3>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                        رقم الحجز: {req.bookingCode || 'غير متوفر'}
                      </p>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-xs text-slate-400 block">إجمالي الخصم</span>
                      <span className="text-lg font-black text-emerald-600">
                        {req.totalDiscount.toLocaleString()} {booking?.currency || 'YER'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl space-y-1.5 border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span>سبب الخصم: {req.discountReason}</span>
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-bold">
                      <span>مقدم الطلب: {req.requestedBy}</span>
                      <span>التاريخ: {req.createdAt?.split('T')[0]}</span>
                    </div>
                  </div>

                  {/* Days breakdown tags */}
                  {req.daysDiscounts && req.daysDiscounts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {req.daysDiscounts.map((d, dIdx) => (
                        <span key={dIdx} className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                          {d.date}: {Number(d.discount).toLocaleString()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mr-2">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                    req.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                    req.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}>
                    {req.status === 'approved' ? 'معتمد ومنفذ' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                  </span>

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>اعتماد الخصم وترحيل القيود</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(req.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-black text-xs rounded-xl transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                      </>
                    )}

                    {req.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequestForPrint(req);
                          setIsPrintModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة إشعار الخصم</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Official Discount Print Modal */}
      {selectedRequestForPrint && targetBookingForPrint && (
        <OfficialDiscountPrintModal
          isOpen={isPrintModalOpen}
          booking={targetBookingForPrint}
          totalDiscount={selectedRequestForPrint.totalDiscount}
          daysDiscounts={selectedRequestForPrint.daysDiscounts}
          discountReason={selectedRequestForPrint.discountReason}
          company={company}
          accounts={accounts}
          currencies={currencies}
          currentUser={currentUser}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSelectedRequestForPrint(null);
          }}
        />
      )}

      {/* Select Booking Modal to initiate a new discount request */}
      {isSelectBookingModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    اختيار حجز لطلب خصم جديد
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    حدد الحجز المطلوب تقديم طلب خصم أو اعتماده له
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectBookingModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={bookingPickerSearch}
                  onChange={(e) => setBookingPickerSearch(e.target.value)}
                  placeholder="ابحث باسم العميل، رقم العقد، أو رقم الهاتف..."
                  className="w-full bg-transparent border-none text-xs font-bold focus:outline-none dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
              {bookings
                .filter(b => {
                  const term = bookingPickerSearch.toLowerCase();
                  return (
                    (b.customerName || '').toLowerCase().includes(term) ||
                    (b.sequenceCode || '').toLowerCase().includes(term) ||
                    (b.customerPhone || '').toLowerCase().includes(term)
                  );
                })
                .slice(0, 20)
                .map(b => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBookingForDiscount(b);
                      setIsSelectBookingModalOpen(false);
                      setIsDiscountModalOpen(true);
                    }}
                    className="pt-2 first:pt-0 p-3 rounded-2xl hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                          #{b.sequenceCode || b.id.slice(-6)}
                        </span>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white">
                          {b.customerName}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        الهاتف: {b.customerPhone || 'غير مسجل'} | التاريخ: {(b.days && b.days[0]?.date) || (b as any).eventDate || 'غير محدد'}
                      </p>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-[10px] text-slate-400 block">إجمالي العقد</span>
                      <span className="text-xs font-black text-indigo-600">
                        {Number(b.totalPrice || 0).toLocaleString()} {b.currency || 'YER'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Booking Discount Modal */}
      {isDiscountModalOpen && selectedBookingForDiscount && (
        <BookingDiscountModal
          isOpen={isDiscountModalOpen}
          booking={selectedBookingForDiscount}
          accounts={accounts}
          currencies={currencies}
          company={company}
          currentUser={currentUser}
          onClose={() => {
            setIsDiscountModalOpen(false);
            setSelectedBookingForDiscount(null);
          }}
          onSaveDiscount={async (bookingId, totalDiscount, daysDiscounts, reason) => {
            const bookingToUpdate = bookings.find(b => b.id === bookingId);
            if (!bookingToUpdate) return;
            const rawBase = (bookingToUpdate.days || []).reduce((sum, d) => sum + Number(d.price || 0), 0) || bookingToUpdate.totalPrice;
            const newTotalPrice = Math.max(0, rawBase - totalDiscount);
            const updatedDays = (bookingToUpdate.days || []).map(d => {
              const matched = daysDiscounts.find(x => x.date === d.date);
              return { ...d, discount: matched ? matched.discount : 0 };
            });

            await updateBooking(bookingToUpdate.id, {
              totalPrice: newTotalPrice,
              totalDiscount: totalDiscount,
              days: updatedDays,
              discountReason: reason
            });
          }}
        />
      )}
    </div>
  );
}
