import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Plus, Search, Phone, DollarSign, Edit3, Trash2, 
  UserCheck, HardHat, FolderTree, Settings, Check, Sparkles, Building, ChevronDown, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Employee, Currency, Account, LinkedAccounts } from '../types';
import { PermissionGuard } from '../lib/permissions';
import { addAccount } from '../lib/dbService';
import { toast } from 'sonner';

interface EmployeesManagementProps {
  employees: Employee[];
  currencies: Currency[];
  accounts: Account[];
  linkedAccounts?: LinkedAccounts | null;
  onSaveLinkedAccounts?: (config: any) => Promise<void> | void;
  onSaveEmployee: (employee: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
}

/**
 * Calculates the next sequential account code under a parent account in the Chart of Accounts
 */
function getNextChildAccountCode(parentId: string, accountsList: Account[]): string {
  if (!parentId) return "";
  const parentAcc = accountsList.find((a) => a.id === parentId || a.code === parentId);
  if (!parentAcc) return "";

  // Find all current direct children of this parent
  const children = accountsList.filter(
    (a) => a.parentId === parentAcc.id || a.parentId === parentAcc.code
  );

  let candidateCode = "";
  if (children.length > 0) {
    const numericCodes = children
      .map((c) => parseInt(c.code, 10))
      .filter((n) => !isNaN(n));

    if (numericCodes.length > 0) {
      const maxCode = Math.max(...numericCodes);
      candidateCode = (maxCode + 1).toString();
    } else {
      candidateCode = `${parentAcc.code}01`;
    }
  } else {
    // First child under this parent
    candidateCode = `${parentAcc.code}01`;
  }

  // Ensure code uniqueness in case of gaps or existing IDs
  let num = parseInt(candidateCode, 10);
  if (isNaN(num)) num = 1;
  while (accountsList.some((a) => a.code === candidateCode || a.id === candidateCode)) {
    num += 1;
    candidateCode = num.toString();
  }

  return candidateCode;
}

export default function EmployeesManagement({ 
  employees, 
  currencies, 
  accounts, 
  linkedAccounts,
  onSaveLinkedAccounts,
  onSaveEmployee, 
  onDeleteEmployee 
}: EmployeesManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Parent Account Configuration State
  const [parentAccountId, setParentAccountId] = useState<string>(
    linkedAccounts?.employeeParentAccountId || ''
  );
  const [isSavingParentConfig, setIsSavingParentConfig] = useState(false);
  const [showParentConfigPanel, setShowParentConfigPanel] = useState(false);

  // Auto-create Account in Chart of Accounts toggle in the modal
  const [autoCreateAccount, setAutoCreateAccount] = useState<boolean>(true);
  const [modalParentAccountId, setModalParentAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    position: '',
    phone: '',
    salary: 0,
    currency: 'YER',
    linkedAccountId: ''
  });

  // Sync parentAccountId when linkedAccounts updates
  useEffect(() => {
    if (linkedAccounts?.employeeParentAccountId) {
      setParentAccountId(linkedAccounts.employeeParentAccountId);
    }
  }, [linkedAccounts?.employeeParentAccountId]);

  // Current selected parent account details
  const selectedParentAccount = accounts.find(
    (a) => a.id === parentAccountId || a.code === parentAccountId
  );

  // Next child code preview
  const nextChildCodePreview = selectedParentAccount 
    ? getNextChildAccountCode(selectedParentAccount.id, accounts) 
    : '';

  const handleSaveParentAccount = async () => {
    if (!parentAccountId) {
      toast.error("يرجى اختيار حساب أب من القائمة أولاً");
      return;
    }
    setIsSavingParentConfig(true);
    try {
      if (onSaveLinkedAccounts) {
        await onSaveLinkedAccounts({
          ...(linkedAccounts || {}),
          employeeParentAccountId: parentAccountId,
        });
      }
      toast.success("تم حفظ واعتماد الحساب الأب للموظفين بنجاح في إعدادات النظام!");
      setShowParentConfigPanel(false);
    } catch (err) {
      console.error("Failed saving parent account:", err);
      toast.error("حدث خطأ أثناء حفظ الحساب الأب");
    } finally {
      setIsSavingParentConfig(false);
    }
  };

