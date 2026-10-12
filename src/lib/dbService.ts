/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toast } from "sonner";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  orderBy,
  runTransaction,
  where,
  disableNetwork,
  enableNetwork,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Account,
  Currency,
  Task,
  Transaction,
  Hall,
  Booking,
  AuthorizedDevice,
  Client,
  Employee,
  Service,
  User,
  Role,
  ReceiptPayment,
  CompanySettings,
  Broker,
  Guarantor,
  BookingSettings,
  LinkedAccounts,
  CostItem,
  DepositRefundRequest,
  BookingAmendmentRequest,
  BookingDiscountRequest,
  NotificationSetting,
  ManualNotification,
  AccountNotificationSubscription,
} from "../types";

// Initial Chart of Accounts (Default Accounts)
const SEEDABLE_DEFAULT_ACCOUNTS: Account[] = [
  // Assets (الأصول)
  {
    id: "acc-1",
    code: "1",
    name: "الأصول",
    type: "asset",
    parentId: null,
    balance: 3500000,
    currency: "YER",
    isTransactional: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-11",
    code: "11",
    name: "الأصول المتداولة",
    type: "asset",
    parentId: "acc-1",
    balance: 3500000,
    currency: "YER",
    isTransactional: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-1101",
    code: "1101",
    name: "الصندوق الرئيسي",
    type: "asset",
    parentId: "acc-11",
    balance: 1000000,
    currency: "YER",
    isTransactional: true,
    notes: "الصندوق الرئيسي للمنشأة لاستلام المبالغ النقدية الكبيرة",
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-1102",
    code: "1102",
    name: "صندوق العربون والضمان",
    type: "asset",
    parentId: "acc-11",
    balance: 0,
    currency: "YER",
    isTransactional: true,
    notes: "صندوق مخصص لعربونات وضمانات حجوزات القاعات",
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-1103",
    code: "1103",
    name: "بنك التضامن الإسلامي",
    type: "asset",
    parentId: "acc-11",
    balance: 2500000,
    currency: "YER",
    isTransactional: true,
    notes: "الحساب البنكي الرئيسي للمنشأة",
    createdAt: new Date().toISOString(),
  },

  // Liabilities (الالتزامات)
  {
    id: "acc-2",
    code: "2",
    name: "الالتزامات",
    type: "liability",
    parentId: null,
    balance: 0,
    currency: "YER",
    isTransactional: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-21",
    code: "21",
    name: "الالتزامات المتداولة",
    type: "liability",
    parentId: "acc-2",
    balance: 0,
    currency: "YER",
    isTransactional: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-2101",
    code: "2101",
    name: "حساب تأمينات الحجوزات المستردة",
    type: "liability",
    parentId: "acc-21",
    balance: 0,
    currency: "YER",
    isTransactional: true,
    notes:
      "مبالغ تأمين المناسبات المستردة للعملاء بعد انتهاء الفعالية دون أضرار",
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-2102",
    code: "2102",
    name: "حساب رهون الحجوزات",
    type: "liability",
    parentId: "acc-21",
    balance: 0,
    currency: "YER",
    isTransactional: true,
    notes: "مبالغ الرهونات العينية أو النقدية الخاصة بالعملاء",
    createdAt: new Date().toISOString(),
  },

  // Equity (حقوق الملكية)
  {
    id: "acc-3",
    code: "3",
    name: "حقوق الملكية",
    type: "equity",
    parentId: null,
    balance: 3500000,
    currency: "YER",
    isTransactional: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-31",
    code: "31",
    name: "رأس المال",
    type: "equity",
    parentId: "acc-3",
    balance: 3500000,
    currency: "YER",
    isTransactional: true,
    notes: "رأس المال المستثمر في المشروع",
    createdAt: new Date().toISOString(),
  },

  // Revenue (الإيرادات)
  {
    id: "acc-4",
    code: "4",
    name: "الإيرادات",
    type: "revenue",
    parentId: null,
    balance: 0,
    currency: "YER",
    isTransactional: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-41",
    code: "41",
    name: "إيرادات حجز وصيانة قاعات المناسبات",
    type: "revenue",
    parentId: "acc-4",
    balance: 0,
    currency: "YER",
    isTransactional: true,
    notes:
      "العائدات والرسوم المحصلة لقاء حجز وتشغيل الصالات والقاعات ومستلزمات المناسبات",
    createdAt: new Date().toISOString(),
  },

  // Expense (المصروفات)
  {
    id: "acc-5",
    code: "5",
    name: "المصروفات",
    type: "expense",
    parentId: null,
    balance: 0,
    currency: "YER",
    isTransactional: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-51",
    code: "51",
    name: "المصروفات العمومية والإدارية",
    type: "expense",
    parentId: "acc-5",
    balance: 0,
    currency: "YER",
    isTransactional: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "acc-5101",
    code: "5101",
    name: "مصروفات صيانة القاعات والتشغيل",
    type: "expense",
    parentId: "acc-51",
    balance: 0,
    currency: "YER",
    isTransactional: true,
    notes: "مصاريف صيانة ونظافة الصالات وشراء المستهلكات والتشغيل اليومي",
    createdAt: new Date().toISOString(),
  },
];

// Local Storage Fallback setup
const LOCAL_STORAGE_KEYS = {
  ACCOUNTS: "accounting_app_accounts_v3",
  TRANSACTIONS: "accounting_app_transactions_v3",
  CURRENCIES: "accounting_app_currencies_v3",
  TASKS: "accounting_app_tasks_v3",
  HALLS: "accounting_app_halls_v3",
  BOOKINGS: "accounting_app_bookings_v3",
  DEVICES: "accounting_app_devices_v3",
  CLIENTS: "accounting_app_clients_v3",
  EMPLOYEES: "accounting_app_employees_v3",
  SERVICES: "accounting_app_services_v3",
  USERS: "accounting_app_users_v3",
  ROLES: "accounting_app_roles_v3",
  VOUCHERS: "accounting_app_vouchers_v3",
  COMPANY: "accounting_app_company_v3",
  BROKERS: "accounting_app_brokers_v3",
  GUARANTORS: "accounting_app_guarantors_v3",
  BOOKING_SETTINGS: "accounting_app_booking_settings_v3",
  LINKED_ACCOUNTS: "accounting_app_linked_accounts_v3",
  RECURRING: "accounting_app_recurring_v3",
  PAYROLL: "accounting_app_payroll_v3",
  STANDARD_COSTS: "accounting_app_standard_costs_v3",
  ACTUAL_COSTS: "accounting_app_actual_costs_v3",
  COST_ITEMS: "accounting_app_cost_items_v3",
  DEPOSIT_REFUND_REQUESTS: "accounting_app_deposit_refund_requests_v3",
  BOOKING_AMENDMENT_REQUESTS: "accounting_app_booking_amendment_requests_v3",
  BOOKING_DISCOUNT_REQUESTS: "accounting_app_booking_discount_requests_v3",
  ACCOUNT_SUBSCRIPTIONS: "accounting_app_account_subscriptions_v3",
  COMPANY_SETTINGS: "accounting_app_company_settings_v3",
  LOCKED_DATES: "accounting_app_locked_dates_v3",
  NOTIFICATION_SETTINGS: "accounting_app_notification_settings_v3",
  MANUAL_NOTIFICATIONS: "accounting_app_manual_notifications_v3",
};

let useLocalFallback =
  typeof window !== "undefined" &&
  localStorage.getItem("accounting_app_use_local_fallback") === "true";
let consecutiveErrorCount = 0;
const ERROR_THRESHOLD = 15; // Increased threshold for better resilience against transient contention

// Background Sync Queue to serialize Firestore writes and avoid contention on account documents
let backgroundSyncQueue = Promise.resolve();

async function enqueueBackgroundSync(task: () => Promise<void>) {
  backgroundSyncQueue = backgroundSyncQueue.then(async () => {
    try {
      await task();
    } catch (err) {
      // Errors are handled inside the task itself (switching to fallback)
    }
  });
  return backgroundSyncQueue;
}

if (useLocalFallback) {
  try {
    disableNetwork(db).catch((err) =>
      console.error("Error disabling network on startup:", err),
    );
  } catch (e) {
    console.error("Failed to call disableNetwork on startup:", e);
  }
}

// Callbacks container
let accountsCallbacks: ((accounts: Account[]) => void)[] = [];
let currenciesCallbacks: ((currencies: Currency[]) => void)[] = [];
let tasksCallbacks: ((tasks: Task[]) => void)[] = [];
let transactionsCallbacks: ((transactions: Transaction[]) => void)[] = [];
let hallsCallbacks: ((halls: Hall[]) => void)[] = [];
let bookingsCallbacks: ((bookings: Booking[]) => void)[] = [];
let devicesCallbacks: ((devices: AuthorizedDevice[]) => void)[] = [];
let clientsCallbacks: ((clients: Client[]) => void)[] = [];
let employeesCallbacks: ((employees: Employee[]) => void)[] = [];
let servicesCallbacks: ((services: Service[]) => void)[] = [];
let usersCallbacks: ((users: User[]) => void)[] = [];
let rolesCallbacks: ((roles: Role[]) => void)[] = [];
let vouchersCallbacks: ((vouchers: ReceiptPayment[]) => void)[] = [];
let companyCallbacks: ((settings: CompanySettings[]) => void)[] = [];
let brokersCallbacks: ((brokers: Broker[]) => void)[] = [];
let guarantorsCallbacks: ((guarantors: Guarantor[]) => void)[] = [];
let bookingSettingsCallbacks: ((settings: BookingSettings[]) => void)[] = [];
let linkedAccountsCallbacks: ((accounts: LinkedAccounts[]) => void)[] = [];
let recurringCallbacks: ((recurring: any[]) => void)[] = [];
let payrollCallbacks: ((payroll: any[]) => void)[] = [];
let standardCostsCallbacks: ((standardCosts: any[]) => void)[] = [];
let actualCostsCallbacks: ((actualCosts: any[]) => void)[] = [];
let costItemsCallbacks: ((costItems: CostItem[]) => void)[] = [];
let depositRefundRequestsCallbacks: ((
  requests: DepositRefundRequest[],
) => void)[] = [];
let bookingAmendmentRequestsCallbacks: ((
  requests: BookingAmendmentRequest[],
) => void)[] = [];
let bookingDiscountRequestsCallbacks: ((
  requests: BookingDiscountRequest[],
) => void)[] = [];
let lockedDatesCallbacks: ((lockedDates: any[]) => void)[] = [];
let notificationSettingsCallbacks: ((settings: NotificationSetting[]) => void)[] = [];
let manualNotificationsCallbacks: ((notifications: ManualNotification[]) => void)[] = [];
let accountSubscriptionsCallbacks: ((subscriptions: AccountNotificationSubscription[]) => void)[] = [];

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    id: "journal",
    title: "القيود المحاسبية وحركات اليومية",
    pwaEnabled: true,
    inAppEnabled: true,
    customTitle: "🧾 حركة مالية جديدة - {type} [{code}]",
    customBody: "المبلغ: {amount} {currency} | البيان: {description} | المستخدم: {user}",
  },
  {
    id: "booking",
    title: "حجوزات القاعات الجديدة",
    pwaEnabled: true,
    inAppEnabled: true,
    customTitle: "📅 حجز جديد [{code}]",
    customBody: "العميل: {customer} | تاريخ الحجز: {date} | الإجمالي: {price} {currency} | المستخدم: {user}",
  },
  {
    id: "amendment",
    title: "طلبات تعديل الحجوزات",
    pwaEnabled: true,
    inAppEnabled: true,
    customTitle: "📝 طلب تعديل حجز [{code}]",
    customBody: "الحجز: {bookingCode} | السبب: {reason} | المستخدم: {user}",
  },
  {
    id: "refund",
    title: "طلبات إلغاء ورد عربون",
    pwaEnabled: true,
    inAppEnabled: true,
    customTitle: "💰 طلب إلغاء ورد عربون [{code}]",
    customBody: "الحجز: {bookingCode} | المبلغ المطلوب رده: {amount} {currency} | المستخدم: {user}",
  },
  {
    id: "voucher",
    title: "سندات القبض والصرف",
    pwaEnabled: true,
    inAppEnabled: true,
    customTitle: "💵 سند مالي جديد - {type} [{code}]",
    customBody: "المبلغ: {amount} {currency} | البيان: {description} | المستخدم: {user}",
  },
  {
    id: "tasks",
    title: "المهام اليومية والنشاطات",
    pwaEnabled: true,
    inAppEnabled: true,
    customTitle: "📋 مهمة جديدة: {title}",
    customBody: "الأولوية: {priority} | الاستحقاق: {dueDate} | التفاصيل: {description}",
  },
  {
    id: "payroll",
    title: "مسيرات الرواتب والأجور",
    pwaEnabled: true,
    inAppEnabled: true,
    customTitle: "💰 اعتماد مسير رواتب جديد",
    customBody: "الشهر/العام: {monthYear} | إجمالي المسير: {totalAmount} {currency}",
  }
];

