import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, ShieldAlert, Plus, Search, Check, X, ShieldCheck,
  ChevronDown, ChevronUp, LayoutDashboard, FolderTree, Receipt, 
  Coins, Calendar, Sparkles, Users, UserCog, FileText, Settings, 
  HelpCircle, Minimize2, Maximize2
} from 'lucide-react';
import { Role } from '../types';

interface RolesManagementProps {
  roles: Role[];
  onSaveRole: (role: Partial<Role>) => void;
  onDeleteRole: (id: string) => void;
  availablePermissions: { id: string; name: string; category: string }[];
}

const INTERFACE_GROUPS = [
  {
    id: "general",
    name: "١. العامة",
    description: "صلاحيات الوصول للرئيسية ولوحة التحكم، المهام اليومية، والتحليلات الذكية (إرشاد AI)",
    icon: LayoutDashboard,
    permissionIds: ["view-dashboard", "view-tasks", "view-insights"]
  },
  {
    id: "accounting_finance",
    name: "٢. المحاسبة والمالية",
    description: "صلاحيات دليل الحسابات، قيود اليومية، الحركة اليومية، السندات والتحصيلات، التقارير وكشوفات الحسابات، وإدارة العملات",
    icon: Coins,
    permissionIds: [
      "view-accounts", "create-account", "edit-account", "delete-account",
      "view-transactions", "create-transaction", "edit-transaction", "delete-transaction", "bypass-transaction-lock-date",
      "view-reports", "view-sensitive-financial-totals",
      "view-vouchers", "create-voucher", "edit-voucher", "delete-voucher", "print-voucher",
      "view-currencies"
    ]
  },
  {
    id: "operations",
    name: "٣. إدارة العمليات",
    description: "صلاحيات القاعات والحجوزات، دليل القاعات المصور، تدقيق العمليات، والخدمات الإضافية المصاحبة",
    icon: Calendar,
    permissionIds: [
      "view-halls", "create-hall", "edit-hall", "delete-hall",
      "create-booking", "edit-booking", "cancel-booking", "delete-booking",
      "refund-insurance", "refund-mortgage", "collect-booking-payment", "execute-booking", "print-booking", "manage-discounts",
      "bypass-booking-amount-lock", "bypass-booking-details-lock",
      "audit-booking-transactions",
      "view-services", "create-service", "edit-service", "delete-service"
    ]
  },
  {
    id: "resources_clients",
    name: "٤. الموارد والعملاء",
    description: "صلاحيات العملاء والمستأجرين، شؤون الموظفين، مسيرات الرواتب والمستحقات",
    icon: Users,
    permissionIds: [
      "view-clients", "create-client", "edit-client", "delete-client",
      "view-employees", "create-employee", "edit-employee", "delete-employee"
    ]
  },
  {
    id: "settings_security",
    name: "٥. الإعدادات والأمان",
    description: "صلاحيات إدارة المستخدمين، الأدوار والصلاحيات، إعدادات الشركة، ربط الحسابات المحاسبية وإدارة الإشعارات والأجهزة",
    icon: UserCog,
    permissionIds: ["manage-users", "manage-roles", "view-company", "view-accounts-linking", "allow-unlimited-discount"]
  },
  {
    id: "individual_elements",
    name: "٦. صلاحيات العناصر الفردية (الأزرار والبطاقات)",
    description: "التحكم بظهور الأزرار الإجرائية والبطاقات الإحصائية والمالية داخل الواجهات الفردية والمقاييس والتحليلات",
    icon: ShieldCheck,
    permissionIds: [
      "btn-confirm-booking", "btn-cancel-booking", "btn-print-contract", "btn-refund-insurance",
      "btn-refund-mortgage", "btn-collect-payment", "btn-accrue-revenue",
      "card-booking-stats", "card-occupancy-analytics", "card-booking-financials"
    ]
  }
];

