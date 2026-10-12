import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, UserPlus, Search, Lock, Mail, Edit3, Trash2, CheckCircle2, AlertCircle, Users, Wallet, Briefcase, Eye, EyeOff } from 'lucide-react';
import { User as UserType, Role, Account, Employee } from '../types';
import { PermissionGuard } from '../lib/permissions';

interface UserManagementProps {
  users: UserType[];
  roles: Role[];
  accounts: Account[];
  employees: Employee[];
  onSaveUser: (user: Partial<UserType>) => void;
  onDeleteUser: (id: string) => void;
}

export default function UserManagement({ users, roles, accounts, employees, onSaveUser, onDeleteUser }: UserManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  const cashboxes = accounts.filter(a => a.type === 'asset' && a.isTransactional && (a.name.includes('صندوق') || a.name.includes('Cash') || a.name.includes('بنك') || a.name.includes('Bank')));

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Partial<UserType>>({
    username: '',
    email: '',
    roleId: '',
    status: 'active',
    linkedCashboxIds: [],
    linkedEmployeeId: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUser(editingUser ? { ...formData, id: editingUser.id } : formData);
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      roleId: '',
      status: 'active',
      linkedCashboxIds: [],
      linkedEmployeeId: '',
      password: ''
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const filteredUsers = users.filter(u => 
    (u.username || "").toLowerCase().includes((searchTerm || "").toLowerCase()) ||
    (u.email || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <User className="h-8 w-8 text-blue-500" />
            إدارة المستخدمين
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic">التحكم في وصول الموظفين والأدوار الوظيفية</p>
        </div>
        
        <PermissionGuard permission="manage-users">
          <button 
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 text-sm"
          >
            <UserPlus className="h-4 w-4" />
            إضافة مستخدم
          </button>
        </PermissionGuard>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="البحث باسم المستخدم أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 text-right"
            />
          </div>
        </div>

        <div className="hidden md:block">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">المستخدم</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">الدور الوظيفي</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">الحالة</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">آخر ظهور</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-sm">{user.username}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 dark:text-slate-300">
                      <Shield className="h-3.5 w-3.5 text-indigo-500" />
                      {roles.find(r => r.id === user.roleId)?.name || 'بدون دور'}
                    </div>
                  </td>
                  <td className="p-4">
                    {user.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
                        <AlertCircle className="h-3 w-3" />
                        معلق
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-[10px] font-bold text-slate-400">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-EG') : 'لم يسجل دخول'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PermissionGuard permission="manage-users">
                        <button 
                          onClick={() => { setEditingUser(user); setFormData(user); setShowModal(true); }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard permission="manage-users">
                        <button 
                          onClick={() => onDeleteUser(user.id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Flexible Grid Layout */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white text-sm">{user.username}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { setEditingUser(user); setFormData(user); setShowModal(true); }}
                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteUser(user.id)}
                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">الدور</span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <Shield className="h-3 w-3 text-indigo-500" />
                    {roles.find(r => r.id === user.roleId)?.name || 'بدون دور'}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">الحالة</span>
                  <div>
                    {user.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600">
                        <AlertCircle className="h-3 w-3" />
                        معلق
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-1">آخر ظهور</span>
                <span className="text-[10px] font-bold text-slate-500">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-EG') : 'لم يسجل دخول'}
                </span>
              </div>
            </div>
          ))}
        </div>
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
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">{editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</h3>
                  <p className="text-white/80 text-xs font-medium">سيتم ربط الصلاحيات حسب الدور المختار</p>
                </div>
                <Users className="h-10 w-10 opacity-40" />
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">اسم المستخدم</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: osama_admin"
                    value={formData.username || ""}
                    onChange={e => setFormData(p => ({...p, username: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">البريد الإلكتروني</label>
                  <input 
                    type="email"
                    required
                    placeholder="admin@enterprise.com"
                    value={formData.email || ""}
                    onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">الدور الوظيفي</label>
                    <select 
                      required
                      value={formData.roleId || ""}
                      onChange={e => setFormData(p => ({...p, roleId: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر الدور...</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">الحالة</label>
                    <select 
                      value={formData.status || ""}
                      onChange={e => setFormData(p => ({...p, status: e.target.value as any}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">نشط</option>
                      <option value="suspended">معلق / موقوف</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-2 flex items-center gap-1">
                      <Wallet className="h-3 w-3" /> الصناديق المربوطة
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {cashboxes.map(box => (
                        <button
                          key={box.id}
                          type="button"
                          onClick={() => {
                            const currentIds = formData.linkedCashboxIds || [];
                            const newIds = currentIds.includes(box.id)
                              ? currentIds.filter(id => id !== box.id)
                              : [...currentIds, box.id];
                            setFormData(p => ({ ...p, linkedCashboxIds: newIds }));
                          }}
                          className={`p-2 rounded-lg text-xs font-bold transition-all border ${
                            (formData.linkedCashboxIds || []).includes(box.id)
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {box.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-2 flex items-center gap-1 text-blue-600">
                      <Wallet className="h-3 w-3" /> الصندوق الافتراضي للعمليات
                    </label>
                    <select
                      value={formData.defaultCashboxId || ''}
                      onChange={e => setFormData(p => ({ ...p, defaultCashboxId: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-900/30 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">لا يوجد صندوق افتراضي</option>
                      {(formData.linkedCashboxIds || []).map(id => {
                        const box = cashboxes.find(b => b.id === id);
                        return box ? <option key={box.id} value={box.id}>{box.name}</option> : null;
                      })}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1 pr-1 font-bold italic">* سيتم اختيار هذا الحساب تلقائياً في سندات القبض والصرف لهذا المستخدم</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-2 flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> الموظف المرتبط
                    </label>
                    <select
                      value={formData.linkedEmployeeId || ''}
                      onChange={e => setFormData(p => ({ ...p, linkedEmployeeId: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">لا يوجد موظف مرتبط</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">
                    {editingUser ? 'كلمة المرور الجديدة (أتركها فارغة للإبقاء على الحالية)' : 'كلمة المرور للدخول'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password || ""}
                      onChange={e => setFormData(p => ({...p, password: e.target.value}))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 pl-10 pr-10 text-sm focus:ring-2 focus:ring-blue-500 text-right font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    حفظ التغييرات
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
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
