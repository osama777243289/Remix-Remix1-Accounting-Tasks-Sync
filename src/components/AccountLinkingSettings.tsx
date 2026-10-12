import React, { useState, useEffect } from 'react';
import { Account } from '../types';

interface AccountLinkingSettingsProps {
  accounts: Account[];
  onSave: (config: any) => void;
  currentConfig?: any | null;
}

export default function AccountLinkingSettings({ accounts, onSave, currentConfig }: AccountLinkingSettingsProps) {
  const [config, setConfig] = useState<any>(() => ({
    accountsReceivableId: currentConfig?.accountsReceivableId || '1010301',
    deferredRevenueId: currentConfig?.deferredRevenueId || '2010201',
    cashBankAccountId: currentConfig?.cashBankAccountId || '1010101',
    refundableDepositAccountId: currentConfig?.refundableDepositAccountId || '2010202',
    preEventRevenueAccountId: currentConfig?.preEventRevenueAccountId || '40101',
    guaranteeAccountId: currentConfig?.guaranteeAccountId || '2010202',
    bookingMortgageAccountId: currentConfig?.bookingMortgageAccountId || '2010203',
    depositCreditAccountId: currentConfig?.depositCreditAccountId || '1010301',
    insuranceCreditAccountId: currentConfig?.insuranceCreditAccountId || '2010202',
    insuranceDebitAccountId: currentConfig?.insuranceDebitAccountId || '2010202',
    mortgageCreditAccountId: currentConfig?.mortgageCreditAccountId || '2010203',
    mortgageDebitAccountId: currentConfig?.mortgageDebitAccountId || '2010203',
    finesAccountId: currentConfig?.finesAccountId || '40104',
    createdAt: new Date().toISOString(),
    ...(currentConfig || {})
  }));

  useEffect(() => {
    if (currentConfig) {
      setConfig((prev: any) => ({
        ...prev,
        ...currentConfig
      }));
    }
  }, [currentConfig]);

  const updateConfig = (key: string, value: string) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
      <div>
        <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2">
          ⚙️ إعدادات ربط الحسابات للحجوزات
        </h3>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
          قم بربط كل مبلغ من مبالغ الحجز بالحساب المحاسبي المناسب لتوليد السندات تلقائياً وترحيل القيود اليومية.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: General Accounts */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
            الحسابات العامة للنظام
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'ذمم العملاء (المدينين)', key: 'accountsReceivableId' },
              { label: 'إيراد مقدم (ربح مؤجل)', key: 'deferredRevenueId' },
            ].map(item => (
              <div key={item.key}>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-extrabold mb-1">{item.label}</label>
                <select 
                  value={config[item.key] || ""} 
                  onChange={(e) => updateConfig(item.key, e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-bold"
                >
                  <option value="">اختر حساباً...</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Booking Specific Fields (One field per booking amount!) */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
            ربط حقول مبالغ الحجوزات بالحسابات
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: '١. حساب سعر الحجز الإجمالي (مبلغ العقد)', key: 'preEventRevenueAccountId' },
              { label: '٢. حساب صندوق العربون (المبلغ المدفوع)', key: 'cashBankAccountId' },
              { label: '٣. حساب العربون - دائن (عند الحجز)', key: 'depositCreditAccountId' },
              { label: '٤. حساب أمانات التأمين - دائن (عند الحجز)', key: 'insuranceCreditAccountId' },
              { label: '٥. حساب رد التأمين - مدين (عند الإرجاع)', key: 'insuranceDebitAccountId' },
              { label: '٦. حساب الرهونات النقدية - دائن (عند الحجز)', key: 'mortgageCreditAccountId' },
              { label: '٧. حساب رد الرهن النقدي - مدين (عند الإرجاع)', key: 'mortgageDebitAccountId' },
              { label: '٨. حساب الغرامات والجزاءات - دائن (عند الإلغاء)', key: 'finesAccountId' },
            ].map(item => (
              <div key={item.key}>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-extrabold mb-1">{item.label}</label>
                <select 
                  value={config[item.key] || ""} 
                  onChange={(e) => updateConfig(item.key, e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-bold"
                >
                  <option value="">اختر حساباً...</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="button"
            onClick={() => onSave(config)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black p-2.5 px-6 rounded-xl text-xs transition cursor-pointer shadow-md shadow-indigo-600/10"
          >
            💾 حفظ إعدادات ربط الحسابات
          </button>
        </div>
      </div>
    </div>
  );
}
