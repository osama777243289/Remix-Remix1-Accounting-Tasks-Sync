import React from "react";
import { Booking, CompanySettings, Hall } from "../types";
import { getBookingAllDates } from "./HallsManagement";

interface OfficialLeaseAgreementPrintProps {
  booking: Booking;
  company?: CompanySettings | null;
  documentNumber?: string;
  hall?: Hall | null;
}

export default function OfficialLeaseAgreementPrint({
  booking,
  company,
  documentNumber,
  hall,
}: OfficialLeaseAgreementPrintProps) {
  // Format Date for header
  const rawDate = booking.voucherDate || booking.createdAt || new Date().toISOString();
  const dateObj = new Date(rawDate);
  const formattedDate = !isNaN(dateObj.getTime())
    ? `${dateObj.getDate()} / ${dateObj.getMonth() + 1} / ${dateObj.getFullYear()} م`
    : "";

  // Serial Number in Red (e.g. 0099 or booking sequence code)
  const serialNo = (() => {
    if (booking.manualNumber) return booking.manualNumber;
    if (documentNumber) return documentNumber.replace(/\D/g, "").slice(-4) || documentNumber;
    const seq = (booking as any).sequenceCode || booking.id || "";
    const cleanDigits = seq.replace(/\D/g, "");
    if (cleanDigits.length > 0) {
      return cleanDigits.slice(-4).padStart(4, "0");
    }
    return "0099";
  })();

  // Multi-day & single day handling
  const allDates = getBookingAllDates(booking);
  const datesText =
    allDates.length > 1
      ? `${allDates.join(" ، ")} (لمدة ${allDates.length} أيام)`
      : allDates.length === 1
      ? allDates[0]
      : booking.eventDate || "غير محدد";

  // Financial values
  const totalPrice = Number(booking.totalPrice) || 0;
  const paidDeposit = Number(booking.paidAmount) || 0;
  const subsequentPayments = Number(booking.subsequentPayments) || 0;
  const totalPaid = paidDeposit + subsequentPayments;
  const remainingAmount = Math.max(0, totalPrice - totalPaid);
  const insurance = Number(booking.insuranceAmount) || 100000;

  // Matching standard package in the official table with hall custom prices
  const eventTypeStr = (booking.eventType || "").trim().toLowerCase();
  
  const hallPricesMap = new Map<string, number>();
  if (hall?.eventPrices) {
    hall.eventPrices.forEach(ep => {
      hallPricesMap.set(ep.eventType.trim(), ep.price);
    });
  }

  const standardPackages = [
    { 
      id: "lunch_afternoon", 
      name: "غداء ومقيل", 
      price: hallPricesMap.get("غداء ومقيل") ?? 650000, 
      keywords: ["غداء ومقيل", "غدا ومقيل", "غداء"] 
    },
    { 
      id: "afternoon_evening", 
      name: "مقيل وسمر", 
      price: hallPricesMap.get("مقيل وسمر") ?? 500000, 
      keywords: ["مقيل وسمر", "مقيل وسهرة", "سمر"] 
    },
    { 
      id: "women_wedding", 
      name: "عرس بنت", 
      price: hallPricesMap.get("عرس بنت") ?? 450000, 
      keywords: ["عرس بنت", "نساء", "حناء", "عروسة"] 
    },
    { 
      id: "full_day", 
      name: "غداء ومقيل وسمر", 
      price: hallPricesMap.get("غداء ومقيل وسمر") ?? 750000, 
      keywords: ["غداء ومقيل وسمر", "يوم كامل"] 
    },
    { 
      id: "party", 
      name: "إحتفالات", 
      price: hallPricesMap.get("إحتفالات") ?? 450000, 
      keywords: ["احتفال", "إحتفال", "احتفالات", "إحتفالات", "تخرج", "ندوة", "مؤتمر"] 
    },
  ];

  // Selected events with their dates and prices for display (only selected events appear)
  const selectedEventRows = (() => {
    if (booking.days && booking.days.length > 0) {
      return booking.days.map((day, idx) => {
        const evName = (day.eventType || booking.eventType || "مناسبة خاصة").trim();
        const hallPrice = hallPricesMap.get(evName);
        const resolvedRowPrice =
          Number(day.price) > 0
            ? Number(day.price)
            : hallPrice || (totalPrice > 0 ? Math.round(totalPrice / booking.days.length) : 0);

        return {
          id: `day_${idx}_${day.date}`,
          name: evName,
          date: day.date,
          price: resolvedRowPrice,
        };
      });
    }

    if (allDates && allDates.length > 0) {
      return allDates.map((d, idx) => {
        const evName = (booking.eventType || "مناسبة خاصة").trim();
        const hallPrice = hallPricesMap.get(evName);
        const resolvedRowPrice =
          hallPrice || (totalPrice > 0 ? Math.round(totalPrice / allDates.length) : 0);
        return {
          id: `date_${idx}_${d}`,
          name: evName,
          date: d,
          price: resolvedRowPrice,
        };
      });
    }

    return [
      {
        id: "single",
        name: (booking.eventType || "مناسبة خاصة").trim(),
        date: booking.eventDate || datesText || "غير محدد",
        price: totalPrice,
      },
    ];
  })();

  return (
    <div className="print-area-wrapper print-area bg-white text-slate-900 font-sans select-text p-2 sm:p-4 max-w-4xl mx-auto" dir="rtl">
      {/* Container simulating official paper contract */}
      <div className="border border-slate-900/60 p-4 sm:p-6 rounded-lg bg-white relative">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
          
          {/* Right: Hall Information */}
          <div className="w-1/3 text-right space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
              {company?.name || hall?.name || "قاعة الزين الكبرى"}
            </h1>
            <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
              {company?.address || hall?.location || "إب - شارع الثلاثين - النجح"}
            </p>
            <p className="text-[11px] sm:text-xs font-bold text-slate-700 leading-tight">
              جوار خرسانة بن مروان
            </p>
            <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight pt-0.5" dir="ltr">
              تلفون ( 846657 - 770998820 )
            </p>
          </div>

          {/* Center: Logo & Contract Badge */}
          <div className="w-1/3 flex flex-col items-center justify-center text-center">
            {/* Zain Decorative Logo */}
            <div className="flex flex-col items-center mb-1">
              {company?.logo ? (
                <img
                  src={company.logo}
                  alt="Zain Logo"
                  className="h-12 w-auto object-contain max-w-[130px]"
                />
              ) : (
                <div className="flex flex-col items-center">
                  {/* Stylized SVG crown and calligraphy */}
                  <svg
                    className="w-12 h-9 text-slate-900"
                    viewBox="0 0 100 65"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M50 8 L60 28 L82 15 L73 44 L27 44 L18 15 L40 28 Z" strokeLinejoin="round" />
                    <circle cx="50" cy="7" r="3.5" fill="currentColor" />
                    <circle cx="82" cy="14" r="3.5" fill="currentColor" />
                    <circle cx="18" cy="14" r="3.5" fill="currentColor" />
                    <path d="M22 52 C35 48, 65 48, 78 52" strokeLinecap="round" />
                    <path d="M15 58 C35 55, 65 55, 85 58" strokeLinecap="round" />
                  </svg>
                  <span className="text-[13px] font-black tracking-widest text-slate-950 font-serif -mt-1">
                    zain
                  </span>
                  <span className="text-[9px] font-bold text-slate-700 -mt-0.5">
                    قاعة الزين الكبرى
                  </span>
                </div>
              )}
            </div>

            {/* Contract Title Oval Badge */}
            <div className="border-2 border-slate-950 rounded-full px-5 py-0.5 mt-1 bg-slate-50/50">
              <span className="text-sm sm:text-base font-black text-slate-950 tracking-wider">
                عقد إتفاق إيجار
              </span>
            </div>
          </div>

          {/* Left: Date & Red Serial Numbers (Automated above Manual) */}
          <div className="w-1/3 text-left flex flex-col items-end justify-between self-stretch">
            <div className="text-[11px] sm:text-xs font-bold text-slate-800" dir="rtl">
              <span className="ml-1">التاريخ:</span>
              <span className="font-mono font-bold">{formattedDate || "  /   /  202 م"}</span>
            </div>
            
            {/* Serial Numbers Stamp in RED: Automated sequence code above, Manual number below */}
            <div className="mt-2 text-center space-y-0.5" dir="ltr">
              <div className="text-sm sm:text-base font-black font-mono tracking-wider text-red-600 drop-shadow-sm select-all">
                {booking.sequenceCode ? `الآلي: ${booking.sequenceCode}` : `الآلي: BOK-${serialNo}`}
              </div>
              {booking.manualNumber ? (
                <div className="text-[11px] sm:text-xs font-bold font-mono tracking-wider text-slate-700">
                  يدوي: {booking.manualNumber}
                </div>
              ) : documentNumber && documentNumber !== serialNo ? (
                <div className="text-[11px] sm:text-xs font-bold font-mono tracking-wider text-slate-700">
                  يدوي: {documentNumber}
                </div>
              ) : null}
            </div>
          </div>

        </div>

        {/* ================= PARTIES DETAILS ================= */}
        <div className="text-xs sm:text-[13px] font-bold text-slate-900 leading-relaxed mb-3 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>تم الإتفاق بين كلاً من</span>
            <span className="font-black underline decoration-slate-400 underline-offset-4">الطرف الأول / قاعة الزين الكبرى</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span>والطرف الثاني المستأجر/</span>
            <span className="font-black text-slate-950 underline decoration-slate-950 underline-offset-4 px-2 py-0.5 bg-slate-100 rounded text-sm">
              {booking.customerName || "................................................"}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span>يحمل بطاقة برقم (</span>
            <span className="font-mono font-black text-slate-950 underline decoration-slate-400 underline-offset-2 w-24 inline-block text-center">
              {booking.customerIdNumber || "........"}
            </span>
            <span>)</span>
            {booking.customerPhone && (
              <span className="text-[11px] font-normal text-slate-700 mr-2">
                - هاتف: <span className="font-mono font-bold text-slate-900" dir="ltr">{booking.customerPhone}</span>
              </span>
            )}
          </div>

          <div className="font-black pt-1">
            <span>على التالي :-</span>
          </div>
        </div>

        {/* ================= CLAUSES 1 & 2 ================= */}
        <div className="space-y-2 text-[11px] sm:text-xs font-bold text-slate-900 leading-relaxed">
          {/* Clause 1 */}
          <div className="flex items-start gap-1">
            <span className="font-black shrink-0">١ -</span>
            <div className="flex-1">
              <span>يستأجر الطرف الثاني من الطرف الأول القاعة لمدة بتاريخ</span>
              <span className="font-black text-slate-950 underline decoration-slate-900 underline-offset-4 mx-2 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono text-[11.5px]">
                {datesText}
              </span>
              <span>م</span>
            </div>
          </div>

          {/* Clause 2 & Table */}
          <div className="space-y-1.5">
            <div className="flex items-start gap-1">
              <span className="font-black shrink-0">٢ -</span>
              <span>نوع المناسبة بحسب المبلغ المحدد أدناه :</span>
            </div>

            {/* Package / Event Type Pricing Table - ONLY SELECTED EVENTS WITH DATE COLUMN */}
            <div className="w-full max-w-xl mx-auto my-1.5 overflow-hidden border-2 border-slate-900 rounded-md">
              <table className="w-full text-center border-collapse text-[11px] sm:text-xs font-bold">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900">
                    <th className="py-1.5 px-2 border-l-2 border-slate-900 w-12 text-center">اختيار</th>
                    <th className="py-1.5 px-3 border-l-2 border-slate-900 text-right">نوع المناسبة</th>
                    <th className="py-1.5 px-3 border-l-2 border-slate-900 text-center w-36">تاريخ الفعالية</th>
                    <th className="py-1.5 px-3 text-center w-32">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEventRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-800 bg-amber-100/70 font-black text-slate-950"
                    >
                      <td className="py-1.5 px-2 border-l-2 border-slate-900 text-center text-emerald-700 font-extrabold text-lg">
                        ✓
                      </td>
                      <td className="py-1.5 px-3 border-l-2 border-slate-900 text-right font-black">
                        {row.name}
                      </td>
                      <td className="py-1.5 px-3 border-l-2 border-slate-900 text-center font-mono font-bold text-[11.5px]" dir="ltr">
                        {row.date}
                      </td>
                      <td className="py-1.5 px-3 text-center font-mono font-bold text-[11.5px]" dir="ltr">
                        {row.price.toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Bar - Hidden on print, shown on preview */}
            <div className="bg-slate-50 p-2 rounded border border-slate-300 max-w-xl mx-auto flex items-center justify-between text-[11px] font-bold text-slate-900 print:hidden">
              <div>
                <span>المبلغ المتفق عليه: </span>
                <span className="font-mono font-black text-slate-950" dir="ltr">{totalPrice.toLocaleString("en-US")} ريال</span>
              </div>
              <div className="border-r border-slate-300 pr-2">
                <span>العربون المسلم: </span>
                <span className="font-mono font-black text-emerald-700" dir="ltr">{paidDeposit.toLocaleString("en-US")} ريال</span>
              </div>
              <div className="border-r border-slate-300 pr-2">
                <span>المتبقي: </span>
                <span className="font-mono font-black text-rose-700" dir="ltr">{remainingAmount.toLocaleString("en-US")} ريال</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= CLAUSES 3 TO 13 ================= */}
        <div className="mt-2.5 space-y-1.5 text-[11px] sm:text-[12px] font-bold text-slate-900 leading-[1.45] text-justify">
          <p>
            <span className="font-black">٣ - </span>
            يستلم الطرف الأول من الطرف الثاني عربون عند الحجز بمبلغ 100,000 ريال عن كل يوم حجز، ويتم أخذ سند مختوم من الإدارة بالمبلغ المسلم، وبقية المبلغ يسدد قبل موعد المناسبة بيومين كحد أقصى.
          </p>

          <p>
            <span className="font-black">٤ - </span>
            يلتزم الطرف الثاني كاملاً بالمحافظة على أثاث ومستلزمات القاعة من أي حرق أو تمزيق أو فقدان، ويتحمل قيمة ما يتم تلفه.
          </p>

          <p>
            <span className="font-black">٥ - </span>
            الطرف الأول غير مسئول عن فقدان الطرف الثاني أي شيء داخل القاعة.
          </p>

          <p>
            <span className="font-black">٦ - </span>
            تمنع إدارة القاعة منعاً باتاً إحضار الأطفال بأي شكل، كما تمنع اصطحاب واستخدام الهواتف المحمولة أثناء الفعاليات النسائية.
          </p>

          <p>
            <span className="font-black">٧ - </span>
            يمنع استخدام البخاخات والألعاب النارية بالقاعة.
          </p>

          <p>
            <span className="font-black">٨ - </span>
            يمنع إدخال السلاح إلى القاعة.
          </p>

          <p>
            <span className="font-black">٩ - </span>
            يمنع إطلاق النار جوار القاعة، ويعتبر الطرف الثاني المسؤول الأول أمام الجهات المختصة.
          </p>

          <p>
            <span className="font-black">١٠ - </span>
            يبدأ موعد فعاليات الرجال تمام الساعة الثانية ظهراً، على أن ينتهي تمام الساعة الثانية عشرة ليلاً، ويتحمل الطرف الثاني المسؤولية الكاملة والقانونية أمام الجهات المعنية عن أي تأخير في الموعد.
          </p>

          <p>
            <span className="font-black">١١ - </span>
            يبدأ موعد فعاليات النساء تمام الساعة الثانية ظهراً، على أن ينتهي مساءً تمام الساعة التاسعة، ويتحمل الطرف الثاني المسؤولية الكاملة والقانونية أمام الجهات المعنية عن أي تأخير في الموعد.
          </p>

          <p>
            <span className="font-black">١٢ - </span>
            في حالة إلغاء أو تغيير موعد الحجز، يتم إبلاغ الطرف الأول قبل الموعد الأصلي بـ 15 يوماً، وما لم يتم ذلك فيتحمل المستأجر كامل المسؤولية، ويعتبر العقد ساري المفعول.
          </p>

          <p>
            <span className="font-black">١٣ - </span>
            في حالة اتفق الطرفان بالتراضي على تغيير أي بند من بنود هذا العقد فإنه يتم عمل عقد جديد بتاريخ الإتفاق ويعتبر السابق ملغياً وغير قانونياً بموجب العقد الجديد.
          </p>
        </div>

        {/* ================= SIGNATURES FOOTER ================= */}
        <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-start justify-between text-xs sm:text-[13px] font-black text-slate-950">
          {/* First Party (Hall) */}
          <div className="text-right w-1/2 space-y-3">
            <div>الطرف الأول (قاعة الزين الكبرى)</div>
            <div className="text-slate-500 font-normal text-[11px]">
              التوقيع / الختم: ......................................................
            </div>
          </div>

          {/* Second Party (Customer) */}
          <div className="text-left w-1/2 space-y-3">
            <div>الطرف الثاني (المستأجر)</div>
            <div className="text-slate-500 font-normal text-[11px]" dir="rtl">
              التوقيع: ......................................................
            </div>
          </div>
        </div>

      </div>

      {/* Embedded Print CSS to guarantee standard 1-page A4 layout with exact colors and borders */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 6mm 8mm; 
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
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
            z-index: 9999999 !important;
          }
          .print-area {
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            font-size: 11px !important;
            color: black !important;
            background: white !important;
          }
          .print-area table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
        }
      `}} />
    </div>
  );
}
