import React from 'react';
import { motion } from 'motion/react';
import { Link, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Account, LinkedAccounts } from '../types';

interface AccountsLinkingProps {
  accounts: Account[];
  onSave: (data: any) => Promise<void>;
  linkedAccounts: LinkedAccounts | null;
  companySettings?: any;
}

export default function AccountsLinking({ accounts, onSave, linkedAccounts, companySettings }: AccountsLinkingProps) {
  const [formData, setFormData] = React.useState<any>(() => {
    const lSettings = linkedAccounts || ({} as any);
    const cSettings = companySettings || {};
    return {
      preEventRevenueAccountId: lSettings.preEventRevenueAccountId || cSettings.preEventRevenueAccountId || '40101',
      postEventRevenueAccountId: lSettings.postEventRevenueAccountId || cSettings.postEventRevenueAccountId || '40101',
      discountAccountId: lSettings.discountAccountId || cSettings.discountAccountId || '40103',
      accountsReceivableId: lSettings.accountsReceivableId || cSettings.accountsReceivableId || '1010301',
      guaranteeAccountId: lSettings.guaranteeAccountId || cSettings.guaranteeAccountId || '2010202',
      bookingMortgageAccountId: lSettings.bookingMortgageAccountId || cSettings.bookingMortgageAccountId || '2010203',
      cashBankAccountId: lSettings.cashBankAccountId || cSettings.defaultCashAccountId || cSettings.cashBankAccountId || '1010101',
      hallRevenueAccountId: lSettings.hallRevenueAccountId || '40101',
      servicesRevenueAccountId: lSettings.servicesRevenueAccountId || '40102',
      finesAccountId: lSettings.finesAccountId || '40104',
    };
  });

  const hasInitialized = React.useRef(false);

  React.useEffect(() => {
    if (linkedAccounts || companySettings) {
      const lSettings = linkedAccounts || ({} as any);
      const cSettings = companySettings || {};
      const hasSomeData = lSettings.preEventRevenueAccountId || lSettings.cashBankAccountId || cSettings.preEventRevenueAccountId || cSettings.defaultCashAccountId;
      
      if (hasSomeData && !hasInitialized.current) {
        setFormData({
          preEventRevenueAccountId: lSettings.preEventRevenueAccountId || cSettings.preEventRevenueAccountId || '40101',
          postEventRevenueAccountId: lSettings.postEventRevenueAccountId || cSettings.postEventRevenueAccountId || '40101',
          discountAccountId: lSettings.discountAccountId || cSettings.discountAccountId || '40103',
          accountsReceivableId: lSettings.accountsReceivableId || cSettings.accountsReceivableId || '1010301',
          guaranteeAccountId: lSettings.guaranteeAccountId || cSettings.guaranteeAccountId || '2010202',
          bookingMortgageAccountId: lSettings.bookingMortgageAccountId || cSettings.bookingMortgageAccountId || '2010203',
          cashBankAccountId: lSettings.cashBankAccountId || cSettings.defaultCashAccountId || cSettings.cashBankAccountId || '1010101',
          hallRevenueAccountId: lSettings.hallRevenueAccountId || '40101',
          servicesRevenueAccountId: lSettings.servicesRevenueAccountId || '40102',
          finesAccountId: lSettings.finesAccountId || '40104',
        });
        hasInitialized.current = true;
      }
    }
  }, [linkedAccounts, companySettings]);

  const handleSave = async () => {
    try {
      await onSave(formData);
      toast.success('تم حفظ ربط الحسابات بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const sections = [
    {
      title: 'الحجوزات',
      items: [
        { label: 'إيرادات ما قبل الفعالية', key: 'preEventRevenueAccountId' },
        { label: 'إيرادات ما بعد الفعالية', key: 'postEventRevenueAccountId' },
        { label: 'الخصومات', key: 'discountAccountId' },
        { label: 'حساب العملاء (الحجوزات)', key: 'accountsReceivableId' },
        { label: 'حساب إيرادات إيجار القاعات', key: 'hallRevenueAccountId' },
        { label: 'حساب إيرادات الخدمات الإضافية', key: 'servicesRevenueAccountId' },
        { label: 'حساب الأمانات والتأمينات (التأمين)', key: 'guaranteeAccountId' },
        { label: 'حساب الرهونات النقدية (الرهن المالي)', key: 'bookingMortgageAccountId' },
        { label: 'حساب الصندوق / البنك (للاستلام الفوري)', key: 'cashBankAccountId' },
        { label: 'حساب الغرامات والجزاءات (إلغاء الحجز)', key: 'finesAccountId' },
      ]
    },
  ];

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <Link className="h-8 w-8 text-indigo-500" />
          ربط الحسابات المحاسبية
        </h2>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 text-white font-black py-3 px-6 rounded-xl hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          حفظ الإعدادات
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map(section => (
          <div key={section.title} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              {section.title}
            </h3>
            {section.items.map(item => (
              <div key={item.key}>
                <label className="text-xs font-bold text-slate-500 block mb-1">{item.label}</label>
                <select
                  value={formData[item.key] || ''}
                  onChange={e => setFormData(p => ({ ...p, [item.key]: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">اختر حساباً...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
