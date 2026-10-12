import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Eye,
  Filter,
  ArrowUpDown,
  BookOpen,
  UserCheck,
  Lock,
  LockOpen,
  Activity,
  FileText,
  MessageSquare,
  TrendingUp,
  LayoutGrid,
  Layers,
  ArrowRightLeft,
  Calendar,
} from "lucide-react";
import { Transaction, Account } from "../types";
import { toast } from "sonner";

interface FinancialAuditProps {
  transactions: Transaction[];
  accounts: Account[];
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export default function FinancialAudit({
  transactions,
  accounts,
  onUpdateTransaction,
}: FinancialAuditProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "audited" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"individual" | "booking" | "date" | "type">("individual");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [auditNotes, setAuditNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter transactions
  const filteredTx = transactions.filter((tx) => {
    // Audit Status sorting
    const txStatus = tx.status || "pending_audit"; // default un-audited to pending_audit for CFO review
    
    if (activeTab === "pending" && txStatus !== "pending_audit") return false;
    if (activeTab === "audited" && txStatus !== "audited") return false;
    if (activeTab === "rejected" && txStatus !== "rejected") return false;

    // Search query
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const debAcc = accounts.find((a) => a.id === tx.debitAccountId)?.name.toLowerCase() || "";
      const credAcc = accounts.find((a) => a.id === tx.creditAccountId)?.name.toLowerCase() || "";
      return (
        tx.description.toLowerCase().includes(query) ||
        tx.id.toLowerCase().includes(query) ||
        debAcc.includes(query) ||
        credAcc.includes(query) ||
        tx.amount.toString().includes(query)
      );
    }

    return true;
  });

  const handleApprove = async (txId: string) => {
    setIsSubmitting(true);
    try {
      await onUpdateTransaction(txId, {
        status: "audited",
        auditedBy: "المدير المالي",
        auditedAt: new Date().toISOString(),
        auditNotes: auditNotes || "تم التدقيق والموافقة من قبل المدير المالي",
      });
      toast.success("تم اعتماد الحركة بنجاح وإثبات قيدها النهائي.");
      setSelectedTx(null);
      setAuditNotes("");
      setSelectedIds(prev => prev.filter(id => id !== txId));
    } catch (err) {
      toast.error("حدث خطأ أثناء اعتماد الحركة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    const count = selectedIds.length;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          onUpdateTransaction(id, {
            status: "audited",
            auditedBy: "المدير المالي",
            auditedAt: new Date().toISOString(),
            auditNotes: auditNotes || "تم التدقيق الجماعي والموافقة من قبل المدير المالي",
          })
        )
      );
      toast.success(`تم اعتماد ${count} حركة محاسبية بنجاح.`);
      setSelectedIds([]);
      setAuditNotes("");
      setSelectedTx(null);
    } catch (err) {
      toast.error("حدث خطأ أثناء الاعتماد الجماعي");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (!auditNotes.trim()) {
      toast.error("يرجى كتابة سبب الرفض الجماعي لتوجيه المحاسب");
      return;
    }
    setIsSubmitting(true);
    const count = selectedIds.length;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          onUpdateTransaction(id, {
            status: "rejected",
            auditedBy: "المدير المالي",
            auditedAt: new Date().toISOString(),
            auditNotes: auditNotes,
          })
        )
      );
      toast.error(`تم رفض ${count} حركة محاسبية وإعادتها للمراجعة.`);
      setSelectedIds([]);
      setAuditNotes("");
      setSelectedTx(null);
    } catch (err) {
      toast.error("حدث خطأ أثناء الرفض الجماعي");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelection = (txId: string) => {
    setSelectedIds((prev) =>
      prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId]
    );
  };

  const toggleGroupSelection = (txs: Transaction[]) => {
    const txIds = txs.map(t => t.id);
    const allSelected = txIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !txIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...txIds])]);
    }
  };

  const handleReject = async (txId: string) => {
    if (!auditNotes.trim()) {
      toast.error("يرجى كتابة سبب الرفض لتوجيه المحاسب");
      return;
    }
    setIsSubmitting(true);
    try {
      await onUpdateTransaction(txId, {
        status: "rejected",
        auditedBy: "المدير المالي",
        auditedAt: new Date().toISOString(),
        auditNotes: auditNotes,
      });
      toast.error("تم رفض القيد المالي وإرجاعه للمحاسب للمراجعة والتعديل.");
      setSelectedTx(null);
      setAuditNotes("");
    } catch (err) {
      toast.error("حدث خطأ أثناء رفض الحركة");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats Calculations
  const pendingCount = transactions.filter((t) => !t.status || t.status === "pending_audit").length;
  const auditedCount = transactions.filter((t) => t.status === "audited").length;
  const rejectedCount = transactions.filter((t) => t.status === "rejected").length;
  const totalAuditedVolume = transactions
    .filter((t) => t.status === "audited")
    .reduce((sum, t) => sum + t.amount, 0);

  const getBookingIdFromSource = (tx: Transaction) => {
    // 1. Check sourceId for BOK pattern
    if (tx.sourceId) {
      const match = tx.sourceId.match(/BOK-\d{4}-\d{4}/);
      if (match) return match[0];
    }
    
    // 2. Check description for BOK pattern
    if (tx.description) {
      const match = tx.description.match(/BOK-\d{4}-\d{4}/);
      if (match) return match[0];
    }

    // 3. Fallback to older logic if needed
    if (tx.sourceType === 'booking' && tx.sourceId) {
      const parts = tx.sourceId.split('-');
      if (parts.length >= 3 && parts[0] === 'BOK') {
        return parts.slice(0, 3).join('-');
      }
      return tx.sourceId.split('-')[0];
    }
    return null;
  };

  const groupedItems = React.useMemo(() => {
    if (viewMode === "individual") {
      return filteredTx.map((tx) => ({ type: "single" as const, data: tx, id: tx.id }));
    }

    const groups: Record<string, Transaction[]> = {};
    
    filteredTx.forEach((tx) => {
      let key = "";
      if (viewMode === "booking") {
        key = getBookingIdFromSource(tx) || "غير مرتبط بحجز";
      } else if (viewMode === "date") {
        key = tx.date;
      } else if (viewMode === "type") {
        key = tx.sourceType || "قيد يدوي";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });

    return Object.entries(groups).map(([key, txs]) => {
      let title = key;
      let subtitle = "";
      
      if (viewMode === "booking" && key !== "غير مرتبط بحجز") {
        const nameTx = txs.find(t => t.description?.includes(":")) || txs[0];
        if (nameTx && nameTx.description?.includes(":")) {
          subtitle = nameTx.description.split(":")[1].split("-")[0].trim();
        }
        title = `حجز: ${key}`;
      } else if (viewMode === "type") {
        title = `نوع: ${key}`;
      } else if (viewMode === "date") {
        title = `تاريخ: ${key}`;
      }

      return {
        type: "group" as const,
        id: key,
        title,
        subtitle,
        data: txs,
        totalAmount: txs.reduce((sum, t) => sum + t.amount, 0),
        currency: txs[0]?.currency || "YER",
      };
    });
  }, [filteredTx, viewMode]);

  const relatedTransactions = React.useMemo(() => {
    if (!selectedTx) return [];
    const bId = getBookingIdFromSource(selectedTx);
    if (!bId) return [selectedTx];
    
    // Find all transactions for this booking in the main transactions list
    return transactions.filter(t => getBookingIdFromSource(t) === bId);
  }, [selectedTx, transactions]);

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-indigo-500" />
          تدقيق الحركات والقيود المالية
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
          بوابة المدير المالي لمراجعة القيود اليومية، سندات الصرف والقبض، واعتمادها رسمياً في الميزانية أو رفضها
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400">حركات بانتظار الاعتماد</span>
            <span className="text-lg font-black text-amber-600 block mt-1">{pendingCount} حركة محاسبية</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400">الحركات المعتمدة بالكامل</span>
            <span className="text-lg font-black text-emerald-600 block mt-1">{auditedCount} حركة معتمدة</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400">حركات مرفوضة ومستبعدة</span>
            <span className="text-lg font-black text-rose-500 block mt-1">{rejectedCount} قيد معلق</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center">
            <XCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-indigo-950/40 text-white rounded-2xl border border-slate-800 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400">حجم التدفقات المعتمدة</span>
            <span className="text-lg font-black text-indigo-400 block mt-1">{totalAuditedVolume.toLocaleString()} YER</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main filter tabs & table area */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
            <button
              onClick={() => {
                setActiveTab("pending");
                setSelectedTx(null);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              قيد التدقيق والانتظار ({pendingCount})
            </button>
            <button
              onClick={() => {
                setActiveTab("audited");
                setSelectedTx(null);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${
                activeTab === "audited"
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              الحركات المعتمدة ({auditedCount})
            </button>
            <button
              onClick={() => {
                setActiveTab("rejected");
                setSelectedTx(null);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${
                activeTab === "rejected"
                  ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              القيود المرفوضة ({rejectedCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* View Toggle */}
            <div className="flex flex-wrap bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setViewMode("individual")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold whitespace-nowrap ${
                  viewMode === "individual"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>فردي</span>
              </button>
              <button
                onClick={() => setViewMode("booking")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold whitespace-nowrap ${
                  viewMode === "booking"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>حسب الحجز</span>
              </button>
              <button
                onClick={() => setViewMode("date")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold whitespace-nowrap ${
                  viewMode === "date"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>حسب التاريخ</span>
              </button>
              <button
                onClick={() => setViewMode("type")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold whitespace-nowrap ${
                  viewMode === "type"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>حسب النوع</span>
              </button>
            </div>

            {/* Search bar */}
            <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث بالبيان، الحساب، المعرف..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

        {/* Transactions List area */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-y-auto max-h-[700px] custom-scrollbar">
            <div className={`grid grid-cols-1 ${viewMode === 'individual' ? 'md:grid-cols-2 xl:grid-cols-3' : ''} divide-y divide-slate-100 dark:divide-slate-800 gap-px bg-slate-100 dark:bg-slate-800`}>
              {groupedItems.map((item) => {
                if (item.type === "group") {
                  const isExpanded = expandedGroups.includes(item.id);
                  const allSelected = item.data.every(tx => selectedIds.includes(tx.id));
                  const someSelected = item.data.some(tx => selectedIds.includes(tx.id));

                  return (
                    <div key={item.id} className="bg-white dark:bg-slate-900">
                      {/* Group Header */}
                      <div
                        onClick={() => {
                          setExpandedGroups(prev => 
                            prev.includes(item.id) 
                              ? prev.filter(id => id !== item.id) 
                              : [...prev, item.id]
                          );
                        }}
                        className={`p-5 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          isExpanded ? "bg-slate-50/50 dark:bg-slate-800/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroupSelection(item.data);
                            }}
                            className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                              allSelected 
                                ? "bg-amber-500 border-amber-500 text-white" 
                                : someSelected 
                                  ? "bg-amber-500/20 border-amber-500 text-amber-500"
                                  : "border-slate-200 dark:border-slate-700 hover:border-amber-400"
                            }`}
                          >
                            {allSelected && <CheckCircle className="h-4 w-4 stroke-[3]" />}
                            {!allSelected && someSelected && <div className="w-2.5 h-0.5 bg-amber-500 rounded-full" />}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-800 dark:text-white">
                                {item.title}
                              </h4>
                              {item.subtitle && (
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              تحتوي على ({item.data.length}) حركات محاسبية
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-left">
                            <span className="text-[9px] text-slate-400 block font-bold">إجمالي القيمة:</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {item.totalAmount.toLocaleString()} <span className="text-[10px] text-indigo-500 font-bold">{item.currency}</span>
                            </span>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"
                          >
                            <TrendingUp className="h-4 w-4 rotate-90" />
                          </motion.div>
                        </div>
                      </div>

                      {/* Group Body (Collapsible) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20"
                          >
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                              {item.data.map((tx) => {
                                const isSelected = selectedIds.includes(tx.id);
                                const debAcc = accounts.find((a) => a.id === tx.debitAccountId);
                                const credAcc = accounts.find((a) => a.id === tx.creditAccountId);
                                return (
                                  <div
                                    key={tx.id}
                                    onClick={() => {
                                      setSelectedTx(tx);
                                      setAuditNotes(tx.auditNotes || "");
                                    }}
                                    className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                                      isSelected 
                                        ? "border-indigo-500 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5" 
                                        : "border-slate-100 dark:border-slate-800 hover:border-indigo-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSelection(tx.id);
                                        }}
                                        className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                                          isSelected 
                                            ? "bg-indigo-600 border-indigo-600 text-white" 
                                            : "border-slate-300 dark:border-slate-700"
                                        }`}
                                      >
                                        {isSelected && <CheckCircle className="h-3 w-3 stroke-[3]" />}
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-bold">{tx.date}</span>
                                    </div>
                                    <h5 className="text-[11px] font-black text-slate-800 dark:text-white line-clamp-1 mb-3">
                                      {tx.description}
                                    </h5>
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                      <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-slate-500 truncate max-w-[80px]">{debAcc?.name || "---"}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span className="text-slate-500 truncate max-w-[80px]">{credAcc?.name || "---"}</span>
                                      </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                      <span className="text-[9px] text-slate-400">#{tx.id.substring(tx.id.length - 6)}</span>
                                      <span className="text-[11px] font-black text-slate-900 dark:text-white">
                                        {tx.amount.toLocaleString()} <span className="text-[9px] text-indigo-500">{tx.currency}</span>
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                const tx = item.data;
                const isSelected = selectedIds.includes(tx.id);
                const debAcc = accounts.find((a) => a.id === tx.debitAccountId);
                const credAcc = accounts.find((a) => a.id === tx.creditAccountId);

                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      setSelectedTx(tx);
                      setAuditNotes(tx.auditNotes || "");
                    }}
                    className={`p-5 bg-white dark:bg-slate-900 transition text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 relative group ${
                      isSelected ? "ring-2 ring-indigo-500/30 z-10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(tx.id);
                          }}
                          className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                          }`}
                        >
                          {isSelected && <CheckCircle className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
                          {tx.sourceType ? `مصدر: ${tx.sourceType}` : "قيد يدوي"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">{tx.date}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-slate-800 dark:text-white mt-1 line-clamp-2 min-h-[2rem]">
                      {tx.description}
                    </h4>

                    <div className="grid grid-cols-2 gap-4 mt-4 text-[11px] font-bold text-slate-500">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-emerald-600 block text-[9px] mb-1">المدين:</span>
                        <span className="truncate block">{debAcc ? debAcc.name : "غير معروف"}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-rose-500 block text-[9px] mb-1">الدائن:</span>
                        <span className="truncate block">{credAcc ? credAcc.name : "غير معروف"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4 pt-3 text-[10px]">
                      <span className="text-slate-400 font-bold">#{tx.id.substring(tx.id.length - 8)}</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {tx.amount.toLocaleString()} <span className="text-[10px] text-indigo-500 font-bold">{tx.currency}</span>
                      </span>
                    </div>
                  </div>
                );
              })}

              {groupedItems.length === 0 && (
                <div className="col-span-full p-20 text-center text-slate-400 space-y-3 flex flex-col items-center bg-white dark:bg-slate-900">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-slate-300" />
                  </div>
                  <div className="font-bold text-xs">لا توجد حركات محاسبية مطابقة للبحث حالياً</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Detail Modal */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                      تدقيق تفاصيل الحركة المحاسبية
                    </h3>
                    <p className="text-xs text-slate-400 font-bold">المراجعة الشاملة للحسابات المربوطة والمبالغ</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">الرقم المرجعي للقيد</span>
                    <span className="text-sm font-black text-slate-800 dark:text-white block truncate">{selectedTx.id}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-1 text-left">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">تاريخ القيد</span>
                    <span className="text-sm font-black text-slate-800 dark:text-white block">{selectedTx.date}</span>
                  </div>
                </div>

                {relatedTransactions.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-black flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-amber-500" />
                        سجل الحركات المرتبطة بهذا الحجز ({relatedTransactions.length} قيود)
                      </span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                      <table className="w-full text-right text-[10px] font-bold">
                        <thead>
                          <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="p-3 w-10">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroupSelection(relatedTransactions);
                                }}
                                className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center transition-all hover:border-indigo-500"
                              >
                                {relatedTransactions.every(rtx => selectedIds.includes(rtx.id)) && <CheckCircle className="h-3.5 w-3.5 text-indigo-500 stroke-[3]" />}
                              </button>
                            </th>
                            <th className="p-3">البيان</th>
                            <th className="p-3">المدين</th>
                            <th className="p-3">الدائن</th>
                            <th className="p-3 text-left">المبلغ</th>
                            <th className="p-3 text-center">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {relatedTransactions.map((rtx) => (
                            <tr 
                              key={rtx.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelection(rtx.id);
                              }}
                              className={`cursor-pointer transition-colors ${
                                rtx.id === selectedTx.id 
                                  ? "bg-indigo-50/50 dark:bg-indigo-950/30" 
                                  : selectedIds.includes(rtx.id)
                                    ? "bg-indigo-50/20 dark:bg-indigo-950/10"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              <td className="p-3">
                                <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                                  selectedIds.includes(rtx.id)
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "border-slate-300 dark:border-slate-600"
                                }`}>
                                  {selectedIds.includes(rtx.id) && <CheckCircle className="h-2.5 w-2.5 stroke-[3]" />}
                                </div>
                              </td>
                              <td className="p-3 max-w-[200px] truncate">{rtx.description}</td>
                              <td className="p-3 text-emerald-600">{accounts.find(a => a.id === rtx.debitAccountId)?.name || "---"}</td>
                              <td className="p-3 text-rose-500">{accounts.find(a => a.id === rtx.creditAccountId)?.name || "---"}</td>
                              <td className="p-3 text-left font-black">{rtx.amount.toLocaleString()} {rtx.currency}</td>
                              <td className="p-3 text-center">
                                {rtx.status === 'audited' ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                                ) : rtx.status === 'rejected' ? (
                                  <XCircle className="h-3.5 w-3.5 text-rose-500 mx-auto" />
                                ) : (
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-2">البيان والشرح:</span>
                    <p className="text-sm font-black text-slate-800 dark:text-white leading-relaxed">
                      {selectedTx.description}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">القيمة الإجمالية:</span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {selectedTx.amount.toLocaleString()} <span className="text-sm">{selectedTx.currency}</span>
                      </span>
                    </div>
                    {selectedTx.sourceType && (
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        نوع المصدر: {selectedTx.sourceType}
                      </span>
                    )}
                  </div>
                </div>

                {/* Account Details Check */}
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-400 font-bold block">التوجيه المحاسبي المعتمد:</span>

                  <div className="grid grid-cols-2 gap-4 relative">
                    <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-emerald-600 font-black text-[10px]">حساب المدين (من حـ/)</span>
                      </div>
                      <span className="font-black text-slate-800 dark:text-white block text-sm">
                        {accounts.find((a) => a.id === selectedTx.debitAccountId)?.name || "غير معروف"}
                      </span>
                    </div>

                    <div className="p-4 bg-rose-50/30 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-rose-600 font-black text-[10px]">حساب الدائن (إلى حـ/)</span>
                      </div>
                      <span className="font-black text-slate-800 dark:text-white block text-sm">
                        {accounts.find((a) => a.id === selectedTx.creditAccountId)?.name || "غير معروف"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Actions */}
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-500" />
                      <label className="text-[10px] text-slate-400 font-bold">ملاحظات التدقيق وتوجيهات المدير المالي:</label>
                    </div>
                    <textarea
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      placeholder="اكتب التوجيهات أو سبب الرفض هنا..."
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24 resize-none transition-all"
                      disabled={activeTab !== "pending"}
                    />
                  </div>

                  {activeTab === "pending" ? (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        onClick={() => handleReject(selectedTx.id)}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black py-3 px-6 rounded-2xl text-sm cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                      >
                        <XCircle className="h-5 w-5" />
                        رفض وتوجيه للتعديل
                      </button>
                      <button
                        onClick={() => handleApprove(selectedTx.id)}
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-6 rounded-2xl text-sm cursor-pointer active:scale-95 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                      >
                        <CheckCircle className="h-5 w-5" />
                        اعتماد وموافقـة
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-center">
                      {activeTab === "audited" ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm">
                          <CheckCircle className="h-5 w-5" />
                          <span>تم اعتماد هذا القيد المالي مسبقاً</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-rose-500 font-black text-sm">
                          <XCircle className="h-5 w-5" />
                          <span>تم رفض هذا القيد المالي وإعادته للمراجعة</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-4"
          >
            <div className="bg-slate-900 dark:bg-indigo-950 border border-slate-800 dark:border-indigo-900 rounded-[2rem] shadow-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">إجراء جماعي لعدد ({selectedIds.length}) قيد</h4>
                  <p className="text-[10px] text-indigo-300 font-bold">يمكنك اعتماد أو رفض كافة القيود المحددة دفعة واحدة</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  إلغاء التحديد
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition active:scale-95 disabled:opacity-50"
                >
                  رفض جماعي
                </button>
                <button
                  onClick={handleBulkApprove}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                >
                  اعتماد جماعي
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