function getLocalData<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) {
      if (key === LOCAL_STORAGE_KEYS.NOTIFICATION_SETTINGS) {
        return DEFAULT_NOTIFICATION_SETTINGS as any;
      }
      if (key === LOCAL_STORAGE_KEYS.COST_ITEMS) {
        const defaults: CostItem[] = [
          {
            id: "ci-1",
            name: "أعمال النظافة والترتيب",
            defaultStandardCost: 8000,
            accountId: "acc-5101",
            createdAt: new Date().toISOString(),
          },
          {
            id: "ci-2",
            name: "الرفع والترتيب",
            defaultStandardCost: 12000,
            accountId: "acc-5101",
            createdAt: new Date().toISOString(),
          },
          {
            id: "ci-3",
            name: "الكهرباء والديزل",
            defaultStandardCost: 15000,
            accountId: "acc-5101",
            createdAt: new Date().toISOString(),
          },
          {
            id: "ci-4",
            name: "الحراسة والامن",
            defaultStandardCost: 6000,
            accountId: "acc-5101",
            createdAt: new Date().toISOString(),
          },
          {
            id: "ci-5",
            name: "أجور عمال ومباشرين",
            defaultStandardCost: 10000,
            accountId: "acc-5101",
            createdAt: new Date().toISOString(),
          },
          {
            id: "ci-6",
            name: "ضيافة وبوفيه",
            defaultStandardCost: 20000,
            accountId: "acc-5101",
            createdAt: new Date().toISOString(),
          },
        ];
        localStorage.setItem(key, JSON.stringify(defaults));
        return defaults as unknown as T;
      }
      return defaultVal;
    }
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      // Deduplicate by item.id if present
      const unique = parsed.filter((item: any, idx: number, self: any[]) => {
        if (item && typeof item === "object" && "id" in item) {
          return self.findIndex((d: any) => d.id === item.id) === idx;
        }
        return true;
      });
      return unique as unknown as T;
    }
    return parsed;
  } catch {
    return defaultVal;
  }
}

/**
 * Recursively cleans an object for Firestore:
 * - Completely removes any keys with `undefined` values to prevent 'Unsupported field value: undefined' errors
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return undefined as unknown as T;
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return (obj as any[])
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  const result: any = {};
  for (const key of Object.keys(obj as any)) {
    const value = (obj as any)[key];
    if (value === undefined) {
      continue; // Skip undefined keys completely
    }
    result[key] = typeof value === "object" ? sanitizeForFirestore(value) : value;
  }
  return result as T;
}

/**
 * Strips large base64 strings (likely images) from an object to reduce its size.
 */
function stripLargeImages(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => stripLargeImages(item));
  }

  const result: any = {};
  for (const key in obj) {
    const value = obj[key];
    if (
      typeof value === "string" &&
      value.length > 50000 &&
      value.startsWith("data:image")
    ) {
      console.warn(
        `Stripping large image field: ${key} (size: ${value.length})`,
      );
      continue;
    }
    result[key] = typeof value === "object" ? stripLargeImages(value) : value;
  }
  return result;
}

function setLocalData<T>(key: string, data: T) {
  try {
    let finalData = data;
    if (Array.isArray(data)) {
      // Deduplicate on write as well
      finalData = data.filter((item: any, idx: number, self: any[]) => {
        if (item && typeof item === "object" && "id" in item) {
          return self.findIndex((d: any) => d.id === item.id) === idx;
        }
        return true;
      }) as unknown as T;
    }

    localStorage.setItem(key, JSON.stringify(finalData));
  } catch (err) {
    console.error("Local storage write error:", err);
    if (
      err instanceof Error &&
      (err.name === "QuotaExceededError" || err.message?.includes("quota"))
    ) {
      try {
        console.warn(
          `Quota exceeded for ${key}. Attempting to save without large images.`,
        );
        const stripped = stripLargeImages(data);
        localStorage.setItem(key, JSON.stringify(stripped));
      } catch (inner) {
        console.error("Critical storage failure:", inner);
      }
    }
  }
}

let activeSubscriptions: (() => void)[] = [];

export function forceCloudConnection() {
  localStorage.removeItem("accounting_app_use_local_fallback");
  enableNetwork(db).catch((err) =>
    console.error("Error enabling network:", err),
  );
  useLocalFallback = false;
  consecutiveErrorCount = 0;
  window.location.reload();
}

function switchToLocalFallback(err?: any) {
  if (useLocalFallback) return;

  // Increment error count for background failures
  if (err) {
    consecutiveErrorCount++;
    console.error(`Background error count: ${consecutiveErrorCount}`, err);
  }

  const isCriticalError =
    err &&
    (err.code === "permission-denied" || err.code === "resource-exhausted");

  // Only switch if threshold reached or it's a critical error
  if (!isCriticalError && consecutiveErrorCount < ERROR_THRESHOLD) {
    console.warn(
      `Transient sync error detected (${consecutiveErrorCount}/${ERROR_THRESHOLD}). Not switching to local fallback yet.`,
    );
    return;
  }

  let reason = "حدث انقطاع متكرر في الاتصال بالسحابة أو تجاوز الحصة المتاحة.";

  if (err) {
    console.error("Switching to local fallback due to error:", err);
    if (err.code === "permission-denied") {
      reason = "تم رفض الوصول (Permission Denied). يرجى مراجعة إعدادات الأمان.";
    } else if (err.code === "unavailable") {
      reason = "الخدمة السحابية غير متوفرة حالياً (Service Unavailable).";
    } else if (err.code === "resource-exhausted") {
      reason = "تم استهلاك حصة السحابة المتاحة (Quota Exceeded).";
    } else if (err.message) {
      if (err.message.includes("offline") || err.message.includes("network")) {
        reason = "حدث انقطاع في الاتصال بالإنترنت أو السحابة.";
      }
    }
  }

  console.warn("🔒 Fallback to local storage persistence triggered.");
  toast.error(
    `تنبيه: تم تفعيل وضع التخزين المحلي الآمن (Offline Mode). ${reason} بياناتك تُحفظ محلياً وبأمان كامل الآن لضمان استمرارية العمل.`,
    {
      duration: 10000,
      position: "bottom-center",
    },
  );
  useLocalFallback = true;
  try {
    localStorage.setItem("accounting_app_use_local_fallback", "true");
  } catch {}

  try {
    disableNetwork(db).catch((err) =>
      console.error("Error disabling network inside fallback:", err),
    );
  } catch (e) {
    console.error("Failed to disable network:", e);
  }

  // Unsubscribe all active Firestore listeners to prevent further quota/connection errors
  activeSubscriptions.forEach((unsub) => {
    try {
      unsub();
    } catch (e) {
      console.error("Failed to unsub snapshot:", e);
    }
  });
  activeSubscriptions = [];

  triggerAllCallbacks();
}

function resetErrorCount() {
  if (consecutiveErrorCount > 0) {
    console.log("✅ Successful cloud sync. Resetting error count.");
    consecutiveErrorCount = 0;
  }
}

function triggerAllCallbacks() {
  const accountData = getLocalData<Account[]>(LOCAL_STORAGE_KEYS.ACCOUNTS, []);
  accountsCallbacks.forEach((cb) => cb(accountData));

  const currencyData = getLocalData<Currency[]>(
    LOCAL_STORAGE_KEYS.CURRENCIES,
    [],
  );
  currenciesCallbacks.forEach((cb) => cb(currencyData));

  const taskData = getLocalData<Task[]>(LOCAL_STORAGE_KEYS.TASKS, []);
  tasksCallbacks.forEach((cb) => cb(taskData));

  const transactionData = getLocalData<Transaction[]>(
    LOCAL_STORAGE_KEYS.TRANSACTIONS,
    [],
  );
  transactionsCallbacks.forEach((cb) => cb(transactionData));

  const hallData = getLocalData<Hall[]>(LOCAL_STORAGE_KEYS.HALLS, []);
  hallsCallbacks.forEach((cb) => cb(hallData));

  const bookingData = getLocalData<Booking[]>(LOCAL_STORAGE_KEYS.BOOKINGS, []);
  bookingsCallbacks.forEach((cb) => cb(bookingData));

  const deviceData = getLocalData<AuthorizedDevice[]>(
    LOCAL_STORAGE_KEYS.DEVICES,
    [],
  );
  devicesCallbacks.forEach((cb) => cb(deviceData));

  const clientData = getLocalData<Client[]>(LOCAL_STORAGE_KEYS.CLIENTS, []);
  clientsCallbacks.forEach((cb) => cb(clientData));

  const employeeData = getLocalData<Employee[]>(
    LOCAL_STORAGE_KEYS.EMPLOYEES,
    [],
  );
  employeesCallbacks.forEach((cb) => cb(employeeData));

  const serviceData = getLocalData<Service[]>(LOCAL_STORAGE_KEYS.SERVICES, []);
  servicesCallbacks.forEach((cb) => cb(serviceData));

  const userData = getLocalData<User[]>(LOCAL_STORAGE_KEYS.USERS, []);
  usersCallbacks.forEach((cb) => cb(userData));

  const roleData = getLocalData<Role[]>(LOCAL_STORAGE_KEYS.ROLES, []);
  rolesCallbacks.forEach((cb) => cb(roleData));

  const voucherData = getLocalData<ReceiptPayment[]>(
    LOCAL_STORAGE_KEYS.VOUCHERS,
    [],
  );
  vouchersCallbacks.forEach((cb) => cb(voucherData));

  const companyData = getLocalData<CompanySettings[]>(
    LOCAL_STORAGE_KEYS.COMPANY,
    [],
  );
  companyCallbacks.forEach((cb) => cb(companyData));

  const brokerData = getLocalData<Broker[]>(LOCAL_STORAGE_KEYS.BROKERS, []);
  brokersCallbacks.forEach((cb) => cb(brokerData));

  const guarantorData = getLocalData<Guarantor[]>(
    LOCAL_STORAGE_KEYS.GUARANTORS,
    [],
  );
  guarantorsCallbacks.forEach((cb) => cb(guarantorData));

  const bookingSettingsData = getLocalData<BookingSettings[]>(
    LOCAL_STORAGE_KEYS.BOOKING_SETTINGS,
    [],
  );
  bookingSettingsCallbacks.forEach((cb) => cb(bookingSettingsData));

  const linkedAccountsData = getLocalData<LinkedAccounts[]>(
    LOCAL_STORAGE_KEYS.LINKED_ACCOUNTS,
    [],
  );
  linkedAccountsCallbacks.forEach((cb) => cb(linkedAccountsData));

  const recurringData = getLocalData<any[]>(LOCAL_STORAGE_KEYS.RECURRING, []);
  recurringCallbacks.forEach((cb) => cb(recurringData));

  const payrollData = getLocalData<any[]>(LOCAL_STORAGE_KEYS.PAYROLL, []);
  payrollCallbacks.forEach((cb) => cb(payrollData));

  const standardCostsData = getLocalData<any[]>(
    LOCAL_STORAGE_KEYS.STANDARD_COSTS,
    [],
  );
  standardCostsCallbacks.forEach((cb) => cb(standardCostsData));

  const actualCostsData = getLocalData<any[]>(
    LOCAL_STORAGE_KEYS.ACTUAL_COSTS,
    [],
  );
  actualCostsCallbacks.forEach((cb) => cb(actualCostsData));

  const costItemsData = getLocalData<CostItem[]>(
    LOCAL_STORAGE_KEYS.COST_ITEMS,
    [],
  );
  costItemsCallbacks.forEach((cb) => cb(costItemsData));

  const bookingAmendmentRequestsData = getLocalData<BookingAmendmentRequest[]>(
    LOCAL_STORAGE_KEYS.BOOKING_AMENDMENT_REQUESTS,
    [],
  );
  bookingAmendmentRequestsCallbacks.forEach((cb) =>
    cb(bookingAmendmentRequestsData),
  );

  const notificationSettingsData = getLocalData<NotificationSetting[]>(
    LOCAL_STORAGE_KEYS.NOTIFICATION_SETTINGS,
    [],
  );
  notificationSettingsCallbacks.forEach((cb) => cb(notificationSettingsData));

  const manualNotificationsData = getLocalData<ManualNotification[]>(
    LOCAL_STORAGE_KEYS.MANUAL_NOTIFICATIONS,
    [],
  );
  manualNotificationsCallbacks.forEach((cb) => cb(manualNotificationsData));
}

