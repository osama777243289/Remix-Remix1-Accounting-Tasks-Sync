import React, { useState, useMemo, useEffect } from "react";
import { Account, Currency, Transaction, CompanySettings, Client, Booking, ReceiptPayment } from "../types";
import { 
  Search, 
  Calendar, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Sliders, 
  Filter, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  X, 
  ChevronDown, 
  BookOpen,
  Calculator,
  ArrowRightLeft,
  Users,
  XCircle,
  CheckCircle,
  Activity,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

const normalizeArabic = (str: string): string => {
  if (!str) return "";
  return str
    .trim()
    .replace(/\u0640/g, "") // Remove Tatweel (Kashida)
    .replace(/[أإآءئؤ]/g, "ا") // Replace all Alef variations and Hamzas
    .replace(/ة/g, "ه") // Replace Teh Marbuta with Heh
    .replace(/[ىي]/g, "ي") // Normalize Alef Maksura and Yeh
    .replace(/[\u064B-\u065F\u0670]/g, "") // Remove all Arabic diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Clean punctuation to space
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .toLowerCase();
};

const cleanPhoneNumber = (phone: string): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("967") && digits.length >= 10) {
    return digits.slice(3);
  }
  if (digits.startsWith("0") && digits.length >= 8) {
    return digits.slice(1);
  }
  return digits;
};

const namesMatch = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  const n1 = normalizeArabic(name1).trim();
  const n2 = normalizeArabic(name2).trim();
  if (n1 === n2) return true;

  // Compare compact strings without spaces (e.g. عبدالله vs عبد الله)
  const compact1 = n1.replace(/\s+/g, "");
  const compact2 = n2.replace(/\s+/g, "");
  if (compact1 === compact2) return true;

  // Remove "بن" or "ابن" variations (e.g. محمد بن أحمد vs محمد أحمد)
  const clean1 = n1.replace(/\bا?بن\b/g, "").replace(/\s+/g, " ").trim();
  const clean2 = n2.replace(/\bا?بن\b/g, "").replace(/\s+/g, " ").trim();
  if (clean1 === clean2 && clean1.length >= 3) return true;

  return false;
};

const extractCustomerFromDesc = (desc: string): string => {
  if (!desc) return "";
  const norm = normalizeArabic(desc);

  // Pattern 1: العميل: [اسم العميل]
  const matchClient = norm.match(/العميل\s*:\s*([^|\-\n\r]+)/);
  if (matchClient && matchClient[1]) {
    return matchClient[1].trim();
  }

  // Pattern 2: (عربون حجز | تأمين حجز | استحقاق إيجار قاعة | رد تأمين حجز | خصم حجز | قيد إثبات إيجار صالة): [اسم العميل]
  const matchPrefix = norm.match(/(?:عربون حجز|تأمين حجز|استحقاق إيجار قاعة|رد تأمين حجز|خصم حجز|قيد إثبات إيجار صالة)\s*:\s*([^|\-\n\r]+)/);
  if (matchPrefix && matchPrefix[1]) {
    return matchPrefix[1].trim();
  }

  return "";
};

interface AccountStatementProps {
  accounts: Account[];
  transactions: Transaction[];
  currencies: Currency[];
  vouchers?: ReceiptPayment[];
  globalCurrencyCode: string;
  companySettings: CompanySettings | null;
  setPrintData: (data: any) => void;
  initialAccountId?: string | null;
  initialClientIds?: string[] | null;
  onClearInitialAccount?: () => void;
  onClearInitialClients?: () => void;
  clients?: Client[];
  bookings?: Booking[];
  preFilledCustomerName?: string;
  onClose?: () => void;
}

