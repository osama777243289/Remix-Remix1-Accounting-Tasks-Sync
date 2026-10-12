import React, { useState, useMemo, useEffect } from "react";
import { Account, Currency, Transaction } from "../types";
import { BookOpen, Calendar, ArrowRight, DollarSign, PlusCircle, Check, Search, Filter, FileText, ChevronDown, ChevronRight, Layers, User, Hash, Tag } from "lucide-react";
import { addTransactionWithDoubleEntry } from "../lib/dbService";
import { toast } from "sonner";
import { PermissionGuard, usePermissions } from "../lib/permissions";

import { User as UserType } from "../types";

interface TransactionsHistoryProps {
  transactions: Transaction[];
  accounts: Account[];
  currencies: Currency[];
  setPrintData: (data: any) => void;
  currentUser: UserType | null;
  bookingSettings?: any;
  highlightCode?: string | null;
  onClearHighlight?: () => void;
}

type GroupBy = 'none' | 'contract' | 'customer' | 'account' | 'date' | 'type';
type AccountLevel = 1 | 2 | 3 | 4 | 5;

export default function TransactionsHistory({
  transactions,
  accounts,
  currencies,
  setPrintData,
  currentUser,
  bookingSettings,
  highlightCode,
  onClearHighlight
}: TransactionsHistoryProps) {
  const { hasPermission, canAccessAccount } = usePermissions();
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>('contract');
  const [accountLevel, setAccountLevel] = useState<AccountLevel>(5);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (highlightCode) {
      setSearchQuery(highlightCode);
      setGroupBy('none');
      if (onClearHighlight) {
        onClearHighlight();
      }
    }
  }, [highlightCode, onClearHighlight]);

  // Form states for double entry
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txVoucherDate, setTxVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [debitAccId, setDebitAccId] = useState("");
  const [creditAccId, setCreditAccId] = useState("");
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txCurrency, setTxCurrency] = useState("USD");
  const [txDesc, setTxDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [postingLoader, setPostingLoader] = useState(false);

  // Filter accounts that are sub-accounts (transactional) only, respecting permissions
  const selectableAccounts = accounts.filter(a => a.isTransactional && canAccessAccount(a.id));

  const selectedCurrencyObj = currencies.find(c => c.code === txCurrency) || { rateToBase: 1 };

  const getAccountName = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    return acc ? `(${acc.code}) ${acc.name}` : "حساب غير موجود بشكل صحيح";
  };

  const getAccountByCode = (code: string) => {
    return accounts.find(a => a.code === code);
  };

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return { date: '-', time: '-' };
    try {
      const d = new Date(dateTimeStr);
      if (isNaN(d.getTime())) return { date: dateTimeStr, time: '-' };
      
      const date = d.toISOString().split('T')[0];
      const time = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      return { date, time };
    } catch (e) {
      return { date: dateTimeStr, time: '-' };
    }
  };

  const extractInfo = (desc: string | undefined, tx: Transaction) => {
    const safeDesc = desc || "";
    if (tx.sourceType === 'booking' && tx.sourceId) {
      // Common pattern: bookingId-accrue-hall
      const bookingId = tx.sourceId.split('-accrue')[0];
      const parts = safeDesc.split(':');
      const customer = parts.length > 1 ? parts[1].split('-')[0].trim() : 'عميل غير معروف';
      return { customer, contract: bookingId };
    }
    
    // Fallback parsing
    const parts = safeDesc.split(':');
    if (parts.length < 2) return { customer: 'عام', contract: 'يدوي' };
    
    const secondPart = parts[1].trim();
    const detailParts = secondPart.split('-');
    
    if (detailParts.length < 2) return { customer: secondPart, contract: 'يدوي' };
    
    const customer = detailParts[0].trim();
    const contract = detailParts.slice(1).join('-').trim();
    
    return { customer, contract };
  };

  const filteredTransactions = transactions.filter((tx) => {
    const desc = (tx.description || "").toLowerCase();
    const q = (searchQuery || "").toLowerCase();
    
    const matchesSearch = desc.includes(q) ||
                          getAccountName(tx.debitAccountId).toLowerCase().includes(q) ||
                          getAccountName(tx.creditAccountId).toLowerCase().includes(q) ||
                          (tx.sequenceCode && tx.sequenceCode.toLowerCase().includes(q)) ||
                          tx.id.toLowerCase().includes(q);
    const matchesCurrency = filterCurrency === "all" || tx.currency === filterCurrency;
    return matchesSearch && matchesCurrency;
  });

  const groupedData = useMemo(() => {
    if (groupBy === 'none') return { groups: [], flat: filteredTransactions };

    const groups: Record<string, { id: string, name: string, transactions: Transaction[], total: Record<string, number> }> = {};

    filteredTransactions.forEach(tx => {
      let key = '';
      let name = '';

      if (groupBy === 'contract') {
        const info = extractInfo(tx.description, tx);
        key = info.contract;
        name = `عقد: ${info.contract} - ${info.customer}`;
      } else if (groupBy === 'customer') {
        const info = extractInfo(tx.description, tx);
        key = info.customer;
        name = `العميل: ${info.customer}`;
      } else if (groupBy === 'account') {
        const acc = accounts.find(a => a.id === tx.debitAccountId);
        if (acc) {
          // Logic for levels based on code length
          let codePart = acc.code;
          if (accountLevel === 1) codePart = acc.code.substring(0, 1);
          else if (accountLevel === 2) codePart = acc.code.substring(0, 2);
          else if (accountLevel === 3) codePart = acc.code.substring(0, 3);
          else if (accountLevel === 4) codePart = acc.code.substring(0, 5);
          
          const parentAcc = getAccountByCode(codePart);
          key = codePart;
          name = parentAcc ? `(${parentAcc.code}) ${parentAcc.name}` : `مستوى ${accountLevel}: ${codePart}`;
        } else {
          key = tx.debitAccountId;
          name = getAccountName(tx.debitAccountId);
        }
      } else if (groupBy === 'date') {
        const { date: dOnly } = formatDateTime(tx.date);
        key = dOnly;
        name = `التاريخ: ${dOnly}`;
      } else if (groupBy === 'type') {
        if (tx.sourceType === 'booking') {
          key = 'booking';
          name = 'عمليات الحجوزات (استحقاق/خصم)';
        } else if (tx.sourceType === 'voucher') {
          const desc = tx.description || "";
          const isReceipt = desc.includes('قبض');
          const isPayment = desc.includes('صرف') || desc.includes('رد');
          key = isReceipt ? 'receipt' : (isPayment ? 'payment' : 'voucher');
          name = isReceipt ? 'سندات القبض' : (isPayment ? 'سندات الصرف' : 'سندات مالية');
        } else {
          key = 'manual';
          name = 'قيود يومية يدوية';
        }
      }

      if (!groups[key]) {
        groups[key] = { id: key, name, transactions: [], total: {} };
      }
      groups[key].transactions.push(tx);
      
      // Keep track of totals per currency in the group
      groups[key].total[tx.currency] = (groups[key].total[tx.currency] || 0) + tx.amount;
    });

    return { groups: Object.values(groups), flat: [] };
  }, [filteredTransactions, groupBy, accountLevel, accounts]);

  // Set all groups to expanded by default when groupBy changes
  useEffect(() => {
    if (groupBy !== 'none') {
      const newExpanded: Record<string, boolean> = {};
      groupedData.groups.forEach(g => {
        newExpanded[g.id] = true;
      });
      setExpandedGroups(newExpanded);
    }
  }, [groupBy, groupedData.groups.length]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePostTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!hasPermission("create-transaction")) {
      toast.error("عذراً، ليس لديك صلاحية إنشاء قيود محاسبية.");
      setErrorMsg("عذراً، ليس لديك صلاحية إنشاء قيود محاسبية.");
      return;
    }

    if (!debitAccId || !creditAccId || txAmount <= 0 || !txDesc) {
      setErrorMsg("الرجاء استكمال جميع بيانات القيد المحاسبي المزدوج.");
      return;
    }

    if (debitAccId === creditAccId) {
      setErrorMsg("خطأ محاسبي: لا يمكن أن يكون حساب المدين والدائن متطابقين.");
      return;
    }

    setPostingLoader(true);
    try {
      await addTransactionWithDoubleEntry({
        date: txDate,
        voucherDate: txVoucherDate || txDate,
        description: txDesc,
        debitAccountId: debitAccId,
        creditAccountId: creditAccId,
        amount: Number(txAmount),
        currency: txCurrency,
        rate: selectedCurrencyObj.rateToBase,
        createdBy: currentUser?.username || currentUser?.name || "System",
      }, currencies, accounts);

      setDebitAccId("");
      setCreditAccId("");
      setTxAmount(0);
      setTxDesc("");
      setIsPosting(false);
      toast.success("تم ترحيل قيد اليومية بنجاح");
    } catch (err: any) {
      setErrorMsg(err.message || "فشل ترحيل القيد المحاسبي.");
      toast.error("خطأ في ترحيل القيد");
    } finally {
      setPostingLoader(false);
    }
  };

  return (
    <div id="transactions-history-root" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 rtl animate-slideup">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 id="transactions-heading" className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            القيود اليومية والعمليات المالية
          </h2>
          <p id="transactions-sub" className="text-sm text-slate-500 mt-1">
            إدخال قيود مزدوجة وترحيل المبالغ تلقائياً للدليل الهرمي مع التحويل المتزامن للعملات.
          </p>
        </div>

        <PermissionGuard permission="create-transaction">
          <button
            id="btn-add-transaction-toggle"
            onClick={() => setIsPosting(!isPosting)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-sm cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            إنشاء سند محاسبي وقيد مالي
          </button>
        </PermissionGuard>
      </div>

      {isPosting && (
        <form
          id="post-transaction-form"
          onSubmit={handlePostTransactionSubmit}
          className="mb-5 bg-indigo-50/50 dark:bg-slate-950 p-4 rounded-xl border border-indigo-100 dark:border-slate-850 text-xs animate-slideup"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center justify-between">
            <span>ترحيل قيد مزدوج جديد (Double Entry Voucher)</span>
            <button
              type="button"
              onClick={() => setIsPosting(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              إلغاء ×
            </button>
          </h3>

          {errorMsg && <div className="p-2.5 mb-3 bg-red-100 text-red-700 rounded-lg font-bold">{errorMsg}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3">
            <div>
              <label className="block text-indigo-600 dark:text-indigo-400 mb-1 font-extrabold">تاريخ السند (Voucher Date):</label>
              <input
                type="date"
                value={txVoucherDate}
                onChange={(e) => setTxVoucherDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">تاريخ التسجيل (Reg. Date):</label>
              <input
                type="date"
                disabled={bookingSettings?.lockTransactionDate && !hasPermission("bypass-transaction-lock-date")}
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400"
              />
              {bookingSettings?.lockTransactionDate && (
                <p className="text-[9px] text-rose-500 font-bold mt-1">
                  {hasPermission("bypass-transaction-lock-date") 
                    ? "🔓 تم تخطي قفل التاريخ بصلاحية المشرف الصارمة" 
                    : "⚠️ تم قفل تعديل التاريخ من الإعدادات لمجموعتك"}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold text-emerald-700 dark:text-emerald-400">
                من حساب (الطرف المدين - Debit Account):
              </label>
              <select
                id="select-tx-debit"
                value={debitAccId}
                onChange={(e) => setDebitAccId(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- اختر الحساب المستلم للقيمة --</option>
                {selectableAccounts.map((acc, idx) => (
                  <option key={`${acc.id}-${idx}`} value={acc.id}>
                    ({acc.code}) {acc.name} - رصيد: {(acc.balance ?? 0).toLocaleString()} {acc.currency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold text-rose-700 dark:text-rose-400">
                إلى حساب (الطرف الدائن - Credit Account):
              </label>
              <select
                id="select-tx-credit"
                value={creditAccId}
                onChange={(e) => setCreditAccId(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold focus:ring-1 focus:ring-rose-500"
              >
                <option value="">-- اختر الحساب المانح للقيمة --</option>
                {selectableAccounts.map((acc, idx) => (
                  <option key={`${acc.id}-${idx}`} value={acc.id}>
                    ({acc.code}) {acc.name} - رصيد: {(acc.balance ?? 0).toLocaleString()} {acc.currency}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">المبلغ المقيد (Amount):</label>
              <input
                id="input-tx-amount"
                type="number"
                placeholder="0.00"
                value={txAmount || ""}
                onChange={(e) => setTxAmount(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">عملة القيد (Voucher Currency):</label>
              <select
                id="select-tx-currency"
                value={txCurrency}
                onChange={(e) => setTxCurrency(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {currencies.map((curr, idx) => (
                  <option key={`${curr.id}-${idx}`} value={curr.code}>
                    {curr.code} ({curr.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">سعر صرف المعاملة (للـ USD الأساسي):</label>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-250 font-bold rounded-lg text-center">
                1 USD = {selectedCurrencyObj.rateToBase} {txCurrency}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">الشرح / البيان المحاسبي (Description):</label>
            <input
              id="input-tx-desc"
              type="text"
              placeholder="اكتب شرحاً وافياً ومحاسبياً للقيد المالي..."
              value={txDesc}
              onChange={(e) => setTxDesc(e.target.value)}
              className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              id="btn-add-transaction-cancel"
              type="button"
              onClick={() => setIsPosting(false)}
              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350 hover:bg-slate-300 transition duration-150 cursor-pointer"
            >
              إلغاء التغييرات
            </button>
            <button
              id="btn-add-transaction-submit"
              type="submit"
              disabled={postingLoader}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition duration-150 cursor-pointer disabled:opacity-60"
            >
              {postingLoader ? "جاري الترحيل للدفاتر السحابية..." : "ترحيل وحفظ السند المزدوج"}
            </button>
          </div>
        </form>
      )}

      {/* Filters bar */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            id="input-tx-search"
            type="text"
            placeholder="بحث في قيود اليومية أو أسماء الحسابات المنقولة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5">
            <Layers className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">التجميع:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="text-xs bg-transparent border-none text-slate-800 dark:text-white focus:ring-0 outline-none cursor-pointer font-bold"
            >
              <option value="none">بدون تجميع</option>
              <option value="contract">حسب العقد والعميل</option>
              <option value="customer">حسب العميل</option>
              <option value="account">حسب الحساب</option>
              <option value="date">حسب التاريخ</option>
              <option value="type">حسب نوع العملية</option>
            </select>
          </div>

          {groupBy === 'account' && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-850 rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">المستوى:</span>
              <select
                value={accountLevel}
                onChange={(e) => setAccountLevel(Number(e.target.value) as AccountLevel)}
                className="text-xs bg-transparent border-none text-slate-800 dark:text-white focus:ring-0 outline-none cursor-pointer font-bold"
              >
                <option value={1}>المستوى 1</option>
                <option value={2}>المستوى 2</option>
                <option value={3}>المستوى 3</option>
                <option value={4}>المستوى 4</option>
                <option value={5}>المستوى 5 (كامل)</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-1.5">
            <Filter className="h-4 w-4 text-emerald-500 shrink-0" />
            <select
              id="select-tx-filter-currency"
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="text-xs bg-transparent border-none text-slate-800 dark:text-white focus:ring-0 outline-none cursor-pointer font-bold"
            >
              <option value="all">كل العملات</option>
              {currencies.map((curr, idx) => (
                <option key={`${curr.id}-${idx}`} value={curr.code}>{curr.code}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Data render */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-sm text-slate-500">لا توجد قيود مسجلة في الدفاتر تطابق المعايير المخصصة.</p>
        </div>
      ) : (
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800/80 text-slate-600 font-bold text-sm">
                  <th className="py-3 px-4 text-center">رمز القيد</th>
                  <th className="py-3 px-4 text-center">تاريخ السند</th>
                  <th className="py-3 px-4 text-center">التسجيل</th>
                  <th className="py-3 px-4">من حساب (المدين)</th>
                  <th className="py-3 px-4">إلى حساب (الدائن)</th>
                  <th className="py-3 px-4">البيان والشروحات التفصيلية</th>
                  <th className="py-3 px-4 text-left">مبلغ المعاملة (أجنبي)</th>
                  <th className="py-3 px-4 text-left">المعادل (أساسي)</th>
                  <th className="py-3 px-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {groupBy === 'none' ? (
                  filteredTransactions.map((tx) => (
                    <TransactionRow 
                      key={tx.id} 
                      tx={tx} 
                      getAccountName={getAccountName} 
                      setPrintData={setPrintData} 
                      formatDateTime={formatDateTime}
                      highlightCode={searchQuery}
                    />
                  ))
                ) : (
                  groupedData.groups.map((group) => (
                    <React.Fragment key={group.id}>
                      <tr 
                        className="bg-slate-100/50 dark:bg-slate-850 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <td colSpan={5} className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {expandedGroups[group.id] ? <ChevronDown className="h-4 w-4 text-indigo-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                            {groupBy === 'contract' && <Hash className="h-3.5 w-3.5 text-indigo-500" />}
                            {groupBy === 'customer' && <User className="h-3.5 w-3.5 text-indigo-500" />}
                            {groupBy === 'date' && <Calendar className="h-3.5 w-3.5 text-indigo-500" />}
                            {groupBy === 'type' && <Tag className="h-3.5 w-3.5 text-indigo-500" />}
                            <span className="font-black text-slate-800 dark:text-white">{group.name}</span>
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                              {group.transactions.length} قيود
                            </span>
                          </div>
                        </td>
                        <td colSpan={4} className="py-3 px-4 text-left">
                          <div className="flex flex-col items-end gap-1">
                            {Object.entries(group.total).map(([curr, total]) => (
                              <span key={curr} className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[10px]">
                                {total.toLocaleString()} {curr}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                      {expandedGroups[group.id] && group.transactions.map((tx) => (
                        <TransactionRow 
                          key={tx.id} 
                          tx={tx} 
                          getAccountName={getAccountName} 
                          setPrintData={setPrintData} 
                          formatDateTime={formatDateTime}
                          isChild 
                          highlightCode={searchQuery}
                        />
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {groupBy === 'none' ? (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTransactions.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    tx={tx}
                    getAccountName={getAccountName}
                    setPrintData={setPrintData}
                    formatDateTime={formatDateTime}
                    highlightCode={searchQuery}
                  />
                ))}
              </div>
            ) : (
              groupedData.groups.map((group) => (
                <div key={group.id} className="space-y-0">
                  <div 
                    className="p-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2 cursor-pointer border-b border-slate-100 dark:border-slate-800"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedGroups[group.id] ? <ChevronDown className="h-4 w-4 text-indigo-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        <span className="font-black text-slate-800 dark:text-white text-xs">{group.name}</span>
                      </div>
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                        {group.transactions.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {Object.entries(group.total).map(([curr, total]) => (
                        <span key={curr} className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[10px]">
                          {total.toLocaleString()} {curr}
                        </span>
                      ))}
                    </div>
                  </div>
                  {expandedGroups[group.id] && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-950">
                      {group.transactions.map((tx) => (
                        <TransactionCard
                          key={tx.id}
                          tx={tx}
                          getAccountName={getAccountName}
                          setPrintData={setPrintData}
                          formatDateTime={formatDateTime}
                          highlightCode={searchQuery}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TransactionRowProps {
  key?: React.Key;
  tx: Transaction;
  getAccountName: (id: string) => string;
  setPrintData: (data: any) => void;
  isChild?: boolean;
  formatDateTime: (dt: string) => { date: string, time: string };
  highlightCode?: string | null;
}

function TransactionRow({ tx, getAccountName, setPrintData, isChild, formatDateTime, highlightCode }: TransactionRowProps) {
  const { date, time } = formatDateTime(tx.date);
  const isHighlighted = !!(highlightCode && (tx.sequenceCode?.toLowerCase() === highlightCode.toLowerCase() || tx.id.toLowerCase() === highlightCode.toLowerCase()));
  return (
    <tr className={`transition duration-150 ${isHighlighted ? 'bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-md font-extrabold' : (isChild ? 'bg-slate-50/20 dark:bg-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-850' : 'hover:bg-slate-50/50 dark:hover:bg-slate-850')}`}>
      <td className="py-3 px-4 text-center whitespace-nowrap">
        <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">{tx.sequenceCode || "-"}</span>
      </td>
      <td className="py-3 px-4 text-center whitespace-nowrap">
        <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{tx.voucherDate || date}</span>
      </td>
      <td className={`py-3 px-4 text-center whitespace-nowrap ${isChild ? 'pr-10' : ''}`}>
        <div className="flex flex-col items-center">
          <span className="text-slate-600 dark:text-slate-300 font-bold text-xs">{date}</span>
          <span className="text-[10px] text-slate-400 font-medium">{time}</span>
        </div>
      </td>
      <td className="py-3 px-4 font-semibold text-emerald-700 dark:text-emerald-500 text-sm">
        {getAccountName(tx.debitAccountId)}
      </td>
      <td className="py-3 px-4 font-semibold text-rose-700 dark:text-rose-500 text-sm">
        {getAccountName(tx.creditAccountId)}
      </td>
      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium text-sm">
        {tx.description}
      </td>
      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900 dark:text-white">
        <div className="flex flex-col items-end">
          <span className="text-sm">{tx.amount.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">{tx.currency}</span></span>
          <span className="text-[10px] text-slate-500 font-medium">سعر الصرف: {tx.rate}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-left font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm">
        {Math.round(tx.baseAmount || (tx.amount * (tx.rate || 1))).toLocaleString()}
      </td>
      <td className="p-4">
        <button 
          onClick={() => {
            setPrintData({
              title: "قيد يومية",
              documentNumber: tx.sequenceCode || tx.id.slice(-6).toUpperCase(),
              date: tx.date,
              content: (
                <div className="space-y-4" dir="rtl">
                  <div className="border rounded-xl p-4">
                    <p><strong>رمز القيد:</strong> {tx.sequenceCode}</p>
                    <p><strong>البيان:</strong> {tx.description}</p>
                    <p><strong>من حساب:</strong> {getAccountName(tx.debitAccountId)}</p>
                    <p><strong>إلى حساب:</strong> {getAccountName(tx.creditAccountId)}</p>
                    <p><strong>المبلغ الأجنبي:</strong> {tx.amount.toLocaleString()} {tx.currency}</p>
                    <p><strong>سعر الصرف:</strong> {tx.rate}</p>
                    <p><strong>المعادل بالأساسي:</strong> {Math.round(tx.baseAmount || (tx.amount * (tx.rate || 1))).toLocaleString()}</p>
                  </div>
                </div>
              )
            });
          }}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
        >
          <FileText className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function TransactionCard({ tx, getAccountName, setPrintData, formatDateTime, highlightCode }: TransactionRowProps) {
  const { date, time } = formatDateTime(tx.date);
  const isHighlighted = !!(highlightCode && (tx.sequenceCode?.toLowerCase() === highlightCode.toLowerCase() || tx.id.toLowerCase() === highlightCode.toLowerCase()));
  
  return (
    <div className={`p-4 rounded-2xl border transition-all space-y-3 ${isHighlighted ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/20' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">رمز القيد</span>
            <span className="text-xs font-black text-slate-800 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">{tx.sequenceCode || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">تاريخ السند</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{tx.voucherDate || date}</span>
          </div>
        </div>
        <button 
          onClick={() => {
            setPrintData({
              title: "قيد يومية",
              documentNumber: tx.sequenceCode || tx.id.slice(-6).toUpperCase(),
              date: tx.date,
              content: (
                <div className="space-y-4" dir="rtl">
                  <div className="border rounded-xl p-4">
                    <p><strong>رمز القيد:</strong> {tx.sequenceCode}</p>
                    <p><strong>البيان:</strong> {tx.description}</p>
                    <p><strong>من حساب:</strong> {getAccountName(tx.debitAccountId)}</p>
                    <p><strong>إلى حساب:</strong> {getAccountName(tx.creditAccountId)}</p>
                    <p><strong>المبلغ الأجنبي:</strong> {tx.amount.toLocaleString()} {tx.currency}</p>
                    <p><strong>سعر الصرف:</strong> {tx.rate}</p>
                    <p><strong>المعادل بالأساسي:</strong> {Math.round(tx.baseAmount || (tx.amount * (tx.rate || 1))).toLocaleString()}</p>
                  </div>
                </div>
              )
            });
          }}
          className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-500 transition-colors"
        >
          <FileText className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-800">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">من حساب (المدين)</span>
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-emerald-50/30 dark:bg-emerald-900/10 p-2 rounded-lg">
            {getAccountName(tx.debitAccountId)}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">إلى حساب (الدائن)</span>
          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-rose-50/30 dark:bg-rose-900/10 p-2 rounded-lg">
            {getAccountName(tx.creditAccountId)}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">البيان</span>
        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{tx.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1 bg-white dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">المبلغ (أجنبي)</span>
          <div className="flex flex-col font-mono">
            <span className="text-xs font-black text-slate-800 dark:text-white">{tx.amount.toLocaleString()} {tx.currency}</span>
            <span className="text-[9px] text-slate-400">صرف: {tx.rate}</span>
          </div>
        </div>
        <div className="space-y-1 bg-indigo-50/50 dark:bg-indigo-900/20 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">المعادل (أساسي)</span>
          <div className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300">
            {Math.round(tx.baseAmount || (tx.amount * (tx.rate || 1))).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <span className="text-[9px] font-bold text-slate-400">سجل في: {date} {time}</span>
      </div>
    </div>
  );
}