// Subscriptions
function createSubscription<T>(
  collectionName: string,
  callback: (data: T[]) => void,
  callbackArray: ((data: T[]) => void)[],
  localStorageKey: string,
  sortField?: string,
) {
  callbackArray.push(callback);

  if (useLocalFallback) {
    callback(getLocalData<T[]>(localStorageKey, []));
    return () => {
      const idx = callbackArray.indexOf(callback);
      if (idx > -1) callbackArray.splice(idx, 1);
    };
  }

  const q = sortField
    ? query(collection(db, collectionName), orderBy(sortField, "desc"))
    : query(collection(db, collectionName));

  let unsubscribing = false;
  let unsub: () => void;

  try {
    unsub = onSnapshot(
      q,
      (snapshot) => {
        if (useLocalFallback) {
          if (!unsubscribing) {
            unsubscribing = true;
            unsub();
          }
          return;
        }
        const list: T[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as T);
        });
        callback(list);
        setLocalData(localStorageKey, list);
        resetErrorCount();
      },
      (err) => {
        console.error(`Error subscribing to ${collectionName}:`, err);
        // Only fallback for serious persistent errors
        if (err.code !== "failed-precondition") {
          switchToLocalFallback(err);
        }
      },
    );
  } catch (err) {
    console.error(`Catch error subscribing to ${collectionName}:`, err);
    switchToLocalFallback(err);
    return () => {
      const idx = callbackArray.indexOf(callback);
      if (idx > -1) callbackArray.splice(idx, 1);
    };
  }

  const wrappedUnsub = () => {
    if (!unsubscribing) {
      unsubscribing = true;
      try {
        unsub();
      } catch {}
    }
    const sIdx = activeSubscriptions.indexOf(wrappedUnsub);
    if (sIdx > -1) activeSubscriptions.splice(sIdx, 1);
  };

  activeSubscriptions.push(wrappedUnsub);

  return () => {
    wrappedUnsub();
    const idx = callbackArray.indexOf(callback);
    if (idx > -1) callbackArray.splice(idx, 1);
  };
}

export const subscribeAccounts = (cb: (data: Account[]) => void) =>
  createSubscription<Account>(
    "accounts",
    cb,
    accountsCallbacks,
    LOCAL_STORAGE_KEYS.ACCOUNTS,
    "code",
  );

export const subscribeCurrencies = (cb: (data: Currency[]) => void) =>
  createSubscription<Currency>(
    "currencies",
    cb,
    currenciesCallbacks,
    LOCAL_STORAGE_KEYS.CURRENCIES,
  );

export const subscribeTasks = (cb: (data: Task[]) => void) =>
  createSubscription<Task>(
    "tasks",
    cb,
    tasksCallbacks,
    LOCAL_STORAGE_KEYS.TASKS,
    "createdAt",
  );

export const subscribeTransactions = (cb: (data: Transaction[]) => void) =>
  createSubscription<Transaction>(
    "transactions",
    cb,
    transactionsCallbacks,
    LOCAL_STORAGE_KEYS.TRANSACTIONS,
    "createdAt",
  );

export const subscribeHalls = (cb: (data: Hall[]) => void) =>
  createSubscription<Hall>(
    "halls",
    cb,
    hallsCallbacks,
    LOCAL_STORAGE_KEYS.HALLS,
  );

export const subscribeBookings = (cb: (data: Booking[]) => void) =>
  createSubscription<Booking>(
    "bookings",
    cb,
    bookingsCallbacks,
    LOCAL_STORAGE_KEYS.BOOKINGS,
    "createdAt",
  );

export const subscribeDevices = (cb: (data: AuthorizedDevice[]) => void) =>
  createSubscription<AuthorizedDevice>(
    "authorized_devices",
    cb,
    devicesCallbacks,
    LOCAL_STORAGE_KEYS.DEVICES,
  );

export const subscribeClients = (cb: (data: Client[]) => void) =>
  createSubscription<Client>(
    "clients",
    cb,
    clientsCallbacks,
    LOCAL_STORAGE_KEYS.CLIENTS,
  );

export const subscribeEmployees = (cb: (data: Employee[]) => void) =>
  createSubscription<Employee>(
    "employees",
    cb,
    employeesCallbacks,
    LOCAL_STORAGE_KEYS.EMPLOYEES,
  );

export const subscribeServices = (cb: (data: Service[]) => void) =>
  createSubscription<Service>(
    "services",
    cb,
    servicesCallbacks,
    LOCAL_STORAGE_KEYS.SERVICES,
  );

export const subscribeAppUsers = (cb: (data: User[]) => void) =>
  createSubscription<User>(
    "app_users",
    cb,
    usersCallbacks,
    LOCAL_STORAGE_KEYS.USERS,
  );

export const subscribeAppRoles = (cb: (data: Role[]) => void) =>
  createSubscription<Role>(
    "app_roles",
    cb,
    rolesCallbacks,
    LOCAL_STORAGE_KEYS.ROLES,
  );

export const subscribeVouchers = (cb: (data: ReceiptPayment[]) => void) =>
  createSubscription<ReceiptPayment>(
    "vouchers",
    cb,
    vouchersCallbacks,
    LOCAL_STORAGE_KEYS.VOUCHERS,
    "createdAt",
  );

export const subscribeCompanySettings = (
  cb: (data: CompanySettings[]) => void,
) =>
  createSubscription<CompanySettings>(
    "company_settings",
    cb,
    companyCallbacks,
    LOCAL_STORAGE_KEYS.COMPANY,
  );

export const subscribeBrokers = (cb: (data: Broker[]) => void) =>
  createSubscription<Broker>(
    "brokers",
    cb,
    brokersCallbacks,
    LOCAL_STORAGE_KEYS.BROKERS,
    "createdAt",
  );

export const subscribeGuarantors = (cb: (data: Guarantor[]) => void) =>
  createSubscription<Guarantor>(
    "guarantors",
    cb,
    guarantorsCallbacks,
    LOCAL_STORAGE_KEYS.GUARANTORS,
    "createdAt",
  );

export const subscribeBookingSettings = (
  cb: (data: BookingSettings[]) => void,
) =>
  createSubscription<BookingSettings>(
    "booking_settings",
    cb,
    bookingSettingsCallbacks,
    LOCAL_STORAGE_KEYS.BOOKING_SETTINGS,
  );

export const subscribeLinkedAccounts = (
  cb: (data: LinkedAccounts[]) => void,
) =>
  createSubscription<LinkedAccounts>(
    "linked_accounts",
    cb,
    linkedAccountsCallbacks,
    LOCAL_STORAGE_KEYS.LINKED_ACCOUNTS,
  );

export const subscribeRecurringEntries = (cb: (data: any[]) => void) =>
  createSubscription<any>(
    "recurring",
    cb,
    recurringCallbacks,
    LOCAL_STORAGE_KEYS.RECURRING,
    "createdAt",
  );

export const subscribePayrollSheets = (cb: (data: any[]) => void) =>
  createSubscription<any>(
    "payroll",
    cb,
    payrollCallbacks,
    LOCAL_STORAGE_KEYS.PAYROLL,
    "createdAt",
  );

export const subscribeStandardCosts = (cb: (data: any[]) => void) =>
  createSubscription<any>(
    "standard_costs",
    cb,
    standardCostsCallbacks,
    LOCAL_STORAGE_KEYS.STANDARD_COSTS,
    "createdAt",
  );

export const subscribeActualCosts = (cb: (data: any[]) => void) =>
  createSubscription<any>(
    "actual_costs",
    cb,
    actualCostsCallbacks,
    LOCAL_STORAGE_KEYS.ACTUAL_COSTS,
    "createdAt",
  );

