import React, { useState } from 'react';
import { X, Tag, Calculator, Check, AlertCircle, Printer, CheckCircle } from 'lucide-react';
import { Booking, Account, Currency, CompanySettings } from '../types';
import { toast } from 'sonner';
import OfficialDiscountPrintModal from './OfficialDiscountPrintModal';
import { addBookingDiscountRequest } from '../lib/dbService';
import { usePermissions } from '../lib/permissions';

interface BookingDiscountModalProps {
  booking: Booking;
  accounts: Account[];
  currencies: Currency[];
  company?: CompanySettings | null;
  currentUser?: any;
  isOpen: boolean;
  onClose: () => void;
  onSaveDiscount: (bookingId: string, totalDiscount: number, daysDiscounts: { date: string; discount: number }[], discountReason: string) => Promise<void>;
}

export default function BookingDiscountModal({
  booking,
  accounts = [],
  currencies = [],
  company,
  currentUser,
  isOpen,
  onClose,
  onSaveDiscount
}: BookingDiscountModalProps) {
  if (!isOpen) return null;

  const { hasPermission, currentRole } = usePermissions();
  const isManager = Boolean(
    hasPermission('manage-users') || 
    hasPermission('view-company') || 
    hasPermission('allow-unlimited-discount') || 
    currentRole?.name?.toLowerCase().includes('admin') ||
    currentRole?.name?.toLowerCase().includes('مدير') ||
    (currentUser as any)?.role === 'admin' || 
    (currentUser as any)?.role === 'manager'
  );

  const bookingDays: any[] = booking.days && booking.days.length > 0 
    ? booking.days 
    : [{ date: (booking as any).eventDate || new Date().toISOString().split('T')[0], price: booking.totalPrice || 0, discount: 0 }];

  const [daysDiscounts, setDaysDiscounts] = useState<{ date: string; discount: number }[]>(
    bookingDays.map(d => ({ date: d.date, discount: Number(d.discount || 0) }))
  );
  const [discountReason, setDiscountReason] = useState((booking as any).discountReason || 'خصم إداري خاص على الحجز');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const totalDiscount = daysDiscounts.reduce((sum, d) => sum + Number(d.discount || 0), 0);
  const baseTotal = bookingDays.reduce((sum: number, d: any) => sum + Number(d.price || 0), 0);
  const netTotal = Math.max(0, baseTotal - totalDiscount);

  const handleUniformDiscount = (amount: number) => {
    const perDay = bookingDays.length > 0 ? Math.round(amount / bookingDays.length) : 0;
    setDaysDiscounts(bookingDays.map(d => ({ date: d.date, discount: perDay })));
  };

  // Stage 1: Submit Request (For Review and Approval in Discounts Management View)
  const handleSubmitRequest = async () => {
    try {
      setIsSubmitting(true);
      const reqId = `BDR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await addBookingDiscountRequest({
        id: reqId,
        sequenceCode: reqId,
        bookingId: booking.id,
        bookingCode: booking.sequenceCode || booking.id.slice(-6).toUpperCase(),
        customerName: booking.customerName || 'عميل',
        totalDiscount,
        daysDiscounts,
        discountReason,
        status: 'pending',
        requestedBy: currentUser?.name || currentUser?.username || 'الموظف',
        createdAt: new Date().toISOString()
      });
      toast.success('تم إرسال طلب الخصم بنجاح إلى شاشة إدارة الخصومات بانتظار الاعتماد');
      onClose();
    } catch (err: any) {
      toast.error(`حدث خطأ أثناء إرسال طلب الخصم: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Approval (For Managers / Admins)
  const handleDirectApprove = async () => {
    try {
      setIsSubmitting(true);
      // 1. Update Booking and ledger
      await onSaveDiscount(booking.id, totalDiscount, daysDiscounts, discountReason);
      
      // 2. Also record in requests as approved for audit
      const reqId = `BDR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await addBookingDiscountRequest({
        id: reqId,
        sequenceCode: reqId,
        bookingId: booking.id,
        bookingCode: booking.sequenceCode || booking.id.slice(-6).toUpperCase(),
        customerName: booking.customerName || 'عميل',
        totalDiscount,
        daysDiscounts,
        discountReason,
        status: 'approved',
        requestedBy: currentUser?.name || currentUser?.username || 'الإدارة',
        approvedBy: currentUser?.name || currentUser?.username || 'الإدارة العامة',
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      toast.success('تم اعتماد وتطبيق الخصم بنجاح وتحديث الحسابات');
      setIsPrintModalOpen(true);
    } catch (err: any) {
      toast.error(`خطأ أثناء اعتماد الخصم: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  إدارة وتوزيع الخصومات للحجز - العميل: {booking.customerName}
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  رقم الحجز: <span className="font-mono">{booking.sequenceCode || booking.id.slice(-6)}</span> | عدد أيام الحجز: {bookingDays.length} أيام
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-900 dark:text-slate-100">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-[10px] text-slate-500 font-bold mb-1">إجمالي العقد الأساسي</p>
                <p className="text-sm sm:text-base font-black font-mono text-slate-800 dark:text-white">{baseTotal.toLocaleString()} {booking.currency}</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-center">
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mb-1">إجمالي الخصم الممنوح</p>
                <p className="text-sm sm:text-base font-black font-mono text-indigo-700 dark:text-indigo-300">{totalDiscount.toLocaleString()} {booking.currency}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mb-1">صافي قيمة العقد النهائية</p>
                <p className="text-sm sm:text-base font-black font-mono text-emerald-700 dark:text-emerald-300">{netTotal.toLocaleString()} {booking.currency}</p>
              </div>
            </div>

            {/* Quick Uniform Discount Input */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>توزيع إجمالي خصم موحد على أيام الحجز تلقائياً:</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="أدخل إجمالي مبلغ الخصم المراد توزيعه..."
                  onChange={(e) => handleUniformDiscount(Number(e.target.value) || 0)}
                  className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Detailed Days Discount Table */}
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                تخصيص الخصم يدوياً لكل يوم من أيام الحجز:
              </p>
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black">
                    <tr>
                      <th className="p-3">تاريخ اليوم</th>
                      <th className="p-3">سعر اليوم الأساسي</th>
                      <th className="p-3">مبلغ الخصم (يدوي)</th>
                      <th className="p-3">الصافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                    {bookingDays.map((d: any, idx: number) => {
                      const dayPrice = Number(d.price || 0);
                      const dayDisc = Number(daysDiscounts[idx]?.discount || 0);
                      const dayNet = Math.max(0, dayPrice - dayDisc);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono">{d.date}</td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{dayPrice.toLocaleString()} {booking.currency}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={dayDisc}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                const updated = [...daysDiscounts];
                                updated[idx] = { date: d.date, discount: val };
                                setDaysDiscounts(updated);
                              }}
                              className="w-28 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs font-black focus:outline-none focus:border-indigo-600 text-indigo-600"
                            />
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-600">{dayNet.toLocaleString()} {booking.currency}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reason / Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">سبب أو بيان الخصم:</label>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="مثال: خصم إداري خاص / مراعاة للعميل..."
                className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-2xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                عند حفظ الخصم، سيقوم النظام تلقائياً بتحديث إجمالي العقد، وتوليد القيود المحاسبية اللازمة في الحسابات (حـ/ الخصومات المسموح بها وحـ/ العميل).
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-black text-xs rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>معاينة وطباعة إشعار الخصم</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إغلاق
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitRequest}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                title="إرسال طلب الخصم إلى شاشة إدارة الخصومات بانتظار الاعتماد"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>إرسال طلب للاعتماد</span>
              </button>

              {isManager && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDirectApprove}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                  title="اعتماد مباشر وتطبيق الخصم فورياً وتحديث العقد والحسابات"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>اعتماد وتطبيق فوري</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Official Discount Print Modal (A5 Portrait) */}
      <OfficialDiscountPrintModal
        isOpen={isPrintModalOpen}
        booking={booking}
        totalDiscount={totalDiscount}
        daysDiscounts={daysDiscounts}
        discountReason={discountReason}
        company={company}
        accounts={accounts}
        currencies={currencies}
        currentUser={currentUser}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </>
  );
}
