/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type AccountClassification = 'cashbox' | 'client' | 'supplier' | 'employee' | 'operating_expense' | 'general_expense' | 'cost' | 'revenue' | 'general';
export type AccountCategory = 'cash' | 'client' | 'supplier' | 'employee' | 'expense' | 'revenue' | 'general';
export type AccountStatus = 'active' | 'suspended' | 'reports_only';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  balance: number;
  currency: string; // e.g. 'USD', 'EUR', 'SYP', 'SAR'
  notes?: string;
  isTransactional: boolean;
  classification?: AccountClassification;
  category?: AccountCategory;
  status?: AccountStatus;
  createdAt: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  rateToBase: number; // exchange rate relative to USD (which is base, rate = 1)
  isBase: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  linkedAccountId: string | null;
  createdAt: string;
}

export interface Transaction {
  id: string;
  sequenceCode?: string; // e.g. JRN-2026-0001
  manualNumber?: string; // Manual document number (رقم السند اليدوي / الدفتري)
  date: string;
  voucherDate?: string; // New: Voucher date separate from registration
  description: string;
  debitAccountId: string;  // Account debited (Receiving value)
  creditAccountId: string; // Account credited (Giving value)
  amount: number;          // Transaction amount in transaction's currency
  baseAmount?: number;     // Equivalent in base currency (amount * rate)
  currency: string;        // Currency of the transaction
  rate: number;            // Exchange rate of transaction's currency to base
  sourceId?: string;       // Unique ID of the source document (booking, voucher, etc.)
  sourceType?: 'booking' | 'voucher' | 'receipt' | 'payment' | 'payroll';
  linkedBookingId?: string; // Linked booking ID for vouchers and transaction tracing
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  status?: 'pending_audit' | 'audited' | 'rejected'; // CFO audit status
  auditNotes?: string;
  auditedBy?: string;
  auditedAt?: string;
  concernedParty?: { name: string; type: 'client' | 'employee' | 'other' };
}

export interface SmartInsight {
  id: string;
  title: string;
  content: string;
  type: 'warning' | 'info' | 'success';
  date: string;
}

export interface Hall {
  id: string;
  name: string;
  capacity: number;
  price: number;
  currency: string;
  location: string;
  features: string[];
  status: 'active' | 'maintenance' | 'inactive';
  notes?: string;
  createdAt: string;
  eventPrices?: { eventType: string; price: number }[]; // Optional custom pricing by event type
}

export interface Booking {
  id: string;
  sequenceCode?: string; // e.g. BOK-2026-0001
  manualNumber?: string; // Manual document number (رقم السند اليدوي / الدفتري)
  hallId: string;
  voucherDate?: string; // New: Voucher date separate from registration
  customerName: string;
  customerPhone: string;
  eventType?: string;
  eventDates?: string[];
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  days: {
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    discount: number;
    eventType?: string;
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  }[];
  additionalServices: { name: string; cost: number; appliedDates?: string[]; status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' }[];
  period: 'morning' | 'evening' | 'night';
  totalPrice: number; // Net amount after discount (Contract value)
  totalDiscount?: number; // Discount amount
  paidAmount: number; // This acts as the deposit amount (العربون)
  subsequentPayments?: number; // New: subsequent collections/payments
  mortgageAmount: number; // New: Guarantees/Mortgage
  mortgageStatus: 'pending' | 'held' | 'returned' | 'forfeited'; // New
  pledgeStatus?: 'pending' | 'held' | 'returned' | 'forfeited'; // New: Physical pledge status
  insuranceAmount?: number; // New: Insurance security deposit amount (مبلغ التأمين)
  pledgesDescription?: string; // New: Pledges / Collaterals description (الرهونات)
  pledgeImage?: string; // New: Pledge/mortgage attachment image (صورة الرهن)
  customerIdType?: string; // New: نوع الهوية
  customerIdNumber?: string; // New: رقم الهوية
  customerIdIssueDate?: string; // New: تاريخ إصدار الهوية
  customerIdExpiryDate?: string; // New: تاريخ انتهاء الهوية
  customerIdIssuePlace?: string; // New: جهة إصدار الهوية
  customerIdFrontImage?: string; // New: صورة الهوية الأمامية
  customerIdBackImage?: string; // New: صورة الهوية الخلفية
  currency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  revenueAccrued?: boolean;
  insuranceRefunded?: boolean;
  depositRefunded?: boolean;
  depositRefundedAmount?: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  linkedTransactionId?: string | null;
  brokerId?: string | null;
  brokerName?: string;
  guarantorId?: string | null;
  guarantorName?: string;
  isDiscountApproved?: boolean;
}

export interface AccountingConfig {
  accountsReceivableId: string;
  deferredRevenueId: string;
  cashBankAccountId: string;
  refundableDepositAccountId: string; // Used for Mortgages/Guarantees
  discountAccountId: string; // New: Discount account
  preEventRevenueAccountId: string; // New: Pre-event revenue
  postEventRevenueAccountId: string; // New: Post-event revenue
  createdAt: string;
}
export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  linkedAccountId: string; // Every client has a ledger account
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  phone: string;
  salary: number;
  currency: string;
  linkedAccountId: string; // For salary tracking
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  standardCost?: number; // New: standard cost of the service
  currency: string;
  category: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  roleId: string;
  status: 'active' | 'suspended';
  lastLogin?: string;
  linkedCashboxIds?: string[];
  defaultCashboxId?: string; // New: Default cash account for this user
  linkedEmployeeId?: string;
  allowedAccountIds?: string[];
  password?: string; // Password for authentication
}

