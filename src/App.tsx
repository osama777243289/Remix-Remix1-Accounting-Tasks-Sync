/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";

const BUILD_VERSION = "2.2.0";

import FirebaseConfigForm from "./components/FirebaseConfigForm";
import firebaseConfig from "../firebase-applet-config.json";

import {
  subscribeAccounts,
  subscribeCurrencies,
  subscribeTasks,
  subscribeTransactions,
  seedInitialDatabaseIfEmpty,
  updateTask,
  subscribeHalls,
  subscribeBookings,
  subscribeClients,
  subscribeEmployees,
  subscribeServices,
  subscribeAppUsers,
  subscribeAppRoles,
  subscribeVouchers,
  subscribeCompanySettings,
  subscribeBookingSettings,
  subscribeLinkedAccounts,
  addLinkedAccounts,
  updateLinkedAccounts,
  updateAccount,
  deleteAccount,
  updateVoucher,
  deleteVoucher,
  updateClient,
  deleteClient,
  updateEmployee,
  deleteEmployee,
  updateService,
  deleteService,
  updateUser,
  deleteUser,
  updateRole,
  deleteRole,
  updateCompanySettings,
  updateCurrency,
  addCurrency,
  deleteCurrency,
  addClient,
  addEmployee,
  addService,
  addUser,
  addRole,
  addVoucher,
  addCompanySettings,
  updateBooking,
  addTransactionWithDoubleEntry,
  updateBookingSettings,
  addBookingSettings,
  subscribeRecurringEntries,
  subscribePayrollSheets,
  subscribeStandardCosts,
  subscribeActualCosts,
  addRecurringEntry,
  updateRecurringEntry,
  deleteRecurringEntry,
  addPayrollSheet,
  updatePayrollSheet,
  deletePayrollSheet,
  addStandardCost,
  updateStandardCost,
  deleteStandardCost,
  addActualCost,
  updateActualCost,
  deleteActualCost,
  updateTransaction,
  subscribeCostItems,
  addCostItem,
  updateCostItem,
  deleteCostItem,
  subscribeDepositRefundRequests,
  subscribeLockedDates,
  lockDay,
  unlockDay,
  subscribeBookingAmendmentRequests,
  subscribeNotificationSettings,
  updateNotificationSetting,
  subscribeManualNotifications,
  subscribeAccountSubscriptions,
  addManualNotification,
  updateManualNotification,
  deleteManualNotification,
} from "./lib/dbService";
import {
  Account,
  Currency,
  Task,
  Transaction,
  Hall,
  Booking,
  Client,
  Employee,
  Service,
  User as UserType,
  Role,
  ReceiptPayment,
  CompanySettings as CompanyType,
  BookingSettings as BookingSettingsType,
  LinkedAccounts,
  RecurringJournalEntry,
  EmployeePayrollSheet,
  StandardCostTemplate,
  BookingActualCost,
  CostItem,
  DepositRefundRequest,
  BookingAmendmentRequest,
  InAppNotification,
  NotificationSetting,
  ManualNotification,
  AccountNotificationSubscription,
} from "./types";

import AccountsLinking from "./components/AccountsLinking";
import PWAManager from "./components/PWAManager";
import AccountsTree from "./components/AccountsTree";
import SmartAIInsights from "./components/SmartAIInsights";
import TransactionsHistory from "./components/TransactionsHistory";
import TasksGrid from "./components/TasksGrid";
import CurrenciesManagement from "./components/CurrenciesManagement";
import HallsManagement from "./components/HallsManagement";
import HallsDirectory from "./components/HallsDirectory";
import SmartCalendar from "./components/SmartCalendar";
import DashboardStatsCards from "./components/DashboardStatsCards";
import ProfitabilityDashboardCard from "./components/ProfitabilityDashboardCard";
import BookingAlerts from "./components/BookingAlerts";
import DashboardTopCardsRow from "./components/DashboardTopCardsRow";
import ReceiptsPayments from "./components/ReceiptsPayments";
import ClientsManagement from "./components/ClientsManagement";
import EmployeesManagement from "./components/EmployeesManagement";
import ServicesManagement from "./components/ServicesManagement";
import UserManagement from "./components/UserManagement";
import RolesManagement from "./components/RolesManagement";
import AccountsPermissions from "./components/AccountsPermissions";
import BookingCollections from "./components/BookingCollections";
import CompanySettingsComponent from "./components/CompanySettings";
import BookingSettings from "./components/BookingSettings";
import NotificationManager from "./components/NotificationManager";
import NotificationSubscriptionsManagement from "./components/NotificationSubscriptionsManagement";
import DeviceGuard, { DevicesManagement } from "./components/DeviceGuard";
import PrintTemplate from "./components/PrintTemplate";
import AdvancedBookingReports from "./components/AdvancedBookingReports";
import FinancialReports from "./components/FinancialReports";
import AccountStatement from "./components/AccountStatement";
import RecurringEntries from "./components/RecurringEntries";
import PayrollManagement from "./components/PayrollManagement";
import StandardCosts from "./components/StandardCosts";
import FinancialAudit from "./components/FinancialAudit";
import DepositRefundRequests from "./components/DepositRefundRequests";
import BudgetVarianceCard from "./components/BudgetVarianceCard";
import AmendmentRequestsView from "./components/AmendmentRequestsView";
import DailyMovements from "./components/DailyMovements";
import OfficialVoucherPrintModal from "./components/OfficialVoucherPrintModal";
import DiscountsManagementView from "./components/DiscountsManagementView";

import {
  Monitor,
  Smartphone,
  Sparkles,
  FolderTree,
  DollarSign,
  BookOpen,
  CheckSquare,
  Building,
  Wifi,
  ShieldCheck,
  Laptop,
  ChevronRight,
  ChevronDown,
  Users,
  Briefcase,
  Wallet,
  Receipt,
  Tag,
  Building2,
  X,
  LogOut,
  Shield,
  ShieldAlert,
  Layers,
  RefreshCw,
  User,
  Settings,
  FileText,
  Sliders,
  Link,
  Cloud,
  PieChart,
  Sun,
  Moon,
  Clock,
  Landmark,
  Target,
  CheckCircle,
  Undo2,
  Activity,
  Bell,
  Trash2,
  CheckCheck,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
} from "lucide-react";

import {
  PermissionProvider,
  usePermissions,
  PermissionGuard,
} from "./lib/permissions";
import {
  triggerLocalFallback,
  isUsingLocalFallback,
  disableLocalFallback,
  forceCloudConnection,
} from "./lib/dbService";

const availablePermissions = [
  // 1. صلاحيات النوافذ والشاشات
  { id: "view-dashboard", name: "مشاهدة لوحة التحكم والشاشات الرئيسية", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-accounts", name: "الدخول إلى دليل الحسابات", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-reports", name: "الدخول إلى التقارير المالية والتحليلية", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-transactions", name: "الدخول إلى شاشة قيود اليومية", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-vouchers", name: "الدخول إلى شاشة السندات والتحصيلات", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-halls", name: "الدخول إلى شاشة إدارة القاعات والحجوزات", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-services", name: "الدخول إلى شاشة دليل الخدمات الإضافية", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-clients", name: "الدخول إلى شاشة إدارة العملاء والمستأجرين", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-employees", name: "الدخول إلى شاشة إدارة الموظفين والمستخدمين", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-tasks", name: "الدخول إلى شاشة المهام والتنبيهات", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-currencies", name: "الدخول إلى شاشة إدارة العملات", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-insights", name: "الدخول إلى ذكاء النظام والتحليلات الذكية", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "manage-users", name: "الدخول إلى شاشة إدارة المستخدمين", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "manage-roles", name: "الدخول إلى شاشة الصلاحيات والأدوار", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-company", name: "الدخول إلى شاشة إعدادات الشركة والمعلومات", category: "١. صلاحيات النوافذ والشاشات" },
  { id: "view-accounts-linking", name: "الدخول إلى شاشة ربط الحسابات المحاسبية", category: "١. صلاحيات النوافذ والشاشات" },

  // 2. صلاحيات العمليات والمهام والأوامر
  { id: "create-account", name: "إنشاء حساب محاسبي جديد", category: "٢. صلاحيات المهام والأوامر" },
  { id: "edit-account", name: "تعديل حساب محاسبي قائم", category: "٢. صلاحيات المهام والأوامر" },
  { id: "delete-account", name: "حذف حساب محاسبي بشكل نهائي", category: "٢. صلاحيات المهام والأوامر" },
  { id: "create-transaction", name: "إنشاء قيد يومية يدوي جديد", category: "٢. صلاحيات المهام والأوامر" },
  { id: "edit-transaction", name: "تعديل قيد يومية يدوي قائم", category: "٢. صلاحيات المهام والأوامر" },
  { id: "delete-transaction", name: "حذف أو إلغاء قيد محاسبي قائم", category: "٢. صلاحيات المهام والأوامر" },
  { id: "create-voucher", name: "إضافة سند قبض أو صرف جديد", category: "٢. صلاحيات المهام والأوامر" },
  { id: "edit-voucher", name: "تعديل سند قبض أو صرف قائم", category: "٢. صلاحيات المهام والأوامر" },
  { id: "delete-voucher", name: "حذف أو إلغاء سند وقيوده المصاحبة", category: "٢. صلاحيات المهام والأوامر" },
  { id: "print-voucher", name: "طباعة السندات والفواتير", category: "٢. صلاحيات المهام والأوامر" },
  { id: "create-booking", name: "إنشاء حجز جديد وتسكينه", category: "٢. صلاحيات المهام والأوامر" },
  { id: "edit-booking", name: "تعديل تفاصيل حجز قائم", category: "٢. صلاحيات المهام والأوامر" },
  { id: "cancel-booking", name: "إلغاء حجز قائم في النظام", category: "٢. صلاحيات المهام والأوامر" },
  { id: "delete-booking", name: "حذف حجز نهائياً من سجلات النظام", category: "٢. صلاحيات المهام والأوامر" },
  { id: "create-hall", name: "إضافة قاعة أو صالة مناسبات جديدة", category: "٢. صلاحيات المهام والأوامر" },
  { id: "edit-hall", name: "تعديل بيانات وتجهيزات القاعة", category: "٢. صلاحيات المهام والأوامر" },
  { id: "delete-hall", name: "حذف قاعة من سجلات النظام", category: "٢. صلاحيات المهام والأوامر" },
  { id: "create-service", name: "إضافة خدمة إضافية جديدة", category: "٢. صلاحيات المهام والأوامر" },
  { id: "edit-service", name: "تعديل بيانات الخدمة الإضافية", category: "٢. صلاحيات المهام والأوامر" },
  { id: "delete-service", name: "حذف خدمة إضافية من النظام", category: "٢. صلاحيات المهام والأوامر" },
  { id: "create-client", name: "إضافة عميل أو مستأجر جديد", category: "٢. صلاحيات المهام والأوامر" },
  { id: "edit-client", name: "تعديل بيانات عميل أو مستأجر قائم", category: "٢. صلاحيات المهام والأوامر" },
  { id: "delete-client", name: "حذف عميل من سجلات النظام", category: "٢. صلاحيات المهام والأوامر" },
  { id: "create-employee", name: "إضافة موظف جديد", category: "٢. صلاحيات المهام والأوامر" },
  { id: "edit-employee", name: "تعديل بيانات موظف قائم", category: "٢. صلاحيات المهام والأوامر" },
  { id: "delete-employee", name: "حذف موظف من النظام", category: "٢. صلاحيات المهام والأوامر" },
  { id: "refund-insurance", name: "صرف وإرجاع مبلغ التأمين للعميل", category: "٢. صلاحيات المهام والأوامر" },
  { id: "refund-mortgage", name: "إرجاع وصرف مبلغ الرهن المالي والرهن العيني", category: "٢. صلاحيات المهام والأوامر" },
  { id: "collect-booking-payment", name: "تحصيل دفعات الحجوزات وتسجيل المقبوضات المباشرة", category: "٢. صلاحيات المهام والأوامر" },
  { id: "audit-booking-transactions", name: "اعتماد وتدقيق الحركات المالية والقيود للحجوزات والعملاء", category: "٢. صلاحيات المهام والأوامر" },
  { id: "accrue-booking", name: "تنفيذ الترحيل والاستحقاق المالي للحجز", category: "٢. صلاحيات المهام والأوامر" },
  { id: "execute-booking", name: "تنفيذ تحويل الإيراد المؤجل لإيراد محقق", category: "٢. صلاحيات المهام والأوامر" },
  { id: "print-booking", name: "طباعة عقود الحجز وتقاريرها", category: "٢. صلاحيات المهام والأوامر" },
  { id: "manage-discounts", name: "إدارة وتوزيع وحفظ الخصومات للحجوزات", category: "٢. صلاحيات المهام والأوامر" },

  // 3. صلاحيات الضوابط والقيود الصارمة
  { id: "bypass-transaction-lock-date", name: "تجاوز قفل التاريخ وتمرير قيود بتاريخ قديم", category: "٣. الضوابط والقيود الصارمة" },
  { id: "bypass-booking-amount-lock", name: "تعديل الأسعار والمبالغ المقفلة يدوياً للحجز", category: "٣. الضوابط والقيود الصارمة" },
  { id: "bypass-booking-details-lock", name: "تعديل تفاصيل الحجز المؤكد بعد ترحيله أو حفظه", category: "٣. الضوابط والقيود الصارمة" },
  { id: "allow-unlimited-discount", name: "منح خصم غير محدود يتجاوز النسبة المعيارية", category: "٣. الضوابط والقيود الصارمة" },
  { id: "view-sensitive-financial-totals", name: "مشاهدة إجماليات الإيرادات والأرباح بلوحة التحكم", category: "٣. الضوابط والقيود الصارمة" },

  // 4. صلاحيات العناصر الفردية (الأزرار والبطاقات)
  { id: "btn-confirm-booking", name: "زر تأكيد الحجز (في شاشة المعاينة)", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "btn-cancel-booking", name: "زر إلغاء الحجز (في شاشة المعاينة)", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "btn-print-contract", name: "زر طباعة العقد (في شاشة المعاينة)", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "btn-refund-insurance", name: "زر رد مبلغ التأمين (في شاشة المعاينة)", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "btn-refund-mortgage", name: "زر رد مبلغ الرهن العيني والمالي (في شاشة المعاينة)", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "btn-collect-payment", name: "زر تحصيل دفعة إضافية (في شاشة المعاينة)", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "btn-accrue-revenue", name: "زر الترحيل والاستحقاق المالي (في شاشة المعاينة)", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "card-booking-stats", name: "البطاقات الإحصائية والتحليلية للحجوزات", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "card-occupancy-analytics", name: "بطاقة نسب إشغال القاعات والتحليلات البيانية", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
  { id: "card-booking-financials", name: "بطاقة كشف وموجز المبالغ والتحصيلات", category: "٤. صلاحيات العناصر الفردية (الأزرار والبطاقات)" },
];

// --- Helper Comps ---

function UserSwitcher() {
  const { currentUser, setCurrentUser } = usePermissions();
  if (!currentUser) return null;
  return (
    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col text-right">
        <span className="text-[10px] font-bold text-slate-800 dark:text-white leading-none">
          {currentUser.username || currentUser.name}
        </span>
        <span className="text-[8px] text-slate-500 dark:text-slate-400 capitalize">
          {currentUser.roleId}
        </span>
      </div>
      <button
        onClick={() => {
          localStorage.removeItem("current_user_id");
          setCurrentUser(null);
        }}
        className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
        title="تبديل الحساب"
      >
        <LogOut className="h-3 w-3" />
      </button>
    </div>
  );
}

function AppWrapper(props: any) {
  const { currentUser, setCurrentUser, users } = usePermissions();
  const [showFallbackBtn, setShowFallbackBtn] = useState(false);
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<UserType | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loginError, setLoginError] = useState("");

  const filteredUsers = useMemo(() => {
    try {
      const stored = localStorage.getItem("guard_allowed_user_ids");
      if (stored) {
        const allowedIds = JSON.parse(stored) as string[];
        if (allowedIds && allowedIds.length > 0) {
          return users.filter(u => allowedIds.includes(u.id));
        }
      }
    } catch (e) {
      console.error("Error filtering users by device restriction", e);
    }
    return users;
  }, [users]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (props.dbLoading) setShowFallbackBtn(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [props.dbLoading]);

  const handleAttemptLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForLogin) return;

    if (selectedUserForLogin.password && selectedUserForLogin.password.trim() !== "") {
      if (passwordInput.trim() === selectedUserForLogin.password.trim()) {
        setCurrentUser(selectedUserForLogin);
        setSelectedUserForLogin(null);
        setPasswordInput("");
        setLoginError("");
      } else {
        setLoginError("كلمة المرور غير صحيحة، يرجى إعادة المحاولة.");
      }
    } else {
      // If user password is not set yet in DB, allow login or check default
      setCurrentUser(selectedUserForLogin);
      setSelectedUserForLogin(null);
      setPasswordInput("");
      setLoginError("");
    }
  };

  if (props.dbLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 rtl font-sans text-center">
        <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold animate-pulse">
          جاري تحميل النظام والمزامنة السحابية...
        </p>
        {showFallbackBtn && !isUsingLocalFallback() && (
          <button
            onClick={() => {
              triggerLocalFallback();
              window.location.reload();
            }}
            className="mt-8 text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            استخدام التخزين المحلي (Offline Mode)؟
          </button>
        )}
        {isUsingLocalFallback() && (
          <button
            onClick={() => {
              forceCloudConnection();
            }}
            className="mt-8 text-xs text-emerald-400 hover:text-emerald-300 underline"
          >
            إعادة الاتصال بالسحابة (Reconnect)
          </button>
        )}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 rtl font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10">
            {selectedUserForLogin ? (
              <div>
                <button
                  onClick={() => {
                    setSelectedUserForLogin(null);
                    setPasswordInput("");
                    setLoginError("");
                  }}
                  className="mb-6 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>العودة لقائمة الحسابات</span>
                </button>

                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 mx-auto shadow-lg shadow-indigo-600/20 font-black text-2xl">
                  {(selectedUserForLogin.username || selectedUserForLogin.name || "U").charAt(0).toUpperCase()}
                </div>

                <h1 className="text-xl font-black text-white text-center mb-1">
                  {selectedUserForLogin.username || selectedUserForLogin.name}
                </h1>
                <p className="text-indigo-400 text-xs text-center font-bold uppercase tracking-wider mb-6">
                  {selectedUserForLogin.roleId}
                </p>

                <form onSubmit={handleAttemptLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2 text-right">
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showPasswordInput ? "text" : "password"}
                        required
                        autoFocus
                        placeholder="أدخل كلمة المرور"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordInput(!showPasswordInput)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPasswordInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold text-center">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>تسجيل الدخول</span>
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 mx-auto shadow-lg shadow-indigo-600/20">
                  <Shield className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-black text-white text-center mb-2">
                  محاسب بلس (Muhasib Plus)
                </h1>
                <p className="text-slate-400 text-sm text-center mb-8">
                  الرجاء اختيار الحساب لبدء العمل على النظام
                </p>

                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUserForLogin(user);
                        setPasswordInput("");
                        setLoginError("");
                      }}
                      className="w-full p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 flex justify-between items-center transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-indigo-400 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {(user.username || user.name || "U").charAt(0)}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white text-sm">
                            {user.username || user.name}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-tighter">
                            {user.roleId}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <AppContent {...props} />;
}