export default function AccountStatement({
  accounts,
  transactions,
  currencies,
  vouchers = [],
  globalCurrencyCode,
  companySettings,
  setPrintData,
  initialAccountId,
  initialClientIds,
  onClearInitialAccount,
  onClearInitialClients,
  clients = [],
  bookings = [],
  preFilledCustomerName,
  onClose
}: AccountStatementProps) {
  // Select account state
  const [selectedAccId, setSelectedAccId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpenSelector, setIsOpenSelector] = useState(false);
  const [onlyActiveAccounts, setOnlyActiveAccounts] = useState<boolean>(true);

  // Set of account IDs that have transactions or non-zero balance
  const accountsWithActivity = useMemo(() => {
    const active = new Set<string>();
    (transactions || []).forEach((tx) => {
      if (tx.debitAccountId) active.add(tx.debitAccountId);
      if (tx.creditAccountId) active.add(tx.creditAccountId);
    });
    accounts.forEach((acc) => {
      if (Math.abs(acc.balance || 0) > 0.001) {
        active.add(acc.id);
        if (acc.code) active.add(acc.code);
      }
    });
    return active;
  }, [transactions, accounts]);

  // Client filter state
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientSelectorOpen, setIsClientSelectorOpen] = useState(false);

  // Date filters state
  const [fromDate, setFromDate] = useState<string>(() => {
    const now = new Date();
    // Default to start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return startOfMonth.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Currency view filter state
  // 'account' means showing native currency of the account, otherwise convert to specific currency
  const [currencyView, setCurrencyView] = useState<string>("account");

  // Load initial account and clients if provided
  useEffect(() => {
    if (initialAccountId) {
      const targetAcc = accounts.find(a => a.id === initialAccountId || a.code === initialAccountId);
      if (targetAcc) {
        setSelectedAccId(targetAcc.id);
      } else {
        setSelectedAccId(initialAccountId);
      }
      if (onClearInitialAccount) {
        onClearInitialAccount();
      }
    } else if (!selectedAccId && accounts.length > 0) {
      // Default to first active transactional account if available
      const firstActiveAcc = accounts.find(
        (a) =>
          (accountsWithActivity.has(a.id) ||
            (a.code && accountsWithActivity.has(a.code))) &&
          !accounts.some((child) => child.parentId === a.id)
      );
      if (firstActiveAcc) {
        setSelectedAccId(firstActiveAcc.id);
      } else {
        const firstTxAcc = accounts.find(
          (a) => !accounts.some((child) => child.parentId === a.id)
        );
        if (firstTxAcc) {
          setSelectedAccId(firstTxAcc.id);
        }
      }
    }

    if (initialClientIds !== undefined || preFilledCustomerName) {
      let ids = [...(initialClientIds || [])];
      if (preFilledCustomerName) {
        ids.push(`temp-name-${preFilledCustomerName}`);
      }
      // Deduplicate tags
      const uniqueIds = Array.from(new Set(ids));
      setSelectedClientIds(uniqueIds);
      if (onClearInitialClients) {
        onClearInitialClients();
      }
    }

    // Expand date range to cover all transactions (including future event dates) when opening from booking or client card
    if (initialAccountId || initialClientIds?.length || preFilledCustomerName) {
      setFromDate("2020-01-01");
      setToDate("2030-12-31");
      if (!initialAccountId && (initialClientIds?.length || preFilledCustomerName)) {
        setSelectedAccId("all");
      }
    }
  }, [initialAccountId, initialClientIds, accounts, onClearInitialAccount, onClearInitialClients, preFilledCustomerName]);

  const isAllAccounts = selectedAccId === "all";

  // Find currently selected account object
  const selectedAccount = useMemo(() => {
    if (isAllAccounts) {
      return {
        id: "all",
        code: "ALL",
        name: selectedClientIds.length > 0 ? "كافة الحسابات (كشف شامل لكافة حركات العميل)" : "كافة الحسابات المالية (كشف شامل)",
        type: "asset" as const,
        parentId: null,
        balance: 0,
        currency: globalCurrencyCode,
        isTransactional: true,
        createdAt: ""
      };
    }
    return accounts.find(a => a.id === selectedAccId) || null;
  }, [accounts, selectedAccId, isAllAccounts, selectedClientIds, globalCurrencyCode]);

  const allCustomers = useMemo(() => {
    const list = [...(clients || [])];
    const existingNames = new Set(list.map(c => normalizeArabic(c.name || "")));
    (bookings || []).forEach(b => {
      const normBName = normalizeArabic(b.customerName || "");
      if (normBName && !existingNames.has(normBName)) {
        existingNames.add(normBName);
        list.push({
          id: `booking-cust-${b.customerName.trim()}`,
          name: b.customerName.trim(),
          phone: b.customerPhone || '',
          linkedAccountId: (b as any).clientAccountId || '',
          createdAt: b.createdAt || new Date().toISOString()
        } as any);
      }
    });
    return list;
  }, [clients, bookings]);

  // Comprehensive lookup profile for selected clients
  const clientInfo = useMemo(() => {
    if (selectedClientIds.length === 0) return null;

    const namesSet = new Set<string>();
    const compactNamesSet = new Set<string>();
    const phonesSet = new Set<string>();
    const dedicatedAccountIds = new Set<string>();
    const bookingIdsSet = new Set<string>();
    const bookingSeqSet = new Set<string>();
    const voucherIdsSet = new Set<string>();
    const voucherSeqSet = new Set<string>();

    selectedClientIds.forEach(cid => {
      // 1. Direct client object or booking-cust object
      const client = clients.find(c => c.id === cid) || allCustomers.find(c => c.id === cid);
      const rawName = cid.startsWith("booking-cust-")
        ? cid.replace("booking-cust-", "")
        : cid.startsWith("temp-name-")
        ? cid.replace("temp-name-", "")
        : cid.startsWith("booking-exact-")
        ? (bookings.find(b => b.id === cid.replace("booking-exact-", ""))?.customerName || "")
        : client?.name || "";

      if (rawName) {
        const norm = normalizeArabic(rawName);
        if (norm) {
          namesSet.add(norm);
          compactNamesSet.add(norm.replace(/\s+/g, ""));
        }
      }

      const clientPhoneClean = cleanPhoneNumber(client?.phone || "");
      if (clientPhoneClean.length >= 6) {
        phonesSet.add(clientPhoneClean);
      }

      // If client has a dedicated ledger account (not a shared control account)
      if (client?.linkedAccountId && !["1010101", "1010301", "40101", "2010201", "2010202"].includes(client.linkedAccountId)) {
        dedicatedAccountIds.add(client.linkedAccountId);
      }

      // Check any chart of account whose name strictly matches client
      if (rawName) {
        const norm = normalizeArabic(rawName);
        accounts.forEach(acc => {
          const normAcc = normalizeArabic(acc.name || "");
          if (normAcc === norm || (norm.length >= 5 && normAcc === norm)) {
            dedicatedAccountIds.add(acc.id);
            if (acc.code) dedicatedAccountIds.add(acc.code);
          }
        });
      }

      // 1. Find matching bookings
      (bookings || []).forEach(b => {
        const bPhoneClean = cleanPhoneNumber(b.customerPhone || "");
        const isBookingMatch = 
          (cid.startsWith("booking-exact-") && cid.replace("booking-exact-", "").toLowerCase() === b.id.toLowerCase()) ||
          ((b as any).clientId && (b as any).clientId === cid) ||
          namesMatch(rawName, b.customerName || "") ||
          (clientPhoneClean.length >= 6 && bPhoneClean.length >= 6 && (clientPhoneClean === bPhoneClean || clientPhoneClean.endsWith(bPhoneClean) || bPhoneClean.endsWith(clientPhoneClean)));

        if (isBookingMatch) {
          if (b.id) bookingIdsSet.add(b.id.toLowerCase());
          if (b.sequenceCode) bookingSeqSet.add(b.sequenceCode.toLowerCase());
          if (b.manualNumber) bookingSeqSet.add(b.manualNumber.toLowerCase());
          if (b.customerName) {
            const bNorm = normalizeArabic(b.customerName);
            namesSet.add(bNorm);
            compactNamesSet.add(bNorm.replace(/\s+/g, ""));
          }
          if (bPhoneClean.length >= 6) phonesSet.add(bPhoneClean);
          if ((b as any).clientAccountId && !["1010101", "1010301", "40101", "2010201", "2010202"].includes((b as any).clientAccountId)) {
            dedicatedAccountIds.add((b as any).clientAccountId);
          }
        }
      });

      // 2. Find matching vouchers
      (vouchers || []).forEach(v => {
        const vPhoneClean = cleanPhoneNumber((v as any).customerPhone || (v as any).phone || "");
        const isVoucherMatch =
          ((v as any).clientId && (v as any).clientId === cid) ||
          (v.linkedBookingId && bookingIdsSet.has(v.linkedBookingId.toLowerCase())) ||
          namesMatch(rawName, v.customerName || "") ||
          (clientPhoneClean.length >= 6 && vPhoneClean.length >= 6 && (clientPhoneClean === vPhoneClean || clientPhoneClean.endsWith(vPhoneClean) || vPhoneClean.endsWith(clientPhoneClean)));

        if (isVoucherMatch) {
          if (v.id) voucherIdsSet.add(v.id.toLowerCase());
          if (v.sequenceCode) voucherSeqSet.add(v.sequenceCode.toLowerCase());
          if (v.manualNumber) voucherSeqSet.add(v.manualNumber.toLowerCase());
          if (v.customerName) {
            const vNorm = normalizeArabic(v.customerName);
            namesSet.add(vNorm);
            compactNamesSet.add(vNorm.replace(/\s+/g, ""));
          }
        }
      });
    });

    return {
      names: Array.from(namesSet),
      compactNames: Array.from(compactNamesSet),
      phones: Array.from(phonesSet),
      dedicatedAccountIds,
      bookingIds: bookingIdsSet,
      bookingSeqs: bookingSeqSet,
      voucherIds: voucherIdsSet,
      voucherSeqs: voucherSeqSet
    };
  }, [selectedClientIds, clients, allCustomers, accounts, bookings, vouchers]);

  // Force target currency code to global base currency
  const displayCurrency = globalCurrencyCode;

  // Conversion helper
  const getConvertedAmount = (amount: number, fromCode: string, toCode: string): number => {
    if (fromCode === toCode) return amount;
    const fromCurr = currencies.find(c => c.code === fromCode);
    const toCurr = currencies.find(c => c.code === toCode);
    if (!fromCurr || !toCurr) return amount;
    
    const amountInBase = amount * fromCurr.rateToBase;
    return amountInBase / toCurr.rateToBase;
  };

  // Quick date ranges handlers
  const handleQuickDate = (range: 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'all') => {
    const today = new Date();
    if (range === 'today') {
      const dayStr = today.toISOString().split("T")[0];
      setFromDate(dayStr);
      setToDate(dayStr);
    } else if (range === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const dayStr = yesterday.toISOString().split("T")[0];
      setFromDate(dayStr);
      setToDate(dayStr);
    } else if (range === 'thisMonth') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(startOfMonth.toISOString().split("T")[0]);
      setToDate(today.toISOString().split("T")[0]);
    } else if (range === 'lastMonth') {
      const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(firstOfLastMonth.toISOString().split("T")[0]);
      setToDate(lastOfLastMonth.toISOString().split("T")[0]);
    } else if (range === 'all') {
      setFromDate("2020-01-01");
      setToDate("2030-12-31");
    }
  };

  // Filter and compute transactions list with running balance
  const ledgerData = useMemo(() => {
    if (!selectedAccount) return { openingBalance: 0, movements: [], totalDebit: 0, totalCredit: 0, closingBalance: 0 };

    const accId = selectedAccount.id;
    const accType = selectedAccount.type;
    const isDebitNormal = accType === 'asset' || accType === 'expense';

    // Helper to check if transaction matches client filter
    const matchesClient = (t: Transaction) => {
      if (!clientInfo) return true;

      // 1. Direct dedicated client account match (if any dedicated sub-account exists)
      if (clientInfo.dedicatedAccountIds.size > 0) {
        if (t.debitAccountId && clientInfo.dedicatedAccountIds.has(t.debitAccountId)) return true;
        if (t.creditAccountId && clientInfo.dedicatedAccountIds.has(t.creditAccountId)) return true;
      }

      // 2. Direct client ID match
      if ((t as any).clientId && selectedClientIds.includes((t as any).clientId)) return true;
      if ((t as any).customerId && selectedClientIds.includes((t as any).customerId)) return true;

      // 3. Linked Booking ID match
      const tLinkedBookingId = (((t as any).linkedBookingId || (t as any).bookingId || "")).toLowerCase();
      if (tLinkedBookingId && clientInfo.bookingIds.has(tLinkedBookingId)) return true;

      // 4. Source ID match
      const tSourceId = (t.sourceId || "").toLowerCase();
      if (tSourceId) {
        // Direct voucher ID match
        if (clientInfo.voucherIds.has(tSourceId)) return true;

        // Booking ID match in sourceId (e.g. bk_123-deposit, bk_123-insurance, bk_123-accrue...)
        for (const bId of clientInfo.bookingIds) {
          if (tSourceId === bId || tSourceId.startsWith(`${bId}-`) || tSourceId.includes(bId)) return true;
        }

        // Booking sequence code match in sourceId
        for (const bSeq of clientInfo.bookingSeqs) {
          if (tSourceId === bSeq || tSourceId.startsWith(`${bSeq}-`) || tSourceId.includes(bSeq)) return true;
        }

        // Voucher sequence code match in sourceId
        for (const vSeq of clientInfo.voucherSeqs) {
          if (tSourceId === vSeq || tSourceId.includes(vSeq)) return true;
        }
      }

      // 5. Sequence code or Manual number match
      const tSeq = (t.sequenceCode || "").toLowerCase();
      const tManual = (t.manualNumber || "").toLowerCase();
      if (tSeq) {
        if (clientInfo.bookingSeqs.has(tSeq) || clientInfo.voucherSeqs.has(tSeq)) return true;
      }
      if (tManual) {
        if (clientInfo.bookingSeqs.has(tManual) || clientInfo.voucherSeqs.has(tManual)) return true;
      }

      // 6. Description match
      const rawDesc = (t.description || "").toLowerCase();
      const normDesc = normalizeArabic(rawDesc);

      // Check if description explicitly names a customer (e.g. "العميل: اسامة")
      const extractedCust = extractCustomerFromDesc(rawDesc);
      if (extractedCust) {
        // If the description explicitly states the customer name, check strict match against the selected client's names!
        for (const name of clientInfo.names) {
          if (namesMatch(extractedCust, name)) return true;
        }
        // If the description explicitly mentions a DIFFERENT customer (e.g. "اسامة الخطيب" when filtering "اسامة"),
        // then this transaction explicitly belongs to that other customer and MUST NOT match!
        return false;
      }

      // Check booking sequence codes in description
      for (const bSeq of clientInfo.bookingSeqs) {
        if (bSeq && rawDesc.includes(bSeq)) return true;
      }

      // Check voucher sequence codes in description
      for (const vSeq of clientInfo.voucherSeqs) {
        if (vSeq && rawDesc.includes(vSeq)) return true;
      }

      // Check phone numbers in description
      for (const phone of clientInfo.phones) {
        if (phone.length >= 7 && rawDesc.includes(phone)) return true;
      }

      // Fallback for general descriptions without "العميل:" prefix:
      // Must match standalone word or exact name to prevent partial substring false positives
      for (const name of clientInfo.names) {
        if (!name || name.length < 3) continue;
        const words = normDesc.split(/\s+/);
        const nameWords = name.split(/\s+/);
        if (nameWords.length === 1) {
          // Single word (e.g. "اسامة"): must match as isolated word, not followed by surname
          if (words.includes(name)) {
            const idx = words.indexOf(name);
            const nextWord = words[idx + 1] || "";
            if (!nextWord || ["في", "من", "عن", "على", "الى", "إلى", "لصالح", "رقم", "بتاريخ"].includes(nextWord)) {
              return true;
            }
          }
        } else {
          // Multi-word name: must be included in exact sequence
          if (normDesc.includes(name)) return true;
        }
      }

      return false;
    };

    // Target account IDs (including sub-accounts if it's a parent)
    const getAllChildIds = (parentId: string): string[] => {
      const children = accounts.filter(a => a.parentId === parentId);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        ids = [...ids, ...getAllChildIds(c.id)];
      });
      return ids;
    };
    const targetAccIds = isAllAccounts 
      ? accounts.map(a => a.id) 
      : [accId, ...getAllChildIds(accId)];

    // Helper to determine debit/credit for statement
    const resolveIsDebit = (t: Transaction): boolean => {
      if (!isAllAccounts) {
        return targetAccIds.includes(t.debitAccountId || "");
      }

      // For comprehensive client statement:
      if (clientInfo?.dedicatedAccountIds?.size) {
        if (t.debitAccountId && clientInfo.dedicatedAccountIds.has(t.debitAccountId)) return true;
        if (t.creditAccountId && clientInfo.dedicatedAccountIds.has(t.creditAccountId)) return false;
      }

      const credAcc = accounts.find(a => a.id === t.creditAccountId);
      const debAcc = accounts.find(a => a.id === t.debitAccountId);

      // Revenue / Service Fee credited -> Customer is debited (+)
      if (credAcc?.type === 'revenue' || credAcc?.code?.startsWith('4')) {
        return true;
      }
      // Cash / Bank received from customer (Cashbox debited) -> Customer is credited (-)
      if (debAcc?.classification === 'cashbox' || debAcc?.category === 'cash' || debAcc?.code === '1010101' || debAcc?.code?.startsWith('10101')) {
        return false;
      }
      // Cash paid to customer (Refund of insurance/deposit, Cashbox credited) -> Customer is debited (+)
      if (credAcc?.classification === 'cashbox' || credAcc?.category === 'cash' || credAcc?.code === '1010101' || credAcc?.code?.startsWith('10101')) {
        return true;
      }
      // Discount allowed to customer (Discount expense debited) -> Customer is credited (-)
      if (debAcc?.name?.includes("خصم") || debAcc?.code?.includes("50103")) {
        return false;
      }
      // Receivables account:
      if (t.debitAccountId === '1010301' || debAcc?.code === '1010301' || debAcc?.name?.includes('الزبائن')) {
        return true;
      }
      if (t.creditAccountId === '1010301' || credAcc?.code === '1010301' || credAcc?.name?.includes('الزبائن')) {
        return false;
      }

      return true;
    };

    // 1. Calculate Opening Balance before `fromDate`
    const priorTransactions = (transactions || []).filter(t => {
      const tDateStr = (t.date || "").split("T")[0];
      return (
        (isAllAccounts || targetAccIds.includes(t.debitAccountId || "") || targetAccIds.includes(t.creditAccountId || "")) && 
        tDateStr < fromDate &&
        matchesClient(t)
      );
    });

    let openingDebit = 0;
    let openingCredit = 0;

    priorTransactions.forEach(t => {
      const amtInDisplayCur = t.baseAmount !== undefined ? t.baseAmount : (t.amount * (t.rate || 1));
      const isDebit = resolveIsDebit(t);

      if (isDebit) {
        openingDebit += amtInDisplayCur;
      } else {
        openingCredit += amtInDisplayCur;
      }
    });

    const openingBalance = isDebitNormal 
      ? (openingDebit - openingCredit) 
      : (openingCredit - openingDebit);

    // 2. Filter movements within the period
    const periodTransactions = (transactions || []).filter(t => {
      const tDateStr = (t.date || "").split("T")[0];
      return (
        (isAllAccounts || targetAccIds.includes(t.debitAccountId || "") || targetAccIds.includes(t.creditAccountId || "")) && 
        tDateStr >= fromDate && 
        tDateStr <= toDate &&
        matchesClient(t)
      );
    }).sort((a, b) => {
      // Sort by date, then by createdAt time
      const dateCompare = (a.date || "").localeCompare(b.date || "");
      if (dateCompare !== 0) return dateCompare;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });

    // 3. Compute movements with running balance
    let currentRunningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const movements = periodTransactions.map(t => {
      const amtInDisplayCur = t.baseAmount !== undefined ? t.baseAmount : (t.amount * (t.rate || 1));
      const isDebit = resolveIsDebit(t);
      
      const debitVal = isDebit ? amtInDisplayCur : 0;
      const creditVal = !isDebit ? amtInDisplayCur : 0;

      totalDebit += debitVal;
      totalCredit += creditVal;

      if (isDebitNormal) {
        currentRunningBalance += debitVal - creditVal;
      } else {
        currentRunningBalance += creditVal - debitVal;
      }

      const foreignInfo = (t.currency && t.currency !== displayCurrency) ? ` (مبلغ أجنبي: ${t.amount.toLocaleString()} ${t.currency} - سعر الصرف: ${t.rate})` : "";

      return {
        ...t,
        description: t.description + foreignInfo,
        debitAmount: debitVal,
        creditAmount: creditVal,
        runningBalance: currentRunningBalance
      };
    });

    const closingBalance = openingBalance + (isDebitNormal ? (totalDebit - totalCredit) : (totalCredit - totalDebit));

    return {
      openingBalance,
      movements,
      totalDebit,
      totalCredit,
      closingBalance
    };
  }, [selectedAccount, isAllAccounts, transactions, fromDate, toDate, displayCurrency, selectedClientIds, clientInfo, accounts]);

  // Filter accounts list for selection dropdown
  const filteredAccountsForSelect = useMemo(() => {
    // Show all accounts or only active accounts, sorted by code
    let list = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

    if (onlyActiveAccounts) {
      list = list.filter(
        (a) =>
          accountsWithActivity.has(a.id) ||
          (a.code && accountsWithActivity.has(a.code))
      );
    }
    
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase().trim();
    return list.filter(a => 
      (a.name || "").toLowerCase().includes(query) || 
      (a.code || "").includes(query)
    );
  }, [accounts, searchQuery, onlyActiveAccounts, accountsWithActivity]);

  // Format account display label
  const getAccountLabel = (acc: Account) => {
    if (acc.code === "ALL") return acc.name;
    return `[${acc.code}] ${acc.name}`;
  };

  const getAccountTypeText = (type: string) => {
    switch (type) {
      case 'asset': return 'أصول';
      case 'liability': return 'خصوم / التزامات';
      case 'equity': return 'حقوق ملكية';
      case 'revenue': return 'إيرادات';
      case 'expense': return 'مصروفات';
      default: return type;
    }
  };

  // Format Date for Arabic display
  const formatDateArabic = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Handle Action Print
  const handlePrint = () => {
    if (!selectedAccount) {
      toast.error("عذراً، يجب تحديد حساب أولاً للطباعة!");
      return;
    }

    const { openingBalance, movements, totalDebit, totalCredit, closingBalance } = ledgerData;
    const isDebitNormal = selectedAccount.type === 'asset' || selectedAccount.type === 'expense';

    const printContent = (
      <div className="w-full text-slate-900 leading-normal" dir="rtl">
        {/* Compact Statement Details Header Info */}
        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 mb-3 print:mb-2 text-[10px] sm:text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200/80">
            <div className="space-y-1 pr-1">
              <div className="flex items-center gap-1.5 text-slate-800 font-black">
                <span className="text-slate-500">اسم الحساب:</span>
                <span className="text-indigo-600 text-xs sm:text-sm">{selectedAccount.name}</span>
                <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-[9px] text-indigo-700">({selectedAccount.code})</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[9.5px] sm:text-[10.5px] text-slate-600 font-bold">
                <span>طبيعة الحساب: <span className="text-slate-900 dark:text-slate-200">{getAccountTypeText(selectedAccount.type)}</span></span>
                <span>العملة: <span className="font-mono text-indigo-600 font-extrabold">{selectedAccount.currency}</span></span>
              </div>
            </div>
            
            <div className="space-y-1 pt-1 md:pt-0 md:pl-1 text-right md:text-left">
              <div className="flex items-center justify-start md:justify-end gap-1.5 text-slate-800 font-bold text-[10px] sm:text-[11px]">
                <span className="text-slate-500">الفترة الزمنية:</span>
                <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded">{fromDate}</span>
                <span className="text-slate-400">إلى</span>
                <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded">{toDate}</span>
              </div>
              <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 text-[9px] sm:text-[10px] text-slate-500 font-bold">
                <span>عملة العرض: <span className="font-mono font-black text-slate-700">{displayCurrency}</span></span>
                <span>إصدار الكشف: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                {selectedClientIds.length > 0 && (
                  <span className="text-rose-600 font-black bg-rose-50 px-1.5 py-0.5 rounded">
                    فلترة: {selectedClientIds.map(cid => {
                      if (cid.startsWith("temp-name-")) {
                        return cid.replace("temp-name-", "");
                      }
                      return clients.find(c => c.id === cid)?.name || cid;
                    }).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Recap Table */}
        <div className="mb-3 print:mb-2 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full border-collapse text-right text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-1 px-2">الرصيد الافتتاحي السابق</th>
                <th className="py-1 px-2">إجمالي حركات مدين (+)</th>
                <th className="py-1 px-2">إجمالي حركات دائن (-)</th>
                <th className="py-1 px-2 bg-indigo-50 text-indigo-950 font-black">الرصيد الختامي الحالي</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-black text-slate-800">
                <td className="py-1 px-2 font-mono border-b border-slate-200">
                  {openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
                  <span className="text-[10px] text-slate-500 mr-1">
                    ({openingBalance >= 0 ? (isDebitNormal ? 'مدين' : 'دائن') : (isDebitNormal ? 'دائن' : 'مدين')})
                  </span>
                </td>
                <td className="py-1 px-2 font-mono text-emerald-600 border-b border-slate-200">
                  {totalDebit.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
                </td>
                <td className="py-1 px-2 font-mono text-rose-600 border-b border-slate-200">
                  {totalCredit.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
                </td>
                <td className="py-1 px-2 font-mono bg-indigo-50/50 text-indigo-700 font-black border-b border-slate-200">
                  {closingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
                  <span className="text-[10px] text-indigo-600 mr-1 font-bold">
                    ({closingBalance >= 0 ? (isDebitNormal ? 'مدين' : 'دائن') : (isDebitNormal ? 'دائن' : 'مدين')})
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Ledger Print Table */}
        <h3 className="text-xs sm:text-sm font-black text-slate-800 mb-1.5 print:mb-1 pr-1">تفاصيل حركة كشف الحساب</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full border-collapse text-right text-[9px] leading-tight">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                <th className="py-1 px-2 w-12 text-center">م</th>
                <th className="py-1 px-2 w-24">التاريخ</th>
                <th className="py-1 px-2 w-28">المرجع / المستند</th>
                <th className="py-1 px-2">البيان والتفاصيل</th>
                <th className="py-1 px-2 w-24 text-emerald-700">مدين (+)</th>
                <th className="py-1 px-2 w-24 text-rose-700">دائن (-)</th>
                <th className="py-1 px-2 w-28 bg-slate-50">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody>
              {/* Row for Opening Balance */}
              <tr className="bg-slate-50/40 text-slate-500 font-bold border-b border-slate-200">
                <td className="py-0.5 px-2 text-center">-</td>
                <td className="py-0.5 px-2 font-mono">{fromDate}</td>
                <td className="p-2">رصيد افتتاحي</td>
                <td className="py-0.5 px-2 italic">الرصيد المدور للفترة السابقة</td>
                <td className="py-0.5 px-2 font-mono text-emerald-600">-</td>
                <td className="py-0.5 px-2 font-mono text-rose-600">-</td>
                <td className="py-0.5 px-2 font-mono bg-slate-50 font-bold text-slate-700">
                  {openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Transactions List */}
              {movements.map((move, index) => (
                <tr key={move.id} className="border-b border-slate-200 hover:bg-slate-50/30">
                  <td className="py-0.5 px-2 text-center text-slate-400 font-mono">{index + 1}</td>
                  <td className="py-0.5 px-2 font-mono">{move.date}</td>
                  <td className="py-0.5 px-2 font-semibold text-slate-700">
                    {move.sourceType === 'booking' && `حجز #${move.sourceId?.slice(-6) || ''}`}
                    {move.sourceType === 'voucher' && `سند #${move.sourceId?.slice(-6) || ''}`}
                    {!move.sourceType && 'قيد يدوي'}
                  </td>
                  <td className="py-0.5 px-2 text-slate-600">{move.description}</td>
                  <td className="py-0.5 px-2 font-mono text-emerald-600 font-bold">
                    {move.debitAmount > 0 ? move.debitAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-0.5 px-2 font-mono text-rose-600 font-bold">
                    {move.creditAmount > 0 ? move.creditAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                  </td>
                  <td className="py-0.5 px-2 font-mono bg-slate-50 font-black text-slate-800">
                    {move.runningBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {/* Summary Row */}
              <tr className="bg-slate-100 text-slate-800 font-black border-t border-slate-300">
                <td className="py-1 px-2 text-center" colSpan={4}>المجموع الإجمالي للحركات</td>
                <td className="py-1 px-2 font-mono text-emerald-700">
                  {totalDebit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="py-1 px-2 font-mono text-rose-700">
                  {totalCredit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="py-1 px-2 font-mono bg-indigo-50 font-black text-indigo-800 text-xs">
                  {closingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );

    setPrintData({
      title: "كشف حساب تفصيلي رسمي",
      documentNumber: `STMT-${selectedAccount.code}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
      date: new Date().toISOString().split('T')[0],
      content: printContent
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header Widget */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-indigo-500" />
            كشف الحساب المالي التفصيلي
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 font-semibold">
            استعرض حركات المحاسبة التفصيلية لأي حساب، مع تتبع الأرصدة التراكمية، خيارات الفلترة المتقدمة، والمعاينة للطباعة بشكل رسمي.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {selectedAccount && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/15 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>معاينة وطباعة الكشف الرسمي</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 px-5 py-3 rounded-2xl text-xs font-black border border-rose-200 dark:border-rose-800/60 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              title="إغلاق كشف الحساب والعودة للشاشة السابقة"
            >
              <X className="h-4.5 w-4.5" />
              <span>إغلاق الشاشة</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Selection Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Account Selector Widget */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between relative">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 block">الحساب المالي المستهدف:</label>
          
          <div className="relative">
            <button
              onClick={() => setIsOpenSelector(!isOpenSelector)}
              className="w-full flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl text-right text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Calculator className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="truncate">
                  {selectedAccount ? getAccountLabel(selectedAccount) : "اختر الحساب من شجرة الحسابات..."}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            </button>

            {/* Custom search list dropdown */}
            <AnimatePresence>
              {isOpenSelector && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsOpenSelector(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 left-0 mt-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 flex flex-col"
                  >
                    <div className="p-2 border-b border-slate-100 dark:border-slate-900 flex items-center gap-2 bg-slate-50 dark:bg-slate-950">
                      <Search className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="ابحث برقم الحساب أو الاسم المالي..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs focus:outline-none p-1.5 font-bold text-slate-800 dark:text-slate-100"
                        autoFocus
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery("")}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {/* Activity Filter Toggle Bar */}
                    <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-bold flex items-center gap-1">
                        <Activity className="h-3 w-3 text-emerald-600" />
                        <span>فلترة الحسابات:</span>
                      </span>
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setOnlyActiveAccounts(true)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            onlyActiveAccounts
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                          }`}
                        >
                          ذات حركة فقط ({accounts.filter(a => accountsWithActivity.has(a.id) || (a.code && accountsWithActivity.has(a.code))).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlyActiveAccounts(false)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            !onlyActiveAccounts
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                          }`}
                        >
                          الكل ({accounts.length})
                        </button>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-50 dark:divide-slate-900">
                      {/* Comprehensive All Accounts Option */}
                      <button
                        key="all"
                        onClick={() => {
                          setSelectedAccId("all");
                          setIsOpenSelector(false);
                          setSearchQuery("");
                        }}
                        className={`w-full text-right p-3 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-between font-bold border-b border-indigo-100 dark:border-indigo-950/60 ${selectedAccId === 'all' ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}
                      >
                        <span className="truncate flex items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span>كافة الحسابات (كشف شامل لكافة الحركات المالية)</span>
                        </span>
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                          شامل
                        </span>
                      </button>

                      {filteredAccountsForSelect.map(acc => {
                        const hasAct = accountsWithActivity.has(acc.id) || (acc.code && accountsWithActivity.has(acc.code));
                        return (
                          <button
                            key={acc.id}
                            onClick={() => {
                              setSelectedAccId(acc.id);
                              setIsOpenSelector(false);
                              setSearchQuery("");
                            }}
                            className={`w-full text-right p-3 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center justify-between font-bold ${selectedAccId === acc.id ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              {hasAct && (
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="حساب به حركات مالية" />
                              )}
                              <span>{getAccountLabel(acc)}</span>
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {hasAct && (
                                <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                  له حركة
                                </span>
                              )}
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-mono">
                                {acc.currency}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {filteredAccountsForSelect.length === 0 && (
                        <p className="p-4 text-center text-[11px] text-slate-400 font-bold">لا توجد حسابات مطابقة للبحث</p>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Client Filter Widget */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between relative">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 block flex items-center justify-between">
            <span>تصفية بحسب العميل (اختياري):</span>
            {selectedClientIds.length > 0 && (
              <button onClick={() => setSelectedClientIds([])} className="text-[10px] text-rose-500 hover:underline cursor-pointer">مسح الكل</button>
            )}
          </label>
          
          <div className="relative">
            <button 
              onClick={() => setIsClientSelectorOpen(!isClientSelectorOpen)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 pr-4 pl-10 rounded-2xl flex items-center justify-between font-bold text-xs text-slate-800 dark:text-white transition-all hover:border-indigo-500 cursor-pointer min-h-[46px]"
            >
              <div className="flex flex-wrap gap-1 max-w-[85%] overflow-hidden">
                {selectedClientIds.length === 0 ? (
                  <span className="text-slate-400">بحث واختيار العملاء...</span>
                ) : (
                  selectedClientIds.map(cid => {
                    const isTemp = cid.startsWith("temp-name-") || cid.startsWith("booking-exact-") || cid.startsWith("booking-cust-");
                    const displayName = cid.startsWith("booking-exact-")
                      ? (bookings.find(b => b.id === cid.replace("booking-exact-", ""))?.customerName || "الحجز المحدد")
                      : isTemp ? cid.replace("temp-name-", "").replace("booking-cust-", "") : (allCustomers.find(c => c.id === cid)?.name || cid);
                    return (
                      <span key={cid} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg text-[9px] flex items-center gap-1 shrink-0">
                        {displayName}
                        {isTemp && <span className="text-[7.5px] opacity-70">(تصفية الحجز)</span>}
                        <XCircle className="h-2.5 w-2.5 hover:text-rose-500 cursor-pointer" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClientIds(prev => prev.filter(id => id !== cid));
                        }} />
                      </span>
                    )
                  })
                )}
              </div>
              <Users className="h-4 w-4 text-slate-400 shrink-0" />
            </button>

            {isClientSelectorOpen && (
              <div className="absolute top-full right-0 left-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[100] max-h-60 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن عميل..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 pr-8 rounded-xl text-[10px] font-bold focus:outline-none focus:border-indigo-500"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  {allCustomers
                    .filter(c => 
                      (c.name || "").toLowerCase().includes(clientSearchQuery.toLowerCase()) || 
                      (c.phone || "").includes(clientSearchQuery)
                    )
                    .map(client => {
                      const isSelected = selectedClientIds.includes(client.id);
                      return (
                        <button
                          key={client.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClientIds(prev => prev.filter(id => id !== client.id));
                            } else {
                              setSelectedClientIds(prev => [...prev, client.id]);
                              // Expand date to show full history including future scheduled events
                              setFromDate("2020-01-01");
                              setToDate("2030-12-31");

                              // Switch to comprehensive view showing all movements of this client
                              setSelectedAccId("all");
                            }
                          }}
                          className={`w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                        >
                          <div>
                            <div className={`text-[10px] font-black ${isSelected ? 'text-indigo-600' : 'text-slate-800 dark:text-slate-200'}`}>{client.name}</div>
                            <div className="text-[8px] font-bold text-slate-400">{client.phone}</div>
                          </div>
                          {isSelected && <CheckCircle className="h-4 w-4 text-indigo-600" />}
                        </button>
                      );
                    })}
                  {allCustomers.length === 0 && (
                    <div className="p-8 text-center text-[10px] font-bold text-slate-400">لا يوجد عملاء متاحين</div>
                  )}
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setIsClientSelectorOpen(false)}
                    className="w-full py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date Filter Widget */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 block">فترة تصفية التواريخ:</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">من تاريخ:</span>
              <div className="relative">
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-right font-bold font-mono text-[11px] border border-slate-200 dark:border-slate-800 p-2 pr-9 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-1">إلى تاريخ:</span>
              <div className="relative">
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-right font-bold font-mono text-[11px] border border-slate-200 dark:border-slate-800 p-2 pr-9 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Currency View Widget */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between lg:col-span-1">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 block">عملة عرض المبالغ:</label>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-700 dark:text-indigo-400 text-xs font-bold border border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span>يتم العرض بالعملة الأساسية ({globalCurrencyCode})</span>
          </div>
        </div>
        <div className="lg:col-span-3"></div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-black text-slate-400 ml-2">فترات سريعة:</span>
        <button
          onClick={() => handleQuickDate('today')}
          className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
        >
          اليوم
        </button>
        <button
          onClick={() => handleQuickDate('yesterday')}
          className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
        >
          أمس
        </button>
        <button
          onClick={() => handleQuickDate('thisMonth')}
          className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
        >
          هذا الشهر
        </button>
        <button
          onClick={() => handleQuickDate('lastMonth')}
          className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
        >
          الشهر الماضي
        </button>
        <button
          onClick={() => handleQuickDate('all')}
          className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
        >
          كل الأوقات السابقة
        </button>
      </div>

      {/* Client Active Filter Status & Mode Switcher */}
      {selectedClientIds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl text-xs font-bold text-indigo-950 dark:text-indigo-200 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              كشف الحساب مصفى بحسب العميل: <span className="font-black underline text-indigo-700 dark:text-indigo-300">{selectedClientIds.map(cid => {
                const isTemp = cid.startsWith("temp-name-") || cid.startsWith("booking-exact-") || cid.startsWith("booking-cust-");
                return isTemp ? cid.replace("temp-name-", "").replace("booking-cust-", "") : (allCustomers.find(c => c.id === cid)?.name || cid);
              }).join('، ')}</span>
              {' '} | الحساب المالي المختار: <span className="font-black text-slate-800 dark:text-slate-100">[{selectedAccount?.name}]</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedAccId !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedAccId("all")}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>عرض كشف شامل لكافة الحسابات</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setFromDate("2020-01-01");
                setToDate("2030-12-31");
              }}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-[11px] font-black hover:bg-indigo-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              عرض كافة الفترات السابقة والمستقبلية
            </button>
            <button
              type="button"
              onClick={() => setSelectedClientIds([])}
              className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-[11px] font-black transition cursor-pointer"
            >
              إلغاء تصفية العميل
            </button>
          </div>
        </motion.div>
      )}

      {selectedAccount ? (
        <>
          {/* Statement Bento Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Opening Balance */}
            <div className="bg-gradient-to-br from-indigo-50/40 to-indigo-50 dark:from-slate-900 dark:to-slate-900/40 p-5 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">الرصيد السابق (الافتتاحي)</span>
                <Clock className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="mt-4">
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {ledgerData.openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold ml-1">{displayCurrency}</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-semibold">
                قبل تاريخ {formatDateArabic(fromDate)}
              </p>
            </div>

            {/* Card 2: Total Debit */}
            <div className="bg-gradient-to-br from-emerald-50/40 to-emerald-50 dark:from-slate-900 dark:to-slate-900/40 p-5 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/30 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">إجمالي مدين (+)</span>
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="mt-4">
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {ledgerData.totalDebit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold ml-1">{displayCurrency}</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-semibold">
                إجمالي الدخل / الزيادة في الفترة المحددة
              </p>
            </div>

            {/* Card 3: Total Credit */}
            <div className="bg-gradient-to-br from-rose-50/40 to-rose-50 dark:from-slate-900 dark:to-slate-900/40 p-5 rounded-3xl border border-rose-100/50 dark:border-rose-900/30 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-700 dark:text-rose-400">إجمالي دائن (-)</span>
                <ArrowDownRight className="h-5 w-5 text-rose-500" />
              </div>
              <div className="mt-4">
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {ledgerData.totalCredit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-rose-600 dark:text-rose-400 font-bold ml-1">{displayCurrency}</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-semibold">
                إجمالي الصرف / الخفض في الفترة المحددة
              </p>
            </div>

            {/* Card 4: Closing Balance */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-5 rounded-3xl shadow-lg shadow-indigo-600/10 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-100">رصيد الفترة النهائي</span>
                <TrendingUp className="h-5 w-5 text-indigo-200" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black font-mono">
                  {ledgerData.closingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-indigo-200 font-bold ml-1">{displayCurrency}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded">
                  {ledgerData.closingBalance >= 0 
                    ? (selectedAccount.type === 'asset' || selectedAccount.type === 'expense' ? 'مدين / Dr' : 'دائن / Cr') 
                    : (selectedAccount.type === 'asset' || selectedAccount.type === 'expense' ? 'دائن / Cr' : 'مدين / Dr')
                  }
                </span>
                <span className="text-[10px] text-indigo-100 font-semibold">حتى تاريخ {toDate}</span>
              </div>
            </div>
          </div>

          {/* Statement Detailed Table Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-black text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-500" />
                سجل القيود وحركات الحساب التفصيلية
              </h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                إجمالي العمليات للفترة: {ledgerData.movements.length} حركة
              </span>
            </div>

            {/* Ledger Transactions Table View - Responsive */}
            <div className="hidden md:block overflow-x-auto w-full select-none">
              <table className="w-full border-collapse text-right table-fixed min-w-full">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 font-black border-b border-slate-100 dark:border-slate-800/60 text-[8px] sm:text-xs">
                    <th className="p-1 px-1.5 sm:px-3 sm:py-2 w-[6%] text-center whitespace-nowrap">م</th>
                    <th className="p-1 px-1.5 sm:px-3 sm:py-2 w-[16%] whitespace-nowrap">التاريخ والوقت</th>
                    <th className="p-1 px-1.5 sm:px-3 sm:py-2 w-[18%] whitespace-nowrap">نوع السند والعميل</th>
                    <th className="p-1 px-1.5 sm:px-3 sm:py-2 w-[28%] whitespace-nowrap">البيان (الشرح)</th>
                    <th className="p-1 px-1.5 sm:px-3 sm:py-2 w-[11%] text-emerald-600 dark:text-emerald-400 text-left whitespace-nowrap">مدين (+)</th>
                    <th className="p-1 px-1.5 sm:px-3 sm:py-2 w-[11%] text-rose-600 dark:text-rose-400 text-left whitespace-nowrap">دائن (-)</th>
                    <th className="p-1 px-1.5 sm:px-3 sm:py-2 w-[10%] bg-slate-50/30 dark:bg-slate-950/10 text-left font-black whitespace-nowrap">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-[8px] sm:text-xs">
                  {/* Prior Opening Balance Row */}
                  <tr className="bg-slate-50/20 dark:bg-slate-950/5 text-slate-400 dark:text-slate-500 font-bold">
                    <td className="p-1 px-1.5 sm:px-3 sm:py-2 text-center whitespace-nowrap">-</td>
                    <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-mono whitespace-nowrap">{fromDate}</td>
                    <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-black whitespace-nowrap">رصيد افتتاحي</td>
                    <td className="p-1 px-1.5 sm:px-3 sm:py-2 italic truncate max-w-[200px]">الرصيد السابق قبل تاريخ التصفية</td>
                    <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-mono text-left whitespace-nowrap">-</td>
                    <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-mono text-left whitespace-nowrap">-</td>
                    <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-mono text-left bg-slate-50/30 dark:bg-slate-950/10 text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                      {ledgerData.openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Movements list */}
                  {ledgerData.movements.map((move, index) => {
                    const isDebit = move.debitAccountId === selectedAccount.id;
                    return (
                      <tr key={move.id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-all">
                        <td className="p-1 px-1.5 sm:px-3 sm:py-2 text-center font-mono text-slate-400 dark:text-slate-600 whitespace-nowrap">{index + 1}</td>
                        <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <div className="tracking-tight">{move.date}</div>
                          <div className="text-[7px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {move.createdAt ? new Date(move.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </div>
                        </td>
                        <td className="p-1 px-1.5 sm:px-3 sm:py-2 overflow-hidden truncate">
                          <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 sm:px-2 sm:py-0.5 rounded-md sm:rounded-full text-[7px] sm:text-[9px] font-black ${
                            move.sourceType === 'booking' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' :
                            move.sourceType === 'voucher' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {move.sourceType === 'booking' && `حجز #${move.sourceId?.slice(-4) || ''}`}
                            {move.sourceType === 'voucher' && `سند #${move.sourceId?.slice(-4) || ''}`}
                            {!move.sourceType && 'قيد قياسي'}
                          </span>
                        </td>
                        <td className="p-1 px-1.5 sm:px-3 sm:py-2 text-slate-700 dark:text-slate-300 font-medium sm:font-semibold group-hover:text-slate-900 dark:group-hover:text-white transition-colors truncate max-w-[200px]" title={move.description}>
                          <p className="truncate text-[10px] sm:text-xs leading-snug">{move.description}</p>
                          {move.createdBy && (
                            <p className="text-[7px] sm:text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">المستخدم: {move.createdBy}</p>
                          )}
                        </td>
                        <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-mono text-left text-emerald-600 dark:text-emerald-400 font-bold text-[8.5px] sm:text-[11px] whitespace-nowrap">
                          {move.debitAmount > 0 ? (
                            <span>{move.debitAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>
                        <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-mono text-left text-rose-600 dark:text-rose-400 font-bold text-[8.5px] sm:text-[11px] whitespace-nowrap">
                          {move.creditAmount > 0 ? (
                            <span>{move.creditAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>
                        <td className="p-1 px-1.5 sm:px-3 sm:py-2 font-mono text-left bg-slate-50/30 dark:bg-slate-950/10 font-black text-slate-800 dark:text-slate-200 text-[8.5px] sm:text-[11px] whitespace-nowrap">
                          {move.runningBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  {ledgerData.movements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        <Calculator className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        {selectedClientIds.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-slate-700 dark:text-slate-200 font-black text-xs sm:text-sm">
                              لا توجد حركات مالية مسجلة للعميل المحدد خلال الفترة المحددة ({fromDate} إلى {toDate})
                            </p>
                            <p className="text-slate-400 text-[11px]">
                              {selectedAccId !== "all" 
                                ? "قد تكون حركات العميل مقيدة على حسابات أخرى. يمكنك التبديل إلى 'كافة الحسابات' أو توسيع التواريخ." 
                                : "لم يتم تسجيل قيود أو حركات مالية مرتبطة بهذا العميل حتى الآن."}
                            </p>
                            <div className="flex items-center justify-center gap-2 pt-2">
                              {selectedAccId !== "all" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedAccId("all")}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                                >
                                  عرض كشف شامل لكافة الحسابات
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setFromDate("2020-01-01");
                                  setToDate("2030-12-31");
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                              >
                                توسيع نطاق التواريخ
                              </button>
                            </div>
                          </div>
                        ) : (
                          "لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة"
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {/* Mobile Opening Balance Card */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>الرصيد الافتتاحي</span>
                  <span className="font-mono">{fromDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">رصيد ما قبل نطاق الفلترة:</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                    {ledgerData.openingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayCurrency}
                  </span>
                </div>
              </div>

              {/* Movements Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
                {ledgerData.movements.map((move, index) => (
                  <div key={move.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors space-y-3 shadow-sm">
                    {/* Top line: index, date and source tag */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 font-mono shrink-0">
                          {index + 1}
                        </span>
                        <div className="text-[10px] font-bold text-slate-500 font-mono">
                          {move.date}
                        </div>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                        move.sourceType === 'booking' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' :
                        move.sourceType === 'voucher' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {move.sourceType === 'booking' && `حجز #${move.sourceId?.slice(-6) || ''}`}
                        {move.sourceType === 'voucher' && `سند #${move.sourceId?.slice(-6) || ''}`}
                        {!move.sourceType && 'قيد قياسي'}
                      </span>
                    </div>

                    {/* Description / Statement */}
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                      <p className="leading-relaxed line-clamp-2">{move.description}</p>
                    </div>

                    {/* Financial amounts grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/50 dark:bg-slate-950/15 p-2 rounded-xl text-center">
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block mb-0.5 font-bold">مدين (+)</span>
                        <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {move.debitAmount > 0 ? move.debitAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block mb-0.5 font-bold">دائن (-)</span>
                        <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                          {move.creditAmount > 0 ? move.creditAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                        </span>
                      </div>
                      <div className="border-r border-slate-100 dark:border-slate-800/60">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block mb-0.5 font-black">الرصيد</span>
                        <span className="text-[11px] font-mono font-black text-slate-900 dark:text-white">
                          {move.runningBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {ledgerData.movements.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-bold px-4">
                  <Calculator className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  {selectedClientIds.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-slate-700 dark:text-slate-200 font-black text-xs">
                        لا توجد حركات مالية مسجلة للعميل المحدد خلال الفترة ({fromDate} إلى {toDate})
                      </p>
                      {selectedAccId !== "all" && (
                        <button
                          type="button"
                          onClick={() => setSelectedAccId("all")}
                          className="mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[11px] font-bold"
                        >
                          عرض كشف شامل لكافة الحسابات
                        </button>
                      )}
                    </div>
                  ) : (
                    "لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة"
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 shadow-sm border border-slate-100 dark:border-slate-800/80 text-center flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center text-slate-400">
            <BookOpen className="h-10 w-10 text-indigo-500" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white">يرجى اختيار الحساب المستهدف</h3>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold max-w-sm">
            الرجاء اختيار الحساب المالي من القائمة للبدء في تصفية واستخراج حركاته التفصيلية وإصدار الكشف الرسمي للطباعة.
          </p>
        </div>
      )}
    </div>
  );
}
