import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, ShieldCheck, Users, Search, Check, CheckSquare, 
  Square, RefreshCw, Save, Folder, FolderOpen, AlertCircle, FileText,
  UserCheck, Layers, HelpCircle, Landmark, Wallet, ArrowDownUp
} from "lucide-react";
import { User, Account, Role } from "../types";

interface AccountsPermissionsProps {
  users: User[];
  roles: Role[];
  accounts: Account[];
  onSaveUser: (user: Partial<User>) => void;
}

export default function AccountsPermissions({ users, roles, accounts, onSaveUser }: AccountsPermissionsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchAccountQuery, setSearchAccountQuery] = useState<string>("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<boolean>(false);

  // Find currently selected user
  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Selected account ids for the active user
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  // Is restriction enabled? (We assume restriction is enabled if allowedAccountIds is defined and has items, or we can explicit track via state)
  const [isRestrictionEnabled, setIsRestrictionEnabled] = useState<boolean>(false);

  // Initialize selected accounts when a user is selected
  React.useEffect(() => {
    if (selectedUser) {
      const allowedIds = selectedUser.allowedAccountIds || [];
      setSelectedAccountIds(allowedIds);
      setIsRestrictionEnabled(allowedIds.length > 0);
    } else {
      setSelectedAccountIds([]);
      setIsRestrictionEnabled(false);
    }
  }, [selectedUser]);

  // Translate account types to Arabic
  const typeTranslations: Record<string, { label: string; color: string; bg: string }> = {
    asset: { label: "الأصول", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20" },
    liability: { label: "الخصوم", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/20" },
    equity: { label: "حقوق الملكية", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/20" },
    revenue: { label: "الإيرادات", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
    expense: { label: "المصروفات", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20" }
  };

  // Hierarchy building helpers
  const buildTreeItems = (list: Account[]): (Account & { depth: number })[] => {
    const map = new Map<string, Account>();
    list.forEach(acc => map.set(acc.id, { ...acc }));

    const roots: Account[] = [];
    list.forEach(acc => {
      if (!acc.parentId) {
        roots.push(acc);
      }
    });

    // Sort roots by code
    roots.sort((a, b) => a.code.localeCompare(b.code));

    const result: (Account & { depth: number })[] = [];
    
    const traverse = (nodeId: string, depth: number) => {
      const node = list.find(n => n.id === nodeId);
      if (!node) return;
      
      result.push({ ...node, depth });
      
      // Find children
      const children = list.filter(n => n.parentId === nodeId);
      children.sort((a, b) => a.code.localeCompare(b.code));
      
      children.forEach(child => traverse(child.id, depth + 1));
    };

    roots.forEach(root => traverse(root.id, 0));
    return result;
  };

  // Transactional accounts (or all accounts) in hierarchical list
  const fullTreeList = useMemo(() => {
    return buildTreeItems(accounts);
  }, [accounts]);

  // Filter full tree based on search
  const filteredTreeList = useMemo(() => {
    if (!searchAccountQuery) return fullTreeList;
    const query = searchAccountQuery.toLowerCase();
    
    // Find all nodes matching query
    const matchingIds = new Set<string>();
    fullTreeList.forEach(node => {
      if (
        node.name.toLowerCase().includes(query) || 
        node.code.toLowerCase().includes(query) ||
        (node.notes && node.notes.toLowerCase().includes(query))
      ) {
        matchingIds.add(node.id);
        
        // Also add all parent nodes of matching nodes so the tree structure is kept
        let currentParentId = node.parentId;
        while (currentParentId) {
          const pNode = accounts.find(a => a.id === currentParentId);
          if (pNode) {
            matchingIds.add(pNode.id);
            currentParentId = pNode.parentId;
          } else {
            break;
          }
        }
      }
    });

    return fullTreeList.filter(node => matchingIds.has(node.id));
  }, [fullTreeList, searchAccountQuery, accounts]);

  const toggleSelectAccount = (id: string) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Quick action selects
  const handleSelectAll = () => {
    // Select all transactional accounts
    const transactionalIds = accounts.filter(a => a.isTransactional).map(a => a.id);
    setSelectedAccountIds(transactionalIds);
  };

  const handleDeselectAll = () => {
    setSelectedAccountIds([]);
  };

  const handleSelectCashboxesAndBanksOnly = () => {
    const matchingIds = accounts.filter(a => 
      a.isTransactional && 
      (a.name.includes("صندوق") || a.name.includes("Cash") || a.name.includes("بنك") || a.name.includes("Bank"))
    ).map(a => a.id);
    setSelectedAccountIds(matchingIds);
  };

  const handleSelectClientsAndSuppliersOnly = () => {
    const matchingIds = accounts.filter(a => 
      a.isTransactional && 
      (a.classification === "client" || a.classification === "supplier" || a.name.includes("عميل") || a.name.includes("مورد"))
    ).map(a => a.id);
    setSelectedAccountIds(matchingIds);
  };

  const handleSelectTypeOnly = (type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense') => {
    const matchingIds = accounts.filter(a => a.isTransactional && a.type === type).map(a => a.id);
    setSelectedAccountIds(matchingIds);
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      // If restriction is enabled, we save the selected IDs. If not enabled, we save empty list (unrestricted)
      const allowedIds = isRestrictionEnabled ? selectedAccountIds : [];
      await onSaveUser({
        id: selectedUserId,
        allowedAccountIds: allowedIds
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            صلاحيات الحسابات للمستخدمين
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic">
            تحديد حسابات مالية مخصصة لكل مستخدم لتقييد وصوله ومعاملاته على حسابات معينة فقط (الصناديق، العملاء، المصاريف)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* User Selection Sidebar Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">اختر المستخدم لضبط صلاحياته</h3>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 block">قائمة مستخدمي النظام</label>
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                {users.map(u => {
                  const role = roles.find(r => r.id === u.roleId);
                  const isSelected = u.id === selectedUserId;
                  const isRestricted = u.allowedAccountIds && u.allowedAccountIds.length > 0;
                  
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected 
                          ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm"
                          : "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isSelected 
                            ? "bg-indigo-600 text-white" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={`font-bold text-xs ${isSelected ? "text-indigo-900 dark:text-indigo-200" : "text-slate-800 dark:text-white"}`}>
                            {u.username}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {role?.name || "بدون دور"}
                          </div>
                        </div>
                      </div>

                      {isRestricted ? (
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                          مقيد ({u.allowedAccountIds?.length})
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                          كامل الصلاحية
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedUser && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="font-extrabold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>حالة تقييد المستخدم المحدد:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                    عند تفعيل التقييد، لن يتمكن الموظف من استخدام أو رؤية أي حسابات غير محددة له في سندات القبض والصرف، العمليات، القيود المحاسبية أو كشوف الحسابات.
                  </p>

                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">تقييد الحسابات المحاسبية:</span>
                    <button
                      type="button"
                      onClick={() => setIsRestrictionEnabled(!isRestrictionEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isRestrictionEnabled ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isRestrictionEnabled ? "-translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !selectedUserId}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold py-3 px-4 rounded-xl transition shadow-lg shadow-indigo-600/10 cursor-pointer text-xs"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري حفظ الإعدادات...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      حفظ صلاحيات الحسابات
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Main Permissions Panel */}
        <div className="lg:col-span-8">
          {selectedUser ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                    <Layers className="h-5 w-5 text-indigo-500" />
                    تحديد الحسابات المسموحة للمستخدم: <strong className="text-indigo-600 dark:text-indigo-400 font-black">({selectedUser.username})</strong>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    قم بتحديد الحسابات التي يمكن للمستخدم التعامل معها. الحسابات الرئيسية والفرعية تدعم تحديد الصلاحيات.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث بالحساب أو الكود..."
                    value={searchAccountQuery}
                    onChange={e => setSearchAccountQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-right focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white font-bold"
                  />
                </div>
              </div>

              {isRestrictionEnabled ? (
                <div className="space-y-4">
                  
                  {/* Quick Filter Actions */}
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">أدوات التحديد السريع للحسابات:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold rounded-lg transition"
                      >
                        تحديد كل الفرعية ({accounts.filter(a => a.isTransactional).length})
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold rounded-lg transition"
                      >
                        إلغاء تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectCashboxesAndBanksOnly}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 text-[11px] font-extrabold rounded-lg transition flex items-center gap-1"
                      >
                        <Wallet className="h-3 w-3" />
                        الصناديق والبنوك فقط
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectClientsAndSuppliersOnly}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 text-[11px] font-extrabold rounded-lg transition flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        العملاء والموردين فقط
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                      <span className="text-[10px] font-extrabold text-slate-500 self-center">تحديد حسب الصنف المالي:</span>
                      <button
                        type="button"
                        onClick={() => handleSelectTypeOnly("asset")}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 text-[10px] font-bold rounded-md transition"
                      >
                        الأصول
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTypeOnly("liability")}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300 text-[10px] font-bold rounded-md transition"
                      >
                        الخصوم
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTypeOnly("equity")}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 text-[10px] font-bold rounded-md transition"
                      >
                        حقوق الملكية
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTypeOnly("revenue")}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-[10px] font-bold rounded-md transition"
                      >
                        الإيرادات
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectTypeOnly("expense")}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 text-[10px] font-bold rounded-md transition"
                      >
                        المصروفات
                      </button>
                    </div>
                  </div>

                  {/* Accounts List Tree with Checkboxes */}
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-extrabold text-[11px] border-b border-slate-100 dark:border-slate-800">
                          <th className="p-3 w-12 text-center">مسموح</th>
                          <th className="p-3">رمز الحساب واسمه</th>
                          <th className="p-3 text-center w-24">النوع</th>
                          <th className="p-3 text-center w-28">النوع الفرعي</th>
                          <th className="p-3 text-center w-20">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredTreeList.map(node => {
                          const isChecked = selectedAccountIds.includes(node.id);
                          const isLeaf = node.isTransactional;
                          const depth = node.depth;
                          
                          return (
                            <tr 
                              key={node.id} 
                              onClick={() => isLeaf && toggleSelectAccount(node.id)}
                              className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
                                !isLeaf ? "bg-slate-50/20 dark:bg-slate-900/40" : "cursor-pointer"
                              } ${isChecked && isLeaf ? "bg-indigo-50/30 dark:bg-indigo-950/5" : ""}`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                {isLeaf ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectAccount(node.id)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform cursor-pointer"
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="h-4.5 w-4.5 fill-indigo-100 dark:fill-indigo-950/30" />
                                    ) : (
                                      <Square className="h-4.5 w-4.5 text-slate-300 dark:text-slate-600" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-300 font-bold select-none">-</span>
                                )}
                              </td>
                              
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  {/* Indentation with custom RTL tree lines */}
                                  {depth > 0 && (
                                    <div className="flex shrink-0 items-center font-mono text-slate-300 dark:text-slate-700 text-[11px] tracking-tighter select-none ml-1 mr-1.5" dir="ltr">
                                      {Array.from({ length: depth }).map((_, i) => (
                                        <span key={i} className="inline-block whitespace-pre">
                                          {i === depth - 1 ? "└── " : "│   "}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <Folder className={`h-4 w-4 shrink-0 ${!isLeaf ? "text-amber-500" : "text-slate-400"}`} />
                                  
                                  <div>
                                    <div className="text-[10px] font-mono font-black text-slate-400 tracking-tight">{node.code}</div>
                                    <div className={`font-bold text-xs ${!isLeaf ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"}`}>
                                      {node.name}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full ${typeTranslations[node.type]?.bg || ""} ${typeTranslations[node.type]?.color || ""}`}>
                                  {typeTranslations[node.type]?.label || node.type}
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                                  {node.classification ? (
                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                                      {node.classification}
                                    </span>
                                  ) : "-"}
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                <span className={`w-2 h-2 rounded-full inline-block ${node.status === "suspended" ? "bg-red-500" : "bg-emerald-500"}`} title={node.status || "active"}></span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 bg-indigo-50/20 dark:bg-indigo-950/10 p-3 rounded-lg border border-indigo-100/30">
                    <span>عدد الحسابات المسموحة حالياً: <strong className="text-indigo-600 dark:text-indigo-400 font-black">{selectedAccountIds.length}</strong> حساب</span>
                    <span>إجمالي الحسابات الفرعية بالنظام: {accounts.filter(a => a.isTransactional).length} حساب</span>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-emerald-50/30 dark:bg-emerald-950/5 rounded-2xl border border-emerald-100 dark:border-slate-850/60 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-8 w-8 animate-bounce" />
                  </div>
                  <h5 className="font-extrabold text-slate-800 dark:text-white text-sm">وصول كامل غير مقيد للحسابات</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                    تقييد الحسابات غير مفعّل لهذا المستخدم حالياً. هذا يعني أن هذا المستخدم يمتلك وصولاً كاملاً لاستخدام وقراءة كافة الحسابات المالية الموجودة بالدليل المحاسبي بحسب صلاحيات دوره الوظيفي.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsRestrictionEnabled(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer shadow-md"
                  >
                    تفعيل التقييد وتخصيص حسابات معينة
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mx-auto text-indigo-500">
                <HelpCircle className="h-10 w-10" />
              </div>
              <h4 className="font-extrabold text-slate-700 dark:text-slate-300">لم يتم اختيار أي مستخدم</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                الرجاء اختيار مستخدم من القائمة الجانبية لتتمكن من تفعيل تقييد الحسابات المحاسبية وتحديد الحسابات التي يُسمح له بالتعامل معها.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
