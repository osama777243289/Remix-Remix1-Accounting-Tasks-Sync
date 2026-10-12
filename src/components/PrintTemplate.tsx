import React from 'react';
import { CompanySettings } from '../types';
import { Phone, Mail, Globe, MapPin } from 'lucide-react';

interface PrintTemplateProps {
  company: CompanySettings | null;
  title: string;
  children: React.ReactNode;
  documentNumber?: string;
  manualNumber?: string;
  documentLabel?: string;
  bookingNumber?: string;
  date?: string;
  createdBy?: string;
  createdAt?: string;
}

export default function PrintTemplate({ company, title, children, documentNumber, manualNumber, documentLabel = "رقم المستند:", bookingNumber, date, createdBy, createdAt }: PrintTemplateProps) {
  return (
    <div className="print-area-wrapper print-area bg-white p-2 sm:p-3 text-slate-900 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start mb-2 print:mb-1">
        {/* Right: Company Branding */}
        <div className="flex items-center gap-3 text-right">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">{company?.name || 'قاعة الزين الكبرى'}</h1>
            <p className="text-[10px] sm:text-[11px] font-extrabold text-slate-500 mt-0.5 tracking-wide">{company?.notes || 'رؤية جديدة في التميز والدقة'}</p>
          </div>
          {company?.logo && (
            <img src={company.logo} alt="Logo" className="h-12 w-12 sm:h-14 sm:w-14 object-contain bg-black p-1 rounded-sm" />
          )}
        </div>

        {/* Left Card: Document Info */}
        <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm min-w-[170px]">
          <h2 className="text-base sm:text-lg font-black text-slate-900 mb-0.5">{title}</h2>
          <div className="space-y-0.5">
            {documentNumber && (
              <p className="text-[9px] sm:text-[10px] font-black text-slate-700">
                {documentLabel} <span className="font-mono text-indigo-600 ml-1">{documentNumber}</span>
              </p>
            )}
            {manualNumber && (
              <p className="text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                رقم السند اليدوي: <span className="font-mono text-emerald-800 ml-1 font-bold">{manualNumber}</span>
              </p>
            )}
            {bookingNumber && (
              <p className="text-[9px] sm:text-[10px] font-black text-slate-700">
                رقم الحجز: <span className="font-mono text-indigo-600 ml-1">{bookingNumber}</span>
              </p>
            )}
            {date && (
              <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-500">التاريخ: {date}</p>
            )}
            {createdAt && (
              <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-500">وقت التسجيل: <span className="font-mono ml-1">{new Date(createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span></p>
            )}
            {createdBy && (
              <p className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-500">المستخدم: {createdBy}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-0.5">
        {children}
      </div>

      {/* Footer Area */}
      <div className="mt-2 print:mt-1">
        {/* Contact Info Bar */}
        <div className="flex flex-col items-end text-[9px] sm:text-[10px] font-bold text-slate-700 space-y-0.5 mb-2 print:mb-1">
          {company?.phone && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-950" dir="ltr">{company.phone}</span>
              <Phone className="h-3.5 w-3.5 text-slate-900" />
            </div>
          )}
          {company?.address && (
            <div className="flex items-center gap-2">
              <span className="text-slate-950">{company.address}</span>
              <MapPin className="h-3.5 w-3.5 text-slate-900" />
            </div>
          )}
        </div>

        {/* Signatures and Stamp */}
        <div className="flex justify-between items-end gap-6 px-4 relative mb-1 print:mb-1">
          {/* Receiver Signature */}
          <div className="text-center flex-1">
            <div className="border-b border-dashed border-slate-400 mb-1.5 w-full"></div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-600">توقيع المستلم / العميل</p>
          </div>
          
          {/* Central Stamp Area */}
          <div className="flex flex-col items-center justify-center relative w-20 h-20 print:w-16 print:h-16">
             <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center border-2 border-slate-200 rounded-full border-dashed opacity-10 absolute -top-6">
               <span className="text-[7.5px] sm:text-[8px] font-black rotate-[-15deg] uppercase text-center text-slate-400 leading-tight">
                 STAMP HERE<br/>ختم المؤسسة
               </span>
             </div>
          </div>

          {/* Officer Signature */}
          <div className="text-center flex-1">
            <div className="border-b border-dashed border-slate-400 mb-1.5 w-full"></div>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-600">توقيع الموظف المسؤول</p>
          </div>
        </div>

        {/* System Line */}
        <div className="text-center border-t border-slate-100 pt-1.5">
          <p className="text-[8px] sm:text-[8.5px] text-slate-400 font-bold tracking-widest">نظام "إتقان المحاسبي" لإدارة القاعات والفعاليات - تم التصدير إلكترونياً</p>
        </div>
      </div>

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
            background: white !important;
            z-index: 9999999 !important;
          }
          .print-area {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 0.95em !important;
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

