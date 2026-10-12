import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  Printer,
  CheckCircle,
  FileText,
  Calendar,
  CreditCard,
  Percent,
  Check,
  Building,
  User,
  Users,
  AlertCircle,
  Eye,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Employee, Currency, Account, EmployeePayrollSheet, EmployeePayrollRecord } from "../types";
import { toast } from "sonner";
import { usePermissions, PermissionGuard } from "../lib/permissions";

interface PayrollManagementProps {
  employees: Employee[];
  currencies: Currency[];
  accounts: Account[];
  payrollSheets: EmployeePayrollSheet[];
  onAddPayrollSheet: (sheet: Omit<EmployeePayrollSheet, "id" | "createdAt">) => Promise<string>;
  onUpdatePayrollSheet: (id: string, updates: Partial<EmployeePayrollSheet>) => Promise<void>;
  onDeletePayrollSheet: (id: string) => Promise<void>;
  onPostDoubleEntry: (txData: any) => Promise<string>;
}

export default function PayrollManagement({
  employees,
  currencies,
  accounts,
  payrollSheets,
  onAddPayrollSheet,
  onUpdatePayrollSheet,
  onDeletePayrollSheet,
  onPostDoubleEntry,
}: PayrollManagementProps) {
  const { hasPermission } = usePermissions();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7) // e.g. "2026-06"
  );
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [isEditingRecords, setIsEditingRecords] = useState(false);
  const [editingRecords, setEditingRecords] = useState<EmployeePayrollRecord[]>([]);
  const [showPostingModal, setShowPostingModal] = useState(false);

  // Accounts selection for double-entry posting
  const [postingAccounts, setPostingAccounts] = useState({
    expenseAccountId: "",
    cashBankAccountId: "",
  });

  const activeSheet = payrollSheets.find((s) => s.id === activeSheetId) || 
    payrollSheets.find((s) => s.month === selectedMonth) || null;

  const handleCreateSheet = async () => {
    if (employees.length === 0) {
      toast.error("لا يمكن إنشاء مسودة كشف رواتب بدون وجود موظفين مسجلين في النظام!");
      return;
    }

    const alreadyExists = payrollSheets.find((s) => s.month === selectedMonth);
    if (alreadyExists) {
      toast.error(`كشف رواتب شهر ${selectedMonth} موجود بالفعل!`);
      setActiveSheetId(alreadyExists.id);
      return;
    }

    const records: EmployeePayrollRecord[] = employees.map((emp) => ({
      employeeId: emp.id,
      employeeName: emp.name,
      basicSalary: emp.salary,
      currency: emp.currency,
      allowances: 0,
      deductions: 0,
      netSalary: emp.salary,
      notes: "",
    }));

    try {
      const payload: Omit<EmployeePayrollSheet, "id" | "createdAt"> = {
        month: selectedMonth,
        status: "draft",
        records,
      };

      const newId = await onAddPayrollSheet(payload);
      setActiveSheetId(newId);
      toast.success(`تم إنشاء كشف رواتب مسودة لشهر ${selectedMonth} بنجاح.`);
    } catch (err) {
      toast.error("حدث خطأ أثناء إنشاء كشف الرواتب");
    }
  };

  const handleStartEditRecords = () => {
    if (!activeSheet) return;
    setEditingRecords(JSON.parse(JSON.stringify(activeSheet.records)));
    setIsEditingRecords(true);
  };

  const handleRecordChange = (idx: number, field: "allowances" | "deductions" | "notes", value: any) => {
    const updated = [...editingRecords];
    const record = updated[idx];

    if (field === "allowances" || field === "deductions") {
      const numVal = Math.max(0, Number(value) || 0);
      record[field] = numVal;
      record.netSalary = record.basicSalary + record.allowances - record.deductions;
    } else {
      record[field] = value;
    }

    setEditingRecords(updated);
  };

  const handleSaveRecords = async () => {
    if (!activeSheet) return;
    try {
      await onUpdatePayrollSheet(activeSheet.id, {
        records: editingRecords,
      });
      setIsEditingRecords(false);
      toast.success("تم حفظ تعديلات كشف الرواتب بنجاح.");
    } catch (err) {
      toast.error("حدث خطأ أثناء حفظ التعديلات");
    }
  };

  const handleApproveSheet = async () => {
    if (!activeSheet) return;
    try {
      await onUpdatePayrollSheet(activeSheet.id, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: "المدير المالي",
      });
      toast.success("تم اعتماد كشف الرواتب بنجاح! جاهز للصرف والترحيل المالي.");
    } catch (err) {
      toast.error("حدث خطأ أثناء اعتماد الكشف");
    }
  };

  const handleOpenPostingModal = () => {
    if (!activeSheet) return;
    // Pre-fill standard configurations if possible
    const standardExpense = accounts.find((a) => a.code.startsWith("5") && a.isTransactional)?.id || "";
    const standardCash = accounts.find((a) => a.code.startsWith("1101") || (a.type === "asset" && a.name.includes("صندوق") && a.isTransactional))?.id || "";

    setPostingAccounts({
      expenseAccountId: standardExpense,
      cashBankAccountId: standardCash,
    });
    setShowPostingModal(true);
  };

  const handleDisbursePayroll = async () => {
    if (!activeSheet) return;
    if (!postingAccounts.expenseAccountId || !postingAccounts.cashBankAccountId) {
      toast.error("يرجى اختيار الحسابات المالية اللازمة لعملية الصرف");
      return;
    }

    try {
      toast.info("جاري معالجة وترحيل رواتب الموظفين محاسبياً...");

      // Post individual transactions for each employee salary
      for (const record of activeSheet.records) {
        if (record.netSalary <= 0) continue;

        const selectedCurrency = currencies.find((c) => c.code === record.currency) || { rateToBase: 1 };

        const txPayload = {
          date: new Date().toISOString().split("T")[0],
          description: `صرف راتب الموظف: ${record.employeeName} لشهر ${activeSheet.month} (أساسي: ${record.basicSalary.toLocaleString()}، بدلات: ${record.allowances.toLocaleString()}، استقطاع: ${record.deductions.toLocaleString()})`,
          debitAccountId: postingAccounts.expenseAccountId, // Expense Account (Salaries and Wages)
          creditAccountId: postingAccounts.cashBankAccountId, // Asset Account (Cash/Bank)
          amount: record.netSalary,
          currency: record.currency,
          rate: selectedCurrency.rateToBase,
          sourceType: "payroll",
          sourceId: `payroll-${activeSheet.id}-${record.employeeId}`,
          status: "pending_audit", // Requires CFO review
        };

        await onPostDoubleEntry(txPayload);
      }

      await onUpdatePayrollSheet(activeSheet.id, {
        status: "paid",
        paidAt: new Date().toISOString(),
        paidBy: "أمين الصندوق والمدير المالي",
      });

      setShowPostingModal(false);
      toast.success(`تم ترحيل وصرف رواتب شهر ${activeSheet.month} بنجاح وإنشاء القيود المالية اللازمة! المعاملات قيد التدقيق لدى المدير المالي.`);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء صرف وترحيل الرواتب");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "مسودة (قيد التحضير)";
      case "approved":
        return "معتمد (جاهز للصرف)";
      case "paid":
        return "تم الصرف والترحيل";
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      case "approved":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
      case "paid":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Calculations
  const totalBasic = activeSheet?.records.reduce((sum, r) => sum + r.basicSalary, 0) || 0;
  const totalAllowances = activeSheet?.records.reduce((sum, r) => sum + r.allowances, 0) || 0;
  const totalDeductions = activeSheet?.records.reduce((sum, r) => sum + r.deductions, 0) || 0;
  const totalNet = activeSheet?.records.reduce((sum, r) => sum + r.netSalary, 0) || 0;

  return (
    <div className="space-y-6 text-right print:space-y-4 print:p-0">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-indigo-500" />
            مسيرات وكشوفات رواتب الموظفين
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
            تنظيم كشوفات الرواتب الشهرية، البدلات والخصومات، ترحيل رواتب الموظفين محاسبياً وطباعة مسيرات الدفع
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <Calendar className="h-4 w-4 text-indigo-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          {!activeSheet ? (
            <button
              onClick={handleCreateSheet}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              إنشاء مسودة كشف
            </button>
          ) : (
            <div className="text-xs text-slate-400 font-bold">
              كشف شهر {selectedMonth} نشط الآن
            </div>
          )}
        </div>
      </div>

      {activeSheet ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">إجمالي الرواتب الأساسية</span>
              <span className="text-lg font-black text-slate-800 dark:text-white mt-1">
                {totalBasic.toLocaleString()} <span className="text-xs text-indigo-500">YER</span>
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">إجمالي البدلات والمكافآت</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                +{totalAllowances.toLocaleString()} <span className="text-xs">YER</span>
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">إجمالي الخصومات والاستقطاع</span>
              <span className="text-lg font-black text-rose-500 mt-1">
                -{totalDeductions.toLocaleString()} <span className="text-xs">YER</span>
              </span>
            </div>

            <div className="bg-slate-900 text-white dark:bg-indigo-950/40 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">صافي الرواتب المستحقة</span>
              <span className="text-xl font-black text-indigo-400 mt-1">
                {totalNet.toLocaleString()} <span className="text-xs text-white">YER</span>
              </span>
            </div>
          </div>

          {/* Action buttons & info bar */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-slate-800 dark:text-white">حالة الكشف:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${getStatusBadgeClass(activeSheet.status)}`}>
                {getStatusText(activeSheet.status)}
              </span>
              {activeSheet.status === "approved" && (
                <span className="text-xs text-slate-400 font-bold">معتمد بواسطة {activeSheet.approvedBy}</span>
              )}
              {activeSheet.status === "paid" && (
                <span className="text-xs text-emerald-500 font-bold">تم الصرف والترحيل بالكامل</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeSheet.status === "draft" && !isEditingRecords && (
                <>
                  <button
                    onClick={handleStartEditRecords}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    تعديل المكافآت والخصومات
                  </button>
                  <button
                    onClick={handleApproveSheet}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    اعتماد كشف الرواتب
                  </button>
                </>
              )}

              {isEditingRecords && (
                <>
                  <button
                    onClick={handleSaveRecords}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    حفظ التغييرات
                  </button>
                  <button
                    onClick={() => setIsEditingRecords(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-500 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </>
              )}

              {activeSheet.status === "approved" && (
                <button
                  onClick={handleOpenPostingModal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  صرف الرواتب والترحيل لليومية
                </button>
              )}

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                طباعة مسير الرواتب
              </button>

              <button
                onClick={() => {
                  if (confirm("هل تريد حذف هذا الكشف تماماً؟ لن يؤثر على أي معاملات مالية مسجلة مسبقاً.")) {
                    onDeletePayrollSheet(activeSheet.id).then(() => {
                      setActiveSheetId(null);
                      toast.success("تم حذف الكشف بنجاح");
                    });
                  }
                }}
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl"
                title="حذف كشف الرواتب"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm print:border-none">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 hidden print:block text-center space-y-2">
              <h1 className="text-xl font-black">كشف الرواتب ومسير الدفع الشهري للموظفين</h1>
              <p className="text-sm font-bold text-slate-500">لشهر: {activeSheet.month}</p>
            </div>

            <div className="space-y-4">
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4">اسم الموظف</th>
                      <th className="p-4">الراتب الأساسي</th>
                      <th className="p-4">المكافآت / البدلات (+)</th>
                      <th className="p-4">الخصومات / الاستقطاع (-)</th>
                      <th className="p-4 text-slate-800 dark:text-white font-black">الصافي المستحق</th>
                      <th className="p-4 print:hidden">البيان والملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {(isEditingRecords ? editingRecords : activeSheet.records).map((record, idx) => (
                      <tr key={record.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="p-4">
                          <div className="font-black text-slate-800 dark:text-white">{record.employeeName}</div>
                        </td>
                        <td className="p-4 font-bold">
                          {record.basicSalary.toLocaleString()} YER
                        </td>
                        <td className="p-4 text-emerald-600 font-bold">
                          {isEditingRecords ? (
                            <input
                              type="number"
                              min="0"
                              value={record.allowances || ""}
                              onChange={(e) => handleRecordChange(idx, "allowances", e.target.value)}
                              className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-emerald-600"
                            />
                          ) : (
                            `+${record.allowances.toLocaleString()} YER`
                          )}
                        </td>
                        <td className="p-4 text-rose-500 font-bold">
                          {isEditingRecords ? (
                            <input
                              type="number"
                              min="0"
                              value={record.deductions || ""}
                              onChange={(e) => handleRecordChange(idx, "deductions", e.target.value)}
                              className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-rose-500"
                            />
                          ) : (
                            `-${record.deductions.toLocaleString()} YER`
                          )}
                        </td>
                        <td className="p-4 font-black text-indigo-600 dark:text-indigo-400 text-sm">
                          {record.netSalary.toLocaleString()} YER
                        </td>
                        <td className="p-4 print:hidden">
                          {isEditingRecords ? (
                            <input
                              type="text"
                              value={record.notes || ""}
                              onChange={(e) => handleRecordChange(idx, "notes", e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
                              placeholder="بدل سكن، مكافأة أداء..."
                            />
                          ) : (
                            <span className="text-slate-400 text-xs">{record.notes || "لا توجد ملاحظات"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card Grid */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                {(isEditingRecords ? editingRecords : activeSheet.records).map((record, idx) => (
                  <div key={record.employeeId} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="text-sm font-black text-slate-800 dark:text-white">{record.employeeName}</div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">سجل راتب موظف</span>
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] text-slate-400 font-bold mb-0.5">الصافي</div>
                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{record.netSalary.toLocaleString()} YER</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">الراتب الأساسي</span>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{record.basicSalary.toLocaleString()} YER</div>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">البدلات (+)</span>
                        {isEditingRecords ? (
                          <input
                            type="number"
                            min="0"
                            value={record.allowances || ""}
                            onChange={(e) => handleRecordChange(idx, "allowances", e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-emerald-600"
                          />
                        ) : (
                          <div className="text-xs font-bold text-emerald-600">+{record.allowances.toLocaleString()} YER</div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">الاستقطاع (-)</span>
                        {isEditingRecords ? (
                          <input
                            type="number"
                            min="0"
                            value={record.deductions || ""}
                            onChange={(e) => handleRecordChange(idx, "deductions", e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-rose-500"
                          />
                        ) : (
                          <div className="text-xs font-bold text-rose-500">-{record.deductions.toLocaleString()} YER</div>
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">العملة</span>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">YER</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold">ملاحظات</span>
                      {isEditingRecords ? (
                        <textarea
                          rows={1}
                          value={record.notes || ""}
                          onChange={(e) => handleRecordChange(idx, "notes", e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                          placeholder="ملاحظات الراتب..."
                        />
                      ) : (
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 italic bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-xl">
                          {record.notes || "لا توجد ملاحظات مسجلة للموظف."}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print Signatures Block */}
            <div className="hidden print:grid grid-cols-3 gap-6 p-8 border-t border-slate-100 text-center font-bold text-xs">
              <div className="space-y-8">
                <div>أعده / الموظف المسؤول</div>
                <div className="border-b border-slate-300 w-32 mx-auto" />
              </div>
              <div className="space-y-8">
                <div>راجعه / المدير المالي</div>
                <div className="border-b border-slate-300 w-32 mx-auto" />
              </div>
              <div className="space-y-8">
                <div>اعتمد للصرف / المدير العام</div>
                <div className="border-b border-slate-300 w-32 mx-auto" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 py-20 text-center flex flex-col items-center gap-4">
          <FileText className="h-16 w-16 text-slate-300" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white">لا يوجد كشف رواتب لشهر {selectedMonth} بعد</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            كشوفات الرواتب تساعد في تسوية الرواتب وإعداد قيد اليومية الخاص بالأجور بشكل جماعي وصرفها نقداً أو عبر البنك.
          </p>
          <button
            onClick={handleCreateSheet}
            className="mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg cursor-pointer text-sm"
          >
            <Plus className="h-4 w-4" />
            إنشاء كشف رواتب لشهر {selectedMonth}
          </button>
        </div>
      )}

      {/* Disbursal Posting Modal */}
      <AnimatePresence>
        {showPostingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPostingModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-right"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/20">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  ترحيل وإثبات رواتب الموظفين مالياً
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  سيقوم النظام بتوليد قيد يومية لكل موظف يخصم من حساب الأجور إلى حساب الصندوق أو البنك المختار
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">حساب مصروف الرواتب والأجور (مدين) *</label>
                  <select
                    required
                    value={postingAccounts.expenseAccountId}
                    onChange={(e) => setPostingAccounts({ ...postingAccounts, expenseAccountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر حساب المصروف...</option>
                    {accounts
                      .filter((a) => a.type === "expense" && a.isTransactional)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">حساب الصرف والنقدية (دائن) *</label>
                  <select
                    required
                    value={postingAccounts.cashBankAccountId}
                    onChange={(e) => setPostingAccounts({ ...postingAccounts, cashBankAccountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">اختر حساب الصندوق أو البنك...</option>
                    {accounts
                      .filter((a) => a.type === "asset" && a.isTransactional)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.code}) [الرصيد: {acc.balance.toLocaleString()} YER]
                        </option>
                      ))}
                  </select>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 space-y-1.5">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">ملخص الترحيل والقيود:</div>
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>عدد الموظفين:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{activeSheet.records.length} موظفين</span>
                  </div>
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>إجمالي مبلغ الصرف المالي:</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{totalNet.toLocaleString()} YER</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPostingModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleDisbursePayroll}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    تأكيد الصرف وترحيل الحركات
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
