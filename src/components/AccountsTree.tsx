/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Account, Currency, AccountType, Transaction, ReceiptPayment, 
  Booking, BookingSettings, Client, Employee, Task,
  AccountClassification, AccountCategory, AccountStatus, LinkedAccounts
} from "../types";
import { 
  FolderTree, Folder, DollarSign, Plus, Eye, Check, Trash2, Edit2, 
  Settings, RefreshCcw, AlertTriangle, Database, FileText,
  Activity, Search, X
} from "lucide-react";
import { 
  addAccount, deleteAccount, updateAccount, 
  updateTransaction, updateVoucher, updateBooking, 
  updateBookingSettings, updateClient, updateEmployee, updateTask,
  updateLinkedAccounts
} from "../lib/dbService";
import { toast } from "sonner";
import { PermissionGuard, usePermissions } from "../lib/permissions";

interface AccountsTreeProps {
  accounts: Account[];
  currencies: Currency[];
  selectedAccount: Account | null;
  onSelectAccount: (acc: Account | null) => void;
  globalCurrencyCode: string;
  transactions: Transaction[];
  vouchers: ReceiptPayment[];
  bookings: Booking[];
  bookingSettings: BookingSettings | null;
  linkedAccounts?: LinkedAccounts | null;
  clients: Client[];
  employees: Employee[];
  tasks: Task[];
  onViewStatement?: (accountId: string) => void;
}