// Generic Write Helpers
async function genericAdd<T>(
  collectionName: string,
  item: Omit<T, "id" | "createdAt" | "updatedAt"> | any,
  storageKey: string,
  callbacks: ((data: T[]) => void)[],
) {
  const now = new Date().toISOString();
  const payload: any = {
    ...item,
    createdAt: now,
    updatedAt: now,
  };
  const customId = item.id;
  if (payload.id) delete payload.id;

  // 1. Load local data
  let list = getLocalData<T[]>(storageKey, []);

  // Calculate baseAmount for transactions if not present
  if (
    collectionName === "transactions" &&
    typeof payload.amount === "number" &&
    typeof payload.rate === "number"
  ) {
    if (payload.baseAmount === undefined) {
      payload.baseAmount = payload.amount * payload.rate;
    }
  }

  // Ensure unique sequence code
  if (
    collectionName === "transactions" ||
    collectionName === "vouchers" ||
    collectionName === "bookings" ||
    collectionName === "deposit_refund_requests"
  ) {
    if (!payload.sequenceCode) {
      let prefix = "";
      const year = new Date().getFullYear();
      if (collectionName === "transactions") {
        if (payload.type === "journal") prefix = "JRN";
        else prefix = "JRN"; // default to journal or maybe empty. Wait, all transactions in ledger are journal entries in a way.
      } else if (collectionName === "vouchers") {
        if (payload.type === "receipt") prefix = "REC";
        else if (payload.type === "payment") prefix = "PAY";
      } else if (collectionName === "bookings") {
        prefix = "BOK";
      } else if (collectionName === "deposit_refund_requests") {
        prefix = "DRR";
      }

      if (prefix) {
        let maxSeq = 0;

        // Get sequence starting numbers from Company Settings
        const companySettings = getLocalData<any>(
          LOCAL_STORAGE_KEYS.COMPANY_SETTINGS,
          {},
        );
        let startSequence = 0;
        if (companySettings && companySettings.sequenceStarts) {
          if (prefix === "BOK")
            startSequence = (companySettings.sequenceStarts.booking || 1) - 1;
          else if (prefix === "REC")
            startSequence = (companySettings.sequenceStarts.receipt || 1) - 1;
          else if (prefix === "PAY")
            startSequence = (companySettings.sequenceStarts.payment || 1) - 1;
          else if (prefix === "JRN")
            startSequence = (companySettings.sequenceStarts.journal || 1) - 1;
        }

        maxSeq = startSequence;

        list.forEach((existingItem: any) => {
          if (
            existingItem.sequenceCode &&
            existingItem.sequenceCode.startsWith(`${prefix}-${year}-`)
          ) {
            const parts = existingItem.sequenceCode.split("-");
            const seq = parseInt(parts[2], 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }
        });
        const nextSeqStr = String(maxSeq + 1).padStart(4, "0");
        payload.sequenceCode = `${prefix}-${year}-${nextSeqStr}`;
      }
    }
  }

  const generatedId =
    customId ||
    payload.sequenceCode ||
    `doc-${Date.now()}-${Math.round(Math.random() * 1000000)}`;

  const newItem = { ...payload, id: generatedId } as unknown as T;

  list = list.filter((item: any) => item.id !== generatedId);
  list.push(newItem);
  setLocalData(storageKey, list);

  // 2. Instantly notify React states to update the UI
  callbacks.forEach((cb) => cb(list));

  if (useLocalFallback) {
    return generatedId;
  }

  // 3. Sync to Firestore in the background
  enqueueBackgroundSync(async () => {
    try {
      let finalPayload = sanitizeForFirestore({ ...payload });
      // Firestore document limit is 1MB.
      if (JSON.stringify(finalPayload).length > 800000) {
        finalPayload = stripLargeImages(finalPayload);
        console.warn(
          `Payload for ${collectionName} was too large for Firestore. Images were removed to save record.`,
        );
      }
      await setDoc(doc(db, collectionName, generatedId), finalPayload);
      resetErrorCount();
    } catch (err) {
      console.error(`Background Add failed for ${collectionName}:`, err);
      switchToLocalFallback(err);
    }
  });

  return generatedId;
}

async function genericUpdate<T>(
  collectionName: string,
  id: string,
  updates: Partial<T>,
  storageKey: string,
  callbacks: ((data: T[]) => void)[],
) {
  const now = new Date().toISOString();
  const finalUpdates = { ...updates, updatedAt: now };

  // 1. Instantly write updates to local storage
  const list = getLocalData<T[]>(storageKey, []);
  const updated = list.map((item: any) =>
    item.id === id ? { ...item, ...finalUpdates } : item,
  );
  setLocalData(storageKey, updated);

  // 2. Instantly notify React states to update the UI
  callbacks.forEach((cb) => cb(updated));

  if (useLocalFallback) {
    return;
  }

  // 3. Sync to Firestore in the background
  enqueueBackgroundSync(async () => {
    try {
      let dataToUpdate = sanitizeForFirestore({ ...finalUpdates }) as any;
      if (dataToUpdate.id) delete dataToUpdate.id;
      if (dataToUpdate.createdAt) delete dataToUpdate.createdAt;

      // Firestore document limit is 1MB.
      if (JSON.stringify(dataToUpdate).length > 800000) {
        dataToUpdate = stripLargeImages(dataToUpdate);
        console.warn(
          `Update for ${collectionName} was too large for Firestore. Images were removed to save record.`,
        );
      }

      await updateDoc(doc(db, collectionName, id), dataToUpdate as any);
      resetErrorCount();
    } catch (err: any) {
      if (
        err.code === "not-found" ||
        err.message?.includes("No document to update")
      ) {
        try {
          let fallbackData = sanitizeForFirestore({ ...updates }) as any;
          if (JSON.stringify(fallbackData).length > 800000) {
            fallbackData = stripLargeImages(fallbackData);
          }
          await setDoc(doc(db, collectionName, id), fallbackData, {
            merge: true,
          });
          resetErrorCount();
        } catch (innerErr) {
          console.error(
            `Background fallback setDoc failed for ${collectionName}:`,
            innerErr,
          );
          switchToLocalFallback(innerErr);
        }
      } else {
        console.error(`Background Update failed for ${collectionName}:`, err);
        switchToLocalFallback(err);
      }
    }
  });
}

async function genericDelete<T>(
  collectionName: string,
  id: string,
  storageKey: string,
  callbacks: ((data: T[]) => void)[],
) {
  // 1. Instantly write to local storage
  const list = getLocalData<T[]>(storageKey, []);
  const updated = list.filter((item: any) => item.id !== id);
  setLocalData(storageKey, updated);

  // 2. Instantly notify React states to update the UI
  callbacks.forEach((cb) => cb(updated));

  if (useLocalFallback) {
    return;
  }

  // 3. Sync to Firestore in the background
  enqueueBackgroundSync(async () => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      resetErrorCount();
    } catch (err) {
      console.error(`Background Delete failed for ${collectionName}:`, err);
      switchToLocalFallback(err);
    }
  });
}

export function triggerLocalFallback() {
  switchToLocalFallback();
}

export function isUsingLocalFallback() {
  return useLocalFallback;
}

export function disableLocalFallback() {
  useLocalFallback = false;
  try {
    localStorage.removeItem("accounting_app_use_local_fallback");
  } catch {}
  try {
    enableNetwork(db).catch((err) =>
      console.error("Error enabling network:", err),
    );
  } catch (e) {
    console.error("Failed to enable network:", e);
  }
}

// Exports
export const addAccount = (item: any) =>
  genericAdd<Account>(
    "accounts",
    item,
    LOCAL_STORAGE_KEYS.ACCOUNTS,
    accountsCallbacks,
  );
export const updateAccount = (id: string, updates: any) =>
  genericUpdate<Account>(
    "accounts",
    id,
    updates,
    LOCAL_STORAGE_KEYS.ACCOUNTS,
    accountsCallbacks,
  );
export const deleteAccount = (id: string) =>
  genericDelete<Account>(
    "accounts",
    id,
    LOCAL_STORAGE_KEYS.ACCOUNTS,
    accountsCallbacks,
  );

export const addCurrency = (item: any) =>
  genericAdd<Currency>(
    "currencies",
    item,
    LOCAL_STORAGE_KEYS.CURRENCIES,
    currenciesCallbacks,
  );
export const updateCurrency = (id: string, updates: any) =>
  genericUpdate<Currency>(
    "currencies",
    id,
    updates,
    LOCAL_STORAGE_KEYS.CURRENCIES,
    currenciesCallbacks,
  );
export const deleteCurrency = (id: string) =>
  genericDelete<Currency>(
    "currencies",
    id,
    LOCAL_STORAGE_KEYS.CURRENCIES,
    currenciesCallbacks,
  );

export const addTask = (item: any) =>
  genericAdd<Task>("tasks", item, LOCAL_STORAGE_KEYS.TASKS, tasksCallbacks);
export const updateTask = (id: string, updates: any) =>
  genericUpdate<Task>(
    "tasks",
    id,
    updates,
    LOCAL_STORAGE_KEYS.TASKS,
    tasksCallbacks,
  );
export const deleteTask = (id: string) =>
  genericDelete<Task>("tasks", id, LOCAL_STORAGE_KEYS.TASKS, tasksCallbacks);

export const addHall = (item: any) =>
  genericAdd<Hall>("halls", item, LOCAL_STORAGE_KEYS.HALLS, hallsCallbacks);
export const updateHall = (id: string, updates: any) =>
  genericUpdate<Hall>(
    "halls",
    id,
    updates,
    LOCAL_STORAGE_KEYS.HALLS,
    hallsCallbacks,
  );
export const deleteHall = (id: string) =>
  genericDelete<Hall>("halls", id, LOCAL_STORAGE_KEYS.HALLS, hallsCallbacks);

export const addBooking = (item: any) => {
  const dates = item.eventDates || (item.eventDate ? [item.eventDate] : []);
  if (dates.some((d: string) => isDateLocked(d))) {
    throw new Error("عذراً، لا يمكن إضافة حجز في تاريخ مقفل.");
  }
  return genericAdd<Booking>(
    "bookings",
    item,
    LOCAL_STORAGE_KEYS.BOOKINGS,
    bookingsCallbacks,
  );
};
export const updateBooking = (id: string, updates: any) => {
  if (updates.eventDate && isDateLocked(updates.eventDate)) {
    throw new Error("عذراً، لا يمكن نقل الحجز إلى تاريخ مقفل.");
  }
  if (updates.eventDates && updates.eventDates.some((d: string) => isDateLocked(d))) {
    throw new Error("عذراً، لا يمكن تعديل الحجز ليشمل تواريخ مقفلة.");
  }
  return genericUpdate<Booking>(
    "bookings",
    id,
    updates,
    LOCAL_STORAGE_KEYS.BOOKINGS,
    bookingsCallbacks,
  );
};
export const deleteBooking = (id: string) => {
  const current = getLocalData<Booking[]>(LOCAL_STORAGE_KEYS.BOOKINGS, []);
  const booking = current.find(b => b.id === id);
  if (booking) {
    const dates = booking.eventDates || (booking.eventDate ? [booking.eventDate] : []);
    if (dates.some((d: string) => isDateLocked(d))) {
      throw new Error("عذراً، لا يمكن حذف حجز في تاريخ مقفل.");
    }
  }
  return genericDelete<Booking>(
    "bookings",
    id,
    LOCAL_STORAGE_KEYS.BOOKINGS,
    bookingsCallbacks,
  );
};

export const addDevice = (item: any) =>
  genericAdd<AuthorizedDevice>(
    "authorized_devices",
    item,
    LOCAL_STORAGE_KEYS.DEVICES,
    devicesCallbacks,
  );
export const updateDevice = (id: string, updates: any) =>
  genericUpdate<AuthorizedDevice>(
    "authorized_devices",
    id,
    updates,
    LOCAL_STORAGE_KEYS.DEVICES,
    devicesCallbacks,
  );
export const deleteDevice = (id: string) =>
  genericDelete<AuthorizedDevice>(
    "authorized_devices",
    id,
    LOCAL_STORAGE_KEYS.DEVICES,
    devicesCallbacks,
  );

export const addClient = (item: any) =>
  genericAdd<Client>(
    "clients",
    item,
    LOCAL_STORAGE_KEYS.CLIENTS,
    clientsCallbacks,
  );
export const updateClient = (id: string, updates: any) =>
  genericUpdate<Client>(
    "clients",
    id,
    updates,
    LOCAL_STORAGE_KEYS.CLIENTS,
    clientsCallbacks,
  );
export const deleteClient = (id: string) =>
  genericDelete<Client>(
    "clients",
    id,
    LOCAL_STORAGE_KEYS.CLIENTS,
    clientsCallbacks,
  );

export const addEmployee = (item: any) =>
  genericAdd<Employee>(
    "employees",
    item,
    LOCAL_STORAGE_KEYS.EMPLOYEES,
    employeesCallbacks,
  );
export const updateEmployee = (id: string, updates: any) =>
  genericUpdate<Employee>(
    "employees",
    id,
    updates,
    LOCAL_STORAGE_KEYS.EMPLOYEES,
    employeesCallbacks,
  );
export const deleteEmployee = (id: string) =>
  genericDelete<Employee>(
    "employees",
    id,
    LOCAL_STORAGE_KEYS.EMPLOYEES,
    employeesCallbacks,
  );

export const addService = (item: any) =>
  genericAdd<Service>(
    "services",
    item,
    LOCAL_STORAGE_KEYS.SERVICES,
    servicesCallbacks,
  );
export const updateService = (id: string, updates: any) =>
  genericUpdate<Service>(
    "services",
    id,
    updates,
    LOCAL_STORAGE_KEYS.SERVICES,
    servicesCallbacks,
  );
export const deleteService = (id: string) =>
  genericDelete<Service>(
    "services",
    id,
    LOCAL_STORAGE_KEYS.SERVICES,
    servicesCallbacks,
  );

export const addUser = (item: any) =>
  genericAdd<User>("app_users", item, LOCAL_STORAGE_KEYS.USERS, usersCallbacks);
export const updateUser = (id: string, updates: any) =>
  genericUpdate<User>(
    "app_users",
    id,
    updates,
    LOCAL_STORAGE_KEYS.USERS,
    usersCallbacks,
  );
export const deleteUser = (id: string) =>
  genericDelete<User>(
    "app_users",
    id,
    LOCAL_STORAGE_KEYS.USERS,
    usersCallbacks,
  );

export const addRole = (item: any) =>
  genericAdd<Role>("app_roles", item, LOCAL_STORAGE_KEYS.ROLES, rolesCallbacks);
