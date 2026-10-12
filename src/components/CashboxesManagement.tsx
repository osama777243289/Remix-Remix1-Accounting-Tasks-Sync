import React from 'react';
import { motion } from 'motion/react';
import { Wallet, Landmark, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Account } from '../types';

interface CashboxesManagementProps {
  accounts: Account[];
}

export default function CashboxesManagement({ accounts }: CashboxesManagementProps) {
  const cashboxes = accounts.filter(a => a.type === 'asset' && a.isTransactional && (a.name.includes('صندوق') || a.name.includes('Cash') || a.name.includes('بنك') || a.name.includes('Bank')));

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Wallet className="h-8 w-8 text-emerald-500" />
            إدارة الصناديق والحسابات البنكية
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">مراقبة السيولة النقدية والأرصدة اللحظية</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cashboxes.map((box) => (
          <motion.div 
            key={box.id}
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              {box.name.includes('بنك') ? <Landmark className="h-24 w-24" /> : <Wallet className="h-24 w-24" />}
            </div>

            <div className="flex justify-between items-start mb-8 relative">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${box.name.includes('بنك') ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                {box.name.includes('بنك') ? <Landmark className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">الكود: {box.code}</span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">{box.name}</h3>
              </div>
            </div>

            <div className="space-y-4 relative">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">الرصيد الحالي</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${box.balance < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                    {box.balance.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{box.currency}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                  <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 mb-1">
                    <TrendingUp className="h-3 w-3" />
                    المقبوضات
                  </div>
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300">0.00</div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/10 p-2 rounded-xl border border-rose-100/50 dark:border-rose-900/30">
                  <div className="flex items-center gap-1 text-[9px] font-black text-rose-600 mb-1">
                    <TrendingDown className="h-3 w-3" />
                    المصروفات
                  </div>
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300">0.00</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2 relative">
              <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-600 dark:text-slate-400 text-[10px] font-black py-2 rounded-xl transition-all">
                <ArrowDownLeft className="h-3 w-3" />
                عملية إيداع
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-400 text-[10px] font-black py-2 rounded-xl transition-all">
                <ArrowUpRight className="h-3 w-3" />
                سحب نقدي
              </button>
            </div>
          </motion.div>
        ))}

        {cashboxes.length === 0 && (
          <div className="col-span-full py-24 text-center">
             <div className="inline-flex w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4">
                <Wallet className="h-10 w-10 text-slate-300" />
             </div>
             <p className="text-slate-400 font-bold">لم يتم تعريف صناديق أو بنوك في شجرة الحسابات</p>
          </div>
        )}
      </div>
    </div>
  );
}
