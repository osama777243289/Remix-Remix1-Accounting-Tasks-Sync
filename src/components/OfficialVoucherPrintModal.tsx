import React, { useState } from 'react';
import { X, Printer, Receipt } from 'lucide-react';
import { ReceiptPayment, Booking, Account, Currency, CompanySettings } from '../types';
import { tafqeet } from '../utils/tafqeet';

interface OfficialVoucherPrintModalProps {
  voucher?: ReceiptPayment | null;
  booking?: Booking | null;
  company?: CompanySettings | null;
  accounts?: Account[];
  currencies?: Currency[];
  currentUser?: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function OfficialVoucherPrintModal({
  voucher,
  booking,
  company,
  accounts = [],
  currencies = [],
  currentUser,
  isOpen,
  onClose
}: OfficialVoucherPrintModalProps) {
  if (!isOpen) return null;

  const isReceipt = voucher ? voucher.type === 'receipt' : true;
  const docNumber = voucher?.sequenceCode || voucher?.manualNumber || voucher?.id?.slice(-6)?.toUpperCase() || booking?.sequenceCode || "0001";
  const manualNumber = voucher?.manualNumber || booking?.manualNumber || "";
  
  const rawDate = voucher?.voucherDate || voucher?.date || (voucher as any)?.createdAt || new Date().toISOString().split('T')[0];
  const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
  
  const amount = Number(voucher?.amount ?? (voucher as any)?.totalAmount ?? booking?.paidAmount ?? 0);
  const currencyCode = voucher?.currency || booking?.currency || 'YER';
  
  // Resolve customer name
  const customerName = voucher?.customerName || booking?.customerName || '';
  
  // Resolve accounts
  const fromToAccount = accounts.find(a => a.id === voucher?.fromToAccountId);
  const cashBankAccount = accounts.find(a => a.id === voucher?.cashBankAccountId);
  
  // Payment method: cash vs transfer (تحويل)
  const isTransfer =
    (voucher as any)?.paymentMethod === 'transfer' ||
    (voucher as any)?.paymentMethod === 'bank' ||
    (voucher as any)?.paymentMethod === 'شيك' ||
    Boolean(
      cashBankAccount && (
        (cashBankAccount.type as any) === 'bank' ||
        cashBankAccount.name?.includes('بنك') ||
        cashBankAccount.name?.includes('تحويل') ||
        cashBankAccount.name?.includes('كريمي') ||
        cashBankAccount.name?.includes('حساب')
      )
    );

  // Booking Code & Dates resolution
  const bookingCode =
    booking?.sequenceCode ||
    booking?.manualNumber ||
    (booking?.id ? `#${booking.id.slice(-6).toUpperCase()}` : '') ||
    (voucher?.linkedBookingId ? `#${voucher.linkedBookingId.slice(-6).toUpperCase()}` : '') ||
    ((voucher as any)?.bookingId ? `#${(voucher as any).bookingId.slice(-6).toUpperCase()}` : '');

  const rawBookingDates: string[] = Array.from(
    new Set(
      (booking?.eventDates && booking.eventDates.length > 0)
        ? booking.eventDates
        : (booking?.days && booking.days.length > 0)
          ? booking.days.map((d: any) => d.date).filter(Boolean)
          : (booking as any)?.eventDate
            ? [(booking as any).eventDate]
            : []
    )
  );
  const bookingDatesStr = rawBookingDates.length > 0
    ? (rawBookingDates.length === 1 ? `تاريخ الحجز: ${rawBookingDates[0]}` : `أيام الحجز: ${rawBookingDates.join(' ، ')}`)
    : '';

  const bookingNotes = booking?.notes?.trim() || '';

  const baseDescription =
    voucher?.description ||
    voucher?.note ||
    (booking ? `سند قبض دفعة حجز صالة (${company?.name || 'قاعة الزين الكبرى'}) - العميل: ${customerName}` : 'حجز قاعة المناسبات والخدمات الملحقة');

  let resolvedDescription = baseDescription;
  const extraDetails: string[] = [];
  if (bookingCode && !resolvedDescription.includes(bookingCode)) {
    extraDetails.push(`حجز رقم: ${bookingCode}`);
  }
  if (bookingDatesStr && !rawBookingDates.some((d) => resolvedDescription.includes(d))) {
    extraDetails.push(bookingDatesStr);
  }
  if (bookingNotes && !resolvedDescription.includes(bookingNotes)) {
    extraDetails.push(`ملاحظات: ${bookingNotes}`);
  }

  if (extraDetails.length > 0) {
    resolvedDescription = `${resolvedDescription} | ${extraDetails.join(' | ')}`;
  }

  // User and Print Timestamp
  const printedByName =
    currentUser?.name ||
    currentUser?.username ||
    voucher?.createdBy ||
    (booking as any)?.createdBy ||
    'المسؤول المالي';

  const [printTimestamp] = useState(() => {
    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0];
    const timeFormatted = now.toLocaleTimeString('ar-YE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    return `${dateFormatted} - ${timeFormatted}`;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Header Controls - Hidden on Print */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                {isReceipt ? 'سند قبض رسمي - دفتر قاعة الزين الكبرى' : 'سند صرف رسمي - دفتر قاعة الزين الكبرى'}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                مقاس الطباعة: أعلى ورقة A4 (النصف العلوي من الصفحة A4) مطابق لدفتر القاعة الورقي
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              طباعة السند (أعلى الصفحة)
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body - Positioned at top of A4 page */}
        <div className="p-3 sm:p-6 overflow-y-auto bg-slate-100/50 dark:bg-slate-950/50 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div className="print-area-wrapper print-area w-full max-w-[190mm] border-2 border-slate-900 rounded-2xl p-4 sm:p-5 relative bg-white text-slate-900 select-text shadow-sm print:shadow-none print:rounded-xl print:p-4">
            
            {/* Header: Hall Info, Official Logo & Document Numbers */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2.5 mb-2.5">
              
              {/* Right: Hall Information */}
              <div className="w-1/3 text-right space-y-0.5">
                <h1 className="text-sm sm:text-base font-black text-slate-950 tracking-tight leading-tight">
                  {company?.name || "قاعة الزين الكبرى"}
                </h1>
                <p className="text-[9.5px] font-bold text-slate-700 leading-tight">
                  {company?.address || "إب - شارع الثلاثين - اللحج"}
                </p>
                <p className="text-[9px] font-bold text-slate-600 leading-tight">
                  جوار خرسانة بن مروان
                </p>
                <p className="text-[9px] font-bold text-slate-900 font-mono leading-tight pt-0.5" dir="ltr">
                  {company?.phone ? `تلفون: ${company.phone}` : "تلفون: 770998820 - 846657"}
                </p>
              </div>

              {/* Center: Official Zain Logo & Voucher Badge */}
              <div className="w-1/3 flex flex-col items-center justify-center text-center">
                {company?.logo ? (
                  <img
                    src={company.logo}
                    alt="Zain Logo"
                    className="h-10 w-auto object-contain max-w-[100px] mb-1 print:h-10 print:max-h-10 block"
                    style={{
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  />
                ) : (
                  <div 
                    className="official-zain-logo-box flex flex-col items-center justify-center mb-1 bg-black text-[#d4af37] px-3.5 py-1 rounded-lg border-2 border-[#d4af37] shadow-xs"
                    style={{
                      backgroundColor: '#000000',
                      color: '#d4af37',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <svg
                        className="w-7 h-4.5 text-[#d4af37]"
                        viewBox="0 0 100 65"
                        fill="none"
                        stroke="#d4af37"
                        strokeWidth="2.5"
                      >
                        <path d="M50 8 L60 28 L82 15 L73 44 L27 44 L18 15 L40 28 Z" strokeLinejoin="round" fill="#d4af37" />
                        <circle cx="50" cy="7" r="3.5" fill="#d4af37" />
                        <circle cx="82" cy="14" r="3.5" fill="#d4af37" />
                        <circle cx="18" cy="14" r="3.5" fill="#d4af37" />
                        <path d="M22 52 C35 48, 65 48, 78 52" strokeLinecap="round" />
                        <path d="M15 58 C35 55, 65 55, 85 58" strokeLinecap="round" />
                      </svg>
                      <span className="text-[10.5px] font-black tracking-widest text-[#d4af37] font-serif -mt-0.5 leading-none">
                        zain
                      </span>
                      <span className="text-[7.5px] font-black text-[#d4af37] tracking-wider leading-none mt-0.5">
                        قاعة الزين الكبرى
                      </span>
                    </div>
                  </div>
                )}
                <div 
                  className="border-2 border-slate-950 px-3 py-0.5 rounded-xl bg-slate-50 font-black text-xs text-slate-950 shadow-xs print:bg-slate-100"
                  style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  {isReceipt ? 'سـنـد قـبـض' : 'سـنـد صـرف'}
                </div>
              </div>

              {/* Left: Document Numbers & Amount Badge */}
              <div className="w-1/3 text-left space-y-0.5 flex flex-col items-end">
                <div className="text-[10px] font-bold text-slate-800">
                  التاريخ: <span className="font-mono font-black underline">{dateStr}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-800">
                  رقم السند: <span className="font-mono font-black text-rose-600 text-xs">#{docNumber}</span>
                </div>
                {manualNumber && (
                  <div 
                    className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300"
                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                  >
                    دفتري: <strong className="font-mono">{manualNumber}</strong>
                  </div>
                )}
                <div 
                  className="bg-slate-950 text-white px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-sm mt-0.5"
                  style={{
                    backgroundColor: '#020617',
                    color: '#ffffff',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  {amount.toLocaleString()} {currencyCode}
                </div>
              </div>
            </div>

            {/* Voucher Body Form Fields */}
            <div className="space-y-2 text-[11px] font-bold">
              
              {/* Row 1: Customer / Recipient Name */}
              <div className="flex items-center gap-2 border-b border-dashed border-slate-400 pb-1.5">
                <span className="text-slate-600 w-32 shrink-0">
                  {isReceipt ? 'استلمنا من الأخ / المحترم:' : 'يصرف للأخ / المحترم:'}
                </span>
                <span className="flex-1 font-black text-slate-950 text-xs sm:text-sm">
                  {customerName || fromToAccount?.name || '------------------------------------------------'}
                </span>
              </div>

              {/* Row 2: Amount in Words (Tafqeet) */}
              <div className="flex items-center gap-2 border-b border-dashed border-slate-400 pb-1.5">
                <span className="text-slate-600 w-32 shrink-0">مبلغ وقدره (كتابةً):</span>
                <span 
                  className="flex-1 font-black text-slate-900 text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200 print:bg-transparent print:border-none"
                  style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  {tafqeet(amount, currencyCode)}
                </span>
              </div>

              {/* Row 3: Payment Method */}
              <div className="flex items-center gap-2 border-b border-dashed border-slate-400 pb-1.5">
                <span className="text-slate-600 w-28 shrink-0 text-[10px]">طريقة السداد:</span>
                <div className="flex-1 flex items-center gap-5 text-slate-900 font-bold text-[10px]">
                  <label className="flex items-center gap-1.5">
                    <span 
                      className={`w-3.5 h-3.5 rounded-full border-2 border-slate-900 inline-block ${!isTransfer ? 'bg-slate-900' : 'bg-transparent'}`}
                      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    ></span>
                    <span>نقداً</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span 
                      className={`w-3.5 h-3.5 rounded-full border-2 border-slate-900 inline-block ${isTransfer ? 'bg-slate-900' : 'bg-transparent'}`}
                      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                    ></span>
                    <span>تحويل</span>
                  </label>
                  {cashBankAccount && (
                    <span className="text-slate-500 font-normal text-[9px]">
                      (<strong className="text-slate-800">{cashBankAccount.name}</strong>)
                    </span>
                  )}
                </div>
              </div>

              {/* Row 4: Reason / Description */}
              <div className="flex items-start gap-2 border-b border-dashed border-slate-400 pb-1.5 pt-0.5">
                <span className="text-slate-600 w-28 shrink-0 text-[10px] pt-0.5">وذلك مقابل:</span>
                <span className="flex-1 font-bold text-slate-900 text-[9.5px] leading-relaxed break-words">
                  {resolvedDescription}
                </span>
              </div>

              {/* If Multi-entry / booking details */}
              {voucher?.entries && voucher.entries.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-[9.5px]">
                  <p className="font-black text-slate-700 mb-0.5">تفاصيل البنود المتعددة:</p>
                  <div className="space-y-0.5">
                    {voucher.entries.map((entry: any, eIdx: number) => {
                      const acc = accounts.find(a => a.id === entry.accountId);
                      return (
                        <div key={eIdx} className="flex justify-between items-center border-b border-slate-200/60 pb-0.5">
                          <span>{acc?.name || 'حساب فرعي'}: {entry.description || ''}</span>
                          <span className="font-mono font-bold">{Number(entry.amount).toLocaleString()} {currencyCode}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Official Legal Terms / Instructions - ONLY for Receipt, Hidden for Payment */}
            {isReceipt && (
              <div 
                className="bg-slate-50 border border-slate-300 rounded-xl p-2 text-[8.5px] text-slate-800 font-bold space-y-0.5 mt-2"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <div className="flex items-center gap-1 text-slate-950 font-black">
                  <span>• ملاحظات وشروط رسمية هامة:</span>
                </div>
                <p>1. تأكيد الحجز يتم بمراجعة إدارة القاعة ودفع المبلغ المتبقي كاملاً قبل استخدام القاعة بخمسة أيام كحد أقصى.</p>
                <p>2. العربون المدفوع لا يُرد ولا يُنقل إلى موعد أو مناسبة أخرى إلا بموافقة خطية مسبقة من إدارة القاعة ووفقاً للائحة العقود والشروط المعتمدة.</p>
              </div>
            )}

            {/* Official Signatures Section - Receipt has 2 signatures (No client signature), Payment has 2 signatures */}
            <div className="grid grid-cols-2 pt-4 mt-3 border-t border-slate-300 text-center text-[10.5px] font-black">
              <div className="space-y-4">
                <p className="text-slate-700">{isReceipt ? 'أمين الصندوق / المحاسب' : 'المستلم / صاحب الصرف'}</p>
                <p className="font-mono text-slate-400">....................................</p>
              </div>
              <div className="space-y-4">
                <p className="text-slate-700">المدير المسؤول / الختم الرسمي</p>
                <p className="font-mono text-slate-400">....................................</p>
              </div>
            </div>

            {/* Bottom Footer Bar: User Name & Print Date and Time */}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-300 text-[8px] font-bold text-slate-600 print:text-slate-800">
              <div className="flex items-center gap-1">
                <span>طُبع بواسطة:</span>
                <strong className="text-slate-950 font-black">{printedByName}</strong>
              </div>
              <div className="flex items-center gap-1 font-mono" dir="ltr">
                <span>{printTimestamp}</span>
                <span className="font-sans">:تاريخ ووقت الطباعة</span>
              </div>
            </div>

            {/* Embedded Print CSS - Top Half of A4 Page (A4 Portrait) */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page { 
                  size: A4 portrait; 
                  margin: 6mm 10mm; 
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                html, body, #root, main {
                  position: static !important;
                  overflow: visible !important;
                  height: auto !important;
                  max-height: none !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                }
                body *:not(:has(.print-area-wrapper)):not(.print-area-wrapper):not(.print-area-wrapper *) {
                  display: none !important;
                }
                body * {
                  visibility: hidden !important;
                }
                .print-area-wrapper, .print-area-wrapper * {
                  visibility: visible !important;
                }
                .print-area-wrapper {
                  position: absolute !important;
                  left: 0 !important;
                  right: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 190mm !important;
                  height: auto !important;
                  margin: 0 auto !important;
                  padding: 12px 16px !important;
                  background: white !important;
                  z-index: 9999999 !important;
                  box-sizing: border-box !important;
                  page-break-after: avoid !important;
                  page-break-inside: avoid !important;
                  border-width: 2px !important;
                  border-color: #000000 !important;
                }
                .official-zain-logo-box {
                  background-color: #000000 !important;
                  color: #d4af37 !important;
                  border: 2px solid #d4af37 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `}} />

          </div>
        </div>

      </div>
    </div>
  );
}