export const updateRole = (id: string, updates: any) =>
  genericUpdate<Role>(
    "app_roles",
    id,
    updates,
    LOCAL_STORAGE_KEYS.ROLES,
    rolesCallbacks,
  );
export const deleteRole = (id: string) =>
  genericDelete<Role>(
    "app_roles",
    id,
    LOCAL_STORAGE_KEYS.ROLES,
    rolesCallbacks,
  );

export const addVoucher = (item: any) => {
  // Convert simple date string (like "2026-07-03") to a full local real-time ISO string
  if (item.date && !item.date.includes("T")) {
    const now = new Date();
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) {
      item.date = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();
    }
  }
  if (item.voucherDate && !item.voucherDate.includes("T")) {
    const now = new Date();
    const d = new Date(item.voucherDate);
    if (!isNaN(d.getTime())) {
      item.voucherDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();
    }
  }

  if (isDateLocked(item.date)) {
    throw new Error("عذراً، لا يمكن إضافة سند في تاريخ مقفل.");
  }
  return genericAdd<ReceiptPayment>(
    "vouchers",
    item,
    LOCAL_STORAGE_KEYS.VOUCHERS,
    vouchersCallbacks,
  );
};
export const updateVoucher = (id: string, updates: any) => {
  // Convert simple date string (like "2026-07-03") to a full local real-time ISO string
  if (updates.date && !updates.date.includes("T")) {
    const now = new Date();
    const d = new Date(updates.date);
    if (!isNaN(d.getTime())) {
      updates.date = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();
    }
  }
  if (updates.voucherDate && !updates.voucherDate.includes("T")) {
    const now = new Date();
    const d = new Date(updates.voucherDate);
    if (!isNaN(d.getTime())) {
      updates.voucherDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();
    }
  }

  if (updates.date && isDateLocked(updates.date)) {
    throw new Error("عذراً، لا يمكن تعديل السند إلى تاريخ مقفل.");
  }
  return genericUpdate<ReceiptPayment>(
    "vouchers",
    id,
    updates,
    LOCAL_STORAGE_KEYS.VOUCHERS,
    vouchersCallbacks,
  );
};
export const deleteVoucher = (id: string) =>
  genericDelete<ReceiptPayment>(
    "vouchers",
    id,
    LOCAL_STORAGE_KEYS.VOUCHERS,
    vouchersCallbacks,
  );

export const updateCompanySettings = (id: string, updates: any) =>
  genericUpdate<CompanySettings>(
    "company_settings",
    id,
    updates,
    LOCAL_STORAGE_KEYS.COMPANY,
    companyCallbacks,
  );

export const addCompanySettings = (item: any) =>
  genericAdd<CompanySettings>(
    "company_settings",
    item,
    LOCAL_STORAGE_KEYS.COMPANY,
    companyCallbacks,
  );

export const addBroker = (item: any) =>
  genericAdd<Broker>(
    "brokers",
    item,
    LOCAL_STORAGE_KEYS.BROKERS,
    brokersCallbacks,
  );
export const updateBroker = (id: string, updates: any) =>
  genericUpdate<Broker>(
    "brokers",
    id,
    updates,
    LOCAL_STORAGE_KEYS.BROKERS,
    brokersCallbacks,
  );
export const deleteBroker = (id: string) =>
  genericDelete<Broker>(
    "brokers",
    id,
    LOCAL_STORAGE_KEYS.BROKERS,
    brokersCallbacks,
  );

export const addGuarantor = (item: any) =>
  genericAdd<Guarantor>(
    "guarantors",
    item,
    LOCAL_STORAGE_KEYS.GUARANTORS,
    guarantorsCallbacks,
  );
export const updateGuarantor = (id: string, updates: any) =>
  genericUpdate<Guarantor>(
    "guarantors",
    id,
    updates,
    LOCAL_STORAGE_KEYS.GUARANTORS,
    guarantorsCallbacks,
  );
export const deleteGuarantor = (id: string) =>
  genericDelete<Guarantor>(
    "guarantors",
    id,
    LOCAL_STORAGE_KEYS.GUARANTORS,
    guarantorsCallbacks,
  );

export const addBookingSettings = (item: any) =>
  genericAdd<BookingSettings>(
    "booking_settings",
    item,
    LOCAL_STORAGE_KEYS.BOOKING_SETTINGS,
    bookingSettingsCallbacks,
  );
export const updateBookingSettings = (id: string, updates: any) =>
  genericUpdate<BookingSettings>(
    "booking_settings",
    id,
    updates,
    LOCAL_STORAGE_KEYS.BOOKING_SETTINGS,
    bookingSettingsCallbacks,
  );

export const addLinkedAccounts = (item: any) =>
  genericAdd<LinkedAccounts>(
    "linked_accounts",
    item,
    LOCAL_STORAGE_KEYS.LINKED_ACCOUNTS,
    linkedAccountsCallbacks,
  );
export const updateLinkedAccounts = (id: string, updates: any) =>
  genericUpdate<LinkedAccounts>(
    "linked_accounts",
    id,
    updates,
    LOCAL_STORAGE_KEYS.LINKED_ACCOUNTS,
    linkedAccountsCallbacks,
  );

export const addTransaction = (item: any) =>
  genericAdd<Transaction>(
    "transactions",
    item,
    LOCAL_STORAGE_KEYS.TRANSACTIONS,
    transactionsCallbacks,
  );
export const updateTransaction = (id: string, updates: any) => {
  // Convert simple date string (like "2026-07-03") to a full local real-time ISO string
  if (updates.date && !updates.date.includes("T")) {
    const now = new Date();
    const d = new Date(updates.date);
    if (!isNaN(d.getTime())) {
      updates.date = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();
    }
  }
  if (updates.voucherDate && !updates.voucherDate.includes("T")) {
    const now = new Date();
    const d = new Date(updates.voucherDate);
    if (!isNaN(d.getTime())) {
      updates.voucherDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();
    }
  }

  if (updates.date && isDateLocked(updates.date)) {
    throw new Error("عذراً، لا يمكن تعديل القيد إلى تاريخ مقفل.");
  }
  return genericUpdate<Transaction>(
    "transactions",
    id,
    updates,
    LOCAL_STORAGE_KEYS.TRANSACTIONS,
    transactionsCallbacks,
  );
};
export const deleteTransaction = (id: string) => {
  const current = getLocalData<Transaction[]>(LOCAL_STORAGE_KEYS.TRANSACTIONS, []);
  const transaction = current.find(t => t.id === id);
  if (transaction && isDateLocked(transaction.date)) {
    throw new Error("عذراً، لا يمكن حذف قيد في تاريخ مقفل.");
  }
  return genericDelete<Transaction>(
    "transactions",
    id,
    LOCAL_STORAGE_KEYS.TRANSACTIONS,
    transactionsCallbacks,
  );
};

export const addRecurringEntry = (item: any) =>
  genericAdd<any>(
    "recurring",
    item,
    LOCAL_STORAGE_KEYS.RECURRING,
    recurringCallbacks,
  );
export const updateRecurringEntry = (id: string, updates: any) =>
  genericUpdate<any>(
    "recurring",
    id,
    updates,
    LOCAL_STORAGE_KEYS.RECURRING,
    recurringCallbacks,
  );
export const deleteRecurringEntry = (id: string) =>
  genericDelete<any>(
    "recurring",
    id,
    LOCAL_STORAGE_KEYS.RECURRING,
    recurringCallbacks,
  );

export const addPayrollSheet = (item: any) =>
  genericAdd<any>(
    "payroll",
    item,
    LOCAL_STORAGE_KEYS.PAYROLL,
    payrollCallbacks,
  );
export const updatePayrollSheet = (id: string, updates: any) =>
  genericUpdate<any>(
    "payroll",
    id,
    updates,
    LOCAL_STORAGE_KEYS.PAYROLL,
    payrollCallbacks,
  );
export const deletePayrollSheet = (id: string) =>
  genericDelete<any>(
    "payroll",
    id,
    LOCAL_STORAGE_KEYS.PAYROLL,
    payrollCallbacks,
  );

export const addStandardCost = (item: any) =>
  genericAdd<any>(
    "standard_costs",
    item,
    LOCAL_STORAGE_KEYS.STANDARD_COSTS,
    standardCostsCallbacks,
  );
export const updateStandardCost = (id: string, updates: any) =>
  genericUpdate<any>(
    "standard_costs",
    id,
    updates,
    LOCAL_STORAGE_KEYS.STANDARD_COSTS,
    standardCostsCallbacks,
  );
export const deleteStandardCost = (id: string) =>
  genericDelete<any>(
    "standard_costs",
    id,
    LOCAL_STORAGE_KEYS.STANDARD_COSTS,
    standardCostsCallbacks,
  );

export const addActualCost = (item: any) => {
  if (item.date && isDateLocked(item.date)) {
    throw new Error("عذراً، لا يمكن إضافة تكاليف في تاريخ مقفل.");
  }
  return genericAdd<any>(
    "actual_costs",
    item,
    LOCAL_STORAGE_KEYS.ACTUAL_COSTS,
    actualCostsCallbacks,
  );
};
export const updateActualCost = (id: string, updates: any) => {
  if (updates.date && isDateLocked(updates.date)) {
    throw new Error("عذراً، لا يمكن تعديل تكاليف في تاريخ مقفل.");
  }
  return genericUpdate<any>(
    "actual_costs",
    id,
    updates,
    LOCAL_STORAGE_KEYS.ACTUAL_COSTS,
    actualCostsCallbacks,
  );
};
export const deleteActualCost = (id: string) => {
  const current = getLocalData<any[]>(LOCAL_STORAGE_KEYS.ACTUAL_COSTS, []);
  const item = current.find(x => x.id === id);
  if (item && item.date && isDateLocked(item.date)) {
    throw new Error("عذراً، لا يمكن حذف تكاليف في تاريخ مقفل.");
  }
  return genericDelete<any>(
    "actual_costs",
    id,
    LOCAL_STORAGE_KEYS.ACTUAL_COSTS,
    actualCostsCallbacks,
  );
};

export const subscribeCostItems = (cb: (data: CostItem[]) => void) =>
  createSubscription<CostItem>(
    "cost_items",
    cb,
    costItemsCallbacks,
    LOCAL_STORAGE_KEYS.COST_ITEMS,
    "createdAt",
  );
export const addCostItem = (item: any) =>
  genericAdd<CostItem>(
    "cost_items",
    item,
    LOCAL_STORAGE_KEYS.COST_ITEMS,
    costItemsCallbacks,
  );
export const updateCostItem = (id: string, updates: any) =>
  genericUpdate<CostItem>(
    "cost_items",
    id,
    updates,
    LOCAL_STORAGE_KEYS.COST_ITEMS,
    costItemsCallbacks,
  );
export const deleteCostItem = (id: string) =>
  genericDelete<CostItem>(
    "cost_items",
    id,
    LOCAL_STORAGE_KEYS.COST_ITEMS,
    costItemsCallbacks,
  );

export const subscribeDepositRefundRequests = (
  cb: (data: DepositRefundRequest[]) => void,
) =>
  createSubscription<DepositRefundRequest>(
    "deposit_refund_requests",
    cb,
    depositRefundRequestsCallbacks,
    LOCAL_STORAGE_KEYS.DEPOSIT_REFUND_REQUESTS,
    "createdAt",
  );

// --- Date Locking System ---
let lockedDatesCache: string[] = [];

export const isDateLocked = (dateStr: string) => {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    // We use YYYY-MM-DD for comparison
    const targetDate = d.toISOString().split("T")[0];
    return lockedDatesCache.includes(targetDate);
  } catch (e) {
    return false;
  }
};

export const subscribeLockedDates = (cb: (data: any[]) => void) =>
  createSubscription<any>(
    "locked_dates",
    (data) => {
      lockedDatesCache = data.map((d: any) => d.id);
      cb(data);
    },
    lockedDatesCallbacks,
    LOCAL_STORAGE_KEYS.LOCKED_DATES,
  );