const typeTranslations: Record<AccountType, { label: string; color: string; bg: string }> = {
  asset: { label: "الأصول (Assets)", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  liability: { label: "الخصوم (Liabilities)", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
  equity: { label: "حقوق الملكية (Equity)", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  revenue: { label: "الإيرادات (Revenue)", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  expense: { label: "المصروفات (Expenses)", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
};

const classificationTranslations: Record<AccountClassification, string> = {
  cashbox: "صندوق",
  client: "عميل",
  supplier: "مورد",
  employee: "موظف",
  operating_expense: "مصروفات تشغيلية",
  general_expense: "مصروفات عامة",
  cost: "تكاليف",
  revenue: "إيرادات",
  general: "عام"
};

const categoryTranslations: Record<AccountCategory, string> = {
  cash: "نقدية (Cash)",
  client: "عميل (Client)",
  supplier: "مورد (Supplier)",
  employee: "موظف (Employee)",
  expense: "مصروف (Expense)",
  revenue: "إيراد (Revenue)",
  general: "عام (General)"
};

const statusTranslations: Record<AccountStatus, { label: string; color: string; bg: string }> = {
  active: { label: "فعال", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  suspended: { label: "موقف", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
  reports_only: { label: "فعال للتقارير فقط (بدون حركات)", color: "text-amber-700 dark:text-amber-450", bg: "bg-amber-50 dark:bg-amber-950/30" }
};

export default function AccountsTree({
  accounts,
  currencies,
  selectedAccount,
  onSelectAccount,
  globalCurrencyCode,
  transactions,
  vouchers,
  bookings,
  bookingSettings,
  linkedAccounts,
  clients,
  employees,
  tasks,
  onViewStatement,
}: AccountsTreeProps) {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<AccountType | "all">("all");
  const [onlyWithActivity, setOnlyWithActivity] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationTotal, setMigrationTotal] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedBatchClassification, setSelectedBatchClassification] = useState<AccountClassification | "">("");
  const [selectedBatchStatus, setSelectedBatchStatus] = useState<AccountStatus | "">("");

  const [showMaintenance, setShowMaintenance] = useState(false);

  // Form State
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<AccountType>("asset");
  const [newParentId, setNewParentId] = useState<string>("");
  const [newCurrency, setNewCurrency] = useState(globalCurrencyCode || "USD");
  const [newBalance, setNewBalance] = useState<number>(0);
  const [newIsTransactional, setNewIsTransactional] = useState<boolean>(false);
  const [newClassification, setNewClassification] = useState<AccountClassification>("general");
  const [newCategory, setNewCategory] = useState<AccountCategory>("general");
  const [newStatus, setNewStatus] = useState<AccountStatus>("active");
  const [newNotes, setNewNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper routine to convert currency balance to another target currency
  const getConvertedBalance = (balance: number, fromCode: string, toCode: string): string => {
    if (fromCode === toCode) return `${balance.toLocaleString()} ${fromCode}`;

    const fromCurr = currencies.find((c) => c.code === fromCode);
    const toCurr = currencies.find((c) => c.code === toCode);

    if (!fromCurr || !toCurr) return `${balance.toLocaleString()} ${fromCode}`;

    // Convert from custom to Base (USD, rate = 1)
    const amountInBase = balance * fromCurr.rateToBase;
    // Convert from Base to Target
    const amountInTarget = amountInBase / toCurr.rateToBase;

    // formatting with sensible decimals
    const formatted = parseFloat(amountInTarget.toFixed(2)).toLocaleString();
    const symbol = toCurr.symbol;
    return `${formatted} ${symbol}`;
  };

  const selectedGlobalCurrencyObj = currencies.find(c => c.code === globalCurrencyCode) || { symbol: "$" };

  // Calculate nesting level based on hierarchical links
  const getNodeDepth = (acc: Account): number => {
    let depth = 0;
    let current = acc;
    while (current.parentId) {
      const parent = accounts.find((a) => a.id === current.parentId);
      if (parent) {
        depth += 1;
        current = parent;
      } else {
        break;
      }
    }
    return depth;
  };

  // Collect potential parent options based on matching type
  const potentialParents = accounts.filter(
    (acc) => (activeTab === "all" || acc.type === activeTab) && getNodeDepth(acc) < 3
  );

  const handleEditClick = (acc: Account) => {
    if (!hasPermission("edit-account")) {
      toast.error("عذراً، ليس لديك صلاحية تعديل الحسابات المحاسبية.");
      return;
    }
    setNewName(acc.name);
    setNewCode(acc.code);
    setNewType(acc.type);
    setNewParentId(acc.parentId || "");
    setNewCurrency(acc.currency);
    setNewBalance(acc.balance);
    setNewIsTransactional(acc.isTransactional || false);
    setNewClassification(acc.classification || "general");
    setNewCategory(acc.category || "general");
    setNewStatus(acc.status || "active");
    setNewNotes(acc.notes || "");
    setIsEditingAccount(true);
    setIsAdding(true);
    setErrorMsg("");
  };

  const handleUpdateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission("edit-account")) {
      toast.error("عذراً، ليس لديك صلاحية تعديل الحسابات المحاسبية.");
      return;
    }
    if (!selectedAccount) return;
    setErrorMsg("");

    if (!newName || !newCode) {
      setErrorMsg("الرجاء إدخال اسم الحساب ورمزه الشجري.");
      return;
    }

    if (accounts.some((a) => a.code === newCode && a.id !== selectedAccount.id)) {
      setErrorMsg("رمز الحساب مُستخدم بالفعل في الدليل الشجري.");
      return;
    }

    const parentAcc = accounts.find(a => a.id === newParentId);
    
    // Optimistically update & reset form instantly
    toast.success("تم تحديث الحساب بنجاح");
    
    const accountParams = {
      code: newCode,
      name: newName,
      type: parentAcc ? parentAcc.type : newType,
      parentId: newParentId || null,
      balance: Number(newBalance) || 0,
      currency: newCurrency,
      notes: newNotes,
      isTransactional: newIsTransactional,
      classification: newClassification,
      category: newCategory,
      status: newStatus,
    };

    const targetId = selectedAccount.id;

    setNewName("");
    setNewCode("");
    setNewParentId("");
    setNewBalance(0);
    setNewIsTransactional(false);
    setNewClassification("general");
    setNewCategory("general");
    setNewStatus("active");
    setNewNotes("");
    setNewCurrency(globalCurrencyCode || "USD");
    setIsAdding(false);
    setIsEditingAccount(false);
    onSelectAccount(null);

    // Save in background
    (async () => {
      try {
        await updateAccount(targetId, accountParams);
      } catch (err: any) {
        console.error("Account background update failed:", err);
        toast.error("فشلت مزامنة تحديث الحساب على السحابة، يرجى التحقق من اتصالك.");
      }
    })();
  };

  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission("create-account")) {
      toast.error("عذراً، ليس لديك صلاحية إضافة حسابات محاسبية جديدة.");
      return;
    }
    setErrorMsg("");

    if (!newName || !newCode) {
      setErrorMsg("الرجاء إدخال اسم الحساب ورمزه الشجري.");
      return;
    }

    // Check code unique constraint
    if (accounts.some((a) => a.code === newCode)) {
      setErrorMsg("رمز الحساب مُستخدم بالفعل في الدليل الشجري.");
      return;
    }

    const parentAcc = accounts.find(a => a.id === newParentId);

    // Optimistically add & reset form instantly
    toast.success("تمت إضافة الحساب بنجاح");

    const accountParams = {
      id: newCode,
      code: newCode,
      name: newName,
      type: parentAcc ? parentAcc.type : newType,
      parentId: newParentId || null,
      balance: Number(newBalance) || 0,
      currency: newCurrency,
      notes: newNotes,
      isTransactional: newIsTransactional,
      classification: newClassification,
      category: newCategory,
      status: newStatus,
    };

    setNewName("");
    setNewCode("");
    setNewParentId("");
    setNewBalance(0);
    setNewIsTransactional(false);
    setNewClassification("general");
    setNewCategory("general");
    setNewStatus("active");
    setNewNotes("");
    setNewCurrency(globalCurrencyCode || "USD");
    setIsAdding(false);

    // Save in background
    (async () => {
      try {
        await addAccount(accountParams);
      } catch (err: any) {
        console.error("Account background add failed:", err);
        toast.error("فشلت مزامنة إضافة الحساب على السحابة، يرجى التحقق من اتصالك.");
      }
    })();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPermission("delete-account")) {
      toast.error("عذراً، ليس لديك صلاحية حذف الحسابات المحاسبية (صلاحية صارمة ونهائية).");
      return;
    }
    if (confirm("هل أنت متأكد من رغبتك في حذف هذا الحساب؟ الحسابات الأبناء ستصبح هائمة بدون أب.")) {
      try {
        await deleteAccount(id);
        if (selectedAccount?.id === id) onSelectAccount(null);
        toast.success("تم حذف الحساب بنجاح");
      } catch (err) {
        toast.error("حدث خطأ في الحذف.");
      }
    }
  };

  const handleBulkMigrateIDs = async () => {
    const toMigrate = accounts.filter(acc => acc.id !== acc.code);
    if (toMigrate.length === 0) {
      toast.info("جميع الحسابات مُحدثة بالفعل ولا يوجد ما يحتاج للهجرة.");
      return;
    }

    if (!window.confirm(`هل أنت متأكد من رغبتك في تحديث ${toMigrate.length} حساب؟ سيتم تغيير المعرف البرمجي (ID) ليطابق رقم الحساب (Code) وتحديث كافة العمليات والسجلات المرتبطة بها.`)) {
      return;
    }

    setIsMigrating(true);
    setMigrationTotal(toMigrate.length);
    setMigrationProgress(0);

    try {
      for (let i = 0; i < toMigrate.length; i++) {
        const acc = toMigrate[i];
        const oldId = acc.id;
        const newId = acc.code;

        // 1. Update all references in other collections
        
        // Transactions
        const txsToUpdate = transactions.filter(tx => tx.debitAccountId === oldId || tx.creditAccountId === oldId);
        for (const tx of txsToUpdate) {
          const updates: any = {};
          if (tx.debitAccountId === oldId) updates.debitAccountId = newId;
          if (tx.creditAccountId === oldId) updates.creditAccountId = newId;
          await updateTransaction(tx.id, updates);
        }

        // Vouchers (Receipts/Payments)
        const vouchersToUpdate = vouchers.filter(v => v.fromToAccountId === oldId || v.cashBankAccountId === oldId);
        for (const v of vouchersToUpdate) {
          const updates: any = {};
          if (v.fromToAccountId === oldId) updates.fromToAccountId = newId;
          if (v.cashBankAccountId === oldId) updates.cashBankAccountId = newId;
          await updateVoucher(v.id, updates);
        }

        // Clients
        const clientsToUpdate = clients.filter(c => c.linkedAccountId === oldId);
        for (const c of clientsToUpdate) {
          await updateClient(c.id, { linkedAccountId: newId });
        }

        // Employees
        const employeesToUpdate = employees.filter(e => e.linkedAccountId === oldId);
        for (const e of employeesToUpdate) {
          await updateEmployee(e.id, { linkedAccountId: newId });
        }

        // Tasks
        const tasksToUpdate = tasks.filter(t => t.linkedAccountId === oldId);
        for (const t of tasksToUpdate) {
          await updateTask(t.id, { linkedAccountId: newId });
        }

        // Parent IDs in Accounts
        const childrenToUpdate = accounts.filter(child => child.parentId === oldId);
        for (const child of childrenToUpdate) {
          await updateAccount(child.id, { parentId: newId });
        }

        // Linked Accounts Settings
        if (linkedAccounts) {
          const s = linkedAccounts;
          const settingsUpdates: any = {};
          if (s.preEventRevenueAccountId === oldId) settingsUpdates.preEventRevenueAccountId = newId;
          if (s.postEventRevenueAccountId === oldId) settingsUpdates.postEventRevenueAccountId = newId;
          if (s.discountAccountId === oldId) settingsUpdates.discountAccountId = newId;
          if (s.guaranteeAccountId === oldId) settingsUpdates.guaranteeAccountId = newId;
          if (s.cashBankAccountId === oldId) settingsUpdates.cashBankAccountId = newId;
          if (s.bookingMortgageAccountId === oldId) settingsUpdates.bookingMortgageAccountId = newId;
          if (s.accountsReceivableId === oldId) settingsUpdates.accountsReceivableId = newId;
          if (s.hallRevenueAccountId === oldId) settingsUpdates.hallRevenueAccountId = newId;
          if (s.servicesRevenueAccountId === oldId) settingsUpdates.servicesRevenueAccountId = newId;
          if (s.finesAccountId === oldId) settingsUpdates.finesAccountId = newId;

          if (Object.keys(settingsUpdates).length > 0) {
            await updateLinkedAccounts(s.id, settingsUpdates);
          }
        }

        // 2. Create new account document and delete old one
        const { id, ...accData } = acc;
        await addAccount({ ...accData, id: newId });
        await deleteAccount(oldId);

        setMigrationProgress(i + 1);
      }

      toast.success("تم الانتهاء من تحديث كافة الحسابات والسجلات بنجاح!");
      setShowMaintenance(false);
    } catch (err: any) {
      console.error("Migration failed:", err);
      toast.error(`فشلت عملية التحديث: ${err.message || err}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // Track accounts with financial activity (transactions, vouchers, or non-zero balance)
  const accountsWithActivity = useMemo(() => {
    const activeIds = new Set<string>();

    // 1. Transactions
    (transactions || []).forEach((tx) => {
      if (tx.debitAccountId) activeIds.add(tx.debitAccountId);
      if (tx.creditAccountId) activeIds.add(tx.creditAccountId);
    });

    // 2. Vouchers (receipts/payments)
    (vouchers || []).forEach((v) => {
      if (v.fromToAccountId) activeIds.add(v.fromToAccountId);
      if (v.cashBankAccountId) activeIds.add(v.cashBankAccountId);
      if (v.entries && Array.isArray(v.entries)) {
        v.entries.forEach((e) => {
          if (e.accountId) activeIds.add(e.accountId);
        });
      }
    });

    // 3. Directly non-zero balance
    accounts.forEach((acc) => {
      if (Math.abs(acc.balance || 0) > 0.001) {
        activeIds.add(acc.id);
        if (acc.code) activeIds.add(acc.code);
      }
    });

    // Match accounts that have id or code in activeIds
    const directActiveIds = new Set<string>();
    accounts.forEach((acc) => {
      if (activeIds.has(acc.id) || (acc.code && activeIds.has(acc.code))) {
        directActiveIds.add(acc.id);
      }
    });

    // Keep parent hierarchy for visible active accounts so tree remains intact
    const allVisibleIds = new Set<string>(directActiveIds);
    directActiveIds.forEach((accId) => {
      let curr = accounts.find((a) => a.id === accId);
      while (curr?.parentId) {
        allVisibleIds.add(curr.parentId);
        curr = accounts.find((a) => a.id === curr!.parentId);
      }
    });

    return { directActiveIds, allVisibleIds };
  }, [accounts, transactions, vouchers]);

  // Build the hierarchical trees filtered by current tab selection, financial activity, and search query
  const filteredAccounts = accounts.filter((acc) => {
    // Tab filter
    if (activeTab !== "all" && acc.type !== activeTab) return false;

    // Filter by financial activity
    if (onlyWithActivity && !accountsWithActivity.allVisibleIds.has(acc.id)) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchSelf =
        (acc.name || "").toLowerCase().includes(q) ||
        (acc.code || "").includes(q);

      const matchChild = accounts.some(
        (c) =>
          c.parentId === acc.id &&
          ((c.name || "").toLowerCase().includes(q) || (c.code || "").includes(q))
      );

      if (!matchSelf && !matchChild) return false;
    }

    return true;
  });

  // Group accounts by parent/child relationships to draw a perfect tree
  const buildTreeItems = (list: Account[]): Account[] => {
    const roots = list.filter((a) => !a.parentId);
    const children = list.filter((a) => a.parentId);

    const sortedList: Account[] = [];

    const traverse = (node: Account) => {
      sortedList.push(node);
      // Fetch children
      const kids = children.filter((c) => c.parentId === node.id);
      // Sort kids by code
      kids.sort((a, b) => a.code.localeCompare(b.code));
      kids.forEach((k) => {
        traverse(k);
      });
    };

    roots.sort((a, b) => a.code.localeCompare(b.code));
    roots.forEach((root) => traverse(root));

    // Append any orphaned nodes to avoid disappearing data
    list.forEach((item) => {
      if (!sortedList.some((s) => s.id === item.id)) {
        sortedList.push(item);
      }
    });

    return sortedList;
  };

  const treeList = buildTreeItems(filteredAccounts);

  const toggleSelectAll = () => {
    if (selectedAccountIds.length === treeList.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(treeList.map(a => a.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedAccountIds.includes(id)) {
      setSelectedAccountIds(selectedAccountIds.filter(sid => sid !== id));
    } else {
      setSelectedAccountIds([...selectedAccountIds, id]);
    }
  };

  const handleBatchDelete = async () => {
    if (confirm(`هل أنت متأكد من حذف ${selectedAccountIds.length} حسابات؟`)) {
      try {
        await Promise.all(selectedAccountIds.map(id => deleteAccount(id)));
        setSelectedAccountIds([]);
        toast.success("تم حذف الحسابات المختارة بنجاح");
      } catch (err) {
        toast.error("حدث خطأ أثناء حذف الحسابات.");
      }
    }
  };

  const handleBatchUpdateClassification = async (newClass: AccountClassification) => {
    try {
      await Promise.all(selectedAccountIds.map(id => updateAccount(id, { classification: newClass })));
      setSelectedAccountIds([]);
      toast.success("تم تحديث تصنيف الحسابات المحددة بنجاح");
    } catch (err) {
      console.error("Bulk classification update failed:", err);
      toast.error("حدث خطأ أثناء تحديث تصنيف الحسابات.");
    }
  };

  const handleBatchUpdateStatus = async (newStat: AccountStatus) => {
    try {
      await Promise.all(selectedAccountIds.map(id => updateAccount(id, { status: newStat })));
      setSelectedAccountIds([]);
      toast.success("تم تحديث حالة الحسابات المحددة بنجاح");
    } catch (err) {
      console.error("Bulk status update failed:", err);
      toast.error("حدث خطأ أثناء تحديث حالة الحسابات.");
    }
  };

  return (
    <div id="accounts-tree-root" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 rtl animate-slideup">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 id="chart-of-accounts-heading" className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-indigo-600" />
            دليل الحسابات الهرمي الشجري
          </h2>
          <p id="chart-of-accounts-sub" className="text-xs text-slate-500 mt-1">
            دليل محاسبي مرن من عدة مستويات لحصر الأصول والخصوم والملكيات وتحويل الأرصدة لحظياً.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGuard permission="manage-roles">
            <button
              onClick={() => setShowMaintenance(true)}
              className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Settings className="h-3.5 w-3.5" />
              صيانة البيانات
            </button>
          </PermissionGuard>

          <PermissionGuard permission="create-account">
            <button
              id="btn-add-account-toggle"
              onClick={() => {
                if (!isAdding) {
                  setNewName("");
                  setNewCode("");
                  setNewParentId("");
                  setNewBalance(0);
                  setNewIsTransactional(false);
                  setNewClassification("general");
                  setNewCategory("general");
                  setNewStatus("active");
                  setNewNotes("");
                  setNewCurrency(globalCurrencyCode || "USD");
                }
                setIsAdding(!isAdding);
                setIsEditingAccount(false);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              إضافة حساب جديد
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* 🗳️ لوحة العمليات الجماعية للتعديل والتصنيف */}
      <div className="mb-6 bg-slate-50/70 dark:bg-slate-950 p-4 rounded-xl border border-indigo-100 dark:border-slate-850/80 shadow-sm text-xs transition-all animate-slideup">
        <div className="flex flex-col gap-4">
          
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5 gap-2">
            <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-white text-[13px]">
              <span className="text-base">⚙️</span>
              <span>خيارات وإجراءات التعديل الجماعي للحسابات</span>
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-extrabold rounded-md text-[11px] font-mono">
                {selectedAccountIds.length} حسابات محددة
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 font-bold">
              <button
                type="button"
                onClick={() => setSelectedAccountIds(treeList.map(a => a.id))}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg transition shadow-sm cursor-pointer"
              >
                تحديد الكل ({treeList.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAccountIds([]);
                  setSelectedBatchClassification("");
                  setSelectedBatchStatus("");
                }}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition cursor-pointer"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>

          {/* Action Inputs Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            
            {/* Batch Classification Action */}
            <PermissionGuard permission="edit-account">
              <div className="lg:col-span-5 space-y-1.5">
                <label className="block font-bold text-slate-600 dark:text-slate-400 text-right">
                  1. تعديل تصنيف الحسابات المحددة جماعياً:
                </label>
                <div className="flex gap-1.5">
                  <select
                    disabled={selectedAccountIds.length === 0}
                    value={selectedBatchClassification}
                    onChange={(e) => setSelectedBatchClassification(e.target.value as AccountClassification)}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white cursor-pointer focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex-1 text-right"
                  >
                    <option value="">-- اختر التصنيف المراد تطبيقه --</option>
                    {Object.entries(classificationTranslations).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={selectedAccountIds.length === 0 || !selectedBatchClassification}
                    onClick={async () => {
                      if (confirm(`هل أنت متأكد من تغيير تصنيف الحسابات الـ ${selectedAccountIds.length} المحددة إلى: ${classificationTranslations[selectedBatchClassification as AccountClassification]}؟`)) {
                        await handleBatchUpdateClassification(selectedBatchClassification as AccountClassification);
                        setSelectedBatchClassification("");
                      }
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 cursor-pointer text-center"
                  >
                    تطبيق التعديل
                  </button>
                </div>
              </div>
            </PermissionGuard>

            {/* Batch Status Action */}
            <PermissionGuard permission="edit-account">
              <div className="lg:col-span-5 space-y-1.5">
                <label className="block font-bold text-slate-600 dark:text-slate-400 text-right">
                  2. تعديل حالة الحسابات المحددة جماعياً:
                </label>
                <div className="flex gap-1.5">
                  <select
                    disabled={selectedAccountIds.length === 0}
                    value={selectedBatchStatus}
                    onChange={(e) => setSelectedBatchStatus(e.target.value as AccountStatus)}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white cursor-pointer focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold flex-1 text-right"
                  >
                    <option value="">-- اختر الحالة المراد تطبيقها --</option>
                    {Object.entries(statusTranslations).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={selectedAccountIds.length === 0 || !selectedBatchStatus}
                    onClick={async () => {
                      if (confirm(`هل أنت متأكد من تغيير حالة الحسابات الـ ${selectedAccountIds.length} المحددة إلى: ${statusTranslations[selectedBatchStatus as AccountStatus]?.label}؟`)) {
                        await handleBatchUpdateStatus(selectedBatchStatus as AccountStatus);
                        setSelectedBatchStatus("");
                      }
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0 cursor-pointer text-center"
                  >
                    تطبيق التعديل
                  </button>
                </div>
              </div>
            </PermissionGuard>

            <PermissionGuard permission="delete-account">
              <div className="lg:col-span-2">
                <button
                  type="button"
                  disabled={selectedAccountIds.length === 0}
                  onClick={handleBatchDelete}
                  className="w-full flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 p-2 rounded-lg border border-rose-200 dark:border-rose-900/40 transition font-black shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed h-[36px]"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف الحسابات المحددة
                </button>
              </div>
            </PermissionGuard>

          </div>

          {selectedAccountIds.length === 0 && (
            <p className="text-[11px] text-slate-400 italic text-right mt-1">
              💡 قم بتحديد حساب واحد أو أكثر من جدول الحسابات أدناه (باستخدام مربعات التحديد بجانب كل حساب) للبدء في إجراء التعديلات الجماعية.
            </p>
          )}

        </div>
      </div>

      {/* Tabs & Activity Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        {/* Tabs Filter */}
        <div className="flex flex-wrap gap-1">
          <button
            id="tab-all-accounts"
            onClick={() => { setActiveTab("all"); onSelectAccount(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "all"
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            الكل ({onlyWithActivity ? accounts.filter(a => accountsWithActivity.allVisibleIds.has(a.id)).length : accounts.length})
          </button>
          {(Object.keys(typeTranslations) as AccountType[]).map((type) => {
            const trans = typeTranslations[type];
            const count = accounts.filter((a) => a.type === type && (!onlyWithActivity || accountsWithActivity.allVisibleIds.has(a.id))).length;
            return (
              <button
                id={`tab-accounts-${type}`}
                key={type}
                onClick={() => { setActiveTab(type); onSelectAccount(null); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === type
                    ? `${trans.bg} ${trans.color}`
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {trans.label.split(" ")[0]} ({count})
              </button>
            );
          })}
        </div>

        {/* Action Controls: Only with Movement Toggle & Search Input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الرمز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pr-8 pl-6 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Only Active Movement Toggle */}
          <button
            type="button"
            id="toggle-only-active-accounts"
            onClick={() => setOnlyWithActivity(!onlyWithActivity)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
              onlyWithActivity
                ? "bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            }`}
            title="إظهار الحسابات التي تمت عليها حركات مالية فقط (قيود وسندات)"
          >
            <Activity className="h-3.5 w-3.5 shrink-0" />
            <span>الحسابات ذات الحركة فقط</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
              onlyWithActivity
                ? "bg-white/25 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}>
              {accountsWithActivity.directActiveIds.size}
            </span>
          </button>
        </div>
      </div>

      {/* Slide-out or collapsible Form for creating/editing accounts */}
      {isAdding && (
        <form
          id="add-account-form"
          onSubmit={isEditingAccount ? handleUpdateAccountSubmit : handleAddAccountSubmit}
          className="mb-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 text-xs animate-slideup"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center justify-between">
            <span>{isEditingAccount ? "تعديل حساب حالي في الدليل" : "فتح حساب فرعي / رئيسي جديد في الدليل"}</span>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setIsEditingAccount(false); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              إلغاء ×
            </button>
          </h3>

          {errorMsg && <div className="p-2.5 mb-3 bg-red-50 text-red-600 rounded-lg">{errorMsg}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">رمز الحساب الهرمي (مثال: 1104):</label>
              <input
                id="input-acc-code"
                type="text"
                placeholder="أدخل الكود الرقمي الشجري..."
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">اسم الحساب الكامل (بالعربية):</label>
              <input
                id="input-acc-name"
                type="text"
                placeholder="مثال: ذمم العملاء المتميزة..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">الحساب الأب (Parent Account):</label>
              <select
                id="select-acc-parent"
                value={newParentId}
                onChange={(e) => {
                  setNewParentId(e.target.value);
                  const selectedParent = accounts.find((a) => a.id === e.target.value);
                  if (selectedParent) {
                    setNewType(selectedParent.type);
                    setNewCurrency(selectedParent.currency);

                    // Auto-increment code logic: find siblings of the new account (children of selectedParent)
                    const children = accounts.filter((a) => a.parentId === e.target.value);
                    if (children.length > 0) {
                      const maxCode = Math.max(...children.map((c) => parseInt(c.code, 10)).filter((n) => !isNaN(n)));
                      setNewCode((maxCode + 1).toString());
                    } else {
                      // No children, suggest starting with 01 appended to parent code
                      setNewCode(`${selectedParent.code}01`);
                    }
                  } else {
                    setNewCode("");
                  }
                }}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- حساب جذري رئيسي (بدون أب) --</option>
                {potentialParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    ({parent.code}) - {parent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">نوع الحساب الأساسي:</label>
              <select
                id="select-acc-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as AccountType)}
                disabled={!!newParentId}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white disabled:opacity-60 focus:outline-none"
              >
                <option value="asset">أصول (Asset)</option>
                <option value="liability">خصوم (Liability)</option>
                <option value="equity">حقوق ملكية (Equity)</option>
                <option value="revenue">إيرادات (Revenue)</option>
                <option value="expense">مصروفات (Expense)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">عملة محاسبة هذا الحساب:</label>
              <select
                id="select-acc-currency"
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {currencies.map((curr) => (
                  <option key={curr.id} value={curr.code}>
                    {curr.code} ({curr.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">الرصيد الافتتاحي الأولي:</label>
              <input
                id="input-acc-balance"
                type="number"
                placeholder="0.00"
                value={newBalance || ""}
                onChange={(e) => setNewBalance(Number(e.target.value))}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
            <input
              type="checkbox"
              id="input-acc-transactional"
              checked={newIsTransactional}
              onChange={(e) => setNewIsTransactional(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-600"
            />
            <label htmlFor="input-acc-transactional" className="text-indigo-800 dark:text-indigo-300 font-bold text-xs">
              هذا حساب فرعي يُسمح بإجراء قيود عليه (Transactional Account)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">تصنيف الحساب:</label>
              <select
                id="select-acc-classification"
                value={newClassification}
                onChange={(e) => setNewClassification(e.target.value as AccountClassification)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Object.entries(classificationTranslations).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">فئة الحساب (Category):</label>
              <select
                id="select-acc-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as AccountCategory)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Object.entries(categoryTranslations).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">حالة الحساب:</label>
              <select
                id="select-acc-status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as AccountStatus)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {Object.entries(statusTranslations).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">شروحات وملاحظات محاسبية إضافية:</label>
            <input
              id="input-acc-notes"
              type="text"
              placeholder="اكتب ملاحظات تسهّل عملية مراجعة وتدقيق الحساب تالياً..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              id="btn-add-account-cancel"
              type="button"
              onClick={() => { setIsAdding(false); setIsEditingAccount(false); }}
              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350 hover:bg-slate-300 transition duration-150 cursor-pointer text-xs"
            >
              إلغاء التغييرات
            </button>
            <button
              id="btn-add-account-submit"
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold transition duration-150 cursor-pointer text-xs disabled:opacity-50"
            >
              {isSaving ? "جارٍ الحفظ..." : (isEditingAccount ? "حفظ التعديلات" : "حفظ الحساب في السحابة")}
            </button>
          </div>
        </form>
      )}

      {/* Live Balance Exchange Converted Banner */}
      <div className="mb-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 p-2.5 rounded-xl flex flex-wrap justify-between items-center text-xs text-indigo-800 dark:text-indigo-300">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          📍 جاري عرض تقييم الدليل الموحد مع التحويل لـ: <strong className="text-indigo-600 dark:text-indigo-400">{globalCurrencyCode} ({selectedGlobalCurrencyObj.symbol})</strong>
        </span>
        <span className="text-slate-500 dark:text-slate-400 italic">
          يتم تحويل الأرصدة المتعددة لحظياً بناءً على أسعار صرف البنك المركزي المثبّتة.
        </span>
      </div>



      {/* Tree View List - Responsive */}
      {treeList.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-sm text-slate-500">لا توجد حسابات مطابقة للتصفية المحددة في هذا الحساب.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <div className="min-w-full border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 bg-slate-50 dark:bg-slate-900 py-3 px-4 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold text-xs">
                <div className="col-span-5 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={selectedAccountIds.length === treeList.length && treeList.length > 0} 
                    onChange={toggleSelectAll} 
                    className="h-4 w-4 rounded accent-indigo-600" 
                  />
                  الاسم والرمز المحاسبي
                </div>
                <div className="col-span-2">التصنيف</div>
                <div className="col-span-1">العملة الأصل</div>
                <div className="col-span-2 text-left">الرصيد الأصلي</div>
                <div className="col-span-2 text-left text-indigo-700 dark:text-indigo-400 font-extrabold flex items-center justify-end gap-1">
                  الرصيد بـ ({globalCurrencyCode})
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {treeList.map((node) => {
                  const depth = getNodeDepth(node);
                  const hasChildren = accounts.some((a) => a.parentId === node.id);
                  const isCollapsed = !!collapsed[node.id];
                  const trans = typeTranslations[node.type] || { color: "", label: "", bg: "" };
                  const isSelected = selectedAccount?.id === node.id;
                  const isRowSelected = selectedAccountIds.includes(node.id);

                  // If any of the ancestors of this node are collapsed, we should hide this node
                  let ancestorCollapsed = false;
                  let currentParentId = node.parentId;
                  while (currentParentId) {
                    if (collapsed[currentParentId]) {
                      ancestorCollapsed = true;
                      break;
                    }
                    // find grandparent
                    const parentNode = accounts.find((a) => a.id === currentParentId);
                    currentParentId = parentNode ? parentNode.parentId : null;
                  }

                  if (ancestorCollapsed) return null;

                  return (
                    <div
                      key={node.id}
                      id={`acc-node-${node.code}`}
                      onClick={(e) => {
                        // Only select if not clicking the checkbox
                        if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                            onSelectAccount(isSelected ? null : node);
                        }
                      }}
                      className={`grid grid-cols-12 items-center py-2.5 px-4 text-xs transition duration-150 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-r-2 border-indigo-600" : ""
                      } ${isRowSelected ? "bg-indigo-50/30" : ""}`}
                    >
                      <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={isRowSelected} 
                          onChange={() => toggleSelectRow(node.id)} 
                          className="h-4 w-4 rounded accent-indigo-600 shrink-0" 
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        {/* Indentation for Hierarchy - RTL Optimized */}
                        {depth > 0 && (
                          <div 
                            className="flex shrink-0 items-center font-mono text-slate-300 dark:text-slate-700 text-xs tracking-tighter select-none ml-1 mr-1.5"
                            dir="ltr"
                          >
                            {Array.from({ length: depth }).map((_, i) => (
                              <span key={i} className="inline-block whitespace-pre">
                                {i === depth - 1 ? "└── " : "│   "}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={(e) => toggleCollapse(node.id, e)}
                          className={`p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0 ${
                            !hasChildren && "opacity-0 cursor-default"
                          }`}
                        >
                          <Folder className={`h-4 w-4 ${isCollapsed ? "text-slate-400" : "text-amber-500 fill-amber-100 dark:fill-amber-950"}`} />
                        </button>
                        <span className="font-mono text-slate-400 select-all font-semibold shrink-0">
                          {node.code}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-1">
                          {node.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(node);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition opacity-0 group-hover:opacity-100 shrink-0 mr-1"
                          title="تعديل الحساب"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="col-span-2 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${trans.bg} ${trans.color}`}>
                            {trans.label.split(" ")[0]}
                          </span>
                          {node.isTransactional && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                              فرعي
                            </span>
                          )}
                          {accountsWithActivity.directActiveIds.has(node.id) && (
                            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200/50 font-bold flex items-center gap-1" title="توجد حركات مالية مسجلة على هذا الحساب">
                              <Activity className="h-2.5 w-2.5" />
                              له حركة
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700 font-bold" title="التصنيف">
                            {classificationTranslations[node.classification || "general"]}
                          </span>
                          {node.category && node.category !== "general" && (
                            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200/40 font-bold" title="الفئة">
                              {categoryTranslations[node.category]}
                            </span>
                          )}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${statusTranslations[node.status || "active"]?.bg} ${statusTranslations[node.status || "active"]?.color}`}>
                            {statusTranslations[node.status || "active"]?.label}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-1">
                        <span className="font-semibold font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 py-0.5 px-1.5 rounded">
                          {node.currency}
                        </span>
                      </div>

                      <div className="col-span-2 text-left font-mono font-bold text-slate-700 dark:text-slate-350">
                        {(node.balance ?? 0).toLocaleString()}
                      </div>

                      <div className="col-span-2 text-left font-mono font-extrabold text-indigo-600 dark:text-indigo-300">
                        {getConvertedBalance(node.balance ?? 0, node.currency, globalCurrencyCode)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Grid Layout */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
            {treeList.map((node) => {
              const trans = typeTranslations[node.type] || { color: "", label: "", bg: "" };
              const isSelected = selectedAccount?.id === node.id;
              
              // Only show items that aren't hidden by a collapsed parent
              let ancestorCollapsed = false;
              let currentParentId = node.parentId;
              while (currentParentId) {
                if (collapsed[currentParentId]) {
                  ancestorCollapsed = true;
                  break;
                }
                const parentNode = accounts.find((a) => a.id === currentParentId);
                currentParentId = parentNode ? parentNode.parentId : null;
              }
              if (ancestorCollapsed) return null;

              return (
                <div
                  key={node.id}
                  onClick={() => onSelectAccount(isSelected ? null : node)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 shadow-sm ${
                    isSelected 
                      ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-600 shadow-indigo-100 dark:shadow-none" 
                      : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox" 
                        checked={selectedAccountIds.includes(node.id)} 
                        onChange={() => toggleSelectRow(node.id)} 
                        className="h-4 w-4 rounded accent-indigo-600 shrink-0 cursor-pointer" 
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Folder className={`h-4 w-4 ${node.parentId ? "text-slate-400" : "text-amber-500"}`} />
                      <div>
                        <div className="text-[10px] font-mono font-black text-slate-400">{node.code}</div>
                        <div className="text-xs font-black text-slate-800 dark:text-white leading-tight">{node.name}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${trans.bg} ${trans.color}`}>
                      {trans.label.split(" ")[0]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-slate-900 pt-3">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 mb-0.5">الرصيد الأصلي</div>
                      <div className="text-[11px] font-mono font-black text-slate-700 dark:text-slate-300">
                        {(node.balance ?? 0).toLocaleString()} <span className="text-[9px] opacity-60">{node.currency}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] font-bold text-indigo-400 mb-0.5">الرصيد بـ ({globalCurrencyCode})</div>
                      <div className="text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-300">
                        {getConvertedBalance(node.balance ?? 0, node.currency, globalCurrencyCode).split(' ')[0]} <span className="text-[9px] opacity-60">{globalCurrencyCode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700 font-bold">
                      التصنيف: {classificationTranslations[node.classification || "general"]}
                    </span>
                    {node.category && node.category !== "general" && (
                      <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200/40 font-bold">
                        الفئة: {categoryTranslations[node.category]}
                      </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${statusTranslations[node.status || "active"]?.bg} ${statusTranslations[node.status || "active"]?.color}`}>
                      الحالة: {statusTranslations[node.status || "active"]?.label}
                    </span>
                    {accountsWithActivity.directActiveIds.has(node.id) && (
                      <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200/50 font-bold flex items-center gap-1">
                        <Activity className="h-2.5 w-2.5" />
                        له حركة
                      </span>
                    )}
                  </div>

                  {node.isTransactional && (
                    <div className="flex items-center gap-1 mt-auto">
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">حساب فرعي نشط</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Account Info Widget */}
      {selectedAccount && (
        <div id="selected-account-details-widget" className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200 animate-slideup">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
              <span>تفاصيل وحالة الحساب المحدّد:</span>
              <strong className="text-slate-900 dark:text-white">[{selectedAccount.code}] - {selectedAccount.name}</strong>
            </span>
            <button
              onClick={() => onSelectAccount(null)}
              className="text-slate-400 hover:text-slate-600 font-bold dark:hover:text-slate-200"
            >
              إلغاء التحديد ×
            </button>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 flex-1">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">التصنيف الهرمي:</span>
                <span className="font-semibold">{typeTranslations[selectedAccount.type]?.label || selectedAccount.type}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">تصنيف الحساب:</span>
                <span className="font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">{classificationTranslations[selectedAccount.classification || "general"]}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">فئة الحساب (Category):</span>
                <span className="font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">{categoryTranslations[selectedAccount.category || "general"]}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">حالة الحساب:</span>
                <span className={`font-semibold px-1.5 py-0.5 rounded ${statusTranslations[selectedAccount.status || "active"]?.bg} ${statusTranslations[selectedAccount.status || "active"]?.color}`}>{statusTranslations[selectedAccount.status || "active"]?.label}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">العملة الافتراضية:</span>
                <span className="font-semibold font-mono text-indigo-600 dark:text-indigo-400">{selectedAccount.currency}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">مجموع الرصيد الفعلي:</span>
                <span className="font-semibold font-mono">{(selectedAccount.balance ?? 0).toLocaleString()} {selectedAccount.currency}</span>
              </div>
            </div>
            
            <div className="flex gap-2 items-end justify-end shrink-0 mt-2 md:mt-0">
              <button
                onClick={() => onViewStatement && onViewStatement(selectedAccount.id)}
                className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 transition font-bold"
              >
                <FileText className="h-3.5 w-3.5" />
                كشف الحساب
              </button>
              <PermissionGuard permission="edit-account">
                <button
                  id={`btn-edit-account-${selectedAccount.id}`}
                  onClick={() => handleEditClick(selectedAccount)}
                  className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 transition font-bold"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  تعديل
                </button>
              </PermissionGuard>
              <PermissionGuard permission="delete-account">
                <button
                  id={`btn-del-account-${selectedAccount.id}`}
                  onClick={(e) => handleDelete(selectedAccount.id, e)}
                  className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg border border-red-200 transition font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  شطب
                </button>
              </PermissionGuard>
            </div>
          </div>
          {selectedAccount.notes && (
            <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-bold">شروحات وتفاصيل وملاحظات: </span>
              <span className="text-slate-700 dark:text-slate-300 italic">{selectedAccount.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-200">
            <div className="bg-slate-50 dark:bg-slate-850 p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">صيانة وتحديث قاعدة البيانات</h3>
                  <p className="text-xs text-slate-500 mt-0.5">أدوات متقدمة لتصحيح الهيكلية وضمان سلامة المراجع.</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-1" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">تحديث معرفات الحسابات (ID Update)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      هذه الأداة تقوم بمزامنة المعرف البرمجي (ID) لكل حساب مع رمزه المحاسبي (Code). 
                      تفيد في تسهيل الاستعلامات المباشرة وضمان عدم تكرار الحسابات. 
                      سيتم تحديث كافة القيود، السندات، الحجوزات، والعملاء المرتبطين تلقائياً.
                    </p>
                    
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">حالة الحسابات:</span>
                        <span className={accounts.filter(a => a.id !== a.code).length > 0 ? "text-rose-500" : "text-emerald-500"}>
                          {accounts.filter(a => a.id !== a.code).length > 0 
                            ? `يوجد ${accounts.filter(a => a.id !== a.code).length} حساب يحتاج للتحديث` 
                            : "كافة الحسابات سليمة"}
                        </span>
                      </div>
                      
                      {isMigrating ? (
                        <div className="space-y-2 mt-2">
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 transition-all duration-300" 
                              style={{ width: `${(migrationProgress / migrationTotal) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-black text-indigo-600">
                            <span>جاري المعالجة...</span>
                            <span>{migrationProgress} / {migrationTotal}</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={handleBulkMigrateIDs}
                          disabled={accounts.filter(a => a.id !== a.code).length === 0}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition shadow-md cursor-pointer"
                        >
                          <RefreshCcw className="h-4 w-4" />
                          بدء التحديث الجماعي
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-850 flex justify-end">
              <button
                onClick={() => setShowMaintenance(false)}
                disabled={isMigrating}
                className="px-6 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