export default function RolesManagement({ roles, onSaveRole, onDeleteRole, availablePermissions }: RolesManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<Partial<Role>>({
    name: '',
    permissions: []
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    dashboard: true,
  });
  const [permSearch, setPermSearch] = useState('');

  // Dynamically calculate groups based on current available permissions (including future custom permissions)
  const mappedIds = new Set(INTERFACE_GROUPS.flatMap(g => g.permissionIds));
  const otherPermissions = availablePermissions.filter(p => !mappedIds.has(p.id));

  const allGroups = [
    ...INTERFACE_GROUPS,
    ...(otherPermissions.length > 0 ? [{
      id: "other",
      name: "صلاحيات وتسهيلات أخرى",
      description: "صلاحيات إضافية غير مصنفة تحت واجهة رئيسية معينة",
      icon: HelpCircle,
      permissionIds: otherPermissions.map(p => p.id)
    }] : [])
  ];

  const togglePermission = (permId: string) => {
    setFormData(prev => {
      const current = prev.permissions || [];
      if (current.includes(permId)) {
        return { ...prev, permissions: current.filter(id => id !== permId) };
      } else {
        return { ...prev, permissions: [...current, permId] };
      }
    });
  };

  const toggleAllInGroup = (groupId: string, permissionIds: string[]) => {
    const currentSelected = formData.permissions || [];
    const allSelected = permissionIds.every(pid => currentSelected.includes(pid));
    
    setFormData(prev => {
      const current = prev.permissions || [];
      if (allSelected) {
        // Deselect all in this group
        return {
          ...prev,
          permissions: current.filter(pid => !permissionIds.includes(pid))
        };
      } else {
        // Select all in this group (avoid duplicates)
        const newPermissions = Array.from(new Set([...current, ...permissionIds]));
        return {
          ...prev,
          permissions: newPermissions
        };
      }
    });
  };

  const handleExpandAll = () => {
    const updated: Record<string, boolean> = {};
    allGroups.forEach(g => {
      updated[g.id] = true;
    });
    setExpandedGroups(updated);
  };

  const handleCollapseAll = () => {
    setExpandedGroups({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRole(editingRole ? { ...formData, id: editingRole.id } : formData);
    setShowModal(false);
  };

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-indigo-500" />
            نظام الصلاحيات والأدوار
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic">تخصيص مستويات الوصول لكل مجموعة مستخدمين</p>
        </div>
        
        <button 
          id="btn-create-role"
          onClick={() => { 
            setEditingRole(null); 
            setFormData({ name: '', permissions: [] }); 
            setPermSearch('');
            setExpandedGroups({ dashboard: true });
            setShowModal(true); 
          }}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          إنشاء دور جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <motion.div 
            layout
            key={role.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-full hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                <Shield className="h-6 w-6" />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { 
                    setEditingRole(role); 
                    setFormData(role); 
                    setPermSearch('');
                    // Expand groups that have active permissions to show them
                    const activeGroupMap: Record<string, boolean> = {};
                    allGroups.forEach(g => {
                      const hasActive = g.permissionIds.some(pid => (role.permissions || []).includes(pid));
                      if (hasActive) activeGroupMap[g.id] = true;
                    });
                    setExpandedGroups(activeGroupMap);
                    setShowModal(true); 
                  }}
                  className="text-xs font-black text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  تعديل
                </button>
                <button 
                  onClick={() => { if(confirm('هل أنت متأكد من حذف هذا الدور؟')) onDeleteRole(role.id); }}
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">{role.name}</h3>
            <p className="text-xs text-slate-400 font-bold mb-4">يحتوي هذا الدور على ({(role.permissions || []).length}) صلاحية مفعلة</p>

            <div className="mt-auto flex flex-wrap gap-1.5">
              {(role.permissions || []).slice(0, 5).map(pid => (
                <span key={pid} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 rounded-full">
                  {availablePermissions.find(p => p.id === pid)?.name || pid}
                </span>
              ))}
              {(role.permissions || []).length > 5 && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-[9px] font-black text-indigo-500 rounded-full">
                  +{(role.permissions || []).length - 5} أخرى
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

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
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-800"
            >
              <div className="bg-indigo-600 p-6 text-white shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">{editingRole ? 'تعديل الدور والصلاحيات' : 'إنشاء دور جديد'}</h3>
                  <p className="text-white/80 text-xs font-medium italic mt-1">تحديد هرمي منطوي للصلاحيات مصنفة بحسب واجهات النظام</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-indigo-700/50 rounded-xl text-white/90 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Role Name */}
                <div className="bg-slate-50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase tracking-widest mr-1">اسم الدور الوظيفي</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: مدير المبيعات، محاسب قاعات، أمين صندوق..."
                    value={formData.name}
                    onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-right shadow-sm outline-none transition-all"
                  />
                </div>

                {/* Search and Expand/Collapse Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن صلاحية محددة..."
                      value={permSearch}
                      onChange={e => setPermSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pr-11 pl-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-right outline-none transition-all shadow-inner"
                    />
                    {permSearch && (
                      <button 
                        onClick={() => setPermSearch('')}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      id="expand-all-btn"
                      onClick={handleExpandAll}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      توسيع الكل
                    </button>
                    <button
                      type="button"
                      id="collapse-all-btn"
                      onClick={handleCollapseAll}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                      طيّ الكل
                    </button>
                  </div>
                </div>

                {/* Collapsible Groups Tree */}
                <div className="space-y-4">
                  {allGroups.map(group => {
                    const groupPerms = availablePermissions.filter(p => group.permissionIds.includes(p.id));
                    
                    // Filter group permissions by search string
                    const filteredGroupPerms = groupPerms.filter(p => 
                      p.name.toLowerCase().includes(permSearch.toLowerCase()) || 
                      p.id.toLowerCase().includes(permSearch.toLowerCase())
                    );

                    // Skip displaying group if search text is active and there are no matched permissions inside this group
                    if (permSearch && filteredGroupPerms.length === 0) return null;

                    // Automatically expand groups that have matches if a search query is typed
                    const isExpanded = !!expandedGroups[group.id] || !!permSearch;

                    const selectedInGroup = (formData.permissions || []).filter(pid => group.permissionIds.includes(pid));
                    const isAllSelected = group.permissionIds.every(pid => (formData.permissions || []).includes(pid));
                    const isSomeSelected = selectedInGroup.length > 0 && !isAllSelected;

                    const IconComponent = group.icon || HelpCircle;

                    return (
                      <div 
                        key={group.id} 
                        className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 transition-all shadow-sm hover:border-indigo-100 dark:hover:border-indigo-900/40"
                      >
                        {/* Accordion Trigger */}
                        <div 
                          className={`flex items-center justify-between p-4 cursor-pointer select-none transition-colors ${
                            isExpanded ? 'bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                          }`}
                          onClick={() => setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                          id={`group-header-${group.id}`}
                        >
                          <div className="flex items-center gap-3.5 flex-1 pl-4">
                            <div className={`p-2.5 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                              selectedInGroup.length > 0 
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="text-right">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white leading-snug">{group.name}</h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 leading-relaxed">{group.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 mr-4" onClick={(e) => e.stopPropagation()}>
                            {/* Status indicator */}
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${
                              isAllSelected 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : isSomeSelected 
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            }`}>
                              {selectedInGroup.length === 0 
                                ? 'مغلق بالكامل' 
                                : isAllSelected 
                                  ? 'مفعل بالكامل' 
                                  : `مفعل: ${selectedInGroup.length} من ${group.permissionIds.length}`}
                            </span>

                            {/* Check all master box */}
                            <button
                              type="button"
                              id={`group-master-${group.id}`}
                              onClick={() => toggleAllInGroup(group.id, group.permissionIds)}
                              className={`p-1.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                                isAllSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                                  : isSomeSelected
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300'
                              }`}
                              title={isAllSelected ? "إلغاء تحديد الكل" : "تحديد كافة الصلاحيات في هذه الشاشة"}
                            >
                              {isAllSelected ? (
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              ) : isSomeSelected ? (
                                <div className="w-3.5 h-3.5 flex items-center justify-center">
                                  <div className="w-2.5 h-1 bg-indigo-500 rounded-full" />
                                </div>
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-md border-2 border-slate-300 dark:border-slate-600" />
                              )}
                            </button>

                            {/* Chevron fold */}
                            <div className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/20 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/50 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {filteredGroupPerms.map(perm => {
                                const isSelected = (formData.permissions || []).includes(perm.id);
                                return (
                                  <button
                                    key={perm.id}
                                    id={`permission-btn-${perm.id}`}
                                    type="button"
                                    onClick={() => togglePermission(perm.id)}
                                    className={`flex items-start justify-between p-3.5 rounded-2xl border-2 transition-all text-right group ${
                                      isSelected
                                        ? 'bg-indigo-50/20 dark:bg-indigo-900/10 border-indigo-500 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900/30'
                                    }`}
                                  >
                                    <div className="flex-1 pl-3">
                                      <span className={`text-[11px] font-black leading-snug block ${
                                        isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'
                                      }`}>
                                        {perm.name}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block mt-1 uppercase tracking-wider font-mono">
                                        {perm.id}
                                      </span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-lg shrink-0 flex items-center justify-center transition-all mt-0.5 ${
                                      isSelected 
                                        ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/20' 
                                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                                    }`}>
                                      {isSelected ? (
                                        <Check className="h-3 w-3 stroke-[3]" />
                                      ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 shrink-0 flex gap-3">
                <button 
                  id="btn-save-role-permissions"
                  onClick={handleSubmit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer text-sm"
                >
                  حفظ وتطبيق الصلاحيات
                </button>
                <button 
                  id="btn-cancel-role-permissions"
                  onClick={() => setShowModal(false)}
                  className="px-8 font-black text-slate-500 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all cursor-pointer text-sm"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