export const lockDay = async (dateId: string, lockedBy: string) => {
  const item = {
    id: dateId,
    isLocked: true,
    lockedAt: new Date().toISOString(),
    lockedBy,
  };
  await setDoc(doc(db, "locked_dates", dateId), item);
  // Trigger local updates
  const current = getLocalData<any[]>(LOCAL_STORAGE_KEYS.LOCKED_DATES, []);
  const updated = [...current.filter((x) => x.id !== dateId), item];
  localStorage.setItem(LOCAL_STORAGE_KEYS.LOCKED_DATES, JSON.stringify(updated));
  lockedDatesCallbacks.forEach((cb) => cb(updated));
};

export const unlockDay = async (dateId: string) => {
  await deleteDoc(doc(db, "locked_dates", dateId));
  // Trigger local updates
  const current = getLocalData<any[]>(LOCAL_STORAGE_KEYS.LOCKED_DATES, []);
  const updated = current.filter((x) => x.id !== dateId);
  localStorage.setItem(LOCAL_STORAGE_KEYS.LOCKED_DATES, JSON.stringify(updated));
  lockedDatesCallbacks.forEach((cb) => cb(updated));
};
export const addDepositRefundRequest = (item: any) =>
  genericAdd<DepositRefundRequest>(
    "deposit_refund_requests",
    item,
    LOCAL_STORAGE_KEYS.DEPOSIT_REFUND_REQUESTS,
    depositRefundRequestsCallbacks,
  );
export const updateDepositRefundRequest = (id: string, updates: any) =>
  genericUpdate<DepositRefundRequest>(
    "deposit_refund_requests",
    id,
    updates,
    LOCAL_STORAGE_KEYS.DEPOSIT_REFUND_REQUESTS,
    depositRefundRequestsCallbacks,
  );
export const deleteDepositRefundRequest = (id: string) =>
  genericDelete<DepositRefundRequest>(
    "deposit_refund_requests",
    id,
    LOCAL_STORAGE_KEYS.DEPOSIT_REFUND_REQUESTS,
    depositRefundRequestsCallbacks,
  );

export const subscribeBookingAmendmentRequests = (
  cb: (data: BookingAmendmentRequest[]) => void,
) =>
  createSubscription<BookingAmendmentRequest>(
    "booking_amendment_requests",
    cb,
    bookingAmendmentRequestsCallbacks,
    LOCAL_STORAGE_KEYS.BOOKING_AMENDMENT_REQUESTS,
    "createdAt",
  );
export const addBookingAmendmentRequest = (item: any) =>
  genericAdd<BookingAmendmentRequest>(
    "booking_amendment_requests",
    item,
    LOCAL_STORAGE_KEYS.BOOKING_AMENDMENT_REQUESTS,
    bookingAmendmentRequestsCallbacks,
  );
export const updateBookingAmendmentRequest = (id: string, updates: any) =>
  genericUpdate<BookingAmendmentRequest>(
    "booking_amendment_requests",
    id,
    updates,
    LOCAL_STORAGE_KEYS.BOOKING_AMENDMENT_REQUESTS,
    bookingAmendmentRequestsCallbacks,
  );
export const deleteBookingAmendmentRequest = (id: string) =>
  genericDelete<BookingAmendmentRequest>(
    "booking_amendment_requests",
    id,
    LOCAL_STORAGE_KEYS.BOOKING_AMENDMENT_REQUESTS,
    bookingAmendmentRequestsCallbacks,
  );

export const subscribeBookingDiscountRequests = (
  cb: (data: BookingDiscountRequest[]) => void,
) =>
  createSubscription<BookingDiscountRequest>(
    "booking_discount_requests",
    cb,
    bookingDiscountRequestsCallbacks,
    LOCAL_STORAGE_KEYS.BOOKING_DISCOUNT_REQUESTS,
    "createdAt",
  );
export const addBookingDiscountRequest = (item: any) =>
  genericAdd<BookingDiscountRequest>(
    "booking_discount_requests",
    item,
    LOCAL_STORAGE_KEYS.BOOKING_DISCOUNT_REQUESTS,
    bookingDiscountRequestsCallbacks,
  );
export const updateBookingDiscountRequest = (id: string, updates: any) =>
  genericUpdate<BookingDiscountRequest>(
    "booking_discount_requests",
    id,
    updates,
    LOCAL_STORAGE_KEYS.BOOKING_DISCOUNT_REQUESTS,
    bookingDiscountRequestsCallbacks,
  );
export const deleteBookingDiscountRequest = (id: string) =>
  genericDelete<BookingDiscountRequest>(
    "booking_discount_requests",
    id,
    LOCAL_STORAGE_KEYS.BOOKING_DISCOUNT_REQUESTS,
    bookingDiscountRequestsCallbacks,
  );

export const subscribeNotificationSettings = (
  cb: (data: NotificationSetting[]) => void,
) =>
  createSubscription<NotificationSetting>(
    "notification_settings",
    cb,
    notificationSettingsCallbacks,
    LOCAL_STORAGE_KEYS.NOTIFICATION_SETTINGS,
  );

export const updateNotificationSetting = (id: string, updates: any) =>
  genericUpdate<NotificationSetting>(
    "notification_settings",
    id,
    updates,
    LOCAL_STORAGE_KEYS.NOTIFICATION_SETTINGS,
    notificationSettingsCallbacks,
  );

export const subscribeManualNotifications = (
  cb: (data: ManualNotification[]) => void,
) =>
  createSubscription<ManualNotification>(
    "manual_notifications",
    cb,
    manualNotificationsCallbacks,
    LOCAL_STORAGE_KEYS.MANUAL_NOTIFICATIONS,
    "createdAt",
  );

export const subscribeAccountSubscriptions = (
  cb: (data: AccountNotificationSubscription[]) => void,
) =>
  createSubscription<AccountNotificationSubscription>(
    "account_notification_subscriptions",
    cb,
    accountSubscriptionsCallbacks,
    LOCAL_STORAGE_KEYS.ACCOUNT_SUBSCRIPTIONS,
    "id",
  );

export const addManualNotification = (item: Omit<ManualNotification, "id">) =>
  genericAdd<ManualNotification>(
    "manual_notifications",
    item,
    LOCAL_STORAGE_KEYS.MANUAL_NOTIFICATIONS,
    manualNotificationsCallbacks,
  );

export const updateManualNotification = (id: string, updates: Partial<ManualNotification>) =>
  genericUpdate<ManualNotification>(
    "manual_notifications",
    id,
    updates,
    LOCAL_STORAGE_KEYS.MANUAL_NOTIFICATIONS,
    manualNotificationsCallbacks,
  );

export const deleteManualNotification = (id: string) =>
  genericDelete<ManualNotification>(
    "manual_notifications",
    id,
    LOCAL_STORAGE_KEYS.MANUAL_NOTIFICATIONS,
    manualNotificationsCallbacks,
  );