  const handleOpenAddModal = () => {
    resetForm();
    setAutoCreateAccount(true);
    setModalParentAccountId(parentAccountId);
    setShowModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData(emp);
    setAutoCreateAccount(false);
    setModalParentAccountId(parentAccountId);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalLinkedAccountId = formData.linkedAccountId;

      // When adding a new employee with autoCreateAccount checked
      if (!editingEmployee && autoCreateAccount) {
        const parentIdToUse = modalParentAccountId || parentAccountId;
        if (!parentIdToUse) {
          toast.error("يرجى تحديد الحساب الأب الرئيسي أولاً ليتم إنشاء حساب الموظف تحته!");
          setIsSubmitting(false);
          return;
        }

        const parentAcc = accounts.find(
          (a) => a.id === parentIdToUse || a.code === parentIdToUse
        );
        if (!parentAcc) {
          toast.error("الحساب الأب المحدد غير موجود بدليل الحسابات!");
          setIsSubmitting(false);
          return;
        }

        const newCode = getNextChildAccountCode(parentAcc.id, accounts);
        if (!newCode) {
          toast.error("تعذر توليد كود محاسبي للحساب الجديد");
          setIsSubmitting(false);
          return;
        }

        // 1. Create financial account in Chart of Accounts
        const newAccountPayload = {
          id: newCode,
          code: newCode,
          name: formData.name!.trim(),
          type: parentAcc.type,
          parentId: parentAcc.id,
          balance: 0,
          currency: formData.currency || parentAcc.currency || 'YER',
          notes: `حساب مالي للموظف: ${formData.name!.trim()} - المسمى: ${formData.position || 'موظف'}`,
          isTransactional: true,
          classification: 'employee' as const,
          category: 'employee' as const,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
        };

        await addAccount(newAccountPayload);
        finalLinkedAccountId = newCode;

        // Auto-save parent account if it wasn't saved yet
        if (!parentAccountId && onSaveLinkedAccounts) {
          setParentAccountId(parentIdToUse);
          await onSaveLinkedAccounts({
            ...(linkedAccounts || {}),
            employeeParentAccountId: parentIdToUse,
          });
        }

        toast.success(`تم إنشاء الحساب المالي بالدليل بنجاح (كود: ${newCode})`);
      } else if (!finalLinkedAccountId) {
        toast.error("يرجى اختيار الحساب المالي المرتبط بالموظف!");
        setIsSubmitting(false);
        return;
      }

      await onSaveEmployee(
        editingEmployee
          ? { ...formData, id: editingEmployee.id, linkedAccountId: finalLinkedAccountId }
          : { ...formData, linkedAccountId: finalLinkedAccountId }
      );

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Error saving employee with linked account:", err);
      toast.error("حدث خطأ أثناء حفظ بيانات الموظف أو إنشاء الحساب المالي");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      phone: '',
      salary: 0,
      currency: 'YER',
      linkedAccountId: ''
    });
    setEditingEmployee(null);
  };

  const filteredEmployees = employees.filter(e => 
    (e.name || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
    (e.position || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
    (e.phone || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  return (
    <div className="space-y-6 text-right">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <HardHat className="h-8 w-8 text-orange-500" />
            إدارة شؤون الموظفين
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">سجل الموظفين، الرواتب، والربط المالي بالدليل المحاسبي</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowParentConfigPanel(!showParentConfigPanel)}
            className={`flex items-center gap-2 font-bold py-2.5 px-4 rounded-xl text-xs transition-all border ${
              selectedParentAccount 
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 animate-pulse'
            }`}
          >
            <FolderTree className="h-4 w-4" />
            {selectedParentAccount ? `الحساب الأب: ${selectedParentAccount.name}` : 'تحديد الحساب الأب للموظفين'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showParentConfigPanel ? 'rotate-180' : ''}`} />
          </button>

          <PermissionGuard permission="create-employee">
            <button 
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-orange-600/20 transition-all active:scale-95 text-sm"
            >
              <Plus className="h-4 w-4" />
              إضافة موظف
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Parent Account Configuration Panel */}
      {(showParentConfigPanel || !selectedParentAccount) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-900 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-5 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-200/60 dark:border-orange-900/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl">
                <FolderTree className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">
                  الحساب الأب الرئيسي لحسابات الموظفين بالدليل المحاسبي
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  عند إضافة موظف جديد، سيتم إنشاء حساب مالي فرعي له تلقائياً تحت هذا الحساب مع توليد كود تسلسلي منتظم
                </p>
              </div>
            </div>

            {selectedParentAccount && (
              <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-black">
                <CheckCircle2 className="h-4 w-4" />
                معتمد: {selectedParentAccount.name} ({selectedParentAccount.code})
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-8">
              <label className="block text-[11px] font-black text-slate-600 dark:text-slate-300 mb-1.5">
                اختر الحساب الأب من دليل الحسابات (مثل: ذمم الموظفين، رواتب مستحقة، أو مخصص الرواتب):
              </label>
              <select
                value={parentAccountId}
                onChange={(e) => setParentAccountId(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500"
              >
                <option value="">-- اختر الحساب الأب الرئيسي --</option>
                {accounts
                  .filter((a) => a.type === 'liability' || a.type === 'expense' || a.type === 'asset')
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name} ({acc.type === 'liability' ? 'خصوم/التزامات' : acc.type === 'expense' ? 'مصروفات' : 'أصول'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveParentAccount}
                disabled={isSavingParentConfig || !parentAccountId}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {isSavingParentConfig ? (
                  <span>جاري الحفظ...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    حفظ واعتماد الحساب الأب
                  </>
                )}
              </button>
            </div>
          </div>

          {selectedParentAccount && (
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1 text-slate-500">
                <Building className="h-3.5 w-3.5 text-orange-500" />
                نوع الحساب: <strong className="text-slate-700 dark:text-slate-200">{selectedParentAccount.type}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1 text-slate-500">
                العملة: <strong className="text-slate-700 dark:text-slate-200">{selectedParentAccount.currency}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-3.5 w-3.5" />
                الكود المتوقع للموظف القادم: <strong className="font-mono underline">{nextChildCodePreview}</strong>
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، المسمى، أو الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pr-10 pl-4 py-2 text-xs focus:ring-2 focus:ring-orange-500 text-right"
          />
        </div>

        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span>إجمالي الموظفين:</span>
          <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2.5 py-0.5 rounded-full font-black">
            {filteredEmployees.length}
          </span>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => {
          const linkedAcc = accounts.find(a => a.id === emp.linkedAccountId || a.code === emp.linkedAccountId);
          return (
            <motion.div 
              layout
              key={emp.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 font-black text-2xl">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">{emp.name}</h3>
                  <span className="text-[10px] font-black bg-orange-50 dark:bg-orange-900/20 text-orange-600 px-2 py-0.5 rounded-full inline-block mt-1">
                    {emp.position}
                  </span>
                </div>
                <div className="mr-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PermissionGuard permission="edit-employee">
                    <button 
                      onClick={() => handleOpenEditModal(emp)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-500 cursor-pointer"
                      title="تعديل الموظف"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </PermissionGuard>
                  <PermissionGuard permission="delete-employee">
                    <button 
                      onClick={() => onDeleteEmployee(emp.id)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="حذف الموظف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGuard>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <Phone className="h-4 w-4 text-orange-400" />
                  <span className="font-mono">{emp.phone}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">الراتب الأساسي</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1">
                    {emp.salary.toLocaleString()}
                    <span className="text-[10px] text-orange-500 font-bold">{emp.currency}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">الحساب المالي:</div>
                <div className="text-[11px] font-black">
                  {linkedAcc ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-900/40">
                      {linkedAcc.code} - {linkedAcc.name}
                    </span>
                  ) : (
                    <span className="text-rose-500 text-[10px]">غير مربوط</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredEmployees.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
            <HardHat className="h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-bold">لا يوجد موظفين مسجلين</p>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-orange-600 p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">{editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h3>
                  <p className="text-white/80 text-xs font-medium">
                    {autoCreateAccount && !editingEmployee
                      ? 'سيتم إنشاء حساب مالي للموظف بالدليل تلقائياً تحت الحساب الأب المحدد'
                      : 'إدارة وتحديث الملف الوظيفي والحساب المالي'}
                  </p>
                </div>
                <Briefcase className="h-10 w-10 opacity-40" />
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">اسم الموظف</label>
                    <input 
                      type="text"
                      required
                      placeholder="الأسم الثلاثي"
                      value={formData.name || ""}
                      onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">المسمى الوظيفي</label>
                    <input 
                      type="text"
                      required
                      placeholder="مدير، محاسب، استقبال..."
                      value={formData.position || ""}
                      onChange={e => setFormData(p => ({...p, position: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">رقم الهاتف</label>
                    <input 
                      type="tel"
                      required
                      placeholder="000000000"
                      value={formData.phone || ""}
                      onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 text-right font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">العملة</label>
                    <select 
                      required
                      value={formData.currency || ""}
                      onChange={e => setFormData(p => ({...p, currency: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500"
                    >
                      {currencies.map(cur => (
                        <option key={cur.id} value={cur.code}>{cur.code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">الراتب الأساسي</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="number"
                        required
                        min="0"
                        value={formData.salary || ""}
                        onChange={e => setFormData(p => ({...p, salary: parseFloat(e.target.value) || 0}))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 pl-10 text-sm font-black focus:ring-2 focus:ring-orange-500 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Account Section */}
                {!editingEmployee && (
                  <div className="border border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl p-4 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateAccount}
                        onChange={(e) => setAutoCreateAccount(e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-800 dark:text-white">
                        إنشاء حساب مالي جديد للموظف تلقائياً في الدليل المحاسبي
                      </span>
                    </label>

                    {autoCreateAccount ? (
                      <div className="space-y-2 pt-1 border-t border-orange-200/60 dark:border-orange-900/40">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block mb-1">
                            الحساب الأب المحدد بالدليل:
                          </label>
                          <select
                            value={modalParentAccountId || parentAccountId}
                            onChange={(e) => setModalParentAccountId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">-- اختر الحساب الأب لإنشاء الحساب تحته --</option>
                            {accounts
                              .filter((a) => a.type === 'liability' || a.type === 'expense' || a.type === 'asset')
                              .map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} - {acc.name} ({acc.type === 'liability' ? 'خصوم' : acc.type === 'expense' ? 'مصروفات' : 'أصول'})
                                </option>
                              ))}
                          </select>
                        </div>

                        {(modalParentAccountId || parentAccountId) && (
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-orange-100 dark:border-orange-900/30 text-[11px] space-y-1">
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                              <span>اسم الحساب المالي الجديد:</span>
                              <strong className="text-slate-800 dark:text-white">{formData.name?.trim() || 'اسم الموظف'}</strong>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                              <span>الكود المحاسبي التسلسلي المتولد:</span>
                              <strong className="text-orange-600 font-mono font-black">
                                {getNextChildAccountCode(modalParentAccountId || parentAccountId, accounts)}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-black text-slate-500 block mb-1">اختيار حساب مالي موجود يدوياً</label>
                        <select 
                          required={!autoCreateAccount}
                          value={formData.linkedAccountId || ""}
                          onChange={e => setFormData(p => ({...p, linkedAccountId: e.target.value}))}
                          className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500 font-bold"
                        >
                          <option value="">اختر الحساب...</option>
                          {accounts.filter(a => a.type === 'expense' || a.type === 'liability' || a.type === 'asset').map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* If editing employee */}
                {editingEmployee && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">الحساب المالي المرتبط</label>
                    <select 
                      required
                      value={formData.linkedAccountId || ""}
                      onChange={e => setFormData(p => ({...p, linkedAccountId: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">اختر حساب الموظف...</option>
                      {accounts.filter(a => a.type === 'expense' || a.type === 'liability' || a.type === 'asset').map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    {isSubmitting ? 'جاري الحفظ والإنشاء...' : 'حفظ الملف الوظيفي'}
                  </button>
                  <button 
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowModal(false)}
                    className="px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء
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
