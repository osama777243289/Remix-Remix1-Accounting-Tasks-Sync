import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Plus,
  Edit3,
  Trash2,
  Play,
  Check,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Info,
  CalendarDays,
} from "lucide-react";
import { RecurringJournalEntry, Account, Currency } from "../types";
import { toast } from "sonner";
import { usePermissions, PermissionGuard } from "../lib/permissions";

interface RecurringEntriesProps {
  recurringEntries: RecurringJournalEntry[];
  accounts: Account[];
  currencies: Currency[];
  onAddRecurringEntry: (entry: Omit<RecurringJournalEntry, "id" | "createdAt">) => Promise<string>;
  onUpdateRecurringEntry: (id: string, updates: Partial<RecurringJournalEntry>) => Promise<void>;
  onDeleteRecurringEntry: (id: string) => Promise<void>;
  onPostDoubleEntry: (txData: any) => Promise<string>;
}

export default function RecurringEntries({
  recurringEntries,
  accounts,
  currencies,
  onAddRecurringEntry,
  onUpdateRecurringEntry,
  onDeleteRecurringEntry,
  onPostDoubleEntry,
}: RecurringEntriesProps) {
  const { hasPermission } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RecurringJournalEntry | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [isMultiAccount, setIsMultiAccount] = useState(false);
  const [debitEntries, setDebitEntries] = useState<{ accountId: string; amount: number; description: string }[]>([
    { accountId: "", amount: 0, description: "" }
  ]);
  const [creditEntries, setCreditEntries] = useState<{ accountId: string; amount: number; description: string }[]>([
    { accountId: "", amount: 0, description: "" }
  ]);

  // Helper to pair multi-leg entries to standard double entries
  const pairMultiLegEntries = (
    debits: { accountId: string; amount: number; description?: string }[],
    credits: { accountId: string; amount: number; description?: string }[]
  ) => {
    const deb = debits.map(d => ({ ...d }));
    const cred = credits.map(c => ({ ...c }));
    
    const pairs: {
      debitAccountId: string;
      creditAccountId: string;
      amount: number;
      description: string;
    }[] = [];
    
    let debIdx = 0;
    let credIdx = 0;
    
    while (debIdx < deb.length && credIdx < cred.length) {
      const d = deb[debIdx];
      const c = cred[credIdx];
      
      if (d.amount <= 0) {
        debIdx++;
        continue;
      }
      if (c.amount <= 0) {
        credIdx++;
        continue;
      }
      
      const amountToPair = Math.min(d.amount, c.amount);
      
      const combinedDesc = [
        d.description || '',
        c.description || ''
      ].filter(Boolean).join(' | ');
      
      pairs.push({
        debitAccountId: d.accountId,
        creditAccountId: c.accountId,
        amount: amountToPair,
        description: combinedDesc
      });
      
      d.amount -= amountToPair;
      c.amount -= amountToPair;
      
      if (d.amount <= 0) debIdx++;
      if (c.amount <= 0) credIdx++;
    }
    
    return pairs;
  };

  const [formData, setFormData] = useState({
    title: "",
    debitAccountId: "",
    creditAccountId: "",
    amount: 0,
    currency: "YER",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    nextExecutionDate: new Date().toISOString().split("T")[0],
    description: "",
    isActive: true,
  });

  const transactionalAccounts = accounts.filter((a) => a.isTransactional);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMultiAccount) {
      if (!formData.title) {
        toast.error("يرجى تحديد عنوان القيد الدوري");
        return;
      }
      
      const invalidDeb = debitEntries.some(d => !d.accountId || d.amount <= 0);
      if (invalidDeb) {
        toast.error("يرجى ملء جميع الحسابات والمبالغ في الطرف المدين بقيم أكبر من الصفر");
        return;
      }
      
      const invalidCred = creditEntries.some(c => !c.accountId || c.amount <= 0);
      if (invalidCred) {
        toast.error("يرجى ملء جميع الحسابات والمبالغ في الطرف الدائن بقيم أكبر من الصفر");
        return;
      }
      
      const debitsSum = debitEntries.reduce((sum, d) => sum + d.amount, 0);
      const creditsSum = creditEntries.reduce((sum, c) => sum + c.amount, 0);
      if (Math.abs(debitsSum - creditsSum) > 0.01) {
        toast.error(`القيد غير متوازن! إجمالي المدين (${debitsSum}) يجب أن يساوي إجمالي الدائن (${creditsSum})`);
        return;
      }
    } else {
      if (!formData.title || !formData.debitAccountId || !formData.creditAccountId || formData.amount <= 0) {
        toast.error("يرجى ملء جميع الحقول المطلوبة وقيمة أكبر من الصفر");
        return;
      }

      if (formData.debitAccountId === formData.creditAccountId) {
        toast.error("لا يمكن لـ حساب المدين وحساب الدائن أن يكونا متطابقين");
        return;
      }
    }

    const selectedCurrency = currencies.find((c) => c.code === formData.currency) || { rateToBase: 1 };
    
    const entryData: any = {
      title: formData.title,
      currency: formData.currency,
      frequency: formData.frequency,
      nextExecutionDate: formData.nextExecutionDate,
      description: formData.description,
      isActive: formData.isActive,
      rate: selectedCurrency.rateToBase,
      isMultiAccount: isMultiAccount,
    };

    if (isMultiAccount) {
      const totalAmount = debitEntries.reduce((sum, d) => sum + d.amount, 0);
      entryData.amount = totalAmount;
      entryData.debitAccountId = debitEntries[0].accountId;
      entryData.creditAccountId = creditEntries[0].accountId;
      entryData.debitEntries = debitEntries;
      entryData.creditEntries = creditEntries;
    } else {
      entryData.amount = formData.amount;
      entryData.debitAccountId = formData.debitAccountId;
      entryData.creditAccountId = formData.creditAccountId;
      entryData.debitEntries = [];
      entryData.creditEntries = [];
    }

    try {
      if (editingEntry) {
        await onUpdateRecurringEntry(editingEntry.id, entryData);
        toast.success("تم تحديث القيد الدوري بنجاح");
      } else {
        await onAddRecurringEntry(entryData);
        toast.success("تم إضافة القيد الدوري بنجاح");
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error("حدث خطأ أثناء حفظ القيد الدوري");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      debitAccountId: "",
      creditAccountId: "",
      amount: 0,
      currency: "YER",
      frequency: "monthly",
      nextExecutionDate: new Date().toISOString().split("T")[0],
      description: "",
      isActive: true,
    });
    setIsMultiAccount(false);
    setDebitEntries([{ accountId: "", amount: 0, description: "" }]);
    setCreditEntries([{ accountId: "", amount: 0, description: "" }]);
    setEditingEntry(null);
  };

  const handleEdit = (entry: RecurringJournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      debitAccountId: entry.debitAccountId || "",
      creditAccountId: entry.creditAccountId || "",
      amount: entry.amount,
      currency: entry.currency,
      frequency: entry.frequency,
      nextExecutionDate: entry.nextExecutionDate,
      description: entry.description || "",
      isActive: entry.isActive,
    });
    setIsMultiAccount(!!entry.isMultiAccount);
    if (entry.isMultiAccount) {
      setDebitEntries(entry.debitEntries ? entry.debitEntries.map(d => ({ accountId: d.accountId, amount: d.amount, description: d.description || "" })) : []);
      setCreditEntries(entry.creditEntries ? entry.creditEntries.map(c => ({ accountId: c.accountId, amount: c.amount, description: c.description || "" })) : []);
    } else {
      setDebitEntries([{ accountId: entry.debitAccountId || "", amount: entry.amount, description: "" }]);
      setCreditEntries([{ accountId: entry.creditAccountId || "", amount: entry.amount, description: "" }]);
    }
    setShowModal(true);
  };

  // Run the recurring transaction
  const handleExecute = async (entry: RecurringJournalEntry) => {
    setProcessingId(entry.id);
    const selectedCurrency = currencies.find((c) => c.code === entry.currency) || { rateToBase: 1 };

    try {
      if (entry.isMultiAccount) {
        const debitsSum = (entry.debitEntries || []).reduce((acc, d) => acc + d.amount, 0);
        const creditsSum = (entry.creditEntries || []).reduce((acc, c) => acc + c.amount, 0);
        if (Math.abs(debitsSum - creditsSum) > 0.01) {
          throw new Error("لا يمكن ترحيل القيد لأن أطراف المدين والدائن غير متساوية");
        }

        const pairs = pairMultiLegEntries(entry.debitEntries || [], entry.creditEntries || []);
        if (pairs.length === 0) {
          throw new Error("لا توجد بنود صالحة للترحيل");
        }

        // Post each pair as a double entry
        let pairIndex = 0;
        for (const pair of pairs) {
          const txPayload = {
            date: new Date().toISOString().split("T")[0],
            description: `قيد ترحيل دوري (متعدد): ${entry.title} - ${pair.description || entry.description || "بدون بيان"}`,
            debitAccountId: pair.debitAccountId,
            creditAccountId: pair.creditAccountId,
            amount: pair.amount,
            currency: entry.currency,
            rate: selectedCurrency.rateToBase,
            sourceType: "payroll",
            sourceId: `recurring-${entry.id}-${Date.now()}-${pairIndex}`,
            status: "pending_audit",
          };
          await onPostDoubleEntry(txPayload);
          pairIndex++;
        }
      } else {
        // 1. Create Double Entry transaction
        const txPayload = {
          date: new Date().toISOString().split("T")[0],
          description: `قيد ترحيل دوري: ${entry.title} - ${entry.description || "بدون بيان"}`,
          debitAccountId: entry.debitAccountId,
          creditAccountId: entry.creditAccountId,
          amount: entry.amount,
          currency: entry.currency,
          rate: selectedCurrency.rateToBase,
          sourceType: "payroll", // Mark source as payroll/periodic for identification
          sourceId: `recurring-${entry.id}-${Date.now()}`,
          status: "pending_audit", // Auto route to CFO audit if CFO audit is enabled!
        };

        await onPostDoubleEntry(txPayload);
      }

      // 2. Calculate next run date
      const currentDate = new Date(entry.nextExecutionDate);
      if (entry.frequency === "daily") {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (entry.frequency === "weekly") {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (entry.frequency === "monthly") {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (entry.frequency === "yearly") {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }

      const nextRunStr = currentDate.toISOString().split("T")[0];

      // 3. Update entry last execution and next run
      await onUpdateRecurringEntry(entry.id, {
        lastExecutedAt: new Date().toISOString(),
        nextExecutionDate: nextRunStr,
      });

      toast.success(`تم ترحيل القيد الدوري "${entry.title}" بنجاح! القيد التالي في: ${nextRunStr}`);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء معالجة القيد");
    } finally {
      setProcessingId(null);
    }
  };

  const getFrequencyText = (freq: string) => {
    switch (freq) {
      case "daily":
        return "يومياً";
      case "weekly":
        return "أسبوعياً";
      case "monthly":
        return "شهرياً";
      case "yearly":
        return "سنوياً";
      default:
        return freq;
    }
  };

  const isDue = (nextRunDate: string) => {
    const today = new Date().toISOString().split("T")[0];
    return nextRunDate <= today;
  };

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Clock className="h-8 w-8 text-indigo-500" />
            إدارة القيود اليومية الدورية
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
            تحديد القوالب المحاسبية المتكررة دورياً كالإيجارات، الاشتراكات، الاستهلاكات، وترحيلها بنقرة واحدة
          </p>
        </div>

        <PermissionGuard permission="create-transaction">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm"
          >
            <Plus className="h-4 w-4" />
            إنشاء قالب قيد دوري
          </button>
        </PermissionGuard>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">إجمالي قوالب القيود</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {recurringEntries.length} قيد
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">القيود النشطة</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {recurringEntries.filter((e) => e.isActive).length} قالب نشط
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
            <AlertCircle className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400">القيود المستحقة اليوم</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {recurringEntries.filter((e) => e.isActive && isDue(e.nextExecutionDate)).length} مستحق للترحيل
            </div>
          </div>
        </div>
      </div>

      {/* Main entries list */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-800 dark:text-white">قائمة القيود الدورية والجدولة الزمنية</h3>
          <span className="text-xs font-bold text-slate-400">اضغط على زر ترحيل لإثبات القيد محاسبياً عند الاستحقاق</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recurringEntries.map((entry) => {
            const isEntryDue = entry.isActive && isDue(entry.nextExecutionDate);
            const debAcc = accounts.find((a) => a.id === entry.debitAccountId);
            const credAcc = accounts.find((a) => a.id === entry.creditAccountId);

            return (
              <div
                key={entry.id}
                className={`p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition ${
                  isEntryDue ? "bg-amber-50/20 dark:bg-amber-500/5 border-r-4 border-amber-500" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                }`}
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h4 className="text-base font-black text-slate-800 dark:text-white">{entry.title}</h4>
                    <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full">
                      تكرار: {getFrequencyText(entry.frequency)}
                    </span>
                    {!entry.isActive ? (
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                        متوقف مؤقتاً
                      </span>
                    ) : isEntryDue ? (
                      <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        مستحق التشغيل!
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        مجدول بانتظام
                      </span>
                    )}
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{entry.description || "لا يوجد وصف إضافي للقيد"}</p>

                  {entry.isMultiAccount ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span>الطرف المدين (من حساب) - متعدد:</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {entry.debitEntries?.map((deb, idx) => {
                            const acc = accounts.find(a => a.id === deb.accountId);
                            return (
                              <li key={idx} className="flex justify-between items-center gap-4 bg-white dark:bg-slate-850 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="font-bold">{acc ? `${acc.name} (${acc.code})` : deb.accountId}</span>
                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{deb.amount.toLocaleString()} {entry.currency}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-black text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span>الطرف الدائن (إلى حساب) - متعدد:</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {entry.creditEntries?.map((cred, idx) => {
                            const acc = accounts.find(a => a.id === cred.accountId);
                            return (
                              <li key={idx} className="flex justify-between items-center gap-4 bg-white dark:bg-slate-850 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="font-bold">{acc ? `${acc.name} (${acc.code})` : cred.accountId}</span>
                                <span className="font-mono font-black text-rose-600 dark:text-rose-400">{cred.amount.toLocaleString()} {entry.currency}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>المدين (من حساب):</span>
                        <span className="font-black text-slate-800 dark:text-white">
                          {debAcc ? `${debAcc.name} (${debAcc.code})` : entry.debitAccountId}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>الدائن (إلى حساب):</span>
                        <span className="font-black text-slate-800 dark:text-white">
                          {credAcc ? `${credAcc.name} (${credAcc.code})` : entry.creditAccountId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400">مبلغ المعاملة</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                      {entry.amount.toLocaleString()}
                      <span className="text-xs text-indigo-500 font-bold">{entry.currency}</span>
                    </div>
                  </div>

                  <div className="text-right lg:block hidden">
                    <div className="text-[10px] font-bold text-slate-400">تاريخ الاستحقاق القادم</div>
                    <div className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {entry.nextExecutionDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.isActive && (
                      <PermissionGuard permission="create-transaction">
                        <button
                          onClick={() => handleExecute(entry)}
                          disabled={processingId === entry.id}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            isEntryDue
                              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 active:scale-95"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                          }`}
                          title="ترحيل القيد محاسبياً وتحديث تاريخ الاستحقاق القادم"
                        >
                          {processingId === entry.id ? (
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                          )}
                          <span>ترحيل الآن</span>
                        </button>
                      </PermissionGuard>
                    )}

                    <PermissionGuard permission="edit-transaction">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition"
                        title="تعديل القالب"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="delete-transaction">
                      <button
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا القالب الدوري؟ لن يؤثر الحذف على القيود التي تم ترحيلها مسبقاً.")) {
                            onDeleteRecurringEntry(entry.id).then(() => toast.success("تم الحذف بنجاح"));
                          }
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition"
                        title="حذف القالب"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
              </div>
            );
          })}

          {recurringEntries.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-400">
              <CalendarDays className="h-16 w-16 text-slate-300 dark:text-slate-700" />
              <div className="font-bold text-sm">لا توجد قيود دورية مجدولة حالياً</div>
              <p className="text-xs text-slate-500 max-w-sm">
                قم بإنشاء قيود دورية لأمور كالإيجارات، الرواتب الشهرية، الاستهلاكات السنوية، لتوفير الوقت وتفادي نسيان إثباتها.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden text-right border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/10">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" />
                  {editingEntry ? "تعديل قالب قيد دوري" : "إنشاء قالب قيد دوري جديد"}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">عنوان القيد الدوري *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="مثال: إيجار المقر الشهري، مصروف صيانة ربع سنوي"
                  />
                </div>

                {/* خيار قيد متعدد الحسابات */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">قيد متعدد الحسابات (أطراف متعددة)</span>
                    <span className="text-[10px] font-bold text-slate-400">لإنشاء قيد مركب يحتوي على أكثر من حساب مدين أو دائن</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !isMultiAccount;
                      setIsMultiAccount(nextVal);
                      if (nextVal) {
                        if (debitEntries.length === 1 && !debitEntries[0].accountId) {
                          setDebitEntries([{ accountId: formData.debitAccountId, amount: formData.amount || 0, description: "" }]);
                        }
                        if (creditEntries.length === 1 && !creditEntries[0].accountId) {
                          setCreditEntries([{ accountId: formData.creditAccountId, amount: formData.amount || 0, description: "" }]);
                        }
                      }
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:scale-105 transition shrink-0"
                  >
                    {isMultiAccount ? (
                      <ToggleRight className="h-9 w-9 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="h-9 w-9 text-slate-400" />
                    )}
                  </button>
                </div>

                {isMultiAccount ? (
                  <div className="space-y-6 text-right" dir="rtl">
                    {/* الأطراف المدينة */}
                    <div className="border border-emerald-100 dark:border-emerald-950/40 rounded-2xl p-4 bg-emerald-50/10 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          الأطراف المدينة (من حساب) *
                        </span>
                        <button
                          type="button"
                          onClick={() => setDebitEntries([...debitEntries, { accountId: "", amount: 0, description: "" }])}
                          className="text-[10px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-700 transition"
                        >
                          + إضافة سطر مدين
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-48 overflow-y-auto">
                        {debitEntries.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              required
                              value={item.accountId}
                              onChange={(e) => {
                                const newEntries = [...debitEntries];
                                newEntries[idx].accountId = e.target.value;
                                setDebitEntries(newEntries);
                              }}
                              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">اختر حساب مدين...</option>
                              {transactionalAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.code})
                                </option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const newEntries = [...debitEntries];
                                newEntries[idx].description = e.target.value;
                                setDebitEntries(newEntries);
                              }}
                              className="w-1/3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="البيان (اختياري)"
                            />

                            <input
                              type="number"
                              required
                              min="1"
                              value={item.amount || ""}
                              onChange={(e) => {
                                const newEntries = [...debitEntries];
                                newEntries[idx].amount = Number(e.target.value);
                                setDebitEntries(newEntries);
                              }}
                              className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500 text-left"
                              placeholder="0"
                            />

                            {debitEntries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setDebitEntries(debitEntries.filter((_, i) => i !== idx))}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* الأطراف الدائنة */}
                    <div className="border border-rose-100 dark:border-rose-950/40 rounded-2xl p-4 bg-rose-50/10 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-black text-rose-600 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          الأطراف الدائنة (إلى حساب) *
                        </span>
                        <button
                          type="button"
                          onClick={() => setCreditEntries([...creditEntries, { accountId: "", amount: 0, description: "" }])}
                          className="text-[10px] bg-rose-600 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-rose-700 transition"
                        >
                          + إضافة سطر دائن
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-48 overflow-y-auto">
                        {creditEntries.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              required
                              value={item.accountId}
                              onChange={(e) => {
                                const newEntries = [...creditEntries];
                                newEntries[idx].accountId = e.target.value;
                                setCreditEntries(newEntries);
                              }}
                              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">اختر حساب دائن...</option>
                              {transactionalAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.code})
                                </option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const newEntries = [...creditEntries];
                                newEntries[idx].description = e.target.value;
                                setCreditEntries(newEntries);
                              }}
                              className="w-1/3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="البيان (اختياري)"
                            />

                            <input
                              type="number"
                              required
                              min="1"
                              value={item.amount || ""}
                              onChange={(e) => {
                                const newEntries = [...creditEntries];
                                newEntries[idx].amount = Number(e.target.value);
                                setCreditEntries(newEntries);
                              }}
                              className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500 text-left"
                              placeholder="0"
                            />

                            {creditEntries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setCreditEntries(creditEntries.filter((_, i) => i !== idx))}
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* توازن القيد */}
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-xs">
                      <div className="flex gap-4">
                        <span className="text-emerald-600">إجمالي المدين: {debitEntries.reduce((acc, d) => acc + (d.amount || 0), 0).toLocaleString()}</span>
                        <span className="text-rose-600">إجمالي الدائن: {creditEntries.reduce((acc, c) => acc + (c.amount || 0), 0).toLocaleString()}</span>
                      </div>
                      <div>
                        {Math.abs(debitEntries.reduce((acc, d) => acc + (d.amount || 0), 0) - creditEntries.reduce((acc, c) => acc + (c.amount || 0), 0)) === 0 ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-black">
                            <Check className="h-4 w-4" /> القيد متوازن
                          </span>
                        ) : (
                          <span className="text-rose-600 font-black">
                            الفرق: {Math.abs(debitEntries.reduce((acc, d) => acc + (d.amount || 0), 0) - creditEntries.reduce((acc, c) => acc + (c.amount || 0), 0)).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">الحساب المدين (من حساب) *</label>
                        <select
                          required={!isMultiAccount}
                          value={formData.debitAccountId}
                          onChange={(e) => setFormData({ ...formData, debitAccountId: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">اختر حساب مدين...</option>
                          {transactionalAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.code}) [{acc.type === "asset" || acc.type === "expense" ? "مدين" : "دائن"}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">الحساب الدائن (إلى حساب) *</label>
                        <select
                          required={!isMultiAccount}
                          value={formData.creditAccountId}
                          onChange={(e) => setFormData({ ...formData, creditAccountId: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">اختر حساب دائن...</option>
                          {transactionalAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.code}) [{acc.type === "asset" || acc.type === "expense" ? "مدين" : "دائن"}]
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">مبلغ القيد *</label>
                        <input
                          type="number"
                          required={!isMultiAccount}
                          min="1"
                          value={formData.amount || ""}
                          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">العملة *</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {currencies.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">دورية التكرار *</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          frequency: e.target.value as "daily" | "weekly" | "monthly" | "yearly",
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="daily">يومي</option>
                      <option value="weekly">أسبوعي</option>
                      <option value="monthly">شهري</option>
                      <option value="yearly">سنوي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">تاريخ الاستحقاق الأول / القادم *</label>
                    <input
                      type="date"
                      required
                      value={formData.nextExecutionDate}
                      onChange={(e) => setFormData({ ...formData, nextExecutionDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">البيان والتفاصيل (اختياري)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                    placeholder="بيان يظهر تلقائياً في دفتر اليومية عند ترحيل القيد..."
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تفعيل القالب للترحيل والجدولة</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className="text-indigo-600 dark:text-indigo-400 hover:scale-105 transition"
                  >
                    {formData.isActive ? (
                      <ToggleRight className="h-9 w-9 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="h-9 w-9 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                  >
                    حفظ القالب
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