export interface Role {
  id: string;
  name: string;
  permissions: string[]; // List of allowed view IDs or specific actions
}

export interface ReceiptPayment {
  id: string;
  sequenceCode?: string; // e.g. REC-2026-0001 or PAY-2026-0001
  manualNumber?: string; // Manual document number (رقم السند اليدوي / الدفتري)
  type: 'receipt' | 'payment';
  date: string;
  voucherDate?: string; // New: Voucher date separate from registration
  amount: number;
  currency: string;
  fromToAccountId: string;
  cashBankAccountId: string;
  customerName?: string;
  description: string;
  note?: string;
  linkedBookingId?: string;
  linkedTransactionId?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  entries?: MultiReceiptPaymentEntry[];
  totalAmount?: number;
  concernedParty?: { name: string; type: 'client' | 'employee' | 'other' };
}

export interface MultiReceiptPaymentEntry {
  accountId: string;
  amount: number;
  description: string;
}

export interface MultiReceiptPayment {
  id: string;
  sequenceCode?: string;
  manualNumber?: string; // Manual document number (رقم السند اليدوي / الدفتري)
  type: 'receipt' | 'payment';
  date: string;
  voucherDate?: string; // New: Voucher date separate from registration
  currency: string;
  cashBankAccountId: string;
  entries: MultiReceiptPaymentEntry[];
  totalAmount: number;
  description: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CompanySettings {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxNumber?: string;
  crNumber?: string; // Commercial Registration
  notes?: string;
  sequenceStarts?: {
    journal: number;
    receipt: number;
    payment: number;
    booking: number;
  };
  offlineAllowedTasks?: string[];
  updatedAt: string;
}

export interface AuthorizedDevice {
  id: string; // The UUID or local key
  deviceName: string; // e.g. Admin Desktop, Osama's iPhone
  deviceType: string; // desktop, mobile, tablet
  userAgent: string;
  isAuthorized: boolean;
  registeredAt: string;
  lastActive: string;
  requestIp?: string;
  adminNotes?: string;
  hardwareSpecs?: string;
  canvasHash?: string;
  securityLevel?: string;
  tamperCount?: number;
  os?: string;
  browser?: string;
  allowedUserIds?: string[];
}

export interface Broker {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface Guarantor {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export interface BookingPeriod {
  id: string;
  name: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "15:00"
}

export interface BookingSettings {
  id: string;
  periods: BookingPeriod[];
  defaultServices: { name: string; cost: number }[];
  defaultStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  defaultCurrency: string;
  policyNotes?: string[];
  eventTypes?: string[]; // New: Customizable list of event types (e.g., زواج, عزاء)
  // New control settings
  lockTransactionDate?: boolean;
  lockBookingAmounts?: boolean;
  lockBookingDetailsAfterSave?: boolean;
  updatedAt: string;
}

export interface LinkedAccounts {
  id: string;
  preEventRevenueAccountId: string;
  postEventRevenueAccountId: string;
  discountAccountId: string;
  accountsReceivableId: string;
  guaranteeAccountId: string;
  bookingMortgageAccountId: string;
  cashBankAccountId: string;
  hallRevenueAccountId: string;
  servicesRevenueAccountId: string;
  finesAccountId: string;
  employeeParentAccountId?: string;
  updatedAt: string;
}

export interface RecurringJournalEntry {
  id: string;
  title: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  currency: string;
  rate: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  lastExecutedAt?: string;
  nextExecutionDate: string;
  isActive: boolean;
  description: string;
  createdAt: string;
  isMultiAccount?: boolean;
  debitEntries?: { accountId: string; amount: number; description?: string }[];
  creditEntries?: { accountId: string; amount: number; description?: string }[];
}

export interface EmployeePayrollRecord {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  currency: string;
  allowances: number; // بدلات
  deductions: number; // استقطاعات / خصومات
  netSalary: number; // الصافي
  notes?: string;
}

export interface EmployeePayrollSheet {
  id: string;
  month: string; // e.g., "2026-06"
  status: 'draft' | 'approved' | 'paid';
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  paidBy?: string;
  notes?: string;
  records: EmployeePayrollRecord[];
  createdAt: string;
}

export interface StandardCostTemplate {
  id: string;
  hallId?: string; // Optional: specific to a hall
  serviceId?: string; // Optional: specific to a service
  eventType?: string; // Optional: specific to an event type (wedding, funeral, etc.)
  items: {
    name: string; // e.g., "أعمال النظافة", "كهرباء وديزل", "تغذية وضيافة", "أجور عمال"
    standardCost: number;
    accountId?: string; // Linked financial account
  }[];
  totalStandardCost: number;
  currency: string;
  createdAt: string;
}

export interface BookingActualCost {
  id: string;
  bookingId: string;
  items: {
    name: string;
    actualCost: number;
    accountId?: string; // Linked financial account
    notes?: string;
  }[];
  totalActualCost: number;
  createdAt: string;
}

export interface CostItem {
  id: string;
  name: string;
  defaultStandardCost?: number;
  accountId?: string; // Optional default linked financial account
  createdAt: string;
}

export interface DepositRefundRequest {
  id: string;
  sequenceCode?: string; // e.g. DRR-2026-0001
  bookingId: string;
  bookingCode?: string;
  customerName: string;
  customerPhone?: string;
  hallId: string;
  depositAmount: number; // original deposit amount (paidAmount)
  requestedAmount: number; // amount requested to be refunded
  justification: string; // مبررات الطلب
  status: 'pending' | 'approved' | 'rejected';
  fineAmount?: number; // مبلغ الغرامة
  refundableAmount?: number; // مبلغ العربون الواجب رده
  cancelBooking?: boolean; // هل يتم إلغاء الحجز
  cancelledDayDates?: string[]; // New: dates of specific days to cancel
  cancelledServices?: { serviceName: string; dates: string[] }[]; // New: granular service cancellation
  approvedAmount?: number; // المبلغ الموافق عليه
  managerNotes?: string; // ملاحظات المدير
  createdBy: string; // اسم المختص مقدم الطلب
  approvedBy?: string; // اسم صاحب الصلاحية
  approvedAt?: string;
  refunded?: boolean;
  refundVoucherId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LockedDate {
  id: string; // date string yyyy-mm-dd
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
}

export interface BookingAmendmentRequest {
  id: string;
  sequenceCode?: string; // e.g. BAR-2026-0001
  bookingId: string;
  bookingCode?: string;
  reason: string;
  requestedChanges: {
    newDate?: string;
    newDates?: string[];
    newStartTime?: string;
    newEndTime?: string;
    newAdditionalServices?: { name: string; cost: number; appliedDates?: string[] }[];
    notes?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  managerNotes?: string; // ملاحظات صاحب الصلاحية
  requestedBy: string; // اسم المختص مقدم الطلب
  approvedBy?: string; // اسم صاحب الصلاحية
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BookingDiscountRequest {
  id: string;
  sequenceCode?: string; // e.g. BDR-2026-0001
  bookingId: string;
  bookingCode?: string;
  customerName: string;
  totalDiscount: number;
  daysDiscounts: { date: string; discount: number }[];
  discountReason: string;
  status: 'pending' | 'approved' | 'rejected';
  managerNotes?: string;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  status: 'unread' | 'read';
  targetView?: string;
  targetId?: string;
  targetCode?: string;
}

export interface NotificationSetting {
  id: string;
  title: string;
  pwaEnabled: boolean;
  inAppEnabled: boolean;
  customTitle: string;
  customBody: string;
  targetUserIds?: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface ManualNotification {
  id: string;
  title: string;
  body: string;
  type: 'congratulations' | 'meeting' | 'work_hours' | 'holiday' | 'other';
  senderId: string;
  senderName: string;
  targetUserIds: string[]; // Empty means sent to all users
  createdAt: string;
  scheduledAt?: string; // ISO string for future schedule
  status?: 'sent' | 'scheduled' | 'canceled';
}

export interface AccountNotificationSubscription {
  id: string;
  userId: string;
  accountIds: string[];
}