// Complex Transaction Handling remains specific
export async function addTransactionWithDoubleEntry(
  txData: Omit<Transaction, "id" | "createdAt">,
  currencies: Currency[],
  accounts: Account[],
) {
  // Convert simple date string (like "2026-07-03") to a full local real-time ISO string
  if (txData.date && !txData.date.includes("T")) {
    const now = new Date();
    const d = new Date(txData.date);
    if (!isNaN(d.getTime())) {
      txData.date = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();
    }
  }
  
  if (txData.voucherDate && !txData.voucherDate.includes("T")) {
    const now = new Date();
    const d = new Date(txData.voucherDate);
    if (!isNaN(d.getTime())) {
      txData.voucherDate = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      ).toISOString();
    }
  }

  if (isDateLocked(txData.date)) {
    throw new Error("عذراً، لا يمكن إضافة قيد في تاريخ مقفل.");
  }
  // Check for duplicate entry based on sourceId if present (check locally first)
  if (txData.sourceId && txData.sourceType) {
    const localTxs = getLocalData<Transaction[]>(
      LOCAL_STORAGE_KEYS.TRANSACTIONS,
      [],
    );
    const duplicate = localTxs.find(
      (t) =>
        t.sourceId === txData.sourceId &&
        t.sourceType === txData.sourceType &&
        t.debitAccountId === txData.debitAccountId &&
        t.creditAccountId === txData.creditAccountId,
    );
    if (duplicate) {
      console.log(
        "Duplicate transaction detected for source:",
        txData.sourceId,
        "Returning existing ID.",
      );
      return duplicate.id;
    }
  }

  // Auto-calculate baseAmount
  if (txData.baseAmount === undefined) {
    txData.baseAmount = txData.amount * (txData.rate || 1);
  }

  const localTxs = getLocalData<Transaction[]>(
    LOCAL_STORAGE_KEYS.TRANSACTIONS,
    [],
  );

  // Generate sequence code
  if (!txData.sequenceCode) {
    let prefix = txData.sourceType === "booking" ? "BOK" : "JRN";
    const year = new Date().getFullYear();
    let maxSeq = 0;

    // Get sequence starting numbers from Company Settings
    const companySettings = getLocalData<any>(
      LOCAL_STORAGE_KEYS.COMPANY_SETTINGS,
      {},
    );
    let startSequence = 0;
    if (companySettings && companySettings.sequenceStarts) {
      if (prefix === "JRN")
        startSequence = (companySettings.sequenceStarts.journal || 1) - 1;
    }
    maxSeq = startSequence;

    localTxs.forEach((t) => {
      if (t.sequenceCode && t.sequenceCode.startsWith(`${prefix}-${year}-`)) {
        const parts = t.sequenceCode.split("-");
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    const nextSeqStr = String(maxSeq + 1).padStart(4, "0");
    txData.sequenceCode = `${prefix}-${year}-${nextSeqStr}`;
  }

  // Generate a custom ID for the transaction using sequenceCode
  const generatedTxId =
    txData.sequenceCode ||
    `tx-${Date.now()}-${Math.round(Math.random() * 1000000)}`;

  // 1. Calculate local impact on accounts and update local state instantly
  const localAccounts = getLocalData<Account[]>(
    LOCAL_STORAGE_KEYS.ACCOUNTS,
    [],
  );
  // Find accounts by ID or by Code
  let debitAcc = localAccounts.find(
    (a) => a.id === txData.debitAccountId || a.code === txData.debitAccountId,
  );
  let creditAcc = localAccounts.find(
    (a) => a.id === txData.creditAccountId || a.code === txData.creditAccountId,
  );

  let localUpdated = false;

  if (!debitAcc) {
    debitAcc =
      localAccounts.find(
        (a) => a.id === txData.debitAccountId || a.code === txData.debitAccountId,
      ) ||
      localAccounts.find(
        (a) => a.isTransactional && (a.type === "asset" || a.name?.includes("صندوق")),
      ) ||
      localAccounts.find((a) => a.isTransactional) ||
      localAccounts[0] ||
      null;
  }

  if (!creditAcc) {
    creditAcc =
      localAccounts.find(
        (a) => a.id === txData.creditAccountId || a.code === txData.creditAccountId,
      ) ||
      localAccounts.find(
        (a) =>
          a.isTransactional &&
          (a.type === "liability" ||
            a.type === "revenue" ||
            a.name?.includes("عملاء") ||
            a.name?.includes("زبائن")),
      ) ||
      localAccounts.find((a) => a.isTransactional) ||
      localAccounts[1] ||
      null;
  }

  if (debitAcc) txData.debitAccountId = debitAcc.id;
  if (creditAcc) txData.creditAccountId = creditAcc.id;

  const amountInBase = txData.amount * txData.rate;
  const debitCurr = currencies.find((c) => c.code === debitAcc?.currency) || {
    rateToBase: 1,
  };
  const creditCurr = currencies.find((c) => c.code === creditAcc?.currency) || {
    rateToBase: 1,
  };

  if (debitAcc) {
    const debitImpact = amountInBase * debitCurr.rateToBase;
    if (debitAcc.type === "asset" || debitAcc.type === "expense")
      debitAcc.balance += debitImpact;
    else debitAcc.balance -= debitImpact;
    debitAcc.balance = Number(debitAcc.balance.toFixed(4));
  }

  if (creditAcc) {
    const creditImpact = amountInBase * creditCurr.rateToBase;
    if (
      creditAcc.type === "liability" ||
      creditAcc.type === "equity" ||
      creditAcc.type === "revenue"
    )
      creditAcc.balance += creditImpact;
    else creditAcc.balance -= creditImpact;
    creditAcc.balance = Number(creditAcc.balance.toFixed(4));
  }

  setLocalData(LOCAL_STORAGE_KEYS.ACCOUNTS, localAccounts);

  // 2. Unshift new transaction to local storage
  const newTx = {
    ...txData,
    id: generatedTxId,
    createdAt: new Date().toISOString(),
  };
  localTxs.unshift(newTx as any);
  setLocalData(LOCAL_STORAGE_KEYS.TRANSACTIONS, localTxs);

  // 3. Trigger all React callbacks to instantly render updated state in the frontend
  triggerAllCallbacks();

  if (useLocalFallback) {
    return generatedTxId;
  }

  // 4. Run Firestore transaction in background using serialized queue
  enqueueBackgroundSync(async () => {
    try {
      const txRef = doc(db, "transactions", generatedTxId);
      const debitAccRef = doc(db, "accounts", txData.debitAccountId);
      const creditAccRef = doc(db, "accounts", txData.creditAccountId);

      await runTransaction(db, async (t) => {
        const debitDoc = await t.get(debitAccRef);
        const creditDoc = await t.get(creditAccRef);

        let activeDebit: Account | null = debitDoc.exists()
          ? (debitDoc.data() as Account)
          : null;
        let activeCredit: Account | null = creditDoc.exists()
          ? (creditDoc.data() as Account)
          : null;

        if (debitDoc.exists()) {
          activeDebit = debitDoc.data() as Account;
        }
        if (creditDoc.exists()) {
          activeCredit = creditDoc.data() as Account;
        }

        const cleanTx = sanitizeForFirestore({
          ...txData,
          createdAt: new Date().toISOString(),
        });
        t.set(txRef, cleanTx);

        if (activeDebit) {
          const dCurr = currencies.find(
            (c) => c.code === activeDebit!.currency,
          ) || { rateToBase: 1 };
          const dImpact = amountInBase * dCurr.rateToBase;
          let nDebitBal = activeDebit.balance;
          if (activeDebit.type === "asset" || activeDebit.type === "expense")
            nDebitBal += dImpact;
          else nDebitBal -= dImpact;
          t.update(debitAccRef, { balance: Number(nDebitBal.toFixed(4)) });
        }

        if (activeCredit) {
          const cCurr = currencies.find(
            (c) => c.code === activeCredit!.currency,
          ) || { rateToBase: 1 };
          const cImpact = amountInBase * cCurr.rateToBase;
          let nCreditBal = activeCredit.balance;
          if (
            activeCredit.type === "liability" ||
            activeCredit.type === "equity" ||
            activeCredit.type === "revenue"
          )
            nCreditBal += cImpact;
          else nCreditBal -= cImpact;
          t.update(creditAccRef, { balance: Number(nCreditBal.toFixed(4)) });
        }
      });
      resetErrorCount();
    } catch (err) {
      console.error("Background double-entry transaction sync failed:", err);
      // Retry logic for contention can be added here if needed, but the queue should handle it
      switchToLocalFallback(err);
    }
  });

  return generatedTxId;
}

// Booking Accounting Workflow
export async function processBookingAction(
  action: "SAVE_BOOKING" | "ACCRUE" | "EXECUTE" | "LIQUIDATE",
  booking: Booking,
  currencies: Currency[],
  accounts: Account[],
  settings: any,
  createdBy: string = "System",
) {
  const dates = booking.eventDates || (booking.eventDate ? [booking.eventDate] : []);
  if (dates.some((d: string) => isDateLocked(d))) {
    throw new Error("عذراً، لا يمكن معالجة حجز في تاريخ مقفل.");
  }

  const transactionPromises: Promise<string>[] = [];

  const localTxsList = getLocalData<Transaction[]>(
    LOCAL_STORAGE_KEYS.TRANSACTIONS,
    [],
  );
  const isBookingAlreadyAudited = localTxsList.some((t) => {
    const sId = t.sourceId || "";
    const bId = booking.id;
    const bSeq = booking.sequenceCode;
    return (
      (sId === bId ||
        (bSeq && sId === bSeq) ||
        sId.startsWith(`${bId}-`) ||
        (bSeq && sId.startsWith(`${bSeq}-`))) &&
      t.status === "audited"
    );
  });
  const autoAuditProps: any = isBookingAlreadyAudited
    ? {
        status: "audited",
        auditedBy: createdBy,
        auditedAt: new Date().toISOString(),
        auditNotes: "اعتماد تلقائي تبعاً لاعتماد الحجز",
      }
    : {};

  switch (action) {
    case "SAVE_BOOKING":
      // 1. Deposit
      if (booking.paidAmount > 0) {
        const depositCreditAccount =
          settings.accountsReceivableId ||
          settings.depositCreditAccountId ||
          accounts.find(
            (a) =>
              a.code === "1010301" ||
              a.name === "الزبائن والحجوزات" ||
              (a.name?.includes("عملاء") && !a.name?.includes("خصم")) ||
              a.name?.includes("المدينون"),
          )?.id ||
          "1010301";

        transactionPromises.push(
          addTransactionWithDoubleEntry(
            {
              date: booking.voucherDate || new Date().toISOString(),
              description: `عربون حجز: ${booking.customerName} - ${booking.id}`,
              debitAccountId: settings.cashBankAccountId || "1010101",
              creditAccountId: depositCreditAccount,
              amount: Number(booking.paidAmount) || 0,
              currency: booking.currency,
              rate: 1,
              sourceId: `${booking.id}-deposit`,
              sourceType: "booking",
              createdBy,
              ...autoAuditProps,
              concernedParty: { name: booking.customerName, type: 'client' },
            },
            currencies,
            accounts,
          ),
        );
      }
      // 2. Security/Insurance
      if (booking.insuranceAmount && booking.insuranceAmount > 0) {
        transactionPromises.push(
          addTransactionWithDoubleEntry(
            {
              date: booking.voucherDate || new Date().toISOString(),
              description: `تأمين حجز: ${booking.customerName} - ${booking.id}`,
              debitAccountId: settings.cashBankAccountId || "1010101",
              creditAccountId:
                settings.insuranceCreditAccountId ||
                settings.guaranteeAccountId ||
                "2010202",
              amount: Number(booking.insuranceAmount) || 0,
              currency: booking.currency,
              rate: 1,
              sourceId: `${booking.id}-insurance`,
              sourceType: "booking",
              createdBy,
              ...autoAuditProps,
              concernedParty: { name: booking.customerName, type: 'client' },
            },
            currencies,
            accounts,
          ),
        );
      }
      break;

    case "ACCRUE":
      const currentRate =
        currencies.find((c) => c.code === booking.currency)?.rateToBase || 1;
      const clientAccountId =
        settings.accountsReceivableId ||
        accounts.find(
          (a) =>
            a.code === "1010301" ||
            a.name === "الزبائن والحجوزات" ||
            (a.name?.includes("عملاء") && !a.name?.includes("خصم")) ||
            a.name?.includes("المدينون"),
        )?.id ||
        "1010301";
      const preEventAccId =
        settings.preEventRevenueAccountId ||
        settings.hallRevenueAccountId ||
        "40101";
      const postEventAccId =
        settings.postEventRevenueAccountId ||
        settings.hallRevenueAccountId ||
        "40101";
      const discountDebitAccId =
        settings.discountAccountId ||
        accounts.find(
          (a) =>
            a.code === "40103" ||
            a.name?.includes("خصم") ||
            a.name?.includes("الخصومات"),
        )?.id ||
        "40103";

      const validDays = (booking.days || []).filter(
        (d) => d.status !== "cancelled",
      );

      const servicesRevenueAmount = (booking.additionalServices || []).reduce(
        (sum, s) => {
          const daysCount = s.appliedDates && s.appliedDates.length > 0
            ? s.appliedDates.length
            : validDays.length || 1;
          return sum + (s.cost * daysCount);
        },
        0,
      );


      validDays.forEach((day, index) => {
        const dayDate =
          day.date ||
          booking.voucherDate ||
          new Date().toISOString().split("T")[0];

        let dayTotalContract = Number(day.price || 0);
        let contractDesc = `قيد إثبات إيجار صالة - العميل: ${booking.customerName} - ليوم ${dayDate}`;

        if (index === 0 && servicesRevenueAmount > 0) {
          dayTotalContract += servicesRevenueAmount;
          contractDesc = `قيد إثبات إيجار صالة وخدمات إضافية - العميل: ${booking.customerName} - ليوم ${dayDate}`;
        }

        // A. Generate Discount Transaction per day
        if (Number(day.discount || 0) > 0 && booking.isDiscountApproved) {
          transactionPromises.push(
            addTransactionWithDoubleEntry(
              {
                date: dayDate,
                description: `قيد خصم حجز صالة - العميل: ${booking.customerName} - ليوم ${dayDate}`,
                amount: Number(day.discount || 0),
                currency: booking.currency,
                rate: currentRate,
                sourceType: "booking",
                sourceId: `${booking.id}-discount-day-${index}`,
                debitAccountId: discountDebitAccId,
                creditAccountId: clientAccountId,
                createdBy,
                ...autoAuditProps,
                concernedParty: { name: booking.customerName, type: 'client' },
              },
              currencies,
              accounts,
            ),
          );
        }

        // C. Revenue Realization (Accrual) per day
        if (Number(day.price || 0) > 0) {
          transactionPromises.push(
            addTransactionWithDoubleEntry(
              {
                date: dayDate,
                description: `استحقاق إيجار قاعة: ${booking.customerName} - ليوم ${dayDate}`,
                debitAccountId: clientAccountId,
                creditAccountId:
                  settings.hallRevenueAccountId || preEventAccId,
                amount: Number(day.price || 0),
                currency: booking.currency,
                rate: currentRate,
                sourceId: `${booking.id}-accrue-hall-day-${index}`,
                sourceType: "booking",
                createdBy,
                ...autoAuditProps,
                concernedParty: { name: booking.customerName, type: 'client' },
              },
              currencies,
              accounts,
            ),
          );
        }
      });

      // D. Generate Services Transaction (distribute by appliedDates or first valid day)
      if (servicesRevenueAmount > 0) {
        const serviceTotal = (booking.additionalServices || []).reduce(
          (sum, s) => {
            const daysCount = s.appliedDates && s.appliedDates.length > 0
              ? s.appliedDates.length
              : validDays.length || 1;
            return sum + (s.cost * daysCount);
          },
          0,
        );

        // Group services by date
        const servicesByDate: { [date: string]: number } = {};
        (booking.additionalServices || []).forEach((s) => {
          const dates = s.appliedDates && s.appliedDates.length > 0 ? s.appliedDates : validDays.map(d => d.date);
          dates.forEach(d => {
            if (!servicesByDate[d]) servicesByDate[d] = 0;
            // s.cost is daily, so we just add it to each date it applies to
            servicesByDate[d] += s.cost;
          });
        });

        Object.entries(servicesByDate).forEach(([date, amount]) => {
          if (amount <= 0) return;
          transactionPromises.push(
            addTransactionWithDoubleEntry(
              {
                date: date,
                description: `استحقاق خدمات إضافية: ${booking.customerName} - ليوم ${date}`,
                debitAccountId: clientAccountId,
                creditAccountId:
                  settings.servicesRevenueAccountId || preEventAccId,
                amount: Number(amount),
                currency: booking.currency,
                rate: currentRate,
                sourceId: `${booking.id}-accrue-services-${date}`,
                sourceType: "booking",
                createdBy,
                ...autoAuditProps,
                concernedParty: { name: booking.customerName, type: 'client' },
              },
              currencies,
              accounts,
            ),
          );
        });
      }
      break;

    case "EXECUTE":
      // From Deferred Revenue to Revenue
      // We should transfer the GROSS amount (what was credited to Pre-Event)
      // which is sum(day.price) + sum(service.cost * days)
      const validDaysEx = (booking.days || []).filter(d => d.status !== 'cancelled');
      const sumDaysPrice = validDaysEx.reduce((sum, d) => sum + (Number(d.price) || 0), 0);
      const sumServicesPrice = (booking.additionalServices || []).filter(s => s.status !== 'cancelled').reduce(
        (sum, s) => {
          const daysCount = s.appliedDates && s.appliedDates.length > 0
            ? s.appliedDates.length
            : validDaysEx.length || 1;
          return sum + (s.cost * daysCount);
        },
        0,
      );
      const grossAmount = sumDaysPrice + sumServicesPrice;

      const bookingEventDateRawEx =
        booking.eventDates?.[0] ||
        booking.eventDate ||
        (booking.days && booking.days[0]?.date) ||
        booking.voucherDate ||
        new Date().toISOString();
      const bookingEventDateEx = bookingEventDateRawEx.split("T")[0];

      transactionPromises.push(
        addTransactionWithDoubleEntry(
          {
            date: bookingEventDateEx,
            description: `تحويل إيراد فعالية مكتملة (إقفال إيراد مؤجل): ${booking.customerName} - ${booking.id}`,
            debitAccountId: settings.preEventRevenueAccountId,
            creditAccountId: settings.postEventRevenueAccountId,
            amount: grossAmount > 0 ? grossAmount : (Number(booking.totalPrice) || 0),
            currency: booking.currency,
            rate: 1,
            sourceId: `${booking.id}-execute`,
            sourceType: "booking",
            createdBy,
            ...autoAuditProps,
            concernedParty: { name: booking.customerName, type: 'client' },
          },
          currencies,
          accounts,
        ),
      );
      break;

    case "LIQUIDATE":
      // Handle remaining payments and refund insurance
      // 1. Return Security/Insurance
      if (booking.insuranceAmount && booking.insuranceAmount > 0) {
        transactionPromises.push(
          addTransactionWithDoubleEntry(
            {
              date: booking.voucherDate || new Date().toISOString(),
              description: `رد تأمين حجز: ${booking.customerName} - ${booking.id}`,
              debitAccountId:
                settings.insuranceDebitAccountId || settings.guaranteeAccountId,
              creditAccountId: settings.cashBankAccountId || "acc-1101",
              amount: Number(booking.insuranceAmount) || 0,
              currency: booking.currency,
              rate: 1,
              sourceId: `${booking.id}-liquidate`,
              sourceType: "booking",
              createdBy,
              concernedParty: { name: booking.customerName, type: 'client' },
            },
            currencies,
            accounts,
          ),
        );
      }
      break;
  }

  return Promise.all(transactionPromises);
}

export async function seedInitialDatabaseIfEmpty() {
  const seedData = async () => {
    // Default Roles
    const adminRoleId = "admin";
    const accountantRoleId = "accountant";

    const defaultRoles: Role[] = [
      {
        id: adminRoleId,
        name: "مدير النظام",
        permissions: [
          "view-dashboard",
          "view-accounts",
          "edit-accounts",
          "view-transactions",
          "view-clients",
          "view-employees",
          "view-vouchers",
          "view-halls",
          "view-bookings",
          "view-services",
          "view-tasks",
          "view-currencies",
          "view-insights",
          "manage-users",
          "manage-roles",
          "view-company",
          "view-android",
          "view-windows",
          "view-reports",
        ],
      },
      {
        id: accountantRoleId,
        name: "محاسب",
        permissions: [
          "view-dashboard",
          "view-accounts",
          "view-transactions",
          "view-vouchers",
          "view-clients",
          "view-services",
          "view-tasks",
          "view-currencies",
          "view-reports",
        ],
      },
    ];

    // Default Users
    const defaultUsers: User[] = [
      {
        id: "user1",
        username: "أحمد العلي",
        email: "admin@al-muhasib.com",
        roleId: adminRoleId,
        status: "active",
      },
      {
        id: "user2",
        username: "سارة خالد",
        email: "sara@al-muhasib.com",
        roleId: accountantRoleId,
        status: "active",
      },
    ];

    // Initial Currencies
    const defaultCurrencies: Currency[] = [
      {
        id: "yer",
        code: "YER",
        name: "ريال يمني",
        symbol: "﷼",
        isBase: true,
        rateToBase: 1,
      },
      {
        id: "usd",
        code: "USD",
        name: "دولار أمريكي",
        symbol: "$",
        isBase: false,
        rateToBase: 0.004,
      },
      {
        id: "sar",
        code: "SAR",
        name: "ريال سعودي",
        symbol: "ر.س",
        isBase: false,
        rateToBase: 0.015,
      },
    ];

    // Initial Chart of Accounts (Default Accounts)
    const defaultAccounts = SEEDABLE_DEFAULT_ACCOUNTS;

    // Initial Booking Settings
    const defaultBookingSettings: BookingSettings = {
      id: "default-settings",
      periods: [
        {
          id: "morning",
          name: "الفترة الصباحية",
          startTime: "09:00",
          endTime: "15:00",
        },
        {
          id: "evening",
          name: "الفترة المسائية",
          startTime: "16:00",
          endTime: "23:00",
        },
        {
          id: "night",
          name: "الفترة الليلية",
          startTime: "01:00",
          endTime: "08:00",
        },
      ],
      defaultServices: [
        { name: "ضيافة شاي وقهوة", cost: 15000 },
        { name: "بخور وعطور فاخرة", cost: 10000 },
        { name: "تجهيز صوتيات وشاشات", cost: 25000 },
        { name: "تنظيف وتعقيم الصالة", cost: 12000 },
      ],
      defaultStatus: "pending",
      defaultCurrency: "YER",
      policyNotes: [
        "يحق للطرف الأول إلغاء الحجز في حال عدم استكمال الدفعات قبل موعد الفعالية بـ 72 ساعة.",
        "لا تقع المسؤولية على الطرف الأول عن فقدان الممتلكات الشخصية لرواد الفعالية أو المدعوين.",
        "يعتبر التوقيت والجدولة الزمنية المتفق عليها معتمداً ونهائياً للطرفين.",
      ],
      updatedAt: new Date().toISOString(),
    };

    const defaultLinkedAccounts: LinkedAccounts = {
      id: "default",
      preEventRevenueAccountId: "40101",
      postEventRevenueAccountId: "40101",
      discountAccountId: "40103",
      accountsReceivableId: "1010301",
      guaranteeAccountId: "2010202",
      bookingMortgageAccountId: "2010203",
      cashBankAccountId: "1010101",
      hallRevenueAccountId: "40101",
      servicesRevenueAccountId: "40102",
      finesAccountId: "40104",
      updatedAt: new Date().toISOString(),
    };

    if (useLocalFallback) {
      const existingUsers = getLocalData(LOCAL_STORAGE_KEYS.USERS, []);
      if (existingUsers.length === 0) {
        setLocalData(LOCAL_STORAGE_KEYS.ROLES, defaultRoles);
        setLocalData(LOCAL_STORAGE_KEYS.USERS, defaultUsers);
        setLocalData(LOCAL_STORAGE_KEYS.CURRENCIES, defaultCurrencies);
        setLocalData(LOCAL_STORAGE_KEYS.BOOKING_SETTINGS, [
          defaultBookingSettings,
        ]);
        setLocalData(LOCAL_STORAGE_KEYS.LINKED_ACCOUNTS, [
          defaultLinkedAccounts,
        ]);
        triggerAllCallbacks();
      }
      return;
    }

    try {
      console.log("Checking database initialization status...");
      try {
        const usersSnap = await getDocs(collection(db, "app_users"));
        if (!usersSnap.empty) {
          // Seeding update for existing databases
          const notifSnap = await getDocs(collection(db, "notification_settings"));
          if (notifSnap.empty) {
            console.log("Seeding notification settings online for existing database...");
            const batch = writeBatch(db);
            DEFAULT_NOTIFICATION_SETTINGS.forEach((setting) => {
              const { id, ...data } = setting;
              batch.set(doc(db, "notification_settings", id), data);
            });
            await batch.commit();
            console.log("Notification settings seeded online.");
          }
          return;
        }
      } catch (err) {
        console.error("Error reading app_users collection:", err);
        throw err; // Re-throw to be caught by the outer catch
      }

      console.log("Starting batch write (without auto-seeding accounts)...");
      const batch = writeBatch(db);

      const rolesRef = collection(db, "app_roles");
      defaultRoles.forEach((role) => {
        const { id, ...data } = role;
        batch.set(doc(rolesRef, id), data);
      });

      const usersRef = collection(db, "app_users");
      defaultUsers.forEach((user) => {
        const { id, ...data } = user;
        batch.set(doc(usersRef, id), data);
      });

      const curRef = collection(db, "currencies");
      defaultCurrencies.forEach((curr) => {
        const { id, ...data } = curr;
        batch.set(doc(curRef, id), data);
      });

      // NOTE: Accounts auto-seeding disabled by user preference
      // Accounts are only created when manually added by the user in Accounts Tree

      const settingsRef = collection(db, "booking_settings");
      const { id: sId, ...sData } = defaultBookingSettings;
      batch.set(doc(settingsRef, sId), sData);

      const linkedAccsRef = collection(db, "linked_accounts");
      const { id: laId, ...laData } = defaultLinkedAccounts;
      batch.set(doc(linkedAccsRef, laId), laData);

      const notifRef = collection(db, "notification_settings");
      DEFAULT_NOTIFICATION_SETTINGS.forEach((setting) => {
        const { id, ...data } = setting;
        batch.set(doc(notifRef, id), data);
      });

      console.log("Committing batch...");
      await batch.commit();
      console.log("Batch committed successfully.");
    } catch (err: any) {
      console.error("Seeding failed in catch block:", err);
      toast.error(`Seeding failed: ${err.message || err}`);
      if (err.code) console.error("Error code:", err.code);
      if (err.message) console.error("Error message:", err.message);
      switchToLocalFallback();
      // Retry seeding local
      setLocalData(LOCAL_STORAGE_KEYS.ROLES, defaultRoles);
      setLocalData(LOCAL_STORAGE_KEYS.USERS, defaultUsers);
      setLocalData(LOCAL_STORAGE_KEYS.CURRENCIES, defaultCurrencies);
      setLocalData(LOCAL_STORAGE_KEYS.ACCOUNTS, defaultAccounts);
      setLocalData(LOCAL_STORAGE_KEYS.BOOKING_SETTINGS, [
        defaultBookingSettings,
      ]);
      setLocalData(LOCAL_STORAGE_KEYS.LINKED_ACCOUNTS, [
        defaultLinkedAccounts,
      ]);
      triggerAllCallbacks();
    }
  };

  await seedData();
}

export const updateAccountSubscription = (id: string, updates: Partial<AccountNotificationSubscription>) =>
  genericUpdate<AccountNotificationSubscription>(
    "account_notification_subscriptions",
    id,
    updates,
    LOCAL_STORAGE_KEYS.ACCOUNT_SUBSCRIPTIONS,
    accountSubscriptionsCallbacks,
  );

export const addAccountSubscription = (item: Omit<AccountNotificationSubscription, "id">) =>
  genericAdd<AccountNotificationSubscription>(
    "account_notification_subscriptions",
    item,
    LOCAL_STORAGE_KEYS.ACCOUNT_SUBSCRIPTIONS,
    accountSubscriptionsCallbacks,
  );