function AppContent(props: any) {
  const { currentUser } = usePermissions();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'read'>('unread');

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "العامة": true,
    "المحاسبة والمالية": false,
    "إدارة العمليات": false,
    "الموارد والعملاء": false,
    "الإعدادات والأمان": false,
    "المحاكيات": false
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const {
    activeDeviceView,
    setActiveDeviceView,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    accounts,
    currencies,
    tasks,
    transactions,
    setTransactions,
    globalCurrency,
    setGlobalCurrency,
    androidTab,
    setAndroidTab,
    systemTime,
    initialBookingDate,
    setInitialBookingDate,
    halls,
    bookings,
    clients,
    employees,
    services,
    appUsers,
    appRoles,
    vouchers,
    companySettings,
    bookingSettings,
    linkedAccounts,
    recurringEntries,
    payrollSheets,
    standardCosts,
    actualCosts,
    costItems,
    printData,
    setPrintData,
    dashboardCurrentDate,
    setDashboardCurrentDate,
    dashboardSelectedStatType,
    setDashboardSelectedStatType,
    dashboardDepositFilter,
    setDashboardDepositFilter,
    calendarSelectedBooking,
    setCalendarSelectedBooking,
    calendarSelectedDayDetails,
    setCalendarSelectedDayDetails,
    externalPreviewBookingId,
    setExternalPreviewBookingId,
    isGlobalPreviewOpen,
    setIsGlobalPreviewOpen,
    previousDeviceView,
    setPreviousDeviceView,
    selectedAccount,
    setSelectedAccount,
    selectedClientIds,
    setSelectedClientIds,
    syncStatus,
    depositRefundRequests,
    bookingAmendmentRequests,
    lockedDates,
    notifications,
    setNotifications,
    isNotificationMenuOpen,
    setIsNotificationMenuOpen,
    markAllNotificationsAsRead,
    clearAllNotifications,
    handleNotificationClick,
    highlightJournalCode,
    setHighlightJournalCode,
    highlightAmendmentId,
    setHighlightAmendmentId,
    highlightRefundId,
    setHighlightRefundId,
    preFilledCustomerName,
    setPreFilledCustomerName,
    notificationSettings,
    manualNotifications,
  } = props;

  const [officialVoucherToPrint, setOfficialVoucherToPrint] = useState<ReceiptPayment | null>(null);
  const [isOfficialVoucherModalOpen, setIsOfficialVoucherModalOpen] = useState(false);

  const getSumConverted = (type: Account["type"]) => {
    if (!accounts || !currencies) return 0;
    return accounts
      .filter((a) => a.type === type)
      .reduce((sum, acc) => {
        const fromRate =
          currencies.find((c) => c.code === acc.currency)?.rateToBase || 1;
        const targetRate =
          currencies.find((c) => c.code === globalCurrency)?.rateToBase || 1;
        return sum + (acc.balance * fromRate) / targetRate;
      }, 0);
  };

  const getGlobalSymbol = () =>
    currencies.find((c) => c.code === globalCurrency)?.symbol || "﷼";

  const totalAssetsVal = getSumConverted("asset");
  const totalLiabilitiesVal = getSumConverted("liability");
  const totalEquityVal = getSumConverted("equity");

  const renderAndroidPhone = () => {
    return (
      <div className="w-[320px] h-[640px] bg-slate-900 rounded-[3rem] p-2.5 shadow-2xl border-4 border-slate-800 relative ring-12 ring-slate-950/20">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-10" />
        <div className="w-full h-full bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="h-14 bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <span className="font-black text-xs">نظام الأندرويد المحاسبي</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-950">
            <div className="space-y-4">
              <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg">
                <span className="text-[10px] opacity-80 block">
                  إجمالي أصول المؤسسة
                </span>
                <div className="text-xl font-black mt-1">
                  {(getSumConverted("asset") || 0).toLocaleString()}{" "}
                  <span className="text-xs">{globalCurrency}</span>
                </div>
              </div>
              <div className="space-y-2">
                <h6 className="text-[10px] font-black text-slate-500 uppercase pr-1">
                  أحدث الحركات
                </h6>
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]"
                  >
                    <div>
                      <div className="font-bold truncate max-w-[120px]">
                        {tx.description}
                      </div>
                      <div className="text-[8px] text-slate-400">{tx.date}</div>
                    </div>
                    <div className="font-black text-indigo-600">
                      {tx.amount.toLocaleString()} {tx.currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="h-16 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center">
            <button className="flex flex-col items-center gap-1 text-indigo-600">
              <Building className="h-4 w-4" />
              <span className="text-[8px] font-bold">الرئيسية</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-400">
              <FolderTree className="h-4 w-4" />
              <span className="text-[8px] font-bold">الحسابات</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-slate-400">
              <CheckSquare className="h-4 w-4" />
              <span className="text-[8px] font-bold">المهام</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderWindowsApp = () => {
    return (
      <div className="w-full bg-slate-900 rounded-xl border border-slate-750 overflow-hidden shadow-2xl">
        <div className="h-8 bg-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-400 border-b border-slate-700">
          <div className="flex items-center gap-2 font-black">
            <Laptop className="h-3.5 w-3.5 text-blue-400" />{" "}
            <span>برنامج محاسب بلس v3.0 - سطح المكتب</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          </div>
        </div>
        <div className="bg-slate-950 p-6 min-h-[400px]">
          <div className="grid grid-cols-12 gap-6 h-full">
            <div className="col-span-8 flex flex-col gap-6">
              <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">
                      حالة الاتصال والبيانات
                    </h4>
                    <p className="text-xs text-indigo-400 font-bold">
                      قاعدة بيانات Firestore متزامنة لحظياً
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-[10px] text-slate-500 font-black">
                    رقم المعاملة الأخيرة
                  </div>
                  <div className="text-xs text-white font-mono">
                    {transactions[0]?.id.slice(0, 8) || "N/A"}
                  </div>
                </div>
              </div>
              <TransactionsHistory
                transactions={transactions}
                accounts={accounts}
                currencies={currencies}
                setPrintData={setPrintData}
                currentUser={currentUser}
              />
            </div>
            <div className="col-span-4">
              <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 h-full">
                <h4 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-indigo-400" /> أرصدة سريعة
                </h4>
                <div className="space-y-3">
                  {accounts
                    .filter((a) => a.parentId === null)
                    .slice(0, 5)
                    .map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex justify-between items-center text-[10px]"
                      >
                        <span className="text-white font-bold">{acc.name}</span>
                        <span className="font-mono text-indigo-400 font-black">
                          {(acc.balance ?? 0).toLocaleString()} {acc.currency}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handlePrintVoucher = (v: ReceiptPayment) => {
    setOfficialVoucherToPrint(v);
    setIsOfficialVoucherModalOpen(true);
  };

  const handlePrintBooking = (booking: Booking) => {
    const paidDeposit = booking.paidAmount || 0;
    const subsequentPayments = booking.subsequentPayments || 0;
    const totalPaid = paidDeposit + subsequentPayments;
    const remaining = Math.max(0, booking.totalPrice - totalPaid);
    setPrintData({
      title: "عقد وحجز مناسبة",
      documentNumber: booking.sequenceCode || booking.id.slice(-6).toUpperCase(),
      manualNumber: booking.manualNumber,
      date: booking.voucherDate || booking.createdAt,
      content: (
        <div className="space-y-6 text-right" dir="rtl">
          {booking.manualNumber && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold flex justify-between items-center mb-2">
              <span>رقم الحجز / السند اليدوي:</span>
              <span className="font-mono text-sm font-bold">{booking.manualNumber}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase">
                اسم العميل / المستأجر
              </p>
              <p className="text-sm font-black text-slate-800">
                {booking.customerName}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase">
                رقم التواصل
              </p>
              <p className="text-sm font-mono font-bold text-slate-800">
                {booking.customerPhone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase">
                القاعة المحجوزة
              </p>
              <p className="text-sm font-black text-indigo-600">
                {halls.find((h) => h.id === booking.hallId)?.name || "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-black uppercase">
                نوع المناسبة
              </p>
              <p className="text-sm font-bold text-slate-800">
                {booking.eventType || "عامة"}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] text-slate-400 font-black mb-2 uppercase tracking-widest">
              شروط وتوقيت الحجز
            </p>
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed mb-2">
              يلتزم الطرف الثاني بالحفاظ على ممتلكات القاعة وإخلائها في تمام
              الوقت المحدد أعلاه لتفادي أي رسوم إضافية.
            </p>
          </div>

          {/* Dates list */}
          <div className="border border-slate-250 rounded-2xl p-4 space-y-2">
            <h4 className="font-extrabold text-indigo-700 border-b border-slate-100 pb-1 text-[11px]">
              🗓️ تواريخ المناسبة المحجوزة
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {(
                booking.eventDates ||
                (booking.eventDate ? [booking.eventDate] : [])
              ).map((d, i) => (
                <span
                  key={i}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl font-mono font-black text-xs border border-slate-200"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Additional Services if any */}
          {booking.additionalServices &&
            booking.additionalServices.length > 0 && (
              <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-extrabold text-indigo-700 border-b border-slate-100 pb-1 text-[11px]">
                  ✨ الخدمات والضيافة الإضافية المشتركة
                </h4>
                <div className="divide-y divide-slate-100">
                  {booking.additionalServices.map((srv, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between py-1 text-[10px] font-bold text-slate-700"
                    >
                      <span>{srv.name}</span>
                      <span className="font-mono">
                        {srv.cost.toLocaleString()} {booking.currency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Financial Breakdown */}
          <div className="border-2 border-indigo-600 rounded-2xl p-4 space-y-2 bg-indigo-50/20">
            <h4 className="font-black text-indigo-800 border-b border-indigo-100 pb-1 text-[11px]">
              💰 الوضع المالي وجدول السداد
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
              <div className="p-2 bg-white rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold">
                  مجموع قيمة العقد
                </p>
                <span className="text-sm font-mono font-black text-indigo-700">
                  {booking.totalPrice.toLocaleString()} {booking.currency}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold text-emerald-600">
                  العربون المسدد
                </p>
                <span className="text-sm font-mono font-black text-emerald-600">
                  {paidDeposit.toLocaleString()} {booking.currency}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold text-indigo-600">
                  الدفعات المحصلة
                </p>
                <span className="text-sm font-mono font-black text-indigo-600">
                  {subsequentPayments.toLocaleString()} {booking.currency}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold text-rose-500">
                  المتبقي المستحق
                </p>
                <span className="text-sm font-mono font-black text-rose-500">
                  {remaining.toLocaleString()} {booking.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures & Conditions */}
          <div className="pt-6 border-t border-slate-100 text-[10px] leading-relaxed text-slate-500 font-semibold space-y-1">
            {bookingSettings?.policyNotes &&
            bookingSettings.policyNotes.length > 0 ? (
              bookingSettings.policyNotes.map((note, idx) => (
                <p key={idx}>
                  {idx + 1}.{" "}
                  {note
                    .replace("{startTime}", booking.startTime || "")
                    .replace("{endTime}", booking.endTime || "")}
                </p>
              ))
            ) : (
              <>
                <p>
                  1. يحق للطرف الأول إلغاء الحجز في حال عدم استكمال الدفعات قبل
                  موعد الفعالية بـ 72 ساعة.
                </p>
                <p>
                  2. لا تقع المسؤولية على الطرف الأول عن فقدان الممتلكات الشخصية
                  لرواد الفعالية أو المدعوين.
                </p>
                <p>
                  3. يعتبر هذا التوقيت والجدولة الزمنية {booking.startTime} -{" "}
                  {booking.endTime} مُعتمداً ونهائياً للطرفين.
                </p>
              </>
            )}
          </div>
        </div>
      ),
    });
  };

  const isDateLocked = (dateStr: string) => {
    if (!lockedDates || !dateStr) return false;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      const targetDate = d.toISOString().split('T')[0];
      return lockedDates.some(ld => ld.date === targetDate);
    } catch (e) {
      return false;
    }
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction && isDateLocked(transaction.date)) {
      toast.error("عذراً، لا يمكن تعديل حركة في تاريخ مقفل.");
      return;
    }
    if (updates.date && isDateLocked(updates.date)) {
      toast.error("عذراً، لا يمكن نقل الحركة إلى تاريخ مقفل.");
      return;
    }

    const originalTransactions = [...transactions];
    try {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      await updateTransaction(id, updates);
    } catch (error) {
      console.error("Failed to update transaction:", error);
      setTransactions(originalTransactions);
      throw error; // Rethrow so the caller can show the toast
    }
  };

  const handleCollect = async (
    bId: string, 
    am: number, 
    aId: string, 
    creditAccId?: string, 
    date?: string, 
    manualNumber?: string,
    collectionType: "deposit" | "payment" = "payment"
  ) => {
    try {
      const effectiveDate = date || new Date().toISOString().split("T")[0];
      if (isDateLocked(effectiveDate)) {
        toast.error("عذراً، لا يمكن تحصيل دفعة في تاريخ مقفل.");
        return;
      }

      const booking = bookings.find((b) => b.id === bId);
      if (!booking) return;
      const selectedHall = halls.find((h) => h.id === booking.hallId);
      const userName = currentUser?.username || currentUser?.name || "System";
      const now = new Date().toISOString();

      if (collectionType === "deposit") {
        await updateBooking(booking.id, { 
          paidAmount: (booking.paidAmount || 0) + am,
          updatedBy: userName,
          updatedAt: now
        });
      } else {
        await updateBooking(booking.id, { 
          subsequentPayments: (booking.subsequentPayments || 0) + am,
          updatedBy: userName,
          updatedAt: now
        });
      }

      const defaultReceivableAccount = accounts.find(
        (a) => a.code === "1010301" || 
               a.name === "الزبائن والحجوزات" || 
               (a.name?.includes("عملاء") && !a.name?.includes("خصم")) ||
               a.name?.includes("المدينون")
      );
      const targetCreditAccId = creditAccId || 
                                linkedAccounts?.[0]?.accountsReceivableId || 
                                defaultReceivableAccount?.id || 
                                "1010301";

      const hallNamePart = selectedHall?.name ? ` (${selectedHall.name})` : "";
      const bookingCodePart = booking.sequenceCode || booking.manualNumber || `#${booking.id.slice(-6).toUpperCase()}`;
      const rawDates = (booking.eventDates && booking.eventDates.length > 0)
        ? booking.eventDates
        : (booking.days && booking.days.length > 0)
          ? booking.days.map((d: any) => d.date).filter(Boolean)
          : (booking.eventDate ? [booking.eventDate] : []);
      const datesPart = rawDates.length > 0
        ? (rawDates.length === 1 ? ` | تاريخ الحجز: ${rawDates[0]}` : ` | أيام الحجز: ${rawDates.join(' ، ')}`)
        : "";
      const descriptionText = collectionType === "deposit"
        ? `سند قبض عربون حجز صالة${hallNamePart} - العميل: ${booking.customerName} | حجز رقم: ${bookingCodePart}${datesPart}`
        : `سند قبض دفعة حجز صالة${hallNamePart} - العميل: ${booking.customerName} | حجز رقم: ${bookingCodePart}${datesPart}`;

      const voucherData = {
        type: "receipt",
        manualNumber: manualNumber || "",
        date: date || now.split("T")[0],
        voucherDate: date || now.split("T")[0],
        amount: am,
        currency: booking.currency,
        fromToAccountId: targetCreditAccId,
        cashBankAccountId: aId,
        description: descriptionText,
        linkedBookingId: bId,
        createdBy: userName,
        createdAt: now
      };

      const voucherId = await addVoucher(voucherData);

      const currency = currencies.find((c) => c.code === booking.currency);
      const rate = currency ? currency.rateToBase : 1;

      const tx: Omit<Transaction, "id" | "createdAt"> = {
        date: voucherData.date,
        description: voucherData.description,
        manualNumber: manualNumber || "",
        amount: am,
        currency: booking.currency,
        rate: rate,
        sourceId: voucherId,
        sourceType: "voucher",
        linkedBookingId: bId,
        debitAccountId: aId,
        creditAccountId: targetCreditAccId,
        createdBy: userName
      };

      await addTransactionWithDoubleEntry(tx, currencies, accounts);
      toast.success(collectionType === "deposit" ? "تم تحصيل العربون وتوثيق السند بنجاح" : "تم تحصيل الدفعة وتسجيل القيد بنجاح");
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء التحصيل");
    }
  };

  const handleSaveVoucherWrap = async (v: any) => {
    try {
      const effectiveDate = v.voucherDate || v.date;
      
      if (isDateLocked(effectiveDate)) {
        toast.error("عذراً، لا يمكن حفظ سند في تاريخ مقفل.");
        return;
      }

      // If updating, check the original date too
      if (v.id) {
        const originalVoucher = vouchers.find(x => x.id === v.id);
        if (originalVoucher && isDateLocked(originalVoucher.date)) {
          toast.error("عذراً، لا يمكن تعديل سند في تاريخ مقفل.");
          return;
        }
      }

      const userName = currentUser?.username || currentUser?.name || "System";
      const now = new Date().toISOString();
      const currency = currencies.find((c) => c.code === v.currency);
      const rate = currency ? currency.rateToBase : 1;
      
      if (v.id) {
        await updateVoucher(v.id, { ...v, date: effectiveDate, voucherDate: effectiveDate, manualNumber: v.manualNumber || "", updatedBy: userName, updatedAt: now });
        const existingTx = transactions.find(t => t.sourceId === v.id && t.sourceType === "voucher");
        if (existingTx) {
          await updateTransaction(existingTx.id, {
            date: effectiveDate,
            description: v.description,
            manualNumber: v.manualNumber || "",
            amount: v.amount,
            currency: v.currency,
            rate: rate,
            baseAmount: v.amount * rate,
            debitAccountId: v.type === "receipt" ? v.cashBankAccountId : v.fromToAccountId,
            creditAccountId: v.type === "receipt" ? v.fromToAccountId : v.cashBankAccountId,
          });
        }
        toast.success("تم تحديث السند وترحيله بنجاح");
      } else {
        const voucherData = { 
          ...v, 
          manualNumber: v.manualNumber || "",
          date: effectiveDate,
          voucherDate: effectiveDate,
          createdBy: userName, 
          createdAt: now,
          updatedBy: userName, 
          updatedAt: now 
        };
        const voucherId = await addVoucher(voucherData);

        const tx: Omit<Transaction, "id" | "createdAt"> = {
          date: effectiveDate,
          description: v.description,
          manualNumber: v.manualNumber || "",
          amount: v.amount,
          currency: v.currency,
          rate: rate,
          sourceId: voucherId,
          sourceType: "voucher",
          debitAccountId:
            v.type === "receipt" ? v.cashBankAccountId : v.fromToAccountId,
          creditAccountId:
            v.type === "receipt" ? v.fromToAccountId : v.cashBankAccountId,
          createdBy: userName,
        };
        await addTransactionWithDoubleEntry(tx, currencies, accounts);
        toast.success("تم حفظ السند وترحيله بنجاح");
      }
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء الحفظ");
    }
  };

  const handleSaveMultiVoucher = async (v: any) => {
    try {
      const effectiveDate = v.voucherDate || v.date;
      if (isDateLocked(effectiveDate)) {
        toast.error("عذراً، لا يمكن حفظ سند في تاريخ مقفل.");
        return;
      }

      const userName = currentUser?.username || currentUser?.name || "System";
      const now = new Date().toISOString();
      
      const voucherData = { 
        ...v, 
        manualNumber: v.manualNumber || "",
        date: effectiveDate,
        voucherDate: effectiveDate,
        amount: v.totalAmount,
        createdBy: userName, 
        createdAt: now,
        updatedBy: userName, 
        updatedAt: now 
      };
      const voucherId = await addVoucher(voucherData);

      const currency = currencies.find((c) => c.code === v.currency);
      const rate = currency ? currency.rateToBase : 1;

      let index = 0;
      for (const entry of v.entries) {
        const tx: Omit<Transaction, "id" | "createdAt"> = {
          date: effectiveDate,
          description: entry.description || v.description,
          manualNumber: v.manualNumber || "",
          amount: entry.amount,
          currency: v.currency,
          rate: rate,
          sourceId: `${voucherId}-${index}`,
          sourceType: "voucher",
          debitAccountId: v.type === "receipt" ? v.cashBankAccountId : entry.accountId,
          creditAccountId: v.type === "receipt" ? entry.accountId : v.cashBankAccountId,
          createdBy: userName,
        };
        await addTransactionWithDoubleEntry(tx, currencies, accounts);
        index++;
      }
      
      toast.success("تم حفظ السند المتعدد وترحيله بنجاح");
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء الحفظ");
    }
  };

  const handleDeleteVoucherWrap = async (id: string) => {
    try {
      const voucher = vouchers.find(v => v.id === id);
      if (voucher && isDateLocked(voucher.date)) {
        toast.error("عذراً، لا يمكن حذف سند في تاريخ مقفل.");
        return;
      }
      await deleteVoucher(id);
      toast.success("تم حذف السند بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSaveClientWrap = async (c: any) => {
    try {
      if (!c.phone || !c.phone.trim()) {
        toast.error("عذراً، يرجى إدخال رقم الجوال لحفظ العميل!");
        return;
      }
      c.id ? await updateClient(c.id, c) : await addClient(c);
      toast.success("تم حفظ العميل بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDeleteClientWrap = async (id: string) => {
    try {
      await deleteClient(id);
      toast.success("تم حذف العميل بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSaveEmployeeWrap = async (e: any) => {
    try {
      e.id ? await updateEmployee(e.id, e) : await addEmployee(e);
      toast.success("تم حفظ الموظف بنجاح");
    } catch (err) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDeleteEmployeeWrap = async (id: string) => {
    try {
      await deleteEmployee(id);
      toast.success("تم حذف الموظف بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSaveServiceWrap = async (s: any) => {
    try {
      s.id ? await updateService(s.id, s) : await addService(s);
      toast.success("تم حفظ الخدمة بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDeleteServiceWrap = async (id: string) => {
    try {
      await deleteService(id);
      toast.success("تم حذف الخدمة بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSaveUserWrap = async (u: any) => {
    try {
      u.id ? await updateUser(u.id, u) : await addUser(u);
      toast.success("تم حفظ المستخدم بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDeleteUserWrap = async (id: string) => {
    try {
      await deleteUser(id);
      toast.success("تم حذف المستخدم بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSaveRoleWrap = async (r: any) => {
    try {
      r.id ? await updateRole(r.id, r) : await addRole(r);
      toast.success("تم حفظ الصلاحية بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDeleteRoleWrap = async (id: string) => {
    try {
      await deleteRole(id);
      toast.success("تم حذف الصلاحية بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleSaveCompanyWrap = async (d: any) => {
    try {
      const id = companySettings?.id || "default-company";
      await updateCompanySettings(id, d);
      toast.success("تم حفظ إعدادات الشركة بنجاح");
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleSaveBookingSettingsWrap = async (d: any) => {
    try {
      const id = bookingSettings?.id || "default-settings";
      await updateBookingSettings(id, d);
    } catch (e) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleSaveLinkedAccountsWrap = async (d: any) => {
    try {
      const id = linkedAccounts[0]?.id || "default";
      if (linkedAccounts[0]) {
        await updateLinkedAccounts(id, d);
      } else {
        await addLinkedAccounts({ id, ...d });
      }
      if (bookingSettings?.id) {
        await updateBookingSettings(bookingSettings.id, d);
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء حفظ ربط الحسابات");
    }
  };

  const sidebarGroups = [
    {
      title: "العامة",
      items: [
        { id: "web", label: "الرئيسية", icon: Monitor, perm: "view-dashboard" },
        {
          id: "tasks",
          label: "المهام اليومية",
          icon: CheckSquare,
          perm: "view-tasks",
        },
        {
          id: "insights",
          label: "إرشاد AI",
          icon: Sparkles,
          perm: "view-insights",
        },
      ],
    },
    {
      title: "المحاسبة والمالية",
      items: [
        {
          id: "chart",
          label: "الدليل المحاسبي",
          icon: FolderTree,
          perm: "view-accounts",
        },
        {
          id: "journal",
          label: "قيود اليومية",
          icon: BookOpen,
          perm: "view-transactions",
        },
        {
          id: "daily-movements",
          label: "الحركة اليومية للمنشأة",
          icon: Activity,
          perm: "view-transactions",
        },
        {
          id: "recurring-entries",
          label: "القيود اليومية الدورية",
          icon: Clock,
          perm: "view-transactions",
        },
        {
          id: "financial-audit",
          label: "تدقيق الحركات (المدير المالي)",
          icon: ShieldCheck,
          perm: "view-reports",
        },
        {
          id: "standard-costing",
          label: "التكاليف المعيارية والانحرافات",
          icon: Target,
          perm: "view-reports",
        },
        {
          id: "reports",
          label: "التقارير المالية",
          icon: FileText,
          perm: "view-reports",
        },
        {
          id: "account-statement",
          label: "كشف حساب تفصيلي",
          icon: Receipt,
          perm: "view-reports",
        },
        {
          id: "advanced-reports",
          label: "تقارير الحجوزات المتقدمة",
          icon: PieChart,
          perm: "view-reports",
        },
        {
          id: "receipts-payments",
          label: "سندات قبض وصرف",
          icon: Wallet,
          perm: "view-vouchers",
        },
        {
          id: "collections",
          label: "تحصيل دفعات",
          icon: Receipt,
          perm: "view-bookings",
        },
        {
          id: "discounts",
          label: "إدارة الخصومات",
          icon: Tag,
          perm: "view-bookings",
        },
        {
          id: "amendments",
          label: "طلبات تعديل الحجوزات",
          icon: Clock,
          perm: "view-bookings",
        },
        {
          id: "currencies",
          label: "إدارة العملات",
          icon: DollarSign,
          perm: "view-currencies",
        },
      ],
    },
    {
      title: "إدارة العمليات",
      items: [
        {
          id: "halls",
          label: "القاعات والحجوزات",
          icon: Building2,
          perm: "view-halls",
        },
        {
          id: "booking-audit",
          label: "تدقيق الحجوزات",
          icon: CheckCircle,
          perm: "audit-booking-transactions",
        },
        {
          id: "halls-directory",
          label: "دليل القاعات المصور",
          icon: Building,
          perm: "view-halls",
        },
        {
          id: "services",
          label: "الخدمات الإضافية",
          icon: Layers,
          perm: "view-services",
        },
        {
          id: "deposit-refund-requests",
          label: "طلبات رد العربون",
          icon: Undo2,
          perm: "view-bookings",
        },
      ],
    },
    {
      title: "الموارد والعملاء",
      items: [
        { id: "clients", label: "العملاء", icon: Users, perm: "view-clients" },
        {
          id: "employees",
          label: "الموظفون",
          icon: Briefcase,
          perm: "view-employees",
        },
        {
          id: "payroll-sheets",
          label: "مسيرات الرواتب",
          icon: Landmark,
          perm: "view-employees",
        },
      ],
    },
    {
      title: "الإعدادات والأمان",
      items: [
        {
          id: "user-management",
          label: "المستخدمون",
          icon: User,
          perm: "manage-users",
        },
        { id: "roles", label: "الصلاحيات", icon: Shield, perm: "manage-roles" },
        {
          id: "accounts-permissions",
          label: "صلاحيات الحسابات",
          icon: ShieldAlert,
          perm: "manage-users",
        },
        {
          id: "account-setup",
          label: "إعدادات الشركة",
          icon: Settings,
          perm: "view-company",
        },
        {
          id: "accounts-linking",
          label: "ربط الحسابات",
          icon: Link,
          perm: "view-company",
        },
        {
          id: "booking-settings",
          label: "إعدادات الحجوزات",
          icon: Sliders,
          perm: "view-company",
        },
        {
          id: "firebase-config",
          label: "إعدادات السحابة",
          icon: Cloud,
          perm: "view-company",
        },
        {
          id: "notification-management",
          label: "إدارة الإشعارات",
          icon: Bell,
          perm: "view-company",
        },
        {
          id: "notification-subscriptions",
          label: "اشتراكات الإشعارات",
          icon: Bell,
          perm: "view-company",
        },
        {
          id: "device-guard",
          label: "أمان الأجهزة",
          icon: ShieldCheck,
          perm: "manage-users",
        },
      ],
    },
    {
      title: "المحاكيات",
      items: [
        {
          id: "android",
          label: "محاكي أندرويد",
          icon: Smartphone,
          perm: "view-android",
        },
        {
          id: "windows",
          label: "محاكي ويندوز",
          icon: Laptop,
          perm: "view-windows",
        },
      ],
    },
  ];

  useEffect(() => {
    const activeGroup = sidebarGroups.find(group => 
      group.items.some(item => item.id === activeDeviceView)
    );
    if (activeGroup) {
      setExpandedGroups(prev => ({
        ...prev,
        [activeGroup.title]: true
      }));
    }
  }, [activeDeviceView]);

  const handleViewChange = (viewId: string) => {
    setActiveDeviceView(viewId);
    setIsSidebarCollapsed(true);
  };

  return (
    <div className="flex h-screen overflow-hidden rtl font-sans bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Backdrop Overlay */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      {!isSidebarCollapsed && (
        <aside className="fixed top-0 right-0 h-full w-64 bg-white/95 dark:bg-slate-950/90 backdrop-blur-2xl border-l border-slate-200 dark:border-white/10 flex flex-col transition-all z-50 shadow-xl dark:shadow-[0_0_50px_rgba(0,0,0,0.3)]">
          <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/20">
                م
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-black text-slate-800 dark:text-white text-xs tracking-tight">محاسب بلس</span>
                <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">النظام الذكي</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all duration-300"
                title={isDarkMode ? "الوضع الفاتح" : "الوضع الداكن"}
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
              </button>
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all duration-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-6 overflow-y-auto custom-scrollbar">
            {sidebarGroups.map((group, gIdx) => {
              const isExpanded = !!expandedGroups[group.title];
              return (
                <div key={gIdx} className="space-y-1.5">
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-widest transition-all group/header hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <span>{group.title}</span>
                    <ChevronDown
                      className={`h-3 w-3 text-slate-400 dark:text-slate-600 group-hover/header:text-slate-600 dark:group-hover/header:text-slate-400 transition-transform duration-300 ${
                        isExpanded ? "rotate-0" : "-rotate-90 rtl:rotate-90"
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                      >
                        {group.items.map((item) => (
                          <PermissionGuard key={item.id} permission={item.perm}>
                            <button
                              onClick={() => handleViewChange(item.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-xs font-bold relative overflow-hidden group/item ${
                                activeDeviceView === item.id
                                  ? "text-white bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-lg shadow-indigo-600/20"
                                  : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200 hover:bg-indigo-50/60 dark:hover:bg-white/5"
                              }`}
                            >
                              <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-300 group-hover/item:scale-110 ${activeDeviceView === item.id ? 'text-white' : 'text-slate-500 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400'}`} />
                              <span>{item.label}</span>
                              {activeDeviceView === item.id && (
                                <motion.div 
                                  layoutId="active-indicator"
                                  className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 dark:bg-white rounded-r-full"
                                />
                              )}
                            </button>
                          </PermissionGuard>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
          <div className="p-3 bg-slate-50/80 dark:bg-slate-950/50 backdrop-blur-sm border-t border-slate-200 dark:border-white/5 flex flex-col gap-2">
            <UserSwitcher />
            <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-200 dark:border-white/5">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">إصدار النظام</span>
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400/80 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">v{BUILD_VERSION}</span>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
        <header className="h-14 border-b border-slate-200/60 dark:border-white/5 px-4 md:px-6 flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl shrink-0 relative z-40">
          <div className="flex items-center gap-3 md:gap-4">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 shadow-sm hover:scale-105 transition-all"
              >
                <ChevronRight className="h-4 w-4 transform rotate-180" />
              </button>
            )}
            {(previousDeviceView || activeDeviceView === "account-statement") && (
              <button
                type="button"
                onClick={() => {
                  setActiveDeviceView(previousDeviceView || "web");
                  setPreviousDeviceView(null);
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/70 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                title="إغلاق الشاشة الحالية والعودة"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">إغلاق الشاشة</span>
              </button>
            )}
            <div className="flex flex-col leading-tight">
              <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight">
                {sidebarGroups
                  .flatMap((g) => g.items)
                  .find((i) => i.id === activeDeviceView)?.label || "لوحة التحكم"}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">النظام نشط</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme Toggle Button in Header */}
            <button
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs cursor-pointer"
              title={isDarkMode ? "التحويل للوضع الفاتح" : "التحويل للوضع الداكن"}
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-600" />}
            </button>
            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
                className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-pointer group"
                title="الإشعارات والتنبيهات"
              >
                <Bell className={`h-4.5 w-4.5 group-hover:rotate-12 transition-transform ${notifications.some(n => n.status === 'unread') ? 'animate-bounce text-indigo-600 dark:text-indigo-400' : ''}`} />
                {notifications.some(n => n.status === 'unread') && (
                  <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shadow-lg ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {notifications.filter(n => n.status === 'unread').length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationMenuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsNotificationMenuOpen(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="fixed top-16 left-4 right-4 sm:absolute sm:top-auto sm:left-0 sm:right-auto sm:mt-3 w-auto sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-right"
                    >
                      {/* Header */}
                      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                        <h3 className="font-black text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                          <Bell className="h-3.5 w-3.5 text-indigo-600" />
                          <span>مركز التنبيهات</span>
                        </h3>
                        {notifications.filter(n => n.status === 'unread').length > 0 && (
                          <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-indigo-600/20">
                            {notifications.filter(n => n.status === 'unread').length} جديد
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex gap-2">
                          {notifications.length > 0 && (
                            <>
                              <button
                                onClick={markAllNotificationsAsRead}
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                                title="تحديد المقروء"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span>قراءة الكل</span>
                              </button>
                              <button
                                onClick={clearAllNotifications}
                                className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-0.5"
                                title="مسح الكل"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>مسح</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Filter Tabs */}
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex gap-1 justify-around">
                        <button
                          onClick={() => setNotifFilter('unread')}
                          className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            notifFilter === 'unread'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          غير المقروءة ({notifications.filter(n => n.status === 'unread').length})
                        </button>
                        <button
                          onClick={() => setNotifFilter('read')}
                          className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            notifFilter === 'read'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          المقروءة ({notifications.filter(n => n.status === 'read').length})
                        </button>
                        <button
                          onClick={() => setNotifFilter('all')}
                          className={`text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            notifFilter === 'all'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          الكل ({notifications.length})
                        </button>
                      </div>

                      {/* Notification List */}
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                        {notifications.filter(n => {
                          if (notifFilter === 'all') return true;
                          return n.status === notifFilter;
                        }).length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-2">
                            <span className="text-2xl">📭</span>
                            <span>
                              {notifFilter === 'unread' 
                                ? 'لا توجد إشعارات غير مقروءة حالياً' 
                                : notifFilter === 'read' 
                                ? 'لا توجد إشعارات مقروءة حالياً' 
                                : 'لا توجد إشعارات حالياً'}
                            </span>
                          </div>
                        ) : (
                          notifications
                            .filter(n => {
                              if (notifFilter === 'all') return true;
                              return n.status === notifFilter;
                            })
                            .map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-2.5 sm:p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer flex flex-col gap-0.5 relative ${notif.status === 'unread' ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}
                              >
                                {notif.status === 'unread' && (
                                  <div className="absolute top-3 right-1.5 w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                                )}
                                <div className="flex justify-between items-start pl-1 pr-3">
                                  <span className={`text-[11px] sm:text-xs font-black text-slate-800 dark:text-white ${notif.status === 'unread' ? 'font-black' : 'font-semibold'}`}>
                                    {notif.title}
                                  </span>
                                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                    {new Date(notif.timestamp).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pr-3 pl-1 font-medium">
                                  {notif.body}
                                </p>
                                {(() => {
                                  const linkedBooking = (notif.targetView === 'halls' && (notif.targetId || notif.targetCode))
                                    ? bookings?.find(b => b.id === notif.targetId || (notif.targetCode && b.sequenceCode === notif.targetCode))
                                    : null;
                                  if (!linkedBooking) return null;
                                  const rawDates = (linkedBooking.eventDates && linkedBooking.eventDates.length > 0)
                                    ? linkedBooking.eventDates
                                    : (linkedBooking.eventDate ? [linkedBooking.eventDate] : []);
                                  const hasDateInBody = notif.body?.includes("تاريخ") || notif.body?.includes("تواريخ");
                                  const hasNotesInBody = notif.body?.includes("الملاحظات") || notif.body?.includes("ملاحظات");
                                  if ((!hasDateInBody && rawDates.length > 0) || (!hasNotesInBody && linkedBooking.notes)) {
                                    return (
                                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[9px] pr-3 pl-1">
                                        {!hasDateInBody && rawDates.length > 0 && (
                                          <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                            📅 {rawDates.length > 1 ? "تواريخ الحجز:" : "تاريخ الحجز:"} {rawDates.join("، ")}
                                          </span>
                                        )}
                                        {!hasNotesInBody && linkedBooking.notes && (
                                          <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                                            📝 الملاحظات: {linkedBooking.notes}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                {notif.targetView && (
                                  <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold pr-3 mt-1 flex items-center gap-0.5">
                                    <span>انقر لفتح واستعراض التغيير ↗</span>
                                  </span>
                                )}
                              </div>
                            ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {isUsingLocalFallback() ? (
              <button
                id="btn-sync-toggle"
                onClick={() => {
                  disableLocalFallback();
                  toast.success(
                    "تم إلغاء تفعيل وضع التخزين المحلي الآمن. جاري إعادة تحميل التطبيق لمحاولة الاتصال والمزامنة السحابية...",
                  );
                  setTimeout(() => {
                    window.location.reload();
                  }, 1500);
                }}
                className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px] px-2.5 py-1 rounded-lg transition border border-amber-500/20 cursor-pointer"
                title="اضغط لمحاولة الاتصال بالسحابة مجدداً"
              >
                <Wifi className="h-3 w-3 animate-pulse" />
                <span>الوضع المحلي (اضغط للمزامنة)</span>
              </button>
            ) : (
              <>
                {syncStatus === "syncing" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {syncStatus === "synced" ? "متزامن" : "مزامنة..."}
                </span>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-1.5 xs:p-2 sm:p-5 md:p-6">
          {/* View Router */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDeviceView}
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -10 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              {activeDeviceView === "web" && (
                <div className="flex flex-col gap-1.5 h-full p-0.5 sm:p-1 md:p-1.5">
                  {/* Top Compact Cards Row (Sequential Horizontal Bar) */}
                  <DashboardTopCardsRow
                    bookings={bookings}
                    halls={halls}
                    accounts={accounts}
                    transactions={transactions}
                    services={services}
                    standardCosts={standardCosts}
                    currentDate={dashboardCurrentDate}
                    globalCurrencySymbol={getGlobalSymbol()}
                    onPreviewBooking={(bookingId) => {
                      setExternalPreviewBookingId(bookingId);
                      setIsGlobalPreviewOpen(true);
                    }}
                    selectedStatType={dashboardSelectedStatType}
                    onSelectedStatTypeChange={setDashboardSelectedStatType}
                    depositFilter={dashboardDepositFilter}
                    onDepositFilterChange={setDashboardDepositFilter}
                  />

                  <PermissionGuard permission="view-dashboard">
                    <div className="w-full">
                      <SmartCalendar
                        bookings={bookings}
                        halls={halls}
                        vouchers={vouchers}
                        currentDate={dashboardCurrentDate}
                        onMonthChange={setDashboardCurrentDate}
                        onDateSelect={(dates) => {
                          console.log("Selected dates:", dates);
                          // Optional: maybe scroll or just show details
                        }}
                        onDateDoubleClick={(date) => {
                          setInitialBookingDate(date);
                          setActiveDeviceView("halls");
                        }}
                        onPreviewBooking={(booking) => {
                          setExternalPreviewBookingId(booking.id);
                          setIsGlobalPreviewOpen(true);
                        }}
                        selectedBooking={calendarSelectedBooking}
                        onSelectedBookingChange={setCalendarSelectedBooking}
                        selectedDayDetails={calendarSelectedDayDetails}
                        onSelectedDayDetailsChange={setCalendarSelectedDayDetails}
                        accounts={accounts}
                        currencies={currencies}
                        company={bookingSettings?.company || companySettings}
                        currentUser={currentUser}
                        onPrintVoucher={handlePrintVoucher}
                      />
                    </div>
                  </PermissionGuard>
                </div>
              )}

              {activeDeviceView === "chart" && (
                <PermissionGuard permission="view-accounts">
                  <AccountsTree
                    accounts={accounts}
                    currencies={currencies}
                    selectedAccount={selectedAccount}
                    onSelectAccount={setSelectedAccount}
                    globalCurrencyCode={globalCurrency}
                    transactions={transactions}
                    vouchers={vouchers}
                    bookings={bookings}
                    bookingSettings={bookingSettings}
                    linkedAccounts={linkedAccounts[0] || null}
                    clients={clients}
                    employees={employees}
                    tasks={tasks}
                    onViewStatement={(accId) => {
                      const acc = accounts.find(a => a.id === accId);
                      if (acc) {
                        setSelectedAccount(acc);
                        setActiveDeviceView("account-statement");
                      }
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "reports" && (
                <PermissionGuard permission="view-reports">
                  <FinancialReports
                    accounts={accounts}
                    transactions={transactions}
                    currencies={currencies}
                    globalCurrencyCode={globalCurrency}
                    users={appUsers}
                    bookings={bookings}
                    clients={clients}
                    services={services}
                    vouchers={vouchers}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "account-statement" && (
                <PermissionGuard permission="view-reports">
                  <AccountStatement
                    accounts={accounts}
                    transactions={transactions}
                    currencies={currencies}
                    vouchers={vouchers}
                    globalCurrencyCode={globalCurrency}
                    companySettings={companySettings}
                    setPrintData={setPrintData}
                    clients={clients}
                    bookings={bookings}
                    initialAccountId={selectedAccount?.id}
                    initialClientIds={selectedClientIds}
                    onClearInitialAccount={() => setSelectedAccount(null)}
                    onClearInitialClients={() => setSelectedClientIds(null)}
                    preFilledCustomerName={preFilledCustomerName || undefined}
                    onClose={() => {
                      setActiveDeviceView(previousDeviceView || "web");
                      setPreviousDeviceView(null);
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "journal" && (
                <PermissionGuard permission="view-transactions">
                  <TransactionsHistory
                    transactions={transactions}
                    accounts={accounts}
                    currencies={currencies}
                    setPrintData={setPrintData}
                    currentUser={currentUser}
                    bookingSettings={bookingSettings}
                    highlightCode={highlightJournalCode}
                    onClearHighlight={() => setHighlightJournalCode(null)}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "daily-movements" && (
                <PermissionGuard permission="view-transactions">
                  <DailyMovements
                    transactions={transactions}
                    bookings={bookings}
                    accounts={accounts}
                    currencies={currencies}
                    users={appUsers}
                    globalCurrencyCode={globalCurrency}
                    companySettings={companySettings}
                    setPrintData={setPrintData}
                    onUpdateTransaction={handleUpdateTransaction}
                    currentUser={currentUser}
                    lockedDates={lockedDates}
                    onLockDay={lockDay}
                    onUnlockDay={unlockDay}
                    depositRefundRequests={depositRefundRequests}
                    bookingAmendmentRequests={bookingAmendmentRequests}
                    vouchers={vouchers}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "tasks" && (
                <PermissionGuard permission="view-tasks">
                  <TasksGrid tasks={tasks} accounts={accounts} />
                </PermissionGuard>
              )}
              {activeDeviceView === "currencies" && (
                <PermissionGuard permission="view-currencies">
                  <CurrenciesManagement
                    currencies={currencies}
                    onSave={async (v) => {
                      try {
                        v.id
                          ? await updateCurrency(v.id, v)
                          : await addCurrency(v);
                        toast.success("تم حفظ العملة بنجاح");
                      } catch (e) {
                        toast.error("فشل في حفظ العملة");
                      }
                    }}
                    onDelete={async (id) => {
                      try {
                        await deleteCurrency(id);
                        toast.success("تم حذف العملة");
                      } catch (e) {
                        toast.error("فشل الحذف");
                      }
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "clients" && (
                <PermissionGuard permission="view-clients">
                  <ClientsManagement
                    clients={clients}
                    accounts={accounts}
                    onSaveClient={handleSaveClientWrap}
                    onDeleteClient={handleDeleteClientWrap}
                    onViewStatement={(accId, client) => {
                      if (client) {
                        setSelectedClientIds([client.id]);
                        setPreFilledCustomerName(client.name);
                        const acc = accId ? accounts.find(a => a.id === accId) : null;
                        setSelectedAccount(acc || null);
                        setActiveDeviceView("account-statement");
                      } else if (accId) {
                        const acc = accounts.find(a => a.id === accId);
                        if (acc) {
                          setSelectedAccount(acc);
                          setActiveDeviceView("account-statement");
                        } else {
                          toast.error("عذراً، هذا الحساب المالي غير موجود!");
                        }
                      }
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "employees" && (
                <PermissionGuard permission="view-employees">
                  <EmployeesManagement
                    employees={employees}
                    currencies={currencies}
                    accounts={accounts}
                    linkedAccounts={linkedAccounts[0] || null}
                    onSaveLinkedAccounts={handleSaveLinkedAccountsWrap}
                    onSaveEmployee={handleSaveEmployeeWrap}
                    onDeleteEmployee={handleDeleteEmployeeWrap}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "services" && (
                <PermissionGuard permission="view-services">
                  <ServicesManagement
                    services={services}
                    currencies={currencies}
                    onSaveService={handleSaveServiceWrap}
                    onDeleteService={handleDeleteServiceWrap}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "deposit-refund-requests" && (
                <PermissionGuard permission="view-bookings">
                  <DepositRefundRequests
                    bookings={bookings}
                    halls={halls}
                    depositRefundRequests={depositRefundRequests}
                    currencies={currencies}
                    accounts={accounts}
                    globalCurrencySymbol={getGlobalSymbol()}
                    bookingSettings={bookingSettings}
                    linkedAccounts={linkedAccounts[0] || null}
                    highlightId={highlightRefundId}
                    onClearHighlight={() => setHighlightRefundId(null)}
                  />
                </PermissionGuard>
              )}
              {(activeDeviceView === "halls" || activeDeviceView === "booking-audit") && (
                <PermissionGuard permission={activeDeviceView === "booking-audit" ? "audit-booking-transactions" : "view-halls"}>
                  <HallsManagement
                    accounts={accounts}
                    vouchers={vouchers}
                    currencies={currencies}
                    transactions={transactions}
                    globalCurrencySymbol={getGlobalSymbol()}
                    globalCurrencyCode={globalCurrency}
                    systemTime={systemTime}
                    bookingSettings={bookingSettings}
                    linkedAccounts={linkedAccounts[0] || null}
                    initialBookingDate={initialBookingDate}
                    onClearInitialBookingDate={() => setInitialBookingDate(null)}
                    externalPreviewBookingId={externalPreviewBookingId}
                    onClearExternalPreviewBookingId={() =>
                      setExternalPreviewBookingId(null)
                    }
                    onReturnToPreviousView={() => {
                      if (previousDeviceView) {
                        setActiveDeviceView(previousDeviceView);
                        setPreviousDeviceView(null);
                      }
                    }}
                    onCollectPayment={handleCollect}
                    onUpdateTransaction={handleUpdateTransaction}
                    onOpenAccountStatement={(accountId, clientId, customerName) => {
                      setPreviousDeviceView(activeDeviceView);
                      if (clientId) {
                        setSelectedClientIds([clientId]);
                      } else {
                        setSelectedClientIds(null);
                      }
                      if (accountId) {
                        const acc = accounts.find(a => a.id === accountId || a.code === accountId);
                        if (acc) {
                          setSelectedAccount(acc);
                          setActiveDeviceView("account-statement");
                        }
                      } else {
                        setSelectedAccount(null);
                        setActiveDeviceView("account-statement");
                      }
                      setPreFilledCustomerName(customerName);
                    }}
                    defaultTab={activeDeviceView === "booking-audit" ? "audit" : undefined}
                    depositRefundRequests={depositRefundRequests}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "halls-directory" && (
                <PermissionGuard permission="view-halls">
                  <HallsDirectory halls={halls} bookings={bookings} />
                </PermissionGuard>
              )}
              {activeDeviceView === "receipts-payments" && (
                <PermissionGuard permission="view-vouchers">
                  <ReceiptsPayments
                    vouchers={vouchers}
                    accounts={accounts}
                    currencies={currencies}
                    onSaveVoucher={handleSaveVoucherWrap}
                    onSaveMultiVoucher={handleSaveMultiVoucher}
                    onPrint={handlePrintVoucher}
                    bookings={bookings}
                    setPrintData={setPrintData}
                    bookingSettings={bookingSettings}
                    companySettings={companySettings}
                    currentUser={currentUser}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "collections" && (
                <PermissionGuard permission="view-bookings">
                  <BookingCollections
                    bookings={bookings}
                    halls={halls}
                    accounts={accounts}
                    onCollectPayment={handleCollect}
                    onPrintInvoice={(bId) => {
                      const b = bookings.find((x) => x.id === bId);
                      if (b) handlePrintBooking(b);
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "discounts" && (
                <PermissionGuard permission="view-bookings">
                  <DiscountsManagementView
                    company={companySettings}
                    currentUser={currentUser}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "amendments" && (
                <PermissionGuard permission="view-bookings">
                  <AmendmentRequestsView
                    highlightId={highlightAmendmentId}
                    onClearHighlight={() => setHighlightAmendmentId(null)}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "advanced-reports" && (
                <PermissionGuard permission="view-reports">
                  <AdvancedBookingReports 
                    bookings={bookings}
                    halls={halls}
                    transactions={transactions}
                    currencies={currencies}
                    globalCurrencyCode={globalCurrency}
                    settings={bookingSettings}
                    linkedAccounts={linkedAccounts[0] || null}
                    vouchers={vouchers}
                    accounts={accounts}
                    clients={clients}
                    onViewAccountStatement={(accId, clientIds) => {
                      const acc = accounts.find(a => a.id === accId);
                      if (acc) {
                        setSelectedAccount(acc);
                        setSelectedClientIds(clientIds || null);
                        setPreviousDeviceView("advanced-reports");
                        setActiveDeviceView("account-statement");
                      }
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "user-management" && (
                <PermissionGuard permission="manage-users">
                  <UserManagement
                    users={appUsers}
                    roles={appRoles}
                    accounts={accounts}
                    employees={employees}
                    onSaveUser={handleSaveUserWrap}
                    onDeleteUser={handleDeleteUserWrap}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "roles" && (
                <PermissionGuard permission="manage-roles">
                  <RolesManagement
                    roles={appRoles}
                    onSaveRole={handleSaveRoleWrap}
                    onDeleteRole={handleDeleteRoleWrap}
                    availablePermissions={availablePermissions}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "accounts-permissions" && (
                <PermissionGuard permission="manage-users">
                  <AccountsPermissions
                    users={appUsers}
                    roles={appRoles}
                    accounts={accounts}
                    onSaveUser={handleSaveUserWrap}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "account-setup" && (
                <PermissionGuard permission="view-company">
                  <CompanySettingsComponent
                    settings={companySettings}
                    onSave={handleSaveCompanyWrap}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "accounts-linking" && (
                <PermissionGuard permission="view-company">
                  <AccountsLinking
                    accounts={accounts}
                    linkedAccounts={linkedAccounts[0] || null}
                    companySettings={companySettings}
                    onSave={handleSaveLinkedAccountsWrap}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "booking-settings" && (
                <PermissionGuard permission="view-company">
                  <BookingSettings
                    settings={bookingSettings}
                    onSave={handleSaveBookingSettingsWrap}
                    currencies={currencies}
                    accounts={accounts}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "firebase-config" && (
                <PermissionGuard permission="view-company">
                  <FirebaseConfigForm
                    initialConfig={firebaseConfig as any}
                    onSave={async (config) => {
                      try {
                        const response = await fetch("/api/update-firebase-config", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(config),
                        });
                        if (response.ok) {
                          toast.success("تم حفظ الإعدادات بنجاح. يرجى إعادة تحميل الصفحة لتطبيق التغييرات.");
                        } else {
                          toast.error("فشل حفظ الإعدادات.");
                        }
                      } catch (error) {
                        toast.error("فشل الاتصال بالخادم لحفظ الإعدادات.");
                      }
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "notification-management" && (
                <PermissionGuard permission="view-tasks">
                  <NotificationManager
                    settings={notificationSettings}
                    users={appUsers}
                    onSaveSetting={updateNotificationSetting}
                    manualNotifications={manualNotifications}
                    onSendManualNotification={addManualNotification}
                    onDeleteManualNotification={deleteManualNotification}
                    currentUser={currentUser}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "notification-subscriptions" && (
                <PermissionGuard permission="view-tasks">
                  <NotificationSubscriptionsManagement />
                </PermissionGuard>
              )}
              {activeDeviceView === "device-guard" && (
                <PermissionGuard permission="view-company">
                  <DevicesManagement systemTime={systemTime} />
                </PermissionGuard>
              )}
              {activeDeviceView === "recurring-entries" && (
                <PermissionGuard permission="view-transactions">
                  <RecurringEntries
                    recurringEntries={recurringEntries}
                    accounts={accounts}
                    currencies={currencies}
                    onAddRecurringEntry={addRecurringEntry}
                    onUpdateRecurringEntry={updateRecurringEntry}
                    onDeleteRecurringEntry={deleteRecurringEntry}
                    onPostDoubleEntry={async (txPayload) => {
                      const userName = currentUser?.username || currentUser?.name || "System";
                      return addTransactionWithDoubleEntry({ ...txPayload, createdBy: userName }, currencies, accounts);
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "payroll-sheets" && (
                <PermissionGuard permission="view-employees">
                  <PayrollManagement
                    employees={employees}
                    currencies={currencies}
                    accounts={accounts}
                    payrollSheets={payrollSheets}
                    onAddPayrollSheet={addPayrollSheet}
                    onUpdatePayrollSheet={updatePayrollSheet}
                    onDeletePayrollSheet={deletePayrollSheet}
                    onPostDoubleEntry={async (txPayload) => {
                      const userName = currentUser?.username || currentUser?.name || "System";
                      return addTransactionWithDoubleEntry({ ...txPayload, createdBy: userName }, currencies, accounts);
                    }}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "standard-costing" && (
                <PermissionGuard permission="view-reports">
                  <StandardCosts
                    bookings={bookings}
                    halls={halls}
                    standardCosts={standardCosts}
                    actualCosts={actualCosts}
                    accounts={accounts}
                    bookingSettings={bookingSettings}
                    services={services}
                    costItems={costItems}
                    onAddStandardCost={addStandardCost}
                    onUpdateStandardCost={updateStandardCost}
                    onDeleteStandardCost={deleteStandardCost}
                    onAddActualCost={addActualCost}
                    onUpdateActualCost={updateActualCost}
                    onAddCostItem={addCostItem}
                    onUpdateCostItem={updateCostItem}
                    onDeleteCostItem={deleteCostItem}
                    onUpdateService={updateService}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "financial-audit" && (
                <PermissionGuard permission="view-reports">
                  <FinancialAudit
                    transactions={transactions}
                    accounts={accounts}
                    onUpdateTransaction={handleUpdateTransaction}
                  />
                </PermissionGuard>
              )}
              {activeDeviceView === "android" && (
                <div className="flex justify-center p-10">
                  {renderAndroidPhone()}
                </div>
              )}
              {activeDeviceView === "windows" && (
                <div className="p-4">{renderWindowsApp()}</div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Contract Preview Modal */}
        {isGlobalPreviewOpen && externalPreviewBookingId && (
          <div className="relative z-[200]">
            <HallsManagement
              accounts={accounts}
              vouchers={vouchers}
              currencies={currencies}
              transactions={transactions}
              globalCurrencySymbol={getGlobalSymbol()}
              globalCurrencyCode={globalCurrency}
              systemTime={systemTime}
              bookingSettings={bookingSettings}
              externalPreviewBookingId={externalPreviewBookingId}
              onClearExternalPreviewBookingId={() => {}} // Do nothing, let it stay mounted
              onReturnToPreviousView={() => {
                setIsGlobalPreviewOpen(false);
                setExternalPreviewBookingId(null);
              }}
              onCollectPayment={handleCollect}
              onUpdateTransaction={handleUpdateTransaction}
              onOpenAccountStatement={(accountId, clientId, customerName) => {
                setPreviousDeviceView(activeDeviceView);
                setIsGlobalPreviewOpen(false);
                setExternalPreviewBookingId(null);
                if (clientId) {
                  setSelectedClientIds([clientId]);
                } else {
                  setSelectedClientIds(null);
                }
                if (accountId) {
                  const acc = accounts.find((a) => a.id === accountId || a.code === accountId);
                  if (acc) {
                    setSelectedAccount(acc);
                    setActiveDeviceView("account-statement");
                  }
                } else {
                  setSelectedAccount(null);
                  setActiveDeviceView("account-statement");
                }
                setPreFilledCustomerName(customerName);
              }}
              depositRefundRequests={depositRefundRequests}
              previewOnlyMode={true}
            />
          </div>
        )}

        {printData && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="h-16 border-b px-6 flex items-center justify-between bg-slate-50">
                <h3 className="font-black text-slate-800">
                  معاينة المستند قبل الطباعة
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20"
                  >
                    طباعة الآن
                  </button>
                  <button
                    onClick={() => setPrintData(null)}
                    className="p-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <PrintTemplate
                  company={companySettings}
                  title={printData.title}
                  documentNumber={printData.documentNumber}
                  manualNumber={printData.manualNumber}
                  date={printData.date}
                >
                  {printData.content}
                </PrintTemplate>
              </div>
            </div>
          </div>
        )}

        {/* Official Voucher Print Modal - Al-Zain Grand Hall Book Design */}
        <OfficialVoucherPrintModal
          isOpen={isOfficialVoucherModalOpen}
          voucher={officialVoucherToPrint}
          booking={
            officialVoucherToPrint
              ? bookings.find(
                  (b: any) =>
                    b.id === (officialVoucherToPrint.linkedBookingId || (officialVoucherToPrint as any).bookingId) ||
                    b.sequenceCode === (officialVoucherToPrint.linkedBookingId || (officialVoucherToPrint as any).bookingId)
                )
              : null
          }
          company={bookingSettings?.company || companySettings || null}
          accounts={accounts}
          currencies={currencies}
          currentUser={currentUser}
          onClose={() => {
            setIsOfficialVoucherModalOpen(false);
            setOfficialVoucherToPrint(null);
          }}
        />
      </main>
    </div>
  );
}

// --- Main App Entry ---

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  const [manualNotifications, setManualNotifications] = useState<ManualNotification[]>([]);
  const [accountNotificationSubscriptions, setAccountNotificationSubscriptions] = useState<AccountNotificationSubscription[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appUsers, setAppUsers] = useState<UserType[]>([]);
  const [appRoles, setAppRoles] = useState<Role[]>([]);
  const [vouchers, setVouchers] = useState<ReceiptPayment[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanyType | null>(
    null,
  );
  const [bookingSettings, setBookingSettings] =
    useState<BookingSettingsType | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccounts[]>([]);

  const [recurringEntries, setRecurringEntries] = useState<RecurringJournalEntry[]>([]);
  const [payrollSheets, setPayrollSheets] = useState<EmployeePayrollSheet[]>([]);
  const [standardCosts, setStandardCosts] = useState<StandardCostTemplate[]>([]);
  const [actualCosts, setActualCosts] = useState<BookingActualCost[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [depositRefundRequests, setDepositRefundRequests] = useState<DepositRefundRequest[]>([]);
  const [bookingAmendmentRequests, setBookingAmendmentRequests] = useState<BookingAmendmentRequest[]>([]);
  const [lockedDates, setLockedDates] = useState<any[]>([]);
  const [preFilledCustomerName, setPreFilledCustomerName] = useState<string | null>(null);

  const [dbLoading, setDbLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing">("syncing");

  // Notification Logic
  const isFirstLoad = useRef(true);
  const appMountTime = useRef(Date.now());
  const notifiedIds = useRef<Set<string>>(new Set());
  const notifiedSourceIds = useRef<Set<string>>(new Set());
  
  const lastActiveTimeRef = useRef<number>(0);
  if (lastActiveTimeRef.current === 0) {
    try {
      const stored = localStorage.getItem("last_active_time");
      const now = Date.now();
      const parsed = stored ? parseInt(stored, 10) : now - 10000;
      lastActiveTimeRef.current = parsed;
    } catch {
      lastActiveTimeRef.current = Date.now() - 10000;
    }
  }

  useEffect(() => {
    const updateActiveTime = () => {
      localStorage.setItem("last_active_time", Date.now().toString());
    };
    // Initialize current active time after capturing the previous one
    updateActiveTime();
    
    window.addEventListener("beforeunload", updateActiveTime);
    window.addEventListener("visibilitychange", updateActiveTime);
    const interval = setInterval(updateActiveTime, 10000);
    
    return () => {
      window.removeEventListener("beforeunload", updateActiveTime);
      window.removeEventListener("visibilitychange", updateActiveTime);
      clearInterval(interval);
    };
  }, []);

  const prevDataCounts = useRef({
    tx: 0,
    booking: 0,
    amendment: 0,
    refund: 0
  });

  // Highlight states for previewing item from notification click
  const [highlightJournalCode, setHighlightJournalCode] = useState<string | null>(null);
  const [highlightAmendmentId, setHighlightAmendmentId] = useState<string | null>(null);
  const [highlightRefundId, setHighlightRefundId] = useState<string | null>(null);

  // In-app Notifications State
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    try {
      const saved = localStorage.getItem("app_notifications_list");
      if (!saved) return [];
      const parsed = JSON.parse(saved) as InAppNotification[];
      return parsed;
    } catch {
      return [];
    }
  });
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio context might require user interaction first
    }
  };

  const addInAppNotification = (title: string, body: string, targetView?: string, targetId?: string, targetCode?: string, silentSound?: boolean) => {
    if (!silentSound) {
      playNotificationSound();
    }
    const newNotif: InAppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      title,
      body,
      timestamp: new Date().toISOString(),
      status: 'unread',
      targetView,
      targetId,
      targetCode
    };
    setNotifications(prev => {
      if (targetId && prev.some(n => n.targetId === targetId)) return prev;
      const updated = [newNotif, ...prev].slice(0, 100); // Keep last 100 notifications
      localStorage.setItem("app_notifications_list", JSON.stringify(updated));
      return updated;
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, status: 'read' as const }));
      localStorage.setItem("app_notifications_list", JSON.stringify(updated));
      return updated;
    });
    toast.success("تم تحديد جميع الإشعارات كمقروءة");
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.setItem("app_notifications_list", JSON.stringify([]));
    toast.success("تم مسح سجل الإشعارات");
  };

  const handleNotificationClick = (notif: InAppNotification) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notif.id ? { ...n, status: 'read' as const } : n);
      localStorage.setItem("app_notifications_list", JSON.stringify(updated));
      return updated;
    });
    if (notif.targetView) {
      if (notif.targetView === "halls" && notif.targetId) {
        setExternalPreviewBookingId(notif.targetId);
        setIsGlobalPreviewOpen(true);
      } else {
        if (notif.targetView === "journal" && notif.targetCode) {
          setHighlightJournalCode(notif.targetCode);
        } else if (notif.targetView === "amendments" && notif.targetId) {
          setHighlightAmendmentId(notif.targetId);
        } else if (notif.targetView === "deposit-refund-requests" && notif.targetId) {
          setHighlightRefundId(notif.targetId);
        }
        setActiveDeviceView(notif.targetView);
      }
      setIsSidebarCollapsed(true);
    }
    setIsNotificationMenuOpen(false);
  };

  useEffect(() => {
    if (dbLoading) return;

    const formatTemplate = (
      template: string,
      variables: Record<string, string | number>
    ) => {
      let result = template;
      Object.entries(variables).forEach(([key, val]) => {
        result = result.replace(new RegExp(`{${key}}`, "g"), String(val ?? ""));
      });
      return result;
    };

    const notifyWithSetting = (
      settingId: string,
      defaultTitle: string,
      defaultBody: string,
      variables: Record<string, string | number>,
      targetView?: string,
      targetId?: string,
      targetCode?: string,
      tx?: any
    ): boolean => {
      const setting = notificationSettings.find(s => s.id === settingId);
      const currentUserId = localStorage.getItem('current_user_id') || "";
      
      // Filter out notifications if tx is provided and account subscription is not found
      if (tx) {
        // Enforcement for Financial Contexts when user has explicit subscriptions
        const isFinancialType = ['journal', 'voucher', 'booking', 'amendment', 'refund'].includes(settingId);
        
        if (isFinancialType) {
          const userSubs = accountNotificationSubscriptions.filter(s => s.userId === currentUserId);
          if (userSubs.length > 0) {
            const subscribedAccountIds = Array.from(new Set(userSubs.flatMap(s => s.accountIds || []))).filter(Boolean);
            if (subscribedAccountIds.length > 0) {
              let involvedIds = new Set<string>();

              if (Array.isArray(tx)) {
                tx.forEach((id: any) => typeof id === 'string' && id && involvedIds.add(id));
              } else if (typeof tx === 'object' && tx !== null) {
                if (tx.debitAccountId) involvedIds.add(tx.debitAccountId);
                if (tx.creditAccountId) involvedIds.add(tx.creditAccountId);
                if (tx.cashBankAccountId) involvedIds.add(tx.cashBankAccountId);
                if (tx.fromToAccountId) involvedIds.add(tx.fromToAccountId);
                if (tx.accountId) involvedIds.add(tx.accountId);
                
                if (Array.isArray(tx.entries)) {
                  tx.entries.forEach((e: any) => e && e.accountId && involvedIds.add(e.accountId));
                }
                if (Array.isArray(tx.debitEntries)) {
                  tx.debitEntries.forEach((e: any) => e && e.accountId && involvedIds.add(e.accountId));
                }
                if (Array.isArray(tx.creditEntries)) {
                  tx.creditEntries.forEach((e: any) => e && e.accountId && involvedIds.add(e.accountId));
                }
              }

              const involvedAccountIds = Array.from(involvedIds).filter(Boolean);
              
              if (involvedAccountIds.length > 0) {
                const hasMatch = involvedAccountIds.some(id => subscribedAccountIds.includes(id));
                if (!hasMatch) {
                  console.log(`[Root Filter] Blocking ${settingId}: No matching account subscriptions.`);
                  return true; // Mark as handled (blocked)
                }
              }
            }
          }
        }
      }

      // Filter out notifications if targetUserIds is set and current user is not in it
      if (setting && setting.targetUserIds && setting.targetUserIds.length > 0) {
        if (!currentUserId || !setting.targetUserIds.includes(currentUserId)) {
          return true; // Explicitly blocked
        }
      }

      let pwaEnabled = true;
      let inAppEnabled = true;
      let title = defaultTitle;
      let body = defaultBody;

      if (setting) {
        pwaEnabled = setting.pwaEnabled;
        inAppEnabled = setting.inAppEnabled;
        
        if (setting.customTitle) {
          title = formatTemplate(setting.customTitle, variables);
        }
        if (setting.customBody) {
          body = formatTemplate(setting.customBody, variables);
          if (settingId === 'booking' && variables.date && !body.includes("تاريخ") && !body.includes("تواريخ")) {
            const dateStr = `${variables.dateLabel || "تاريخ الحجز"}: ${variables.date}`;
            body = body.includes("|")
              ? body.replace(/\|/, `| ${dateStr} |`)
              : `${body} | ${dateStr}`;
          }
          if (settingId === 'booking' && variables.notes && variables.notes !== "لا يوجد" && !body.includes("ملاحظات") && !body.includes("الملاحظات")) {
            body = `${body} | الملاحظات: ${variables.notes}`;
          }
        }
      }

      if (!pwaEnabled && !inAppEnabled) {
        return true;
      }

      if (pwaEnabled) {
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                const uniqueTag = 'pwa-notif-' + (targetId || targetCode || Math.floor(Math.random() * 1000000));
                registration.showNotification(title, {
                  body,
                  icon: '/icon-192.png',
                  badge: '/icon-192.png',
                  vibrate: [200, 100, 200],
                  tag: uniqueTag,
                  renotify: true,
                  data: {
                    targetView,
                    targetId,
                    targetCode,
                    url: window.location.origin + '/?notifView=' + (targetView || '') + '&notifId=' + (targetId || '') + '&notifCode=' + (targetCode || '')
                  }
                } as any);
              }).catch(() => {
                new Notification(title, {
                  body,
                  icon: '/icon-192.png'
                });
              });
            } else {
              new Notification(title, {
                body,
                icon: '/icon-192.png'
              });
            }
          }
        } catch (e) {
          console.warn('Failed to display native notification:', e);
        }
      }

      if (inAppEnabled) {
        toast.info(title, { description: body });
        addInAppNotification(title, body, targetView, targetId, targetCode);
      }

      return true;
    };

    const getTxTypeArabic = (tx: any) => {
      if (tx.sourceType) {
        switch (tx.sourceType) {
          case 'receipt': return 'سند قبض';
          case 'payment': return 'سند صرف';
          case 'booking': return 'حجز صالة';
          case 'voucher': return 'قيد يومية';
          case 'payroll': return 'مسير رواتب';
        }
      }
      const desc = (tx.description || "").toLowerCase();
      if (desc.includes("صرف") || desc.includes("دفع")) return "سند صرف";
      if (desc.includes("قبض") || desc.includes("استلام")) return "سند قبض";
      return "قيد يومية";
    };

    const isInitialRun = isFirstLoad.current;
    if (isInitialRun) {
      isFirstLoad.current = false;
    }

    // Check for newly added transactions
    transactions.forEach(tx => {
      const isNew = !notifiedIds.current.has(tx.id);
      const isSourceNew = !tx.sourceId || !notifiedSourceIds.current.has(tx.sourceId);
      const txTime = tx.createdAt ? new Date(tx.createdAt).getTime() : Date.now();
      const isRecent = isInitialRun ? (Date.now() - txTime < 30 * 24 * 60 * 60 * 1000) : (txTime >= lastActiveTimeRef.current - 120000);

      if (isNew && isSourceNew) {
        if (isRecent) {
          const txType = getTxTypeArabic(tx);
          const variables = {
            type: txType,
            code: tx.sequenceCode || tx.id,
            amount: tx.amount.toLocaleString(),
            currency: tx.currency,
            description: tx.description,
            user: tx.createdBy || "غير محدد",
            date: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('ar-YE') : new Date().toLocaleDateString('ar-YE'),
            notes: tx.description || "",
            status: tx.status || "معتمد",
            paymentMethod: (tx as any).paymentMethod || "نقداً"
          };
          const settingId = (tx.sourceType === "receipt" || tx.sourceType === "payment") ? "voucher" : "journal";
          
          if (isInitialRun) {
            // Silently populate in-app notifications history without popups
            addInAppNotification(
              `🧾 حركة مالية - ${txType}${tx.sequenceCode ? ` [${tx.sequenceCode}]` : ""}`,
              `المبلغ: ${tx.amount.toLocaleString()} ${tx.currency} | البيان: ${tx.description}`,
              'journal',
              tx.id,
              tx.sequenceCode || tx.id,
              true
            );
            notifiedIds.current.add(tx.id);
            if (tx.sourceId) notifiedSourceIds.current.add(tx.sourceId);
          } else {
            const result = notifyWithSetting(
              settingId,
              `🧾 حركة مالية جديدة - ${txType}${tx.sequenceCode ? ` [${tx.sequenceCode}]` : ""}`,
              `المبلغ: ${tx.amount.toLocaleString()} ${tx.currency} | البيان: ${tx.description}${tx.createdBy ? ` | المستخدم: ${tx.createdBy}` : ""}`,
              variables,
              'journal',
              tx.id,
              tx.sequenceCode || tx.id,
              tx
            );

            if (result !== false) {
              notifiedIds.current.add(tx.id);
              if (tx.sourceId) notifiedSourceIds.current.add(tx.sourceId);
            }
          }
        } else {
          notifiedIds.current.add(tx.id);
          if (tx.sourceId) notifiedSourceIds.current.add(tx.sourceId);
        }
      }
    });

    // Check for newly added bookings
    bookings.forEach(booking => {
      const isNew = !notifiedIds.current.has(booking.id);
      const bTime = booking.createdAt ? new Date(booking.createdAt).getTime() : Date.now();
      const isRecent = isInitialRun ? (Date.now() - bTime < 30 * 24 * 60 * 60 * 1000) : (bTime >= lastActiveTimeRef.current - 120000);

      if (isNew) {
        if (isRecent) {
          const rawDates = (booking.eventDates && booking.eventDates.length > 0)
            ? booking.eventDates
            : (booking.eventDate ? [booking.eventDate] : []);
          const dateLabel = rawDates.length > 1 ? "تواريخ الحجز" : "تاريخ الحجز";
          const formattedDates = rawDates.length > 0
            ? rawDates.join("، ")
            : (booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('ar-YE') : "غير محدد");
          const notesText = booking.notes && booking.notes.trim() ? booking.notes.trim() : "";
          const notesPart = notesText ? ` | الملاحظات: ${notesText}` : "";

          const variables = {
            code: booking.sequenceCode || booking.id,
            customer: booking.customerName,
            price: booking.totalPrice.toLocaleString(),
            currency: booking.currency,
            user: booking.createdBy || "غير محدد",
            date: formattedDates,
            dates: formattedDates,
            dateLabel,
            notes: notesText || "لا يوجد",
            hallName: (booking as any).hallName || halls.find(h => h.id === booking.hallId)?.name || "غير محدد",
            status: booking.status || "مؤكد"
          };
          const relevantAccounts = {
            hallId: booking.hallId,
            ...(linkedAccounts[0] ? {
              debitAccountId: linkedAccounts[0].accountsReceivableId,
              creditAccountId: linkedAccounts[0].hallRevenueAccountId
            } : {})
          };

          const bookingBodyText = `العميل: ${booking.customerName} | ${dateLabel}: ${formattedDates} | الإجمالي: ${booking.totalPrice.toLocaleString()} ${booking.currency}${notesPart}${booking.createdBy ? ` | المستخدم: ${booking.createdBy}` : ""}`;

          if (isInitialRun) {
            addInAppNotification(
              `📅 حجز صالة${booking.sequenceCode ? ` [${booking.sequenceCode}]` : ""}`,
              bookingBodyText,
              'halls',
              booking.id,
              booking.sequenceCode || booking.id,
              true
            );
            notifiedIds.current.add(booking.id);
          } else {
            const result = notifyWithSetting(
              'booking',
              `📅 حجز جديد${booking.sequenceCode ? ` [${booking.sequenceCode}]` : ""}`,
              bookingBodyText,
              variables,
              'halls',
              booking.id,
              booking.sequenceCode || booking.id,
              relevantAccounts
            );
            if (result !== false) {
              notifiedIds.current.add(booking.id);
            }
          }
        } else {
          notifiedIds.current.add(booking.id);
        }
      }
    });

    // Check for newly added amendments
    bookingAmendmentRequests.forEach(req => {
      const isNew = !notifiedIds.current.has(req.id);
      const rTime = req.createdAt ? new Date(req.createdAt).getTime() : Date.now();
      const isRecent = isInitialRun ? (Date.now() - rTime < 30 * 24 * 60 * 60 * 1000) : (rTime >= lastActiveTimeRef.current - 120000);

      if (isNew) {
        if (isRecent) {
          const booking = bookings.find(b => b.id === req.bookingId);
          const variables = {
            code: req.sequenceCode || req.id,
            bookingCode: req.bookingCode || "غير محدد",
            reason: req.reason,
            user: req.requestedBy || "غير محدد",
            date: req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE') : "",
            oldDate: (req as any).originalEventDate || (req as any).oldDate || "",
            newDate: (req as any).requestedEventDate || (req as any).newDate || "",
            status: req.status || "قيد المراجعة"
          };
          const relevantAccounts = {
            ...(booking ? { hallId: booking.hallId } : {}),
            ...(linkedAccounts[0] ? {
              debitAccountId: linkedAccounts[0].accountsReceivableId,
              creditAccountId: linkedAccounts[0].hallRevenueAccountId
            } : {})
          };

          if (isInitialRun) {
            addInAppNotification(
              `📝 طلب تعديل حجز${req.sequenceCode ? ` [${req.sequenceCode}]` : ""}`,
              `الحجز: ${req.bookingCode || "غير محدد"} | السبب: ${req.reason}`,
              'amendments',
              req.id,
              req.sequenceCode || req.id,
              true
            );
            notifiedIds.current.add(req.id);
          } else {
            const result = notifyWithSetting(
              'amendment',
              `📝 طلب تعديل حجز${req.sequenceCode ? ` [${req.sequenceCode}]` : ""}`,
              `الحجز: ${req.bookingCode || "غير محدد"} | السبب: ${req.reason}${req.requestedBy ? ` | المستخدم: ${req.requestedBy}` : ""}`,
              variables,
              'amendments',
              req.id,
              req.sequenceCode || req.id,
              relevantAccounts
            );
            if (result !== false) {
              notifiedIds.current.add(req.id);
            }
          }
        } else {
          notifiedIds.current.add(req.id);
        }
      }
    });

    // Check for newly added refunds
    depositRefundRequests.forEach(req => {
      const isNew = !notifiedIds.current.has(req.id);
      const rfTime = req.createdAt ? new Date(req.createdAt).getTime() : Date.now();
      const isRecent = isInitialRun ? (Date.now() - rfTime < 30 * 24 * 60 * 60 * 1000) : (rfTime >= lastActiveTimeRef.current - 120000);

      if (isNew) {
        if (isRecent) {
          const variables = {
            code: req.sequenceCode || req.id,
            bookingCode: req.bookingCode || "غير محدد",
            customer: req.customerName,
            amount: req.requestedAmount.toLocaleString(),
            currency: "YER",
            user: req.createdBy || "غير محدد",
            date: req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-YE') : "",
            justification: req.justification || "",
            status: req.status || "قيد المراجعة"
          };
          const relevantAccounts = {
            hallId: req.hallId,
            ...(linkedAccounts[0] ? {
              debitAccountId: linkedAccounts[0].hallRevenueAccountId,
              creditAccountId: linkedAccounts[0].accountsReceivableId
            } : {})
          };

          if (isInitialRun) {
            addInAppNotification(
              `💰 طلب إلغاء ورد عربون${req.sequenceCode ? ` [${req.sequenceCode}]` : ""}`,
              `العميل: ${req.customerName} | المطلوب رده: ${req.requestedAmount.toLocaleString()} YER`,
              'deposit-refund-requests',
              req.id,
              req.sequenceCode || req.id,
              true
            );
            notifiedIds.current.add(req.id);
          } else {
            const result = notifyWithSetting(
              'refund',
              `💰 طلب إلغاء ورد عربون${req.sequenceCode ? ` [${req.sequenceCode}]` : ""}`,
              `العميل: ${req.customerName} | المطلوب رده: ${req.requestedAmount.toLocaleString()} YER | المبرر: ${req.justification}${req.createdBy ? ` | المستخدم: ${req.createdBy}` : ""}`,
              variables,
              'deposit-refund-requests',
              req.id,
              req.sequenceCode || req.id,
              relevantAccounts
            );
            if (result !== false) {
              notifiedIds.current.add(req.id);
            }
          }
        } else {
          notifiedIds.current.add(req.id);
        }
      }
    });

    prevDataCounts.current = {
      tx: transactions.length,
      booking: bookings.length,
      amendment: bookingAmendmentRequests.length,
      refund: depositRefundRequests.length
    };
  }, [transactions, bookings, bookingAmendmentRequests, depositRefundRequests, dbLoading, accountNotificationSubscriptions, accounts]);

  // Real-time listener and parser for manual/custom notifications
  useEffect(() => {
    if (dbLoading) return;

    const currentUserId = localStorage.getItem('current_user_id') || "";

    manualNotifications.forEach((n) => {
      // If it is scheduled, skip displaying it immediately until it is marked as sent
      if (n.status === 'scheduled') {
        return;
      }

      const isNew = !notifiedIds.current.has(n.id);
      const isRecent = !n.createdAt || new Date(n.createdAt).getTime() >= lastActiveTimeRef.current;

      if (isNew) {
        notifiedIds.current.add(n.id);

        if (isRecent) {
          const isTargeted = !n.targetUserIds || n.targetUserIds.length === 0 || n.targetUserIds.includes(currentUserId);
          
          if (isTargeted) {
            toast.info(n.title, {
              description: n.body,
              duration: 6000,
              icon: <Bell className="w-5 h-5 text-indigo-600 animate-bounce" />
            });

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.ready.then((registration) => {
                    registration.showNotification(n.title, {
                      body: n.body,
                      icon: '/icon-192.png',
                      badge: '/icon-192.png',
                      vibrate: [200, 100, 200],
                      tag: 'manual-notif-' + n.id,
                      renotify: true,
                      data: {
                        targetView: 'notification-management',
                        url: window.location.origin + '/?notifView=notification-management'
                      }
                    } as any);
                  }).catch(() => {
                    new Notification(n.title, {
                      body: n.body,
                      icon: '/icon-192.png'
                    });
                  });
                } else {
                  new Notification(n.title, {
                    body: n.body,
                    icon: '/icon-192.png'
                  });
                }
              } catch (e) {
                console.warn("Failed to show browser notification", e);
              }
            }

            addInAppNotification(n.title, n.body, 'notification-management');
          }
        }
      }
    });
  }, [manualNotifications, dbLoading]);

  // Background scheduler check for pending manual notifications
  useEffect(() => {
    if (dbLoading) return;

    const interval = setInterval(() => {
      const now = Date.now();
      manualNotifications.forEach((n) => {
        if (n.status === 'scheduled' && n.scheduledAt) {
          const scheduleTime = new Date(n.scheduledAt).getTime();
          if (now >= scheduleTime) {
            // Update to sent so it is delivered to all clients
            updateManualNotification(n.id, {
              status: 'sent',
              createdAt: new Date().toISOString()
            }).catch((err) => {
              console.error("Failed to trigger scheduled notification:", err);
            });
          }
        }
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [manualNotifications, dbLoading]);

  // App Badge API logic to show notification count badge on the PWA app icon
  useEffect(() => {
    try {
      const pendingTasksCount = tasks.filter((t) => t.status === "pending").length;
      const pendingAmendmentsCount = bookingAmendmentRequests.filter((r) => r.status === "pending").length;
      const pendingRefundsCount = depositRefundRequests.filter((r) => r.status === "pending").length;
      const unreadNotifCount = notifications.filter((n) => n.status === "unread").length;
      const totalPendingCount = pendingTasksCount + pendingAmendmentsCount + pendingRefundsCount + unreadNotifCount;

      if ("setAppBadge" in navigator) {
        if (totalPendingCount > 0) {
          navigator.setAppBadge(totalPendingCount).catch((err) => {
            console.warn("Failed to set app badge:", err);
          });
        } else {
          navigator.clearAppBadge().catch((err) => {
            console.warn("Failed to clear app badge:", err);
          });
        }
      }
    } catch (e) {
      console.warn("Badging API error:", e);
    }
  }, [tasks, bookingAmendmentRequests, depositRefundRequests, notifications]);

  // Welcome Toast showing unread notifications on app startup
  useEffect(() => {
    if (dbLoading) return;
    const unreadCount = notifications.filter(n => n.status === 'unread').length;
    if (unreadCount > 0) {
      toast.message("تنبيهات جديدة غير مقروءة 🔔", {
        description: `لديك ${unreadCount} إشعارات جديدة لم تطلع عليها بعد.`,
        action: {
          label: "عرض الإشعارات",
          onClick: () => setIsNotificationMenuOpen(true)
        },
        duration: 10000
      });
    }
  }, [dbLoading]);

  const [globalCurrency, setGlobalCurrency] = useState("YER");
  const [activeDeviceView, setActiveDeviceView] = useState("web");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [systemTime, setSystemTime] = useState("");
  const [initialBookingDate, setInitialBookingDate] = useState<string | null>(
    null,
  );
  const [externalPreviewBookingId, setExternalPreviewBookingId] = useState<
    string | null
  >(null);
  const [isGlobalPreviewOpen, setIsGlobalPreviewOpen] = useState(false);
  const [previousDeviceView, setPreviousDeviceView] = useState<string | null>(
    null,
  );
  const [dashboardCurrentDate, setDashboardCurrentDate] = useState(new Date());
  const [dashboardSelectedStatType, setDashboardSelectedStatType] = useState<any>(null);
  const [dashboardDepositFilter, setDashboardDepositFilter] = useState<any>("all");
  const [calendarSelectedBooking, setCalendarSelectedBooking] = useState<any>(null);
  const [calendarSelectedDayDetails, setCalendarSelectedDayDetails] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[] | null>(null);
  const [androidTab, setAndroidTab] = useState<
    "home" | "accounts" | "transactions" | "tasks"
  >("home");
  const [printData, setPrintData] = useState<{
    title: string;
    documentNumber?: string;
    manualNumber?: string;
    date?: string;
    content: React.ReactNode;
  } | null>(null);

  // Mobile Back Button Support for main views navigation
  useEffect(() => {
    // Initial history state replacement
    if (!window.history.state || !window.history.state.activeDeviceView) {
      window.history.replaceState({ activeDeviceView }, "");
    }
  }, []);

  useEffect(() => {
    if (window.history.state?.activeDeviceView !== activeDeviceView) {
      window.history.pushState({ activeDeviceView }, "");
    }
  }, [activeDeviceView]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.activeDeviceView) {
        setActiveDeviceView(event.state.activeDeviceView);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const updateTime = () =>
      setSystemTime(
        new Date().toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Prevent accidental number increment/decrement when scrolling with mouse wheel over number inputs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLInputElement && activeEl.type === "number") {
        activeEl.blur();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  // Handle mobile PWA notification deep-linking and preview navigation on launch
  useEffect(() => {
    try {
      const handleQueryParams = () => {
        const params = new URLSearchParams(window.location.search);
        const notifView = params.get('notifView');
        const notifId = params.get('notifId');
        const notifCode = params.get('notifCode');

        if (notifView) {
          if (notifView === "halls" && notifId) {
            setExternalPreviewBookingId(notifId);
            setIsGlobalPreviewOpen(true);
          } else {
            if (notifView === "journal" && notifCode) {
              setHighlightJournalCode(notifCode);
            } else if (notifView === "amendments" && notifId) {
              setHighlightAmendmentId(notifId);
            } else if (notifView === "deposit-refund-requests" && notifId) {
              setHighlightRefundId(notifId);
            }
            setActiveDeviceView(notifView);
          }
          setIsSidebarCollapsed(true);

          // Clear query parameters from address bar to prevent repeated preview triggers on refresh
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }
      };

      // Execute on initial mount/load
      handleQueryParams();

      // Listen for popstate/navigation events
      window.addEventListener('popstate', handleQueryParams);
      return () => window.removeEventListener('popstate', handleQueryParams);
    } catch (e) {
      console.warn("Failed to process notification parameters:", e);
    }
  }, []);

  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    seedInitialDatabaseIfEmpty()
      .then(() => {
        setDbReady(true);
        setDbLoading(false);
        setSyncStatus("synced");
      })
      .catch(() => {
        setDbReady(true);
        setDbLoading(false);
        setSyncStatus("synced");
      });
  }, []);

  useEffect(() => {
    if (!dbReady) return;

    const unsubs = [
      subscribeAccounts(setAccounts),
      subscribeCurrencies(setCurrencies),
      subscribeTasks(setTasks),
      subscribeTransactions(setTransactions),
      subscribeHalls(setHalls),
      subscribeBookings(setBookings),
      subscribeClients(setClients),
      subscribeEmployees(setEmployees),
      subscribeServices(setServices),
      subscribeAppUsers(setAppUsers),
      subscribeAppRoles(setAppRoles),
      subscribeVouchers(setVouchers),
      subscribeCompanySettings(
        (data) => data && data.length > 0 && setCompanySettings(data[0]),
      ),
      subscribeBookingSettings(
        (data) => data && data.length > 0 && setBookingSettings(data[0]),
      ),
      subscribeLinkedAccounts(setLinkedAccounts),
      subscribeRecurringEntries(setRecurringEntries),
      subscribePayrollSheets(setPayrollSheets),
      subscribeStandardCosts(setStandardCosts),
      subscribeActualCosts(setActualCosts),
      subscribeCostItems(setCostItems),
      subscribeDepositRefundRequests(setDepositRefundRequests),
      subscribeBookingAmendmentRequests(setBookingAmendmentRequests),
      subscribeLockedDates(setLockedDates),
      subscribeNotificationSettings(setNotificationSettings),
      subscribeManualNotifications(setManualNotifications),
      subscribeAccountSubscriptions(setAccountNotificationSubscriptions),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [dbReady]);

  const mainProps = {
    accounts,
    currencies,
    tasks,
    transactions,
    halls,
    bookings,
    clients,
    employees,
    services,
    appUsers,
    appRoles,
    vouchers,
    companySettings,
    bookingSettings,
    linkedAccounts,
    recurringEntries,
    payrollSheets,
    standardCosts,
    actualCosts,
    costItems,
    depositRefundRequests,
    bookingAmendmentRequests,
    lockedDates,
    notificationSettings,
    dbLoading,
    syncStatus,
    globalCurrency,
    setGlobalCurrency,
    activeDeviceView,
    setActiveDeviceView,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    systemTime,
    setSystemTime,
    initialBookingDate,
    setInitialBookingDate,
    dashboardCurrentDate,
    setDashboardCurrentDate,
    dashboardSelectedStatType,
    setDashboardSelectedStatType,
    dashboardDepositFilter,
    setDashboardDepositFilter,
    calendarSelectedBooking,
    setCalendarSelectedBooking,
    calendarSelectedDayDetails,
    setCalendarSelectedDayDetails,
    externalPreviewBookingId,
    setExternalPreviewBookingId,
    isGlobalPreviewOpen,
    setIsGlobalPreviewOpen,
    previousDeviceView,
    setPreviousDeviceView,
    selectedAccount,
    setSelectedAccount,
    selectedClientIds,
    setSelectedClientIds,
    androidTab,
    setAndroidTab,
    printData,
    setPrintData,
    setTransactions,
    notifications,
    setNotifications,
    isNotificationMenuOpen,
    setIsNotificationMenuOpen,
    markAllNotificationsAsRead,
    clearAllNotifications,
    handleNotificationClick,
    highlightJournalCode,
    setHighlightJournalCode,
    highlightAmendmentId,
    setHighlightAmendmentId,
    highlightRefundId,
    setHighlightRefundId,
    preFilledCustomerName,
    setPreFilledCustomerName,
    accountNotificationSubscriptions,
  };

  return (
    <DeviceGuard>
      <Toaster position="top-center" richColors expand={true} visibleToasts={8} />
      <PermissionProvider users={appUsers} roles={appRoles}>
        <AppWrapper {...mainProps} />
        <PWAManager />
      </PermissionProvider>
    </DeviceGuard>
  );
}
