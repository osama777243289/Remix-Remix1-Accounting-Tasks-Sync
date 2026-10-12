import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Building,
  Calendar,
  Users,
  MapPin,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Phone,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  FolderTree,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  X,
  Check,
  Briefcase,
  HelpCircle,
  Info,
  Printer,
  Camera,
  Image,
  Eye,
  Sun,
  Moon,
  Undo2,
  CreditCard,
  ArrowRight,
  Receipt,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  FileText,
  Tag,
} from "lucide-react";
import {
  Hall,
  Booking,
  Account,
  Currency,
  Transaction,
  Service,
  CompanySettings,
  DepositRefundRequest,
  BookingAmendmentRequest,
} from "../types";
import BookingAmendmentModal from "./BookingAmendmentModal";
import AmendmentRequestsView from "./AmendmentRequestsView";
import { compressImage } from "../utils/imageCompression";
import SmartCalendar from "./SmartCalendar";
import BookingStats from "./BookingStats";
import OccupancyAnalyticsCard from "./OccupancyAnalyticsCard";
import AccountLinkingSettings from "./AccountLinkingSettings";
import PrintTemplate from "./PrintTemplate";
import OfficialLeaseAgreementPrint from "./OfficialLeaseAgreementPrint";
import OfficialVoucherPrintModal from "./OfficialVoucherPrintModal";
import BookingDiscountModal from "./BookingDiscountModal";
import {
  subscribeHalls,
  subscribeBookings,
  addHall,
  updateHall,
  deleteHall,
  addBooking,
  updateBooking,
  deleteBooking,
  addTransactionWithDoubleEntry,
  addAccount,
  subscribeClients,
  addClient,
  subscribeBrokers,
  addBroker,
  subscribeGuarantors,
  addGuarantor,
  subscribeServices,
  subscribeCompanySettings,
  addVoucher,
  updateBookingSettings,
  addBookingSettings,
  addLinkedAccounts,
  updateLinkedAccounts,
  processBookingAction,
  deleteTransaction,
  deleteVoucher,
  updateDepositRefundRequest,
} from "../lib/dbService";
import { toast } from "sonner";
import { PermissionGuard, usePermissions } from "../lib/permissions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const normalizeArabic = (str: string): string => {
  if (!str) return "";
  return str
    .trim()
    .replace(/[أإآ]/g, "ا") // Replace different Alefs with plain Alef
    .replace(/ة/g, "ه")     // Replace Teh Marbuta with Heh
    .replace(/[ىي]/g, "ي")  // Normalize Alef Maksura and Yeh to Yeh
    .replace(/[\u064B-\u065F]/g, "") // Remove Arabic diacritics
    .replace(/\s+/g, " ")   // Normalize spaces
    .toLowerCase();
};

interface HallsManagementProps {
  accounts: Account[];
  vouchers?: any[];
  currencies: Currency[];
  transactions: Transaction[];
  globalCurrencySymbol: string;
  globalCurrencyCode: string;
  systemTime: string;
  bookingSettings?: any;
  linkedAccounts?: any;
  initialBookingDate?: string | null;
  onClearInitialBookingDate?: () => void;
  externalPreviewBookingId?: string | null;
  onClearExternalPreviewBookingId?: () => void;
  onReturnToPreviousView?: () => void;
  previewOnlyMode?: boolean;
  onCollectPayment?: (
    bookingId: string,
    amount: number,
    accountId: string,
    creditAccountId?: string,
    date?: string,
    manualNumber?: string,
    collectionType?: "deposit" | "payment",
  ) => Promise<void>;
  onOpenAccountStatement?: (accountId?: string, clientId?: string, customerName?: string) => void;
  onUpdateTransaction?: (
    id: string,
    updates: Partial<Transaction>,
  ) => Promise<void>;
  defaultTab?: "halls" | "bookings" | "analytics" | "audit";
  depositRefundRequests?: DepositRefundRequest[];
}

const DEFAULT_AMENITIES = [
  "نظام صوتي ستيريو متكامل",
  "إضاءة ليزر ومؤثرات بصرية",
  "غرفة خاصة لتجهيز العروسين",
  "ممر زجاجي مضيء للدخول",
  "بوفيه ضيافة مفتوح (مشروبات ومأكولات)",
  "تكييف هواء مركزي ذكي",
  "مواقف سيارات خاصة بالمدعوين",
  "شاشات عرض LED عملاقة",
];

export const getBookingAllDates = (b: any): string[] => {
  if (!b) return [];
  if (Array.isArray(b.eventDates) && b.eventDates.length > 0) {
    return Array.from(new Set(b.eventDates.filter(Boolean)));
  }
  if (Array.isArray(b.days) && b.days.length > 0) {
    const dates = b.days
      .filter((d: any) => d && d.status !== "cancelled")
      .map((d: any) => d.date)
      .filter(Boolean);
    if (dates.length > 0) return Array.from(new Set(dates));
  }
  if (b.eventDate) {
    return [b.eventDate];
  }
  return [];
};

export default function HallsManagement({
  accounts,
  vouchers,
  currencies,
  transactions,
  globalCurrencySymbol,
  globalCurrencyCode,
  systemTime,
  bookingSettings,
  linkedAccounts,
  initialBookingDate,
  onClearInitialBookingDate,
  externalPreviewBookingId,
  onClearExternalPreviewBookingId,
  onReturnToPreviousView,
  onCollectPayment,
  onOpenAccountStatement,
  onUpdateTransaction,
  defaultTab,
  depositRefundRequests = [],
  previewOnlyMode = false,
}: HallsManagementProps) {
  const { currentUser, hasPermission } = usePermissions();

  const effectiveLinkedAccounts = React.useMemo(() => {
    const l = linkedAccounts || ({} as any);
    const b = bookingSettings || ({} as any);
    return {
      accountsReceivableId: l.accountsReceivableId || b.accountsReceivableId || "1010301",
      cashBankAccountId: l.cashBankAccountId || b.cashBankAccountId || "1010101",
      hallRevenueAccountId: l.hallRevenueAccountId || b.hallRevenueAccountId || "40101",
      preEventRevenueAccountId: l.preEventRevenueAccountId || b.preEventRevenueAccountId || "40101",
      postEventRevenueAccountId: l.postEventRevenueAccountId || b.postEventRevenueAccountId || "40101",
      servicesRevenueAccountId: l.servicesRevenueAccountId || b.servicesRevenueAccountId || "40102",
      discountAccountId: l.discountAccountId || b.discountAccountId || "40103",
      finesAccountId: l.finesAccountId || b.finesAccountId || "40104",
      guaranteeAccountId: l.guaranteeAccountId || b.guaranteeAccountId || "2010202",
      bookingMortgageAccountId: l.bookingMortgageAccountId || b.bookingMortgageAccountId || "2010203",
      depositCreditAccountId: l.depositCreditAccountId || b.depositCreditAccountId || l.accountsReceivableId || b.accountsReceivableId || "1010301",
      insuranceCreditAccountId: l.insuranceCreditAccountId || b.insuranceCreditAccountId || l.guaranteeAccountId || b.guaranteeAccountId || "2010202",
      insuranceDebitAccountId: l.insuranceDebitAccountId || b.insuranceDebitAccountId || l.guaranteeAccountId || b.guaranteeAccountId || "2010202",
      mortgageCreditAccountId: l.mortgageCreditAccountId || b.mortgageCreditAccountId || l.bookingMortgageAccountId || b.bookingMortgageAccountId || "2010203",
      mortgageDebitAccountId: l.mortgageDebitAccountId || b.mortgageDebitAccountId || l.bookingMortgageAccountId || b.bookingMortgageAccountId || "2010203",
    };
  }, [linkedAccounts, bookingSettings]);

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const isEditingBookingMode = !!editingBooking;
  const lockBookingAmounts =
    isEditingBookingMode &&
    bookingSettings?.lockBookingAmounts &&
    !hasPermission("bypass-booking-amount-lock");
  const lockBookingDetails =
    isEditingBookingMode &&
    bookingSettings?.lockBookingDetailsAfterSave &&
    !hasPermission("bypass-booking-details-lock");

  // DB Subscriptions States
  const [halls, setHalls] = useState<Hall[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Nav Views inside Halls Module
  const [currentTab, setCurrentTab] = useState<
    "halls" | "bookings" | "analytics" | "audit" | "amendments"
  >(defaultTab || "halls");

  useEffect(() => {
    if (defaultTab) {
      setCurrentTab(defaultTab);
    }
  }, [defaultTab]);

  // Filter States
  const [selectedHallFilter, setSelectedHallFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals / Form Triggers
  const [showHallModal, setShowHallModal] = useState(false);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [officialVoucherToPrint, setOfficialVoucherToPrint] = useState<any | null>(null);
  const [isOfficialVoucherPrintOpen, setIsOfficialVoucherPrintOpen] = useState(false);
  const [selectedBookingForDiscount, setSelectedBookingForDiscount] = useState<Booking | null>(null);
  const [isBookingDiscountModalOpen, setIsBookingDiscountModalOpen] = useState(false);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activePledgeImage, setActivePledgeImage] = useState<string | null>(
    null,
  );
  const [isClientIdOpen, setIsClientIdOpen] = useState(false);
  const [isBrokerGuarantorOpen, setIsBrokerGuarantorOpen] = useState(false);

  // Add Hall Form State
  const [hallForm, setHallForm] = useState({
    name: "",
    capacity: 200,
    price: 1500,
    currency: "YER",
    location: "",
    status: "active" as "active" | "maintenance" | "inactive",
    features: [] as string[],
    notes: "",
    eventPrices: [] as { eventType: string; price: number }[],
  });

  // Add Booking Form State
  const [bookingForm, setBookingForm] = useState({
    hallId: "",
    customerName: "",
    customerPhone: "",
    eventType: "",
    eventDates: [] as string[],
    days: [] as {
      date: string;
      startTime: string;
      endTime: string;
      price: number;
      discount: number;
      eventType?: string;
      status?: string;
    }[],
    additionalServices: [] as { name: string; cost: number; appliedDates?: string[]; status?: string }[],
    period: "evening" as "morning" | "evening" | "night",
    totalPrice: 0,
    paidAmount: 0,
    mortgageAmount: 0,
    mortgageStatus: "pending" as "pending" | "held" | "returned" | "forfeited",
    pledgeStatus: "pending" as "pending" | "held" | "returned" | "forfeited",
    insuranceAmount: 0,
    pledgesDescription: "",
    pledgeImage: "",
    customerIdType: "",
    customerIdNumber: "",
    customerIdIssueDate: "",
    customerIdExpiryDate: "",
    customerIdIssuePlace: "",
    customerIdFrontImage: "",
    customerIdBackImage: "",
    currency: "YER",
    status: "confirmed" as "pending" | "confirmed" | "completed" | "cancelled",
    notes: "",
    generateTransaction: true,
    debitAccountId: "",
    creditAccountId: "",
    brokerId: "" as string | null,
    brokerName: "",
    guarantorId: "" as string | null,
    guarantorName: "",
    totalDiscount: 0,
    manualNumber: "",
    startTime: "16:00",
    endTime: "23:00",
    voucherDate: new Date().toISOString().split("T")[0],
  });

  const [isTransactionSectionOpen, setIsTransactionSectionOpen] = useState(false);

  const [showDayDetails, setShowDayDetails] = useState(false);

  // Auto creation of account indicator
  const [creatingRevenueAccount, setCreatingRevenueAccount] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(new Date());

  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);
  const [showRefundInsuranceModal, setShowRefundInsuranceModal] =
    useState(false);
  const [refundCashAccountId, setRefundCashAccountId] = useState("");
  const [showRefundDepositModal, setShowRefundDepositModal] = useState(false);
  const [refundDepositCashAccountId, setRefundDepositCashAccountId] =
    useState("");
  const [showRefundMortgageModal, setShowRefundMortgageModal] = useState(false);
  const [refundMortgageCashAccountId, setRefundMortgageCashAccountId] =
    useState("");
  const [showRefundPledgeModal, setShowRefundPledgeModal] = useState(false);
  const [showBookingAccountsStatementModal, setShowBookingAccountsStatementModal] =
    useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionManualNumber, setCollectionManualNumber] = useState("");
  const [collectionAmount, setCollectionAmount] = useState(0);
  const [collectionAccountId, setCollectionAccountId] = useState("");
  const [collectionCreditAccountId, setCollectionCreditAccountId] =
    useState("");
  const [isCollecting, setIsCollecting] = useState(false);
  const [refundVoucherDate, setRefundVoucherDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [openedExternally, setOpenedExternally] = useState(false);
  const [printDocType, setPrintDocType] = useState<
    "contract" | "official_lease_agreement" | "deposit" | "insurance" | "mortgage"
  >("contract");

  // Mobile Back Button Support for previewBooking modal
  const isHandlingBackRef = useRef(false);

  useEffect(() => {
    if (previewBooking) {
      isHandlingBackRef.current = true;
      window.history.pushState({ isPreviewBookingOpen: true }, "");
    } else {
      if (isHandlingBackRef.current) {
        isHandlingBackRef.current = false;
        if (window.history.state?.isPreviewBookingOpen) {
          window.history.back();
        }
      }
    }
  }, [previewBooking ? previewBooking.id : null]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (previewBooking) {
        isHandlingBackRef.current = false;
        setPreviewBooking(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [previewBooking]);

  const handleAuditAction = async (
    txId: string,
    status: "audited" | "rejected",
  ) => {
    if (!onUpdateTransaction) return;

    let notes = "";
    if (status === "rejected") {
      notes = prompt("يرجى كتابة سبب الرفض:") || "";
      if (!notes) return;
    } else {
      notes = "تم التدقيق والموافقة من شاشة معاينة الحجز";
    }

    try {
      const userName =
        currentUser?.username || currentUser?.name || "المدير المالي";
      const now = new Date().toISOString();

      await onUpdateTransaction(txId, {
        status,
        auditedBy: userName,
        auditedAt: now,
        auditNotes: notes,
      });

      if (status === "audited" && previewBooking) {
        const bId = previewBooking.id;
        const bSeq = previewBooking.sequenceCode;
        const targetTx = transactions.find((t) => t.id === txId);
        const sIdTarget = targetTx?.sourceId || "";
        const isCoreAccrual =
          sIdTarget.includes("-contract") ||
          sIdTarget.includes("-accrue-") ||
          sIdTarget.includes("-execute");
        const isDiscount = sIdTarget.includes("-discount");

        if (isCoreAccrual) {
          const relatedTxs = transactions.filter((t) => {
            if (t.id === txId || t.status === "audited") return false;
            const sId = t.sourceId || "";
            const matchesBooking =
              sId === bId ||
              (bSeq && sId === bSeq) ||
              sId.startsWith(`${bId}-`) ||
              (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
            const isCore =
              sId.includes("-contract") ||
              sId.includes("-accrue-") ||
              sId.includes("-execute");
            return matchesBooking && isCore && t.sourceType === "booking";
          });

          for (const relTx of relatedTxs) {
            await onUpdateTransaction(relTx.id, {
              status: "audited",
              auditedBy: userName,
              auditedAt: now,
              auditNotes: "اعتماد تلقائي لعمود الإجمالي قبل الخصم",
            });
          }
        } else if (isDiscount) {
          const relatedDiscountTxs = transactions.filter((t) => {
            if (t.id === txId || t.status === "audited") return false;
            const sId = t.sourceId || "";
            const matchesBooking =
              sId === bId ||
              (bSeq && sId === bSeq) ||
              sId.startsWith(`${bId}-`) ||
              (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
            return (
              matchesBooking &&
              sId.includes("-discount") &&
              t.sourceType === "booking"
            );
          });

          for (const relTx of relatedDiscountTxs) {
            await onUpdateTransaction(relTx.id, {
              status: "audited",
              auditedBy: userName,
              auditedAt: now,
              auditNotes: "اعتماد تلقائي لعمود الخصم",
            });
          }
        }
      } else if (status === "rejected" && previewBooking) {
        const targetTx = transactions.find((t) => t.id === txId);
        const sIdTarget = targetTx?.sourceId || "";
        const isCoreAccrual =
          sIdTarget.includes("-contract") ||
          sIdTarget.includes("-accrue-") ||
          sIdTarget.includes("-execute");
        const isDiscount = sIdTarget.includes("-discount");

        if (isCoreAccrual) {
          const bId = previewBooking.id;
          const bSeq = previewBooking.sequenceCode;
          const coreTxs = transactions.filter((t) => {
            if (t.id === txId || t.status === "rejected") return false;
            const sId = t.sourceId || "";
            const matchesBooking =
              sId === bId ||
              (bSeq && sId === bSeq) ||
              sId.startsWith(`${bId}-`) ||
              (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
            return (
              matchesBooking &&
              (sId.includes("-contract") ||
                sId.includes("-accrue-") ||
                sId.includes("-execute"))
            );
          });
          for (const cTx of coreTxs) {
            await onUpdateTransaction(cTx.id, {
              status: "rejected",
              auditedBy: userName,
              auditedAt: now,
              auditNotes: notes,
            });
          }
        } else if (isDiscount) {
          const bId = previewBooking.id;
          const bSeq = previewBooking.sequenceCode;
          const discountTxs = transactions.filter((t) => {
            if (t.id === txId || t.status === "rejected") return false;
            const sId = t.sourceId || "";
            const matchesBooking =
              sId === bId ||
              (bSeq && sId === bSeq) ||
              sId.startsWith(`${bId}-`) ||
              (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
            return (
              matchesBooking &&
              sId.includes("-discount") &&
              t.sourceType === "booking"
            );
          });
          for (const dTx of discountTxs) {
            await onUpdateTransaction(dTx.id, {
              status: "rejected",
              auditedBy: userName,
              auditedAt: now,
              auditNotes: notes,
            });
          }
        }
      }

      toast.success(
        status === "audited" ? "تم الاعتماد بنجاح" : "تم الرفض بنجاح",
      );
    } catch (err) {
      toast.error("حدث خطأ أثناء التحديث");
    }
  };

  React.useEffect(() => {
    if (externalPreviewBookingId && bookings.length > 0) {
      const booking = bookings.find((b) => b.id === externalPreviewBookingId);
      if (booking) {
        setPreviewBooking(booking);
        setOpenedExternally(true);
      }
      if (onClearExternalPreviewBookingId) {
        onClearExternalPreviewBookingId();
      }
    }
  }, [externalPreviewBookingId, bookings, onClearExternalPreviewBookingId]);

  React.useEffect(() => {
    if (initialBookingDate) {
      // Find the first hall that is available or just take the first hall if available
      const defaultHall = halls && halls.length > 0 ? halls[0] : null;
      
      if (defaultHall) {
        const price = defaultHall.price || 0;
        
        setBookingForm((prev) => ({
          ...prev,
          hallId: defaultHall.id,
          eventDates: [initialBookingDate],
          days: [
            {
              date: initialBookingDate,
              startTime: "16:00",
              endTime: "23:00",
              price: price,
              discount: 0,
            },
          ],
        }));
        setCurrentTab("bookings");
        setShowBookingModal(true);
        if (onClearInitialBookingDate) {
          onClearInitialBookingDate();
        }
      }
    }
  }, [initialBookingDate, onClearInitialBookingDate, halls]);

  const formatTimeTo12h = (time24: string): string => {
    if (!time24) return "";
    try {
      const [hoursStr, minutesStr] = time24.split(":");
      let hours = parseInt(hoursStr, 10);
      const minutes = minutesStr || "00";
      const ampm = hours >= 12 ? "م" : "ص";
      hours = hours % 12;
      hours = hours ? hours : 12; // standard 12 instead of 0
      return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
    } catch (e) {
      return time24;
    }
  };

  const get12hOptions = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const h24 = i.toString().padStart(2, "0") + ":00";
      const h12 = formatTimeTo12h(h24);
      return { value: h24, label: h12 };
    });
  };

  const printBookingPdf = () => {
    const doc = new jsPDF();
    const selectedHall = halls.find((h) => h.id === bookingForm.hallId);
    doc.setFont("helvetica");
    doc.setFontSize(18);
    doc.text("عقد حجز صالة", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`العميل: ${bookingForm.customerName}`, 20, 35);
    doc.text(`نوع الفعالية: ${bookingForm.eventType || "غير محدد"}`, 20, 45);
    doc.text(`الصالة: ${selectedHall?.name || ""}`, 20, 55);
    doc.text(
      `إجمالي القيمة: ${(bookingForm.totalPrice - bookingForm.totalDiscount).toLocaleString()} ${bookingForm.currency}`,
      20,
      65,
    );

    const tableData = bookingForm.days.map((day) => [
      day.date,
      day.price.toString(),
      day.discount.toString(),
      `${day.startTime} - ${day.endTime}`,
    ]);
    autoTable(doc, {
      head: [["التاريخ", "السعر", "الخصم", "الوقت"]],
      body: tableData,
      startY: 75,
    });
    doc.save(`عقد_حجز_${bookingForm.customerName}.pdf`);
  };

  const [clients, setClients] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [guarantors, setGuarantors] = useState<any[]>([]);

  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showBrokerSuggestions, setShowBrokerSuggestions] = useState(false);
  const [showGuarantorSuggestions, setShowGuarantorSuggestions] =
    useState(false);

  // Subscribe to data on mount
  useEffect(() => {
    const unsubHalls = subscribeHalls((data) => {
      setHalls(data);
    });
    const unsubBookings = subscribeBookings((data) => {
      setBookings(data);
      setLoading(false);
    });
    const unsubClients = subscribeClients((data) => {
      setClients(data);
    });
    const unsubBrokers = subscribeBrokers((data) => {
      setBrokers(data);
    });
    const unsubGuarantors = subscribeGuarantors((data) => {
      setGuarantors(data);
    });
    const unsubServices = subscribeServices((data) => {
      setServices(data);
    });
    const unsubCompany = subscribeCompanySettings((data) => {
      if (data && data.length > 0) {
        setCompany(data[0]);
      }
    });

    return () => {
      unsubHalls();
      unsubBookings();
      unsubClients();
      unsubBrokers();
      unsubGuarantors();
      unsubServices();
      unsubCompany();
    };
  }, []);

  const handleTotalDiscountChange = (val: number) => {
    const daysCount = bookingForm.days.length;
    const discountPerDay = daysCount > 0 ? Math.round(val / daysCount) : 0;
    const newDays = bookingForm.days.map((day) => ({
      ...day,
      discount: discountPerDay,
    }));
    setBookingForm((prev) => ({
      ...prev,
      totalDiscount: Math.round(val),
      days: newDays,
    }));
  };

  const handleDayDiscountChange = (idx: number, val: number) => {
    const newDays = [...bookingForm.days];
    newDays[idx].discount = Math.round(val);
    const newTotalDiscount = newDays
      .filter((d) => d.status !== "cancelled")
      .reduce((sum, d) => sum + (d.discount || 0), 0);
    setBookingForm((prev) => ({
      ...prev,
      days: newDays,
      totalDiscount: Math.round(newTotalDiscount),
    }));
  };

  // Synchronize days with eventDates and distribute current totalDiscount
  useEffect(() => {
    if (!bookingForm.hallId) return;
    const selectedHall = halls.find((h) => h.id === bookingForm.hallId);
    if (!selectedHall) return;

    const customEventPriceObj = selectedHall.eventPrices?.find(
      (ep) => ep.eventType === bookingForm.eventType,
    );
    const resolvedPrice = customEventPriceObj
      ? customEventPriceObj.price
      : selectedHall.price;

    const newDays = bookingForm.eventDates.map((date, idx) => {
      const exactMatch = bookingForm.days.find((d) => d.date === date);
      const existingDay = exactMatch || bookingForm.days[idx];

      if (existingDay) {
        const dayEventType = existingDay.eventType || bookingForm.eventType;
        const customDayPriceObj = selectedHall.eventPrices?.find(
          (ep) => ep.eventType === dayEventType,
        );
        const dayResolvedPrice = customDayPriceObj
          ? customDayPriceObj.price
          : resolvedPrice;

        const isDefaultOrKnownEventPrice =
          existingDay.price === 0 ||
          existingDay.price === selectedHall.price ||
          (selectedHall.eventPrices || []).some(
            (ep) => ep.price === existingDay.price,
          );

        return {
          ...existingDay,
          date,
          eventType: dayEventType,
          startTime: existingDay.startTime || bookingForm.startTime,
          endTime: existingDay.endTime || bookingForm.endTime,
          price: isDefaultOrKnownEventPrice ? dayResolvedPrice : existingDay.price,
          discount: existingDay.discount || 0,
        };
      }
      return {
        date,
        eventType: bookingForm.eventType,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        price: resolvedPrice,
        discount: 0,
      };
    });

    if (JSON.stringify(newDays) !== JSON.stringify(bookingForm.days)) {
      setBookingForm((prev) => ({ ...prev, days: newDays }));
    }
  }, [
    bookingForm.eventDates,
    bookingForm.hallId,
    bookingForm.startTime,
    bookingForm.endTime,
    bookingForm.eventType,
    halls,
  ]);

  // Auto-calculate total price
  useEffect(() => {
    const selectedHall = halls.find((h) => h.id === bookingForm.hallId);
    if (selectedHall) {
      const sumDaysBasePrice = (bookingForm.days || [])
        .filter((d) => d.status !== "cancelled")
        .reduce((sum, d) => sum + d.price, 0);
      const sumAdditionalServices = (
        bookingForm.additionalServices || []
      ).filter(s => s.status !== 'cancelled')
      .reduce((sum, s) => {
        const daysCount = s.appliedDates && s.appliedDates.length > 0
          ? s.appliedDates.length
          : (bookingForm.days || []).filter(d => d.status !== 'cancelled').length || 1;
        return sum + (s.cost * daysCount);
      }, 0);
      const rawTotal = Math.round(sumDaysBasePrice + sumAdditionalServices);
      const discount = Math.round(Number(bookingForm.totalDiscount) || 0);
      const netTotal = Math.round(rawTotal - discount);

      setBookingForm((prev) => ({
        ...prev,
        totalPrice: netTotal,
        currency: selectedHall.currency,
        // Only set default 30% if we are registering a brand new form (initial prices)
        paidAmount:
          prev.paidAmount === 500 && prev.totalPrice === 1500
            ? Math.round(netTotal * 0.3)
            : prev.paidAmount,
      }));
    }
  }, [
    bookingForm.hallId,
    bookingForm.days,
    bookingForm.additionalServices,
    bookingForm.totalDiscount,
    halls,
  ]);

  // Pre-fill fields on Hall edit
  useEffect(() => {
    if (editingHall) {
      setHallForm({
        name: editingHall.name,
        capacity: editingHall.capacity,
        price: editingHall.price,
        currency: editingHall.currency,
        location: editingHall.location,
        status: editingHall.status,
        features: editingHall.features,
        notes: editingHall.notes || "",
        eventPrices: editingHall.eventPrices || [],
      });
    } else {
      setHallForm({
        name: "",
        capacity: 250,
        price: 3000,
        currency: globalCurrencyCode,
        location: "",
        status: "active",
        features: [
          "نظام صوتي ستيريو متكامل",
          "إضاءة ليزر ومؤثرات بصرية",
          "تكييف هواء مركزي ذكي",
        ],
        notes: "",
        eventPrices: [],
      });
    }
  }, [editingHall, showHallModal, globalCurrencyCode]);

  // Auto-fill account endpoints on Booking Form open
  useEffect(() => {
    const defaultDebit =
      effectiveLinkedAccounts.cashBankAccountId ||
      accounts.find(
        (a) =>
          a.id === "1010101" ||
          a.code === "1010101" ||
          a.name?.includes("صندوق") ||
          a.id === "acc-1101",
      )?.id ||
      "1010101";
    const defaultCredit =
      effectiveLinkedAccounts.hallRevenueAccountId ||
      effectiveLinkedAccounts.preEventRevenueAccountId ||
      accounts.find(
        (a) =>
          a.id === "40101" ||
          a.code === "40101" ||
          a.name?.includes("ايجارات القاعة") ||
          a.code === "41",
      )?.id ||
      "40101";

    setBookingForm((prev) => ({
      ...prev,
      debitAccountId: prev.debitAccountId || defaultDebit,
      creditAccountId: prev.creditAccountId || defaultCredit,
    }));
  }, [showBookingModal, bookingForm.currency, accounts, effectiveLinkedAccounts]);

  // Helper conversions to Global converted currency
  const convertAmount = (amount: number, fromCurrencyCode: string): number => {
    const fromRate =
      currencies.find((c) => c.code === fromCurrencyCode)?.rateToBase || 1;
    const amountInBase = amount * fromRate;
    const targetRate =
      currencies.find((c) => c.code === globalCurrencyCode)?.rateToBase || 1;
    return amountInBase / targetRate;
  };

  // Create "Halls Revenue" Account automatically in the Chart of Accounts if needed
  const handleCreateHallsRevenueAccount = async () => {
    setCreatingRevenueAccount(true);
    try {
      const code = "4102";
      const accountName = "إيرادات حجز وصيانة قاعات المناسبات";

      const newAccId = await addAccount({
        code,
        name: accountName,
        type: "revenue",
        parentId: "acc-4", // main revenues folder node
        balance: 0,
        currency: "YER",
        notes:
          "الإيرادات والعائدات المحصلة من حجز الصالات والقاعات ومستلزمات الحفلات",
        isTransactional: true,
      });

      // Update local dropdown selection
      setBookingForm((prev) => ({
        ...prev,
        creditAccountId: newAccId,
      }));
      alert(
        "تمت إضافة حساب (إيرادات حجز وصيانة قاعات المناسبات) بنجاح إلى دليل الحسابات الهرمي!",
      );
    } catch (e) {
      console.error("Failed creating revenue account:", e);
    } finally {
      setCreatingRevenueAccount(false);
    }
  };

  // Hall Submit
  const handleHallFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallForm.name.trim()) return;

    try {
      if (editingHall) {
        await updateHall(editingHall.id, hallForm);
        toast.success("تم تحديث بيانات القاعة بنجاح");
      } else {
        await addHall(hallForm);
        toast.success("تمت إضافة القاعة بنجاح");
      }

      setShowHallModal(false);
      setEditingHall(null);
    } catch (err) {
      toast.error("حدث خطأ أثناء حفظ القاعة");
    }
  };

  const handlePledgeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(
            reader.result as string,
            600,
            600,
            0.5,
          );
          setBookingForm((prev) => ({
            ...prev,
            pledgeImage: compressed,
          }));
        } catch (err) {
          console.error("Compression failed:", err);
          setBookingForm((prev) => ({
            ...prev,
            pledgeImage: reader.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [isProcessingIdOcr, setIsProcessingIdOcr] = useState(false);

  const handleIdFrontImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(
            reader.result as string,
            600,
            600,
            0.5,
          );
          setBookingForm((prev) => ({
            ...prev,
            customerIdFrontImage: compressed,
          }));
        } catch (err) {
          console.error("Compression failed:", err);
          setBookingForm((prev) => ({
            ...prev,
            customerIdFrontImage: reader.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdBackImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(
            reader.result as string,
            600,
            600,
            0.5,
          );
          setBookingForm((prev) => ({
            ...prev,
            customerIdBackImage: compressed,
          }));
        } catch (err) {
          console.error("Compression failed:", err);
          setBookingForm((prev) => ({
            ...prev,
            customerIdBackImage: reader.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdOcr = async () => {
    if (!bookingForm.customerIdFrontImage && !bookingForm.customerIdBackImage) {
      toast.error("يرجى إرفاق صورة الهوية الأمامية أو الخلفية أولاً!");
      return;
    }

    setIsProcessingIdOcr(true);
    const toastId = toast.loading(
      "جاري تحليل صورة الهوية واستخراج البيانات عبر الذكاء الاصطناعي...",
    );
    try {
      const response = await fetch("/api/ocr-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontImage: bookingForm.customerIdFrontImage || undefined,
          backImage: bookingForm.customerIdBackImage || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("فشلت عملية قراءة الهوية");
      }

      const data = await response.json();
      setBookingForm((prev) => ({
        ...prev,
        customerIdType: data.idType || prev.customerIdType || "بطاقة شخصية",
        customerIdNumber: data.idNumber || prev.customerIdNumber,
        customerIdIssueDate: data.issueDate || prev.customerIdIssueDate,
        customerIdExpiryDate: data.expiryDate || prev.customerIdExpiryDate,
        customerIdIssuePlace: data.issuePlace || prev.customerIdIssuePlace,
      }));
      toast.success("تم استخراج بيانات الهوية بنجاح عبر الذكاء الاصطناعي! 🎉", {
        id: toastId,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(
        "تعذر التعرف التلقائي على الهوية. يرجى إدخال البيانات يدوياً.",
        { id: toastId },
      );
    } finally {
      setIsProcessingIdOcr(false);
    }
  };

  // Booking Submit
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const handleBookingFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !bookingForm.hallId ||
      !bookingForm.customerName.trim() ||
      !bookingForm.eventDates ||
      bookingForm.eventDates.length === 0
    )
      return;

    if (!bookingForm.startTime || !bookingForm.endTime) {
      toast.error(
        "⚠️ يرجى تحديد الوقت المتفق عليه للفترة بدقة (بداية ونهاية الوقت)!",
      );
      return;
    }

    setIsSavingBooking(true);
    try {
      const now = new Date().toISOString();
      const userName = currentUser?.username || currentUser?.name || "System";
      const createdBy = userName;

      const bookingParam: any = {
        hallId: bookingForm.hallId,
        customerName: bookingForm.customerName,
        customerPhone: bookingForm.customerPhone,
        eventType: bookingForm.eventType || "",
        eventDates: bookingForm.eventDates,
        additionalServices: bookingForm.additionalServices,
        period: bookingForm.period,
        startTime: bookingForm.startTime || "",
        endTime: bookingForm.endTime || "",
        totalPrice: Number(bookingForm.totalPrice),
        paidAmount: Number(bookingForm.paidAmount),
        insuranceAmount: Number(bookingForm.insuranceAmount || 0),
        mortgageAmount: Number(bookingForm.mortgageAmount || 0),
        mortgageStatus: bookingForm.mortgageStatus || "pending",
        pledgeStatus: bookingForm.pledgeStatus || "pending",
        pledgesDescription: bookingForm.pledgesDescription || "",
        pledgeImage: bookingForm.pledgeImage || "",
        customerIdType: bookingForm.customerIdType || "",
        customerIdNumber: bookingForm.customerIdNumber || "",
        customerIdIssueDate: bookingForm.customerIdIssueDate || "",
        customerIdExpiryDate: bookingForm.customerIdExpiryDate || "",
        customerIdIssuePlace: bookingForm.customerIdIssuePlace || "",
        customerIdFrontImage: bookingForm.customerIdFrontImage || "",
        customerIdBackImage: bookingForm.customerIdBackImage || "",
        currency: bookingForm.currency,
        status: bookingForm.status,
        notes: bookingForm.notes,
        linkedTransactionId: editingBooking?.linkedTransactionId || null,
        brokerId: bookingForm.brokerId || null,
        brokerName: bookingForm.brokerName || "",
        guarantorId: bookingForm.guarantorId || null,
        guarantorName: bookingForm.guarantorName || "",
        totalDiscount: Number(bookingForm.totalDiscount),
        manualNumber: bookingForm.manualNumber?.trim() || "",
        days: bookingForm.days,
        voucherDate: bookingForm.voucherDate || now.split("T")[0],
        updatedBy: userName,
        updatedAt: now,
      };

      let savedId = editingBooking?.id || "";
      if (editingBooking?.id) {
        if (!hasPermission("edit-booking")) {
          toast.error("عذراً، ليس لديك صلاحية تعديل الحجز.");
          setIsSavingBooking(false);
          return;
        }
        await updateBooking(editingBooking.id, bookingParam);
        toast.success("تم تعديل حجز المناسبة وتحديث العقد بنجاح!");
        if (bookingParam.status === "completed") {
          await handleEventCompletionTransaction({
            ...bookingParam,
            id: editingBooking.id,
          });
        }
      } else {
        if (!hasPermission("create-booking")) {
          toast.error("عذراً، ليس لديك صلاحية إنشاء حجوزات جديدة.");
          setIsSavingBooking(false);
          return;
        }
        bookingParam.createdBy = userName;
        bookingParam.createdAt = now;
        savedId = await addBooking(bookingParam);
        toast.success("تم تسجيل حجز المناسبة وتوثيق العقد بنجاح!");
        if (bookingParam.status === "completed") {
          await handleEventCompletionTransaction({
            ...bookingParam,
            id: savedId,
          });
        }

        // Handle automatic double entry & vouchers for NEW bookings
        const bookingSettingsData = effectiveLinkedAccounts as any;
        const autoDebitAccId =
          currentUser?.defaultCashboxId ||
          bookingForm.debitAccountId ||
          bookingSettingsData?.cashBankAccountId ||
          accounts.find(
            (a) =>
              a.isTransactional &&
              (a.code === "1101" ||
                a.code === "1010101" ||
                a.name?.includes("الصندوق") ||
                a.name?.includes("نقدية")),
          )?.id ||
          accounts.find((a) => a.isTransactional && a.type === "asset")?.id ||
          "acc-1101";

        const autoCreditAccId =
          bookingForm.creditAccountId ||
          bookingSettingsData?.hallRevenueAccountId ||
          bookingSettingsData?.preEventRevenueAccountId ||
          accounts.find(
            (a) =>
              a.isTransactional &&
              (a.code === "4101" ||
                a.code === "40101" ||
                a.name?.includes("إيراد") ||
                a.name?.includes("حجز")),
          )?.id ||
          accounts.find((a) => a.isTransactional && a.type === "revenue")?.id ||
          "acc-4101";

        // Find the client's financial account (linkedAccountId)
        const matchedClient = clients.find(
          (c) =>
            c.name === bookingForm.customerName ||
            (c.phone && c.phone === bookingForm.customerPhone),
        );
        const clientAccountId =
          matchedClient?.linkedAccountId ||
          bookingSettingsData?.accountsReceivableId ||
          accounts.find(
            (a) =>
              a.isTransactional &&
              (a.code === "1104" ||
                a.code === "1010301" ||
                a.name === "الزبائن والحجوزات" ||
                (a.name?.includes("عملاء") && !a.name?.includes("خصم")) ||
                a.name?.includes("المدينون")),
          )?.id ||
          accounts.find((a) => a.isTransactional && a.type === "asset")?.id ||
          "acc-1104";

        const insuranceCreditAccId =
          bookingSettingsData?.insuranceCreditAccountId ||
          bookingSettingsData?.guaranteeAccountId ||
          accounts.find(
            (a) =>
              a.isTransactional &&
              (a.code === "2102" ||
                a.code === "2010202" ||
                a.name?.includes("تأمين") ||
                a.name?.includes("ضمان")),
          )?.id ||
          accounts.find((a) => a.isTransactional && a.type === "liability")?.id ||
          "acc-2102";

        const mortgageCreditAccId =
          bookingSettingsData?.mortgageCreditAccountId ||
          bookingSettingsData?.bookingMortgageAccountId ||
          accounts.find(
            (a) =>
              a.isTransactional &&
              (a.code === "2103" ||
                a.code === "2010203" ||
                a.name?.includes("رهن")),
          )?.id ||
          accounts.find((a) => a.isTransactional && a.type === "liability")?.id ||
          "acc-2103";

        const depositCreditAccId =
          bookingSettingsData?.depositCreditAccountId ||
          bookingSettingsData?.accountsReceivableId ||
          clientAccountId ||
          accounts.find((a) => a.isTransactional && a.type === "asset")?.id ||
          "acc-1104";

        const selectedHall = halls.find((h) => h.id === bookingForm.hallId);

        try {
          if (bookingForm.generateTransaction && autoDebitAccId) {
            const currentRate =
              currencies.find((c) => c.code === bookingForm.currency)
                ?.rateToBase || 1;

            // 1. Generate Deposit Voucher & Transaction (Credit Account is client's account)
            if (bookingForm.paidAmount > 0) {
              const depositVoucher = {
                type: "receipt",
                manualNumber: bookingForm.manualNumber?.trim() || "",
                date:
                  bookingForm.voucherDate ||
                  new Date().toISOString().split("T")[0],
                amount: Number(bookingForm.paidAmount) || 0,
                currency: bookingForm.currency,
                cashBankAccountId: autoDebitAccId,
                fromToAccountId: depositCreditAccId,
                description: `سند قبض عربون حجز صالة (${selectedHall?.name || ""}) - العميل: ${bookingForm.customerName}`,
                linkedBookingId: savedId,
              };
              const vIdDeposit = await addVoucher({
                ...depositVoucher,
                createdBy,
              });

              await addTransactionWithDoubleEntry(
                {
                  date: depositVoucher.date,
                  description: depositVoucher.description,
                  manualNumber: bookingForm.manualNumber?.trim() || "",
                  amount: depositVoucher.amount,
                  currency: depositVoucher.currency,
                  rate: currentRate,
                  sourceType: "voucher",
                  sourceId: vIdDeposit,
                  debitAccountId: autoDebitAccId,
                  creditAccountId: depositCreditAccId,
                  createdBy,
                },
                currencies,
                accounts,
              );
            }

            // 2. Generate Insurance Voucher & Transaction
            if (bookingForm.insuranceAmount > 0) {
              const insVoucher = {
                type: "receipt",
                manualNumber: bookingForm.manualNumber?.trim() || "",
                date:
                  bookingForm.voucherDate ||
                  new Date().toISOString().split("T")[0],
                amount: Number(bookingForm.insuranceAmount) || 0,
                currency: bookingForm.currency,
                cashBankAccountId: autoDebitAccId,
                fromToAccountId: insuranceCreditAccId,
                description: `سند قبض تأمين حجز صالة (${selectedHall?.name || ""}) - العميل: ${bookingForm.customerName}`,
                linkedBookingId: savedId,
              };
              const vId = await addVoucher({ ...insVoucher, createdBy });

              await addTransactionWithDoubleEntry(
                {
                  date: insVoucher.date,
                  description: insVoucher.description,
                  manualNumber: bookingForm.manualNumber?.trim() || "",
                  amount: insVoucher.amount,
                  currency: insVoucher.currency,
                  rate: currentRate,
                  sourceType: "voucher",
                  sourceId: vId,
                  debitAccountId: autoDebitAccId,
                  creditAccountId: insuranceCreditAccId,
                  createdBy,
                },
                currencies,
                accounts,
              );
            }

            // 3. Generate Mortgage Voucher & Transaction
            if (bookingForm.mortgageAmount > 0 && mortgageCreditAccId) {
              const mortgageVoucher = {
                type: "receipt",
                date:
                  bookingForm.voucherDate ||
                  new Date().toISOString().split("T")[0],
                amount: Number(bookingForm.mortgageAmount) || 0,
                currency: bookingForm.currency,
                cashBankAccountId: autoDebitAccId,
                fromToAccountId: mortgageCreditAccId,
                description: `سند قبض رهن حجز صالة (${selectedHall?.name || ""}) - العميل: ${bookingForm.customerName}`,
                linkedBookingId: savedId,
              };
              const vId = await addVoucher({ ...mortgageVoucher, createdBy });

              await addTransactionWithDoubleEntry(
                {
                  date: mortgageVoucher.date,
                  description: mortgageVoucher.description,
                  amount: mortgageVoucher.amount,
                  currency: mortgageVoucher.currency,
                  rate: currentRate,
                  sourceType: "voucher",
                  sourceId: vId,
                  debitAccountId: autoDebitAccId,
                  creditAccountId: mortgageCreditAccId,
                  createdBy,
                },
                currencies,
                accounts,
              );
            }
          }
        } catch (finErr) {
          console.warn("Auto financial vouchers/transaction sync warning:", finErr);
        }
      }

      // Close modal
      setShowBookingModal(false);

      const fullSavedBookingObj: Booking = {
        ...bookingParam,
        id: savedId,
        createdAt: editingBooking?.createdAt || new Date().toISOString(),
      };

      // Reset form
      setBookingForm({
        hallId: "",
        customerName: "",
        customerPhone: "",
        eventType: "",
        eventDates: [] as string[],
        days: [] as any[],
        additionalServices: [] as { name: string; cost: number }[],
        period: "evening",
        startTime: "16:00",
        endTime: "23:00",
        totalPrice: 1500,
        paidAmount: 500,
        insuranceAmount: 0,
        mortgageAmount: 0,
        mortgageStatus: "pending",
        pledgesDescription: "",
        pledgeImage: "",
        customerIdType: "",
        customerIdNumber: "",
        customerIdIssueDate: "",
        customerIdExpiryDate: "",
        customerIdIssuePlace: "",
        customerIdFrontImage: "",
        customerIdBackImage: "",
        currency: globalCurrencyCode,
        status: "confirmed",
        notes: "",
        generateTransaction: true,
        debitAccountId: "",
        creditAccountId: "",
        brokerId: "",
        brokerName: "",
        guarantorId: "",
        guarantorName: "",
        totalDiscount: 0,
        manualNumber: "",
        pledgeStatus: "pending",
        voucherDate: new Date().toISOString().split("T")[0],
      });

      setEditingBooking(null);

      // Instantly open the Contract Preview and Print modal for this saved booking
      setPreviewBooking(fullSavedBookingObj);
    } catch (err) {
      console.error("Booking save failed:", err);
      toast.error(
        "فشل ترحيل وحفظ بيانات الحجز على السحابة، يرجى تكرار المحاولة.",
      );
    } finally {
      setIsSavingBooking(false);
    }
  };

  // Booking quick actions
  const handleEventCompletionTransaction = async (booking: any) => {
    // Prevent duplicate entry
    const completionExists = transactions.some(
      (t) =>
        t.sourceId === booking.id &&
        t.sourceType === "booking" &&
        t.description?.includes("إيراد الفعالية"),
    );

    if (completionExists) return;

    const bookingSettingsData = effectiveLinkedAccounts as any;
    const preEventAccId =
      bookingSettingsData?.preEventRevenueAccountId || "40101";
    const postEventAccId =
      bookingSettingsData?.postEventRevenueAccountId ||
      bookingSettingsData?.hallRevenueAccountId ||
      "40101";

    if (!preEventAccId || !postEventAccId) {
      console.warn(
        "Pre or Post event revenue account is not set in bookingSettings",
      );
      return;
    }

    const currentRate =
      currencies.find((c) => c.code === booking.currency)?.rateToBase || 1;

    try {
      const createdBy = currentUser?.username || currentUser?.name || "System";
      await processBookingAction(
        "EXECUTE",
        booking,
        currencies,
        accounts,
        linkedAccounts || bookingSettings as any,
        createdBy,
      );
      toast.success("تم ترحيل إيراد الفعالية بنجاح!");
    } catch (err) {
      console.error("Failed to process EXECUTE action", err);
      toast.error("حدث خطأ أثناء ترحيل إيراد الفعالية");
    }
  };

  const handleCollectInternal = async () => {
    if (!previewBooking || !onCollectPayment) return;

    if (collectionAmount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح للتحصيل");
      return;
    }

    if (!collectionAccountId) {
      toast.error("يرجى اختيار حساب التحصيل (الصندوق/البنك)");
      return;
    }

    setIsCollecting(true);
    try {
      await onCollectPayment(
        previewBooking.id,
        collectionAmount,
        collectionAccountId,
        collectionCreditAccountId,
        refundVoucherDate,
        collectionManualNumber.trim() || "",
      );

      // Update local preview booking to reflect new paid amount for visual consistency
      setPreviewBooking({
        ...previewBooking,
        subsequentPayments:
          (previewBooking.subsequentPayments || 0) + collectionAmount,
      });

      setShowCollectionModal(false);
      setCollectionAmount(0);
      setCollectionManualNumber("");
    } catch (error: any) {
      toast.error(error.message || "فشل تحصيل المبلغ");
    } finally {
      setIsCollecting(false);
    }
  };

  // Booking quick actions
  const handleRefundInsurance = async () => {
    if (!previewBooking) return;

    if (!hasPermission("refund-insurance")) {
      toast.error("عذراً، ليس لديك صلاحية صرف واسترجاع مبلغ التأمين.");
      return;
    }

    if (previewBooking.insuranceRefunded) {
      toast.error("تم رد التأمين مسبقاً لهذا الحجز");
      return;
    }

    const bookingSettingsData = bookingSettings as any;
    const insuranceAmount = previewBooking.insuranceAmount || 0;

    if (insuranceAmount <= 0) {
      toast.error("لا يوجد مبلغ تأمين لهذا الحجز");
      return;
    }

    try {
      const vId = `VCH-${Date.now()}`;
      const cashAccId =
        currentUser?.defaultCashboxId ||
        refundCashAccountId ||
        effectiveLinkedAccounts.cashBankAccountId ||
        "1010101";
      const guaranteeAccId =
        effectiveLinkedAccounts.insuranceDebitAccountId ||
        effectiveLinkedAccounts.guaranteeAccountId ||
        "2010202";

      // 1. Create Transaction (Reversal: Dr. Insurance Account, Cr. Cash/Bank)
      const createdBy = currentUser?.username || currentUser?.name || "System";
      await addTransactionWithDoubleEntry(
        {
          date: refundVoucherDate || new Date().toISOString(),
          description: `رد تأمين حجز: ${previewBooking.customerName} - ${previewBooking.id}`,
          amount: insuranceAmount,
          currency: previewBooking.currency,
          rate: 1,
          sourceType: "voucher",
          sourceId: vId,
          debitAccountId: guaranteeAccId,
          creditAccountId: cashAccId,
          createdBy,
        },
        currencies,
        accounts,
      );

      // 2. Create Payment Voucher
      await addVoucher({
        id: vId,
        bookingId: previewBooking.id,
        type: "payment",
        amount: insuranceAmount,
        currency: previewBooking.currency,
        date: refundVoucherDate || new Date().toISOString(),
        customerName: previewBooking.customerName,
        note: `رد تأمين الحجز رقم: ${previewBooking.id}`,
        accountId: cashAccId,
        createdAt: Date.now(),
        createdBy,
      });

      toast.success("تم رد التأمين وتوليد قيد الصرف بنجاح");
      const updatedFields = {
        insuranceRefunded: true,
        updatedBy: currentUser?.username || currentUser?.name || "System",
        updatedAt: new Date().toISOString(),
      };
      await updateBooking(previewBooking.id, updatedFields);
      setPreviewBooking((prev) => (prev ? { ...prev, ...updatedFields } : null));
      setShowRefundInsuranceModal(false);
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes("موجود مسبقاً")) {
        const updatedFields = {
          insuranceRefunded: true,
          updatedBy: currentUser?.username || currentUser?.name || "System",
          updatedAt: new Date().toISOString(),
        };
        await updateBooking(previewBooking.id, updatedFields);
        setPreviewBooking((prev) => (prev ? { ...prev, ...updatedFields } : null));
        toast.info("تم تحديث حالة الحجز، قيد رد التأمين موجود بالفعل.");
        setShowRefundInsuranceModal(false);
        return;
      }
      toast.error("حدث خطأ أثناء رد التأمين");
    }
  };

  const handleRefundDeposit = async () => {
    if (!previewBooking) return;

    const approvedRequest = depositRefundRequests.find(
      (r) =>
        r.bookingId === previewBooking.id &&
        r.status === "approved" &&
        !r.refunded &&
        (r.approvedAmount || 0) > 0,
    );

    if (!approvedRequest) {
      toast.error("عذراً، لا يوجد طلب رد عربون معتمد ومتاح للرد لهذا الحجز.");
      return;
    }

    const refundAmount =
      approvedRequest.approvedAmount || approvedRequest.requestedAmount;
    if (refundAmount <= 0) {
      toast.error("المبلغ المعتمد لرد العربون غير صالح.");
      return;
    }

    try {
      const vId = `VCH-${Date.now()}`;
      const bookingSettingsData = bookingSettings as any;
      const cashAccId =
        currentUser?.defaultCashboxId ||
        refundDepositCashAccountId ||
        bookingSettingsData?.cashBankAccountId ||
        "acc-1101";
      const depositDebitAccId =
        bookingSettingsData?.accountsReceivableId ||
        bookingSettingsData?.depositCreditAccountId ||
        bookingSettingsData?.preEventRevenueAccountId ||
        "acc-1201";

      const createdBy = currentUser?.username || currentUser?.name || "System";

      // 1. Double Entry (Reversal: Debit: Pre-Event Revenue, Credit: Cash/Bank)
      await addTransactionWithDoubleEntry(
        {
          date: refundVoucherDate || new Date().toISOString(),
          description: `رد عربون حجز: ${previewBooking.customerName} - ${previewBooking.id}`,
          amount: refundAmount,
          currency: previewBooking.currency,
          rate: 1,
          sourceType: "voucher",
          sourceId: vId,
          debitAccountId: depositDebitAccId,
          creditAccountId: cashAccId,
          createdBy,
        },
        currencies,
        accounts,
      );

      // 2. Create Payment Voucher
      await addVoucher({
        id: vId,
        bookingId: previewBooking.id,
        type: "payment",
        amount: refundAmount,
        currency: previewBooking.currency,
        date: refundVoucherDate || new Date().toISOString(),
        customerName: previewBooking.customerName,
        note: `رد عربون حجز رقم: ${previewBooking.id} بموجب طلب الاعتماد رقم ${approvedRequest.sequenceCode || approvedRequest.id}`,
        cashBankAccountId: cashAccId,
        createdAt: Date.now(),
        createdBy,
      });

      // 3. Update the request to refunded: true
      await updateDepositRefundRequest(approvedRequest.id, {
        refunded: true,
        refundVoucherId: vId,
        updatedAt: new Date().toISOString(),
      });

      // 4. Update Booking
      const updatedFields = {
        depositRefunded: true,
        depositRefundedAmount:
          (Number(previewBooking.depositRefundedAmount) || 0) + refundAmount,
        updatedBy: createdBy,
        updatedAt: new Date().toISOString(),
      };
      await updateBooking(previewBooking.id, updatedFields);
      setPreviewBooking((prev) => (prev ? { ...prev, ...updatedFields } : null));

      toast.success("تم رد العربون وتوليد قيد الصرف بنجاح");
      setShowRefundDepositModal(false);
    } catch (error: any) {
      console.error(error);
      toast.error(`حدث خطأ أثناء رد العربون: ${error.message || error}`);
    }
  };

  const handleRefundMortgage = async () => {
    if (!previewBooking) return;

    if (!hasPermission("refund-mortgage")) {
      toast.error("عذراً، ليس لديك صلاحية صرف واسترجاع مبلغ الرهن.");
      return;
    }

    if (previewBooking.mortgageStatus === "returned") {
      toast.error("تم رد الرهن المالي مسبقاً لهذا الحجز");
      return;
    }

    const bookingSettingsData = bookingSettings as any;
    const mortgageAmount = previewBooking.mortgageAmount || 0;

    if (mortgageAmount <= 0) {
      toast.error("لا يوجد مبلغ رهن مالي لهذا الحجز");
      return;
    }

    try {
      const vId = `VCH-${Date.now()}`;
      const cashAccId =
        currentUser?.defaultCashboxId ||
        refundMortgageCashAccountId ||
        effectiveLinkedAccounts.cashBankAccountId ||
        "1010101";
      const mortgageAccId =
        effectiveLinkedAccounts.mortgageDebitAccountId ||
        effectiveLinkedAccounts.bookingMortgageAccountId ||
        "2010203";

      // 1. Create Transaction (Reversal: Dr. Mortgage Account, Cr. Cash/Bank)
      const createdBy = currentUser?.username || currentUser?.name || "System";
      await addTransactionWithDoubleEntry(
        {
          date: refundVoucherDate || new Date().toISOString(),
          description: `رد الرهن المالي لحجز: ${previewBooking.customerName} - ${previewBooking.id}`,
          amount: mortgageAmount,
          currency: previewBooking.currency,
          rate: 1,
          sourceType: "voucher",
          sourceId: vId,
          debitAccountId: mortgageAccId,
          creditAccountId: cashAccId,
          createdBy,
        },
        currencies,
        accounts,
      );

      // 2. Create Payment Voucher
      await addVoucher({
        id: vId,
        bookingId: previewBooking.id,
        type: "payment",
        amount: mortgageAmount,
        currency: previewBooking.currency,
        date: refundVoucherDate || new Date().toISOString(),
        customerName: previewBooking.customerName,
        note: `رد الرهن المالي للحجز رقم: ${previewBooking.id}`,
        accountId: cashAccId,
        createdAt: Date.now(),
        createdBy,
      });

      toast.success("تم رد الرهن المالي وتوليد قيد الصرف بنجاح");
      const updatedFields = {
        mortgageStatus: "returned" as const,
        updatedBy: currentUser?.username || currentUser?.name || "System",
        updatedAt: new Date().toISOString(),
      };
      await updateBooking(previewBooking.id, updatedFields);
      setPreviewBooking((prev) => (prev ? { ...prev, ...updatedFields } : null));
      setShowRefundMortgageModal(false);
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes("موجود مسبقاً")) {
        const updatedFields = {
          mortgageStatus: "returned" as const,
          updatedBy: currentUser?.username || currentUser?.name || "System",
          updatedAt: new Date().toISOString(),
        };
        await updateBooking(previewBooking.id, updatedFields);
        setPreviewBooking((prev) => (prev ? { ...prev, ...updatedFields } : null));
        toast.info("تم تحديث حالة الحجز، قيد رد الرهن موجود بالفعل.");
        setShowRefundMortgageModal(false);
        return;
      }
      toast.error("حدث خطأ أثناء رد الرهن المالي");
    }
  };

  const handleRefundPledge = async () => {
    if (!previewBooking) return;

    if (previewBooking.pledgeStatus === "returned") {
      toast.error("تم رد الرهن العيني مسبقاً لهذا الحجز");
      return;
    }

    try {
      const updatedFields = {
        pledgeStatus: "returned" as const,
        updatedBy: currentUser?.username || currentUser?.name || "System",
        updatedAt: new Date().toISOString(),
      };
      await updateBooking(previewBooking.id, updatedFields);
      setPreviewBooking((prev) => (prev ? { ...prev, ...updatedFields } : null));
      toast.success("تم رد الرهن العيني (المادي) بنجاح");
      setShowRefundPledgeModal(false);
    } catch (error: any) {
      console.error(error);
      toast.error("حدث خطأ أثناء رد الرهن العيني");
    }
  };

  const handleUnpostBooking = async (booking: Booking) => {
    try {
      const confirmDelete = window.confirm(
        "هل أنت متأكد من إلغاء كافة قيود وسندات هذا الحجز؟ هذا الإجراء لا يمكن التراجع عنه.",
      );
      if (!confirmDelete) return;

      // 1. Delete all transactions linked to this booking
      const linkedTransactions = transactions.filter((t) =>
        t.sourceId?.includes(booking.id),
      );

      // 2. Delete all vouchers linked to this booking
      const linkedVouchers =
        vouchers?.filter((v) => v.linkedBookingId === booking.id) || [];

      // Delete any transactions generated by those vouchers (fallback)
      const voucherIds = linkedVouchers.map((v) => v.id);
      const voucherTransactions = transactions.filter(
        (t) =>
          t.sourceId &&
          voucherIds.includes(t.sourceId) &&
          t.sourceType === "voucher",
      );

      const allTxToDelete = [...linkedTransactions, ...voucherTransactions];

      for (const tx of allTxToDelete) {
        if (tx.id) await deleteTransaction(tx.id);
      }

      for (const v of linkedVouchers) {
        if (v.id) await deleteVoucher(v.id);
      }

      // 3. Reset booking flags
      await updateBooking(booking.id, {
        revenueAccrued: false,
        insuranceRefunded: false,
        mortgageStatus: undefined,
        pledgeStatus: undefined,
      });

      toast.success("تم إلغاء ترحيل كافة قيود وسندات الحجز بنجاح");
      setPreviewBooking({
        ...booking,
        revenueAccrued: false,
        insuranceRefunded: false,
        mortgageStatus: undefined,
        pledgeStatus: undefined,
      });
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء إلغاء ترحيل القيود");
    }
  };

  const handlePostInitialEntries = async (booking: Booking) => {
    try {
      const confirmPost = window.confirm(
        "هل أنت متأكد من ترحيل القيود والسندات الأولية لهذا الحجز؟",
      );
      if (!confirmPost) return;

      const bookingSettingsData = effectiveLinkedAccounts as any;
      const autoDebitAccId =
        currentUser?.defaultCashboxId ||
        bookingSettingsData?.cashBankAccountId ||
        "1010101";
      const insuranceCreditAccId =
        bookingSettingsData?.insuranceCreditAccountId ||
        bookingSettingsData?.guaranteeAccountId ||
        "2010202";
      const mortgageCreditAccId =
        bookingSettingsData?.mortgageCreditAccountId ||
        bookingSettingsData?.bookingMortgageAccountId ||
        "2010203";
      const selectedHall = halls.find((h) => h.id === booking.hallId);

      const matchedClient = clients.find(
        (c) =>
          c.name === booking.customerName ||
          (c.phone && c.phone === booking.customerPhone),
      );
      const clientAccountId =
        matchedClient?.linkedAccountId ||
        bookingSettingsData?.accountsReceivableId ||
        accounts.find(
          (a) =>
            a.code === "1010301" ||
            a.name === "الزبائن والحجوزات" ||
            (a.name?.includes("عملاء") && !a.name?.includes("خصم")) ||
            a.name?.includes("المدينون"),
        )?.id ||
        "1010301";

      if (autoDebitAccId) {
        const currentRate =
          currencies.find((c) => c.code === booking.currency)?.rateToBase || 1;

        if (booking.paidAmount > 0) {
          const depositVoucher = {
            type: "receipt" as "receipt" | "payment",
            date: booking.voucherDate || new Date().toISOString().split("T")[0],
            amount: booking.paidAmount,
            currency: booking.currency,
            cashBankAccountId: autoDebitAccId,
            fromToAccountId: clientAccountId,
            description: `سند قبض عربون حجز صالة (${selectedHall?.name || ""}) - العميل: ${booking.customerName}`,
            linkedBookingId: booking.id,
            createdBy: currentUser?.username || currentUser?.name || "System",
          };
          const vId = await addVoucher(depositVoucher);

          await addTransactionWithDoubleEntry(
            {
              date: depositVoucher.date,
              description: depositVoucher.description,
              amount: depositVoucher.amount,
              currency: depositVoucher.currency,
              rate: currentRate,
              sourceType: "voucher",
              sourceId: vId,
              debitAccountId: autoDebitAccId,
              creditAccountId: clientAccountId,
              createdBy: currentUser?.username || currentUser?.name || "System",
            },
            currencies,
            accounts,
          );
        }

        if (
          booking.insuranceAmount &&
          booking.insuranceAmount > 0 &&
          insuranceCreditAccId
        ) {
          const insVoucher = {
            type: "receipt" as "receipt" | "payment",
            date: booking.voucherDate || new Date().toISOString().split("T")[0],
            amount: booking.insuranceAmount,
            currency: booking.currency,
            cashBankAccountId: autoDebitAccId,
            fromToAccountId: insuranceCreditAccId,
            description: `سند قبض تأمين حجز صالة (${selectedHall?.name || ""}) - العميل: ${booking.customerName}`,
            linkedBookingId: booking.id,
            createdBy: currentUser?.username || currentUser?.name || "System",
          };
          const vId = await addVoucher(insVoucher);

          await addTransactionWithDoubleEntry(
            {
              date: insVoucher.date,
              description: insVoucher.description,
              amount: insVoucher.amount,
              currency: insVoucher.currency,
              rate: currentRate,
              sourceType: "voucher",
              sourceId: vId,
              debitAccountId: autoDebitAccId,
              creditAccountId: insuranceCreditAccId,
              createdBy: currentUser?.username || currentUser?.name || "System",
            },
            currencies,
            accounts,
          );
        }

        if (
          booking.mortgageAmount &&
          booking.mortgageAmount > 0 &&
          mortgageCreditAccId
        ) {
          const mortgageVoucher = {
            type: "receipt" as "receipt" | "payment",
            date: booking.voucherDate || new Date().toISOString().split("T")[0],
            amount: booking.mortgageAmount,
            currency: booking.currency,
            cashBankAccountId: autoDebitAccId,
            fromToAccountId: mortgageCreditAccId,
            description: `سند قبض رهن حجز صالة (${selectedHall?.name || ""}) - العميل: ${booking.customerName}`,
            linkedBookingId: booking.id,
            createdBy: currentUser?.username || currentUser?.name || "System",
          };
          const vId = await addVoucher(mortgageVoucher);

          await addTransactionWithDoubleEntry(
            {
              date: mortgageVoucher.date,
              description: mortgageVoucher.description,
              amount: mortgageVoucher.amount,
              currency: mortgageVoucher.currency,
              rate: currentRate,
              sourceType: "voucher",
              sourceId: vId,
              debitAccountId: autoDebitAccId,
              creditAccountId: mortgageCreditAccId,
              createdBy: currentUser?.username || currentUser?.name || "System",
            },
            currencies,
            accounts,
          );
        }

        toast.success("تم إنشاء السندات الأولية للحجز بنجاح");
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء ترحيل القيود الأولية");
    }
  };

  const handleAccrueBooking = async (booking: Booking) => {
    if (booking.revenueAccrued) {
      toast.warning("تم ترحيل الإيراد لهذا الحجز مسبقاً");
      return;
    }
    try {
      const createdBy = currentUser?.username || currentUser?.name || "System";
      await processBookingAction(
        "ACCRUE",
        booking,
        currencies,
        accounts,
        linkedAccounts || bookingSettings as any,
        createdBy,
      );
      await updateBooking(booking.id, { revenueAccrued: true });
      toast.success("تم ترحيل قيد الاستحقاق للعميل!");
    } catch (e: any) {
      if (e.message && e.message.includes("موجود مسبقاً")) {
        await updateBooking(booking.id, { revenueAccrued: true });
        toast.info("تم تحديث حالة الحجز، قيد الاستحقاق موجود بالفعل.");
        return;
      }
      console.error("Failed to accrue", e);
      toast.error("فشل ترحيل الاستحقاق");
    }
  };

  const handleLiquidateBooking = async (booking: Booking) => {
    if (booking.insuranceRefunded) {
      toast.warning("تم تصفية التأمين لهذا الحجز مسبقاً");
      return;
    }
    try {
      const createdBy = currentUser?.username || currentUser?.name || "System";
      await processBookingAction(
        "LIQUIDATE",
        booking,
        currencies,
        accounts,
        linkedAccounts || bookingSettings as any,
        createdBy,
      );
      await updateBooking(booking.id, { insuranceRefunded: true });
      toast.success("تم تصفية التأمين ورد المبلغ للعميل!");
    } catch (e: any) {
      if (e.message && e.message.includes("موجود مسبقاً")) {
        await updateBooking(booking.id, { insuranceRefunded: true });
        toast.info("تم تحديث حالة الحجز، قيد التصفية موجود بالفعل.");
        return;
      }
      console.error("Failed to liquidate", e);
      toast.error("فشل تصفية التأمين");
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    newStatus: Booking["status"],
  ) => {
    if (newStatus === "cancelled" && !hasPermission("cancel-booking")) {
      toast.error("عذراً، ليس لديك صلاحية إلغاء الحجوزات.");
      return;
    }
    if (newStatus === "completed" && !hasPermission("accrue-booking")) {
      toast.error("عذراً، ليس لديك صلاحية استحقاق وترحيل الفعاليات المكتملة.");
      return;
    }
    try {
      await updateBooking(bookingId, { status: newStatus });
      toast.success("تم تحديث حالة الحجز");
      if (newStatus === "completed") {
        const targetBooking = bookings.find((b) => b.id === bookingId);
        if (targetBooking) {
          await handleEventCompletionTransaction({
            ...targetBooking,
            status: "completed",
          });
        }
      }
    } catch (e) {
      toast.error("فشل تحديث الحالة");
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setBookingForm({
      hallId: booking.hallId,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      eventType: booking.eventType || "",
      eventDates:
        (booking as any).eventDates && (booking as any).eventDates.length > 0
          ? (booking as any).eventDates
          : (booking.days && booking.days.length > 0)
            ? booking.days.map((d: any) => d.date)
            : ((booking as any).eventDate ? [(booking as any).eventDate] : []),
      additionalServices: booking.additionalServices || [],
      period: booking.period,
      startTime: (booking as any).startTime || "",
      endTime: (booking as any).endTime || "",
      totalPrice: booking.totalPrice,
      paidAmount: booking.paidAmount,
      insuranceAmount: booking.insuranceAmount || 0,
      mortgageAmount: (booking as any).mortgageAmount || 0,
      mortgageStatus: (booking as any).mortgageStatus || "pending",
      pledgeStatus: (booking as any).pledgeStatus || "pending",
      pledgesDescription: booking.pledgesDescription || "",
      pledgeImage: booking.pledgeImage || "",
      customerIdType: booking.customerIdType || "",
      customerIdNumber: booking.customerIdNumber || "",
      customerIdIssueDate: booking.customerIdIssueDate || "",
      customerIdExpiryDate: booking.customerIdExpiryDate || "",
      customerIdIssuePlace: booking.customerIdIssuePlace || "",
      customerIdFrontImage: booking.customerIdFrontImage || "",
      customerIdBackImage: booking.customerIdBackImage || "",
      currency: booking.currency,
      status: booking.status,
      notes: booking.notes || "",
      generateTransaction: !!booking.linkedTransactionId,
      debitAccountId: "",
      creditAccountId: "",
      brokerId: booking.brokerId || "",
      brokerName: booking.brokerName || "",
      guarantorId: booking.guarantorId || "",
      guarantorName: booking.guarantorName || "",
      totalDiscount: (booking as any).totalDiscount || 0,
      manualNumber: booking.manualNumber || "",
      voucherDate: booking.voucherDate || new Date().toISOString().split("T")[0],
      days: booking.days || [],
    });
    setShowBookingModal(true);
  };

  const handleDeleteHall = async (id: string) => {
    if (
      confirm("هل أنت متأكد من حذف هذه القاعة؟ سيؤدي ذلك لإزالتها نهائياً.")
    ) {
      try {
        await deleteHall(id);
        toast.success("تم حذف القاعة بنجاح");
      } catch (e) {
        toast.error("خطأ في حذف القاعة");
      }
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!hasPermission("delete-booking")) {
      toast.error("عذراً، ليس لديك صلاحية حذف وإلغاء الحجوزات بشكل نهائي.");
      return;
    }
    if (confirm("هل أنت متأكد من إلغاء وحذف هذا الحجز بشكل نهائي؟")) {
      try {
        await deleteBooking(id);
        toast.success("تم حذف الحجز بنجاح");
      } catch (e) {
        toast.error("خطأ في حذف الحجز");
      }
    }
  };

  // Analytics helper calculations
  const totalBookingsCount = bookings.length;
  const confirmedBookingsCount = bookings.filter(
    (b) => b.status === "confirmed",
  ).length;
  const completedBookingsCount = bookings.filter(
    (b) => b.status === "completed",
  ).length;
  const pendingBookingsCount = bookings.filter(
    (b) => b.status === "pending",
  ).length;

  const totalContractValueCon = (bookings || []).reduce((sum, b) => {
    return sum + convertAmount(b.totalPrice, b.currency);
  }, 0);

  const totalCollectedAmountCon = (bookings || []).reduce((sum, b) => {
    return (
      sum +
      convertAmount(
        (b.paidAmount || 0) + (b.subsequentPayments || 0),
        b.currency,
      )
    );
  }, 0);

  const totalOutstandingReceivablesCon =
    totalContractValueCon - totalCollectedAmountCon;

  // Filter lists
  const filteredHalls = halls.filter((h) => {
    const matchesSearch =
      (h.name || "").includes(searchTerm) ||
      (h.location || "").includes(searchTerm);
    const matchesStatus =
      selectedStatusFilter === "all" || h.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBookings = bookings.filter((b) => {
    const matchesHall =
      selectedHallFilter === "all" || b.hallId === selectedHallFilter;
    const matchesStatus =
      selectedStatusFilter === "all" || b.status === selectedStatusFilter;
    const matchesSearch =
      (b.customerName || "").includes(searchTerm) ||
      (b.customerPhone || "").includes(searchTerm) ||
      (b.manualNumber && b.manualNumber.includes(searchTerm)) ||
      (b.sequenceCode &&
        b.sequenceCode.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesHall && matchesStatus && matchesSearch;
  });

  const bookingsWithPendingAudit = bookings.filter((b) => {
    const bId = b.id;
    const bSeq = b.sequenceCode;
    const bTxs = transactions.filter((t) => {
      const sId = t.sourceId || "";
      const matchesBooking =
        sId === bId ||
        (bSeq && bSeq !== "-" && sId === bSeq) ||
        sId.startsWith(`${bId}-`) ||
        (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
      return matchesBooking && t.sourceType === "booking";
    });
    return bTxs.some((t) => t.status !== "audited" && t.status !== "rejected");
  });

  const auditedBookings = bookings.filter((b) => {
    const bId = b.id;
    const bSeq = b.sequenceCode;
    const bTxs = transactions.filter((t) => {
      const sId = t.sourceId || "";
      const matchesBooking =
        sId === bId ||
        (bSeq && bSeq !== "-" && sId === bSeq) ||
        sId.startsWith(`${bId}-`) ||
        (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
      return matchesBooking && t.sourceType === "booking";
    });
    return bTxs.length > 0 && bTxs.every((t) => t.status === "audited");
  });

  const rejectedBookings = bookings.filter((b) => {
    const bId = b.id;
    const bSeq = b.sequenceCode;
    const bTxs = transactions.filter((t) => {
      const sId = t.sourceId || "";
      const matchesBooking =
        sId === bId ||
        (bSeq && bSeq !== "-" && sId === bSeq) ||
        sId.startsWith(`${bId}-`) ||
        (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
      return matchesBooking && t.sourceType === "booking";
    });
    return bTxs.some((t) => t.status === "rejected");
  });

  const partiallyAuditedBookings = bookings.filter((b) => {
    const bId = b.id;
    const bSeq = b.sequenceCode;
    const bTxs = transactions.filter((t) => {
      const sId = t.sourceId || "";
      const matchesBooking =
        sId === bId ||
        (bSeq && bSeq !== "-" && sId === bSeq) ||
        sId.startsWith(`${bId}-`) ||
        (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
      return matchesBooking && t.sourceType === "booking";
    });
    const hasAudited = bTxs.some((t) => t.status === "audited");
    const hasPending = bTxs.some(
      (t) => t.status !== "audited" && t.status !== "rejected",
    );
    return bTxs.length > 0 && hasAudited && hasPending;
  });

  return (
    <div id="halls-management-module" className={previewOnlyMode ? "" : "space-y-6"}>
      {!previewOnlyMode && (
        <>
      {/* 1. Module Main Title & Quick Actions */}
      {defaultTab === "audit" ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center font-extrabold text-xl">
              ⚖️
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>منظومة التدقيق والاعتماد الرقابي للحجوزات</span>
                <span className="bg-amber-500/10 text-amber-650 dark:text-amber-400 text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                  تدقيق مالي نشط
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                مراجعة الحجوزات، مطابقة القيود والحسابات المرتبطة، واعتماد أو
                رفض السندات والعمليات الرقابية.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/10 text-indigo-600 rounded-xl flex items-center justify-center font-extrabold text-xl">
              🏰
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>نظام إدارة وحجوزات القاعات والمناسبات المتكامل</span>
                <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-2 py-0.5 rounded-full font-bold">
                  نشط سحابياً
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                تنظيم القاعات، تسجيل المواعيد وفترات الحجوزات مع ترحيل قيود
                مادية مزدوجة تلقائياً في دفتر اليومية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <PermissionGuard permission="create-hall">
              <button
                onClick={() => {
                  setEditingHall(null);
                  setShowHallModal(true);
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-extrabold text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-750 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="h-4 w-4 text-indigo-500" />
                إضافة قاعة جديدة
              </button>
            </PermissionGuard>

            <PermissionGuard permission="create-booking" elementId="btn-confirm-booking">
              <button
                onClick={() => {
                  setEditingBooking(null);

                  // Read configured defaults
                  const defaultPeriodId =
                    bookingSettings?.periods?.[0]?.id || "evening";
                  const defaultPeriod = bookingSettings?.periods?.[0];
                  const defaultStart = defaultPeriod?.startTime || "16:00";
                  const defaultEnd = defaultPeriod?.endTime || "23:00";
                  const defaultCurr = bookingSettings?.defaultCurrency || "YER";
                  const defaultStat = bookingSettings?.defaultStatus || "pending";

                  setBookingForm((prev) => ({
                    ...prev,
                    hallId: halls.length > 0 ? halls[0].id : "",
                    customerName: "",
                    customerPhone: "",
                    eventType: "",
                    eventDates: [] as string[],
                    days: [] as any[],
                    additionalServices: [] as { name: string; cost: number }[],
                    period: defaultPeriodId as any,
                    startTime: defaultStart,
                    endTime: defaultEnd,
                    totalPrice: halls.length > 0 ? halls[0].price : 1500,
                    paidAmount: 0,
                    currency: defaultCurr,
                    status: defaultStat as any,
                    notes: "",
                    generateTransaction: true,
                    debitAccountId: "",
                    creditAccountId: "",
                    brokerId: "",
                    brokerName: "",
                    guarantorId: "",
                    guarantorName: "",
                    totalDiscount: 0,
                    manualNumber: "",
                    voucherDate: new Date().toISOString().split("T")[0],
                  }));
                  setShowBookingModal(true);
                }}
                disabled={halls.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-100 dark:shadow-none transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Calendar className="h-4 w-4" />
                حجز قاعة ومناسبة جديدة
              </button>
            </PermissionGuard>
          </div>
        </div>
      )}

      {/* 2. Mini KPI Counters */}
      {defaultTab !== "audit" && (
        <PermissionGuard elementId="card-booking-stats">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/85 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block tracking-wider">
                  عدد الصالات المتاحة
                </span>
                <span className="text-sm">🏰</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {halls.length}{" "}
                <span className="text-xs text-slate-400 font-medium">
                  قاعات مسجلة
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-1">
                منها {halls.filter((h) => h.status === "active").length} نشط وتحت
                الحجز حالياً
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/85 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block tracking-wider">
                  القيمة الإجمالية للعقود
                </span>
                <span className="text-sm text-indigo-500">📈</span>
              </div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                {totalContractValueCon.toLocaleString("ar-EG", {
                  maximumFractionDigits: 1,
                })}{" "}
                {globalCurrencySymbol}
              </div>
              <span className="text-[9px] text-slate-400 block mt-1">
                تراكمي لـ {totalBookingsCount} حركات مسجلة
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/85 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block tracking-wider">
                  العربون والمحصل الفعلي
                </span>
                <span className="text-sm text-emerald-500">💰</span>
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                {totalCollectedAmountCon.toLocaleString("ar-EG", {
                  maximumFractionDigits: 1,
                })}{" "}
                {globalCurrencySymbol}
              </div>
              <span className="text-[9px] text-slate-400 block mt-1">
                مرحل مباشرة كوديعة ونقدية في الصناديق
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/85 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block tracking-wider">
                  المستحقات الذمم المتبقية
                </span>
                <span className="text-sm text-amber-500">⏳</span>
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2">
                {totalOutstandingReceivablesCon.toLocaleString("ar-EG", {
                  maximumFractionDigits: 1,
                })}{" "}
                {globalCurrencySymbol}
              </div>
              <span className="text-[9px] text-slate-400 block mt-1">
                مستحقة التحصيل في تاريخ حفلة المناسبة
              </span>
            </div>
          </div>
        </PermissionGuard>
      )}

      {defaultTab !== "audit" && (
        <PermissionGuard elementId="card-occupancy-analytics">
          <OccupancyAnalyticsCard bookings={bookings} halls={halls} />
        </PermissionGuard>
      )}

      {/* 3. Navigation Tabs & Filters */}
      {defaultTab !== "audit" && (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Navigation buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl shrink-0 w-full md:w-auto">
            <button
              onClick={() => {
                setCurrentTab("halls");
                setSearchTerm("");
                setSelectedStatusFilter("all");
              }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "halls"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs"
                  : "text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Building className="h-4 w-4" />
              دليل القاعات والتجهيزات ({halls.length})
            </button>

            <button
              onClick={() => {
                setCurrentTab("bookings");
                setSearchTerm("");
                setSelectedStatusFilter("all");
              }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "bookings"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs"
                  : "text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Calendar className="h-4 w-4" />
              جداول وحجوزات العملاء ({bookings.length})
            </button>

            <button
              onClick={() => {
                setCurrentTab("analytics");
                setSearchTerm("");
                setSelectedStatusFilter("all");
              }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "analytics"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs"
                  : "text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              التقارير والإحصائيات
            </button>
            <button
              onClick={() => {
                setCurrentTab("amendments");
                setSearchTerm("");
                setSelectedStatusFilter("all");
              }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "amendments"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs"
                  : "text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Clock className="h-4 w-4" />
              طلبات التعديل
            </button>
          </div>

          {/* Live Filters depending on tab */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {currentTab === "bookings" && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold font-sans">
                  تصفية حسب القاعة:
                </span>
                <select
                  id="select-hall-filter"
                  value={selectedHallFilter}
                  onChange={(e) => setSelectedHallFilter(e.target.value)}
                  className="text-xs bg-transparent text-slate-800 dark:text-white focus:outline-none cursor-pointer font-bold"
                >
                  <option value="all" className="bg-white dark:bg-slate-900">
                    جميع القاعات
                  </option>
                  {halls.map((h) => (
                    <option
                      key={h.id}
                      value={h.id}
                      className="bg-white dark:bg-slate-900"
                    >
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1 md:flex-none">
              <input
                type="text"
                placeholder={
                  currentTab === "halls"
                    ? "بحث عن اسم القاعة أو موقعها..."
                    : "بحث باسم العميل أو جواله..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <select
                id="select-status-filter"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs bg-transparent text-slate-800 dark:text-white focus:outline-none cursor-pointer font-bold"
              >
                <option value="all" className="bg-white dark:bg-slate-900">
                  كل الحالات
                </option>
                {currentTab === "halls" ? (
                  <>
                    <option
                      value="active"
                      className="bg-white dark:bg-slate-900"
                    >
                      نشطة ومتاحة
                    </option>
                    <option
                      value="maintenance"
                      className="bg-white dark:bg-slate-900"
                    >
                      تحت الصيانة
                    </option>
                    <option
                      value="inactive"
                      className="bg-white dark:bg-slate-900 font-sans"
                    >
                      مغلقة مؤقتاً
                    </option>
                  </>
                ) : (
                  <>
                    <option
                      value="confirmed"
                      className="bg-white dark:bg-slate-900"
                    >
                      مؤكدة
                    </option>
                    <option
                      value="pending"
                      className="bg-white dark:bg-slate-900"
                    >
                      قيد التحقق / معلّقة
                    </option>
                    <option
                      value="completed"
                      className="bg-white dark:bg-slate-900"
                    >
                      تمت واكتملت
                    </option>
                    <option
                      value="cancelled"
                      className="bg-white dark:bg-slate-900"
                    >
                      ملغية
                    </option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN DISPLAY PANELS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-2xl animate-spin">⏳</span>
          <span className="text-xs text-slate-400 font-bold">
            جاري مزامنة القاعات والحجوزات سحابياً...
          </span>
        </div>
      ) : (
        <>
          {/* TAB D: AMENDMENTS */}
          {currentTab === "amendments" && <AmendmentRequestsView />}

          {/* TAB A: HALLS GUIDE */}
          {currentTab === "halls" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHalls.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-slate-900 h-64 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 gap-2">
                  <span className="text-4xl text-slate-500">🏰</span>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                    لم يتم العثور على قاعات مناسبات
                  </h4>
                  <p className="text-xs text-slate-450 max-w-sm">
                    لا توجد قاعات مطابقة لبحثك أو مسجلة في الفرع حالياً. اضغط
                    "إضافة قاعة جديدة" للبدء بالتشغيل الفوري.
                  </p>
                </div>
              ) : (
                filteredHalls.map((hall) => {
                  // Count total bookings scheduled for this specific hall
                  const hallBookingsCount = bookings.filter(
                    (b) => b.hallId === hall.id,
                  ).length;
                  return (
                    <motion.div
                      layout
                      key={hall.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-indigo-400 hover:shadow-md transition duration-305 flex flex-col justify-between"
                    >
                      {/* Card Content Header background */}
                      <div className="p-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-950/20">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                            رقم القاعة: {hall.id.slice(-5)}
                          </span>

                          {hall.status === "active" && (
                            <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              نشطة ومتاحة
                            </span>
                          )}
                          {hall.status === "maintenance" && (
                            <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              صيانة دورية
                            </span>
                          )}
                          {hall.status === "inactive" && (
                            <span className="bg-rose-500/10 text-rose-500 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              مغلقة مؤقتاً
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1.5">
                          {hall.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {hall.location || "لم يتم تحديد موقع جغرافي دقيق"}
                        </p>
                      </div>

                      {/* Card specs */}
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                            <span className="text-slate-400 block text-[9px] mb-0.5">
                              السعة الاستيعابية
                            </span>
                            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-indigo-500" />
                              {hall.capacity} شخص
                            </span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                            <span className="text-slate-400 block text-[9px] mb-0.5">
                              سعر الحجز الافتراضي
                            </span>
                            <span className="font-mono font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                              {hall.price.toLocaleString()} {hall.currency}
                            </span>
                          </div>
                        </div>

                        {/* Features checklist summary */}
                        <div>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold block mb-1.5 uppercase">
                            التجهيزات والمستلزمات المتوفرة:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                            {hall.features && hall.features.length > 0 ? (
                              hall.features.map((feature, i) => (
                                <span
                                  key={i}
                                  className="bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/30 text-[9px] text-indigo-650 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-md"
                                >
                                  {feature}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] text-slate-450 italic">
                                لم يتم إدراج ميزات مخصصة
                              </span>
                            )}
                          </div>
                        </div>

                        {hall.notes && (
                          <div className="text-[10px] text-slate-450 p-2 bg-slate-50 dark:bg-slate-950/45 rounded-xl border border-slate-100/70 dark:border-slate-850">
                            <strong>ملاحظات:</strong> {hall.notes}
                          </div>
                        )}
                      </div>

                      {/* Card actions */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs font-semibold gap-3 shrink-0">
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <span>الحجوزات النشطة:</span>
                          <span className="bg-indigo-500 text-white font-mono px-1.5 py-0.5 rounded">
                            {hallBookingsCount} مناسبة
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <PermissionGuard permission="edit-hall">
                            <button
                              onClick={() => {
                                setEditingHall(hall);
                                setShowHallModal(true);
                              }}
                              className="p-1 px-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="تعديل القاعة"
                            >
                              تعديل
                            </button>
                          </PermissionGuard>

                          <PermissionGuard permission="delete-hall">
                            <button
                              onClick={() => handleDeleteHall(hall.id)}
                              className="p-1 px-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50/10 rounded-lg transition"
                              title="إلغاء القاعة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB C: ANALYTICS & CALENDAR */}
          {currentTab === "analytics" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="col-span-full">
                <SmartCalendar
                  bookings={bookings}
                  halls={halls}
                  vouchers={vouchers}
                  accounts={accounts}
                  currencies={currencies}
                  company={company}
                  currentUser={currentUser}
                  onPrintVoucher={(v) => {
                    setOfficialVoucherToPrint(v);
                    setIsOfficialVoucherPrintOpen(true);
                  }}
                  onUpdateBookingStatus={handleUpdateBookingStatus}
                  onPreviewBooking={(booking) => setPreviewBooking(booking)}
                  onEditBooking={handleEditBooking}
                  onDateSelect={(dates) =>
                    console.log("Selected dates:", dates)
                  }
                  onDateDoubleClick={(date) => {
                    setBookingForm((prev) => ({
                      ...prev,
                      eventDates: [date],
                      days: [
                        {
                          date: date,
                          startTime: "16:00",
                          endTime: "23:00",
                          price: 0,
                          discount: 0,
                        },
                      ],
                    }));
                    setCurrentTab("bookings");
                    setShowBookingModal(true);
                  }}
                />
              </div>
              <BookingStats bookings={bookings} />
              <AccountLinkingSettings
                accounts={accounts}
                currentConfig={{
                  ...effectiveLinkedAccounts,
                  ...bookingSettings,
                }}
                onSave={async (config) => {
                  try {
                    if (bookingSettings?.id) {
                      await updateBookingSettings(bookingSettings.id, config);
                    } else {
                      await addBookingSettings(config);
                    }
                    const lId = linkedAccounts?.id || "default";
                    try {
                      await updateLinkedAccounts(lId, config);
                    } catch (e) {
                      await addLinkedAccounts({ id: lId, ...config });
                    }
                    toast.success("تم حفظ إعدادات ربط حسابات الحجوزات بنجاح!");
                  } catch (e) {
                    toast.error("حدث خطأ أثناء حفظ الإعدادات المحاسبية");
                  }
                }}
              />
            </div>
          )}

          {/* TAB D: SMART AUDITING SYSTEM & CALENDAR */}
          {currentTab === "audit" && (
            <div className="space-y-6">
              {/* Audit Status Counters Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-slate-900/40 dark:to-slate-900/60 p-4 rounded-2xl border border-amber-200/60 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">
                      حجوزات بانتظار التدقيق والاعتماد
                    </span>
                    <span className="text-2xl font-black text-amber-900 dark:text-amber-300 font-mono">
                      {bookingsWithPendingAudit.length}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center text-xl font-bold">
                    ⚖️
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-slate-900/40 dark:to-slate-900/60 p-4 rounded-2xl border border-blue-200/60 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block">
                      حجوزات مدققة جزئياً
                    </span>
                    <span className="text-2xl font-black text-blue-900 dark:text-blue-300 font-mono">
                      {partiallyAuditedBookings.length}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-xl font-bold">
                    📝
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-slate-900/40 dark:to-slate-900/60 p-4 rounded-2xl border border-emerald-200/60 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                      حجوزات معتمدة بالكامل
                    </span>
                    <span className="text-2xl font-black text-emerald-900 dark:text-emerald-300 font-mono">
                      {auditedBookings.length}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center text-xl font-bold">
                    ✅
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-slate-900/40 dark:to-slate-900/60 p-4 rounded-2xl border border-rose-200/60 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">
                      حجوزات مرفوضة معلقة
                    </span>
                    <span className="text-2xl font-black text-rose-900 dark:text-rose-300 font-mono">
                      {rejectedBookings.length}
                    </span>
                  </div>
                  <div className="w-12 h-12 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center text-xl font-bold">
                    ❌
                  </div>
                </div>
              </div>

              {/* Main Content Area: Calendar + Pending sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left side: Smart Calendar */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                    <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-850 dark:text-white flex items-center gap-1.5">
                          <span>📅 التقويم الرقابي الذكي لتدقيق الحجوزات</span>
                          <span className="bg-indigo-500/10 text-indigo-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            تفاعلي مباشر
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          * انقر على أي يوم مسجل عليه حجز لفتح نافذة المعاينة
                          والتدقيق والمطابقة المحاسبية فوراً.
                        </p>
                      </div>
                    </div>

                    <SmartCalendar
                      bookings={bookings}
                      halls={halls}
                      vouchers={vouchers}
                      accounts={accounts}
                      currencies={currencies}
                      company={company}
                      currentUser={currentUser}
                      onPrintVoucher={(v) => {
                        setOfficialVoucherToPrint(v);
                        setIsOfficialVoucherPrintOpen(true);
                      }}
                      onUpdateBookingStatus={handleUpdateBookingStatus}
                      onPreviewBooking={(booking) => setPreviewBooking(booking)}
                      onEditBooking={handleEditBooking}
                      onDateSelect={(dates) => {
                        if (dates && dates.length > 0) {
                          const selectedDate = dates[0];
                          const bookingOnDay = bookings.find((b) => {
                            const bDates = getBookingAllDates(b);
                            const matchesDate =
                              bDates.includes(selectedDate) ||
                              b.eventDate === selectedDate;
                            return matchesDate && b.status !== "cancelled";
                          });
                          if (bookingOnDay) {
                            setPreviewBooking(bookingOnDay);
                            toast.success(
                              `جاري فتح معاينة حجز العميل: ${bookingOnDay.customerName}`,
                            );
                          } else {
                            toast.info(
                              `لا توجد حجوزات نشطة في تاريخ ${selectedDate}`,
                            );
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Right side: Pending Audit list */}
                <div className="lg:col-span-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500 text-lg">⚠️</span>
                        <h3 className="font-extrabold text-xs text-slate-800 dark:text-white">
                          حجوزات بانتظار التدقيق والاعتماد (
                          {bookingsWithPendingAudit.length})
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                      {bookingsWithPendingAudit.length === 0 ? (
                        <div className="py-12 text-center text-slate-450 text-xs font-bold border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-2xl">
                          🎉 جميع الحجوزات مدققة ومعتمدة بالكامل!
                        </div>
                      ) : (
                        bookingsWithPendingAudit.map((b) => {
                          const hall = halls.find((h) => h.id === b.hallId);
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                setPreviewBooking(b);
                                toast.success(
                                  `فتح معاينة حجز العميل: ${b.customerName}`,
                                );
                              }}
                              className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl hover:border-amber-400 dark:hover:border-amber-700/60 hover:shadow-xs transition-all cursor-pointer flex flex-col gap-1 relative overflow-hidden"
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="font-black text-[9px] text-slate-800 dark:text-white whitespace-normal break-words leading-tight">
                                  {b.customerName}
                                </h4>
                                <div className="flex flex-wrap items-center justify-end gap-1 max-w-[60%]">
                                  {(() => {
                                    const bDates = getBookingAllDates(b);
                                    if (bDates.length === 0) {
                                      return (
                                        <span className="text-[9px] font-mono font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                          —
                                        </span>
                                      );
                                    }
                                    return (
                                      <>
                                        {bDates.length > 1 && (
                                          <span className="text-[8px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded">
                                            {bDates.length} أيام
                                          </span>
                                        )}
                                        {bDates.map((d, dIdx) => (
                                          <span
                                            key={dIdx}
                                            className="text-[9px] font-mono font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-800/40"
                                          >
                                            {d}
                                          </span>
                                        ))}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                <span>القاعة: {hall?.name || "—"}</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {(b.totalPrice || 0).toLocaleString()}{" "}
                                  {b.currency}
                                </span>
                              </div>

                              <div className="mt-1 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/45 pt-1">
                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-650 rounded-full font-black">
                                  يتطلب المراجعة والتدقيق
                                </span>
                                <span className="text-[8px] text-slate-400 font-bold">
                                  انقر للمعاينة ←
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: BOOKINGS MATRIX */}
          {currentTab === "bookings" && (
            <div id="bookings-panel" className="space-y-6">
              {/* Grid Layout for Bookings - Matching Hall Card style */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBookings.length === 0 ? (
                  <div className="col-span-full bg-white dark:bg-slate-900 h-64 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 gap-2">
                    <span className="text-4xl text-slate-500">📅</span>
                    <h4 className="text-sm font-extrabold text-slate-850 dark:text-white">
                      لا توجد حجوزات مسجلة حالياً في النظام
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      لم يتم العثور على أي حجوزات تطابق معايير البحث. ابدأ
                      بتسجيل حجز جديد من خلال زر "إضافة حجز جديد".
                    </p>
                  </div>
                ) : (
                  filteredBookings.map((booking) => {
                    const hallObj = halls.find((h) => h.id === booking.hallId);
                    const bDates = getBookingAllDates(booking);
                    const latestDate = bDates[bDates.length - 1] || booking.eventDate || booking.createdAt;
                    const isOverdue = latestDate ? new Date(latestDate) < new Date() : false;
                    const outstanding =
                      booking.totalPrice -
                      booking.paidAmount -
                      (booking.subsequentPayments || 0);
                    const isFullyPaid = outstanding <= 0;
                    const remaining = outstanding;

                    return (
                      <motion.div
                        layout
                        key={booking.id}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all duration-500 flex flex-col group relative"
                      >
                        {/* Body Content */}
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="mb-2">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-[10px] md:text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors whitespace-normal break-words leading-tight">
                                  {booking.customerName}
                                </h3>
                                <div className="flex items-center gap-1 mt-0.5 text-slate-500 dark:text-slate-400">
                                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                                  <span className="text-[10px] font-bold">
                                    {hallObj?.name || "قاعة الزين الكبرى"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <div className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                  #{booking.id.slice(-5).toUpperCase()}
                                </div>
                                {booking.manualNumber && (
                                  <div className="text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800" title="رقم الحجز / السند اليدوي">
                                    يدوي: {booking.manualNumber}
                                  </div>
                                )}
                                <div className="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg text-[9px] font-black border border-indigo-100 dark:border-indigo-900/50">
                                  {booking.period === "morning"
                                    ? "صباحية"
                                    : booking.period === "evening"
                                      ? "مسائية"
                                      : "ليلية"}
                                </div>
                                <div
                                  className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                                    booking.status === "confirmed"
                                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                                      : booking.status === "pending"
                                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
                                        : booking.status === "completed"
                                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30"
                                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700"
                                  }`}
                                >
                                  {booking.status === "confirmed"
                                    ? "مؤكد"
                                    : booking.status === "pending"
                                      ? "مبدئي"
                                      : booking.status === "completed"
                                        ? "مكتمل"
                                        : "ملغي"}
                                </div>
                                <div
                                  className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                                    (booking.paidAmount || 0) > 0
                                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                                      : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30"
                                  }`}
                                >
                                  {(booking.paidAmount || 0) > 0
                                    ? "بعربون"
                                    : "بدون عربون"}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50/80 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 mb-3 text-center">
                            <span className="text-[9px] text-slate-400 font-black block mb-0.5 uppercase tracking-wider">
                              السعر الإجمالي
                            </span>
                            <div className="text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-1">
                              <span className="text-indigo-600 dark:text-indigo-400 text-sm">
                                {booking.currency}
                              </span>
                              {booking.totalPrice.toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3 mb-3">
                            <div className="flex flex-col flex-1 min-w-0 mr-1">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {bDates.length > 1 ? `تواريخ المناسبة (${bDates.length} أيام)` : "تاريخ المناسبة"}
                                </span>
                                {bDates.length > 1 && (
                                  <span className="text-[8px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-black px-1.5 py-0.2 rounded-full">
                                    متعدد
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                {bDates.length === 0 ? (
                                  <div className="flex items-center gap-1 text-slate-400 text-[10px] font-black">
                                    <Calendar className="h-3 w-3" />
                                    <span>—</span>
                                  </div>
                                ) : (
                                  bDates.map((d, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md"
                                    >
                                      <Calendar className="h-2.5 w-2.5 shrink-0" />
                                      {d}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-[9px] text-slate-400 font-bold mb-0.5">
                                حالة السداد
                              </span>
                              <span
                                className={`text-[10px] font-black ${isFullyPaid ? "text-emerald-500" : "text-rose-500"}`}
                              >
                                {isFullyPaid
                                  ? "مسدد بالكامل"
                                  : `متبقي: ${remaining.toLocaleString()}`}
                              </span>
                            </div>
                          </div>

                          <div className="relative h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                            <div
                              className="absolute top-0 right-0 h-full bg-indigo-600 rounded-full transition-all duration-1000"
                              style={{
                                width: `${Math.min(100, ((booking.paidAmount + (booking.subsequentPayments || 0)) / (booking.totalPrice || 1)) * 100)}%`,
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setPrintDocType("contract");
                                setPreviewBooking(booking);
                              }}
                              className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                            >
                              <span>عرض التفاصيل</span>
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPrintDocType("official_lease_agreement");
                                setPreviewBooking(booking);
                              }}
                              title="طباعة عقد إتفاق إيجار (النموذج الرسمي الورقي)"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-[11px]">عقد الإيجار</span>
                            </button>
                          </div>
                        </div>

                        <div className="absolute top-3 left-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <PermissionGuard permission="edit-booking">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBooking(booking);
                              setBookingForm({
                                hallId: booking.hallId,
                                customerName: booking.customerName,
                                customerPhone: booking.customerPhone,
                                eventType: booking.eventType || "",
                                eventDates:
                                  booking.eventDates && booking.eventDates.length > 0
                                    ? booking.eventDates
                                    : (booking.days && booking.days.length > 0)
                                      ? booking.days.map((d: any) => d.date)
                                      : ((booking as any).eventDate
                                        ? [(booking as any).eventDate]
                                        : []),
                                additionalServices:
                                  booking.additionalServices || [],
                                period: booking.period,
                                startTime: booking.startTime || "",
                                endTime: booking.endTime || "",
                                totalPrice: booking.totalPrice,
                                paidAmount: booking.paidAmount,
                                insuranceAmount: booking.insuranceAmount || 0,
                                mortgageAmount:
                                  (booking as any).mortgageAmount || 0,
                                mortgageStatus:
                                  (booking as any).mortgageStatus || "pending",
                                pledgeStatus: booking.pledgeStatus || "pending",
                                pledgesDescription:
                                  booking.pledgesDescription || "",
                                pledgeImage: booking.pledgeImage || "",
                                customerIdType: booking.customerIdType || "",
                                customerIdNumber:
                                  booking.customerIdNumber || "",
                                customerIdIssueDate:
                                  booking.customerIdIssueDate || "",
                                customerIdExpiryDate:
                                  booking.customerIdExpiryDate || "",
                                customerIdIssuePlace:
                                  booking.customerIdIssuePlace || "",
                                customerIdFrontImage:
                                  booking.customerIdFrontImage || "",
                                customerIdBackImage:
                                  booking.customerIdBackImage || "",
                                currency: booking.currency,
                                status: booking.status,
                                notes: booking.notes || "",
                                generateTransaction:
                                  !!booking.linkedTransactionId,
                                debitAccountId: "",
                                creditAccountId: "",
                                brokerId: booking.brokerId || "",
                                brokerName: booking.brokerName || "",
                                guarantorId: booking.guarantorId || "",
                                guarantorName: booking.guarantorName || "",
                                totalDiscount: booking.totalDiscount || 0,
                                manualNumber: booking.manualNumber || "",
                                voucherDate:
                                  booking.voucherDate ||
                                  (booking as any).date ||
                                  new Date().toISOString().split("T")[0],
                                days: booking.days || [],
                              });
                              setShowBookingModal(true);
                            }}
                            className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 text-indigo-600 hover:scale-110 transition-transform"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                          <PermissionGuard permission="delete-booking">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBooking(booking.id);
                              }}
                              className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 text-rose-500 hover:scale-110 transition-transform"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================= */}
      {/* 🏰 PORTAL DIALOG modal: Create/Edit Hall */}
      {/* ======================================= */}
      {showHallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-none sm:rounded-2xl shadow-2xl p-4 sm:p-6 relative max-h-[100dvh] sm:max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowHallModal(false);
                setEditingHall(null);
              }}
              className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">
              {editingHall
                ? "تحديث بيانات وتجهيزات القاعة"
                : "إضافة قاعة وصالة مناسبات جديدة"}
            </h3>

            <form onSubmit={handleHallFormSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase block mb-1">
                  اسم الصالة / القاعة
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: قاعة الملكة الكريستالية، صالة الياسمين الملكية"
                  value={hallForm.name || ""}
                  onChange={(e) =>
                    setHallForm({ ...hallForm, name: e.target.value })
                  }
                  className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                    السعة الاستيعابية (أفراد)
                  </label>
                  <input
                    type="number"
                    required
                    min={15}
                    value={hallForm.capacity || ""}
                    onChange={(e) =>
                      setHallForm({
                        ...hallForm,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                    سعر الحجز الافتراضي للحدث
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min={0}
                      value={hallForm.price || ""}
                      onChange={(e) =>
                        setHallForm({
                          ...hallForm,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                    />
                    <select
                      id="select-hall-currency"
                      value={hallForm.currency || ""}
                      onChange={(e) =>
                        setHallForm({ ...hallForm, currency: e.target.value })
                      }
                      className="text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 p-2 rounded-xl text-slate-800 dark:text-white"
                    >
                      {currencies.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                  موقع القاعة / العنوان التفصيلي
                </label>
                <input
                  type="text"
                  placeholder="مثال: صنعاء، شارع الستين - بجوار جولة المصباحي"
                  value={hallForm.location || ""}
                  onChange={(e) =>
                    setHallForm({ ...hallForm, location: e.target.value })
                  }
                  className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                  حالة التشغيل الحالية
                </label>
                <select
                  id="select-hall-status-modal"
                  value={hallForm.status || ""}
                  onChange={(e) =>
                    setHallForm({
                      ...hallForm,
                      status: e.target.value as Hall["status"],
                    })
                  }
                  className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none font-bold"
                >
                  <option value="active">نشطة ومجهزة لاستقبال الحجوزات</option>
                  <option value="maintenance">
                    تحت الصيانة لترتيب التجهيزات والكماليات
                  </option>
                  <option value="inactive">مغلقة مؤقتاً</option>
                </select>
              </div>

              {/* Amenities checkboxes */}
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1.5">
                  التجهيزات والإضافات المتوفرة (اختر ما ينطبق):
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-150 max-h-32 overflow-y-auto">
                  {DEFAULT_AMENITIES.map((amenity, idx) => {
                    const isChecked = hallForm.features.includes(amenity);
                    return (
                      <label
                        key={idx}
                        className="flex items-center gap-2 text-[10px] text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setHallForm({
                                ...hallForm,
                                features: hallForm.features.filter(
                                  (f) => f !== amenity,
                                ),
                              });
                            } else {
                              setHallForm({
                                ...hallForm,
                                features: [...hallForm.features, amenity],
                              });
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 scale-95"
                        />
                        {amenity}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Event specific pricing */}
              <div>
                <label className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold block mb-1">
                  تسعير مخصص بحسب نوع الفعالية (اختياري)
                </label>
                <div className="bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950/45 p-3 rounded-xl space-y-2.5">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[9px] text-slate-450 dark:text-slate-400 block mb-0.5 font-bold">
                        نوع الفعالية
                      </label>
                      <select
                        id="hall-event-pricing-type"
                        className="w-full text-[10px] text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-bold"
                        defaultValue=""
                        onChange={(e) => {
                          const val = e.target.value;
                          const existingPrice =
                            hallForm.eventPrices?.find(
                              (ep) => ep.eventType === val,
                            )?.price ?? "";
                          const priceInput = document.getElementById(
                            "hall-event-pricing-value",
                          ) as HTMLInputElement;
                          if (priceInput)
                            priceInput.value = existingPrice.toString();
                        }}
                      >
                        <option value="">-- اختر الفعالية لتسعيرها --</option>
                        {(
                          Array.from(
                            new Set([
                              "غداء ومقيل",
                              "مقيل وسمر",
                              "عرس بنت",
                              "غداء ومقيل وسمر",
                              "إحتفالات",
                              "زواج",
                              "زواج (رجال)",
                              "زواج (نساء)",
                              "زواج (عريس)",
                              "زواج (عروسة)",
                              "عزاء",
                              "خطوبة",
                              "تخرج",
                              "عيد ميلاد",
                              ...(bookingSettings?.eventTypes || []),
                            ])
                          )
                        ).map((type: string, idx: number) => (
                          <option key={`${type}-${idx}`} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="text-[9px] text-slate-450 dark:text-slate-400 block mb-0.5 font-bold">
                        سعر الإيجار
                      </label>
                      <input
                        type="number"
                        id="hall-event-pricing-value"
                        placeholder="السعر"
                        className="w-full text-[10px] text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono font-bold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const typeEl = document.getElementById(
                          "hall-event-pricing-type",
                        ) as HTMLSelectElement;
                        const priceEl = document.getElementById(
                          "hall-event-pricing-value",
                        ) as HTMLInputElement;
                        if (
                          typeEl &&
                          priceEl &&
                          typeEl.value &&
                          priceEl.value
                        ) {
                          const val = typeEl.value;
                          const priceNum = Number(priceEl.value);
                          if (priceNum >= 0) {
                            const filtered = (
                              hallForm.eventPrices || []
                            ).filter((ep) => ep.eventType !== val);
                            setHallForm({
                              ...hallForm,
                              eventPrices: [
                                ...filtered,
                                { eventType: val, price: priceNum },
                              ],
                            });
                            typeEl.value = "";
                            priceEl.value = "";
                            toast.success(
                              `تم حفظ تسعير الفعالية (${val}) بنجاح`,
                            );
                          }
                        } else {
                          toast.error("يرجى تحديد الفعالية وإدخال السعر أولاً");
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-2 rounded-lg transition shrink-0"
                    >
                      حفظ السعر
                    </button>
                  </div>

                  {/* Render saved event prices */}
                  {(hallForm.eventPrices || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-indigo-100/40 dark:border-indigo-950/40">
                      {hallForm.eventPrices.map((ep, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[9px] font-black px-2 py-1 rounded-lg border border-indigo-100/40 dark:border-indigo-900/30"
                        >
                          <span>
                            {ep.eventType}: {ep.price.toLocaleString()}{" "}
                            {hallForm.currency}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setHallForm({
                                ...hallForm,
                                eventPrices: (
                                  hallForm.eventPrices || []
                                ).filter(
                                  (item) => item.eventType !== ep.eventType,
                                ),
                              });
                            }}
                            className="text-indigo-400 hover:text-red-500 font-bold transition mr-1"
                            title="إلغاء التسعير الخاص"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                  ملاحظات داخلية
                </label>
                <textarea
                  placeholder="ملاحظات حول سعة الكراسي الإضافية أو فترات الضمان للأجهزة الصوتية..."
                  value={hallForm.notes || ""}
                  onChange={(e) =>
                    setHallForm({ ...hallForm, notes: e.target.value })
                  }
                  className="w-full text-xs text-slate-850 dark:text-white bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none font-medium h-16 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowHallModal(false);
                    setEditingHall(null);
                  }}
                  className="text-xs bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 p-2.5 rounded-xl font-bold text-slate-700 dark:text-white cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 p-2.5 px-5 rounded-xl font-bold text-white shadow-md cursor-pointer"
                >
                  {editingHall ? "تعديل وحفظ" : "حفظ وإضافة القاعة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 🗓️ PORTAL DIALOG modal: Create/Edit Booking */}
      {/* ======================================= */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-0 sm:p-2 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl lg:max-w-3xl rounded-none sm:rounded-3xl shadow-2xl p-3 sm:p-5 relative max-h-[100dvh] sm:max-h-[95vh] overflow-y-auto">
            {/* Header with Title and Status Badge */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      {editingBooking
                        ? "تحديث بيانات الحجز والعقد الملكي"
                        : "سند حجز جديد وتسجيل مناسبة"}
                    </h3>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      editingBooking
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800"
                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800"
                    }`}>
                      {editingBooking ? "تعديل حجز قائم" : "تسجيل مباشر"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    تثبيت الموعد وضمان عدم تكرار الحجوزات مع توليد السندات والقيود المحاسبية آلياً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBookingModal(false);
                  setEditingBooking(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBookingFormSubmit} className="space-y-4">
              {/* 📜 Compact Official Document Header Strip */}
              <div className="bg-gradient-to-r from-slate-50 via-indigo-50/20 to-emerald-50/20 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  {/* 1. Voucher Date (تاريخ السند) */}
                  <div className="sm:col-span-4 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-2xs">
                    <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block leading-none mb-1">
                        تاريخ السند (Voucher Date)
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingForm.voucherDate || ""}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
                            voucherDate: e.target.value,
                          })
                        }
                        className="w-full text-xs text-slate-800 dark:text-white font-bold bg-transparent outline-none p-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 2. Manual Voucher Number (رقم السند اليدوي) */}
                  <div className="sm:col-span-5 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border-2 border-emerald-500/30 hover:border-emerald-500 focus-within:border-emerald-500 flex items-center gap-2.5 shadow-2xs transition-colors">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center justify-center shrink-0">
                      #
                    </span>
                    <div className="flex-1 min-w-0">
                      <label className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block leading-none mb-1">
                        رقم السند اليدوي / الدفتري (أرقام فقط)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="أدخل رقم السند الورقي (مثال: 1045)"
                        value={bookingForm.manualNumber || ""}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
                            manualNumber: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        className="w-full text-xs font-mono font-black text-emerald-700 dark:text-emerald-300 bg-transparent outline-none p-0 placeholder:text-slate-350 dark:placeholder:text-slate-600 placeholder:font-sans"
                      />
                    </div>
                  </div>

                  {/* 3. Auto System Code Badge (الرقم الآلي المتسلسل) */}
                  <div className="sm:col-span-3 bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between sm:justify-center gap-2">
                    <div className="text-right sm:text-center">
                      <span className="text-[8px] font-black text-indigo-400 dark:text-indigo-400 uppercase tracking-wider block leading-none mb-1">
                        الرقم الآلي للنظام
                      </span>
                      <span className="font-mono text-[11px] font-black text-indigo-700 dark:text-indigo-300">
                        {editingBooking
                          ? (editingBooking.sequenceCode || `#${editingBooking.id.slice(-6).toUpperCase()}`)
                          : "BOK-آلي (تلقائي)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                    اختر القاعة المطلوبة
                  </label>
                  <select
                    required
                    disabled={lockBookingDetails}
                    value={bookingForm.hallId || ""}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, hallId: e.target.value })
                    }
                    className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none font-bold"
                  >
                    <option
                      value=""
                      disabled
                      className="bg-white dark:bg-slate-900"
                    >
                      -- اختر الصالة --
                    </option>
                    {halls.map((h) => (
                      <option
                        key={h.id}
                        value={h.id}
                        className="bg-white dark:bg-slate-900"
                      >
                        {h.name} (السعة: {h.capacity} فرداً)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                    الفترة الزمنية
                  </label>
                  <select
                    disabled={lockBookingDetails}
                    value={bookingForm.period || ""}
                    onChange={(e) => {
                      const period = e.target.value;
                      let start = "16:00";
                      let end = "23:00";

                      const matchedPeriod = bookingSettings?.periods?.find(
                        (p: any) => p.id === period,
                      );
                      if (matchedPeriod) {
                        start = matchedPeriod.startTime;
                        end = matchedPeriod.endTime;
                      } else {
                        // fallback
                        if (period === "morning") {
                          start = "09:00";
                          end = "15:00";
                        } else if (period === "night") {
                          start = "01:00";
                          end = "08:00";
                        }
                      }

                      setBookingForm({
                        ...bookingForm,
                        period: period as any,
                        startTime: start,
                        endTime: end,
                      });
                    }}
                    className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none font-bold"
                  >
                    {bookingSettings?.periods &&
                    bookingSettings.periods.length > 0 ? (
                      bookingSettings.periods.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.startTime} - {p.endTime})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="morning">
                          الفترة الصباحية (9:00 ص - 3:00 م)
                        </option>
                        <option value="evening">
                          الفترة المسائية (4:00 م - 12:00 م)
                        </option>
                        <option value="night">
                          الفترة الليلية (1:00 ص - 8:00 ص)
                        </option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* ⏰ Custom Specific Agreed Times (Mandatory Integration - Hourly Only) */}
              <div className="grid grid-cols-2 gap-4 bg-indigo-50/35 dark:bg-slate-950/20 p-3.5 rounded-2xl border border-indigo-100/50 dark:border-slate-800/60">
                <div>
                  <label className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold block mb-1 flex items-center gap-1">
                    <span>⏰ بداية الوقت المتفق عليه (بالساعة)</span>
                    <span className="text-red-500 font-black">*</span>
                  </label>
                  <select
                    required
                    disabled={lockBookingDetails}
                    value={
                      bookingForm.startTime
                        ? bookingForm.startTime.split(":")[0].padStart(2, "0") +
                          ":00"
                        : "16:00"
                    }
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full text-xs text-slate-850 dark:text-white bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-bold text-center cursor-pointer"
                  >
                    <option value="00:00">12:00 ص (منتصف الليل)</option>
                    <option value="01:00">01:00 ص</option>
                    <option value="02:00">02:00 ص</option>
                    <option value="03:00">03:00 ص</option>
                    <option value="04:00">04:00 ص</option>
                    <option value="05:00">05:00 ص</option>
                    <option value="06:00">06:00 ص</option>
                    <option value="07:00">07:00 ص</option>
                    <option value="08:00">08:00 ص</option>
                    <option value="09:00">09:00 ص</option>
                    <option value="10:00">10:00 ص</option>
                    <option value="11:00">11:00 ص</option>
                    <option value="12:00">12:00 م (ظهراً)</option>
                    <option value="13:00">01:00 م</option>
                    <option value="14:00">02:00 م</option>
                    <option value="15:00">03:00 م</option>
                    <option value="16:00">04:00 م</option>
                    <option value="17:00">05:00 م</option>
                    <option value="18:00">06:00 م</option>
                    <option value="19:00">07:00 م</option>
                    <option value="20:00">08:00 م</option>
                    <option value="21:00">09:00 م</option>
                    <option value="22:00">10:00 م</option>
                    <option value="23:00">11:00 م</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold block mb-1 flex items-center gap-1">
                    <span>⏰ نهاية الوقت المتفق عليه (بالساعة)</span>
                    <span className="text-red-500 font-black">*</span>
                  </label>
                  <select
                    required
                    disabled={lockBookingDetails}
                    value={
                      bookingForm.endTime
                        ? bookingForm.endTime.split(":")[0].padStart(2, "0") +
                          ":00"
                        : "23:00"
                    }
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full text-xs text-slate-850 dark:text-white bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-bold text-center cursor-pointer"
                  >
                    <option value="00:00">12:00 ص (منتصف الليل)</option>
                    <option value="01:00">01:00 ص</option>
                    <option value="02:00">02:00 ص</option>
                    <option value="03:00">03:00 ص</option>
                    <option value="04:00">04:00 ص</option>
                    <option value="05:00">05:00 ص</option>
                    <option value="06:00">06:00 ص</option>
                    <option value="07:00">07:00 ص</option>
                    <option value="08:00">08:00 ص</option>
                    <option value="09:00">09:00 ص</option>
                    <option value="10:00">10:00 ص</option>
                    <option value="11:00">11:00 ص</option>
                    <option value="12:00">12:00 م (ظهراً)</option>
                    <option value="13:00">01:00 م</option>
                    <option value="14:00">02:00 م</option>
                    <option value="15:00">03:00 م</option>
                    <option value="16:00">04:00 م</option>
                    <option value="17:00">05:00 م</option>
                    <option value="18:00">06:00 م</option>
                    <option value="19:00">07:00 م</option>
                    <option value="20:00">08:00 م</option>
                    <option value="21:00">09:00 م</option>
                    <option value="22:00">10:00 م</option>
                    <option value="23:00">11:00 م</option>
                  </select>
                </div>
                <div className="col-span-2 text-[9px] text-slate-450 dark:text-slate-500 font-bold text-center">
                  ⚠️ الزام تحديد وقت الساعة للفترة بحسب الاتفاق مع العميل لضمان
                  دقة التنظيم وسند الحجز.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                <div className="relative">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                    اسم العميل بالكامل
                  </label>
                  <input
                    type="text"
                    required
                    disabled={lockBookingDetails}
                    placeholder="مثال: أحمد علي عبد الله الحاشدي"
                    value={bookingForm.customerName || ""}
                    onFocus={() => setShowClientSuggestions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowClientSuggestions(false), 200)
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = clients.find((c) => c.name === val);
                      setBookingForm({
                        ...bookingForm,
                        customerName: val,
                        customerPhone: matched
                          ? matched.phone
                          : bookingForm.customerPhone,
                      });
                    }}
                    className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  {showClientSuggestions && bookingForm.customerName && (
                    <div className="absolute z-50 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 shadow-xl max-h-40 overflow-y-auto">
                      {clients
                        .filter((c) =>
                          (c.name || "").includes(bookingForm.customerName),
                        )
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setBookingForm({
                                ...bookingForm,
                                customerName: c.name,
                                customerPhone: c.phone,
                              });
                              setShowClientSuggestions(false);
                            }}
                            className="w-full text-right px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 font-medium block"
                          >
                            👤 {c.name} ({c.phone})
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                    رقم الهاتف والجوال (مباشر)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={lockBookingDetails}
                    placeholder="مثال: +967771234567"
                    value={bookingForm.customerPhone || ""}
                    onFocus={() => setShowClientSuggestions(true)}
                    onBlur={() =>
                      setTimeout(() => setShowClientSuggestions(false), 200)
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = clients.find((c) => c.phone === val);
                      setBookingForm({
                        ...bookingForm,
                        customerPhone: val,
                        customerName: matched
                          ? matched.name
                          : bookingForm.customerName,
                      });
                    }}
                    className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-mono font-bold text-left"
                  />
                </div>

                {(() => {
                  const currentHall = halls.find((h) => h.id === bookingForm.hallId);
                  const hallEventPrices = currentHall?.eventPrices || [];
                  const defaultList = [
                    "غداء ومقيل",
                    "مقيل وسمر",
                    "عرس بنت",
                    "غداء ومقيل وسمر",
                    "إحتفالات",
                    "زواج",
                    "زواج (رجال)",
                    "زواج (نساء)",
                    "زواج (عريس)",
                    "زواج (عروسة)",
                    "عزاء",
                    "خطوبة",
                    "تخرج",
                    "عيد ميلاد",
                  ];
                  const systemEventTypes = bookingSettings?.eventTypes || [];
                  const combinedTypes = Array.from(
                    new Set([
                      ...hallEventPrices.map((ep) => ep.eventType),
                      ...systemEventTypes,
                      ...defaultList,
                    ])
                  );

                  return (
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block">
                          نوع الفعالية / المناسبة (العامة)
                        </label>
                        {hallEventPrices.length > 0 && (
                          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                            {hallEventPrices.length} باقات مسعرة للقاعة
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="اختر أو اكتب نوع الفعالية (غداء ومقيل، مقيل وسمر...)"
                        list="booking-event-types"
                        value={bookingForm.eventType || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matchedEp = hallEventPrices.find((ep) => ep.eventType === val);
                          const targetPrice = matchedEp ? matchedEp.price : (currentHall?.price || 0);

                          setBookingForm((prev) => ({
                            ...prev,
                            eventType: val,
                            days: prev.days.map((d) => ({
                              ...d,
                              eventType: d.eventType || val,
                              price: matchedEp ? targetPrice : d.price,
                            })),
                          }));
                        }}
                        className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-bold"
                      />
                      <datalist id="booking-event-types">
                        {combinedTypes.map((type: string, idx: number) => {
                          const ep = hallEventPrices.find((p) => p.eventType === type);
                          return (
                            <option
                              key={`${type}-${idx}`}
                              value={type}
                              label={ep ? `${type} (${ep.price.toLocaleString()} ${currentHall?.currency || 'YER'})` : type}
                            />
                          );
                        })}
                      </datalist>
                    </div>
                  );
                })()}

                {/* Client Registry Sync Helper Banner */}
                <div className="col-span-1 md:col-span-3">
                  {bookingForm.customerName.trim().length > 2 &&
                  clients.find(
                    (c) =>
                      c.name === bookingForm.customerName &&
                      c.phone === bookingForm.customerPhone,
                  ) ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5 w-fit">
                      <span>🟢 عميل معتمد ومسجل في دليل الحسابات</span>
                    </div>
                  ) : (
                    bookingForm.customerName.trim().length > 2 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] gap-2">
                        <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                          ⚠️ هذا العميل غير مسجل حالياً بسجل العملاء
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !bookingForm.customerPhone ||
                              !bookingForm.customerPhone.trim()
                            ) {
                              toast.error(
                                "عذراً، يرجى إدخال رقم جوال العميل أولاً لإتمام التسجيل!",
                              );
                              return;
                            }
                            try {
                              const clientAccId =
                                effectiveLinkedAccounts.accountsReceivableId ||
                                accounts.find(
                                  (a) =>
                                    a.code === "1010301" ||
                                    a.name === "الزبائن والحجوزات" ||
                                    (a.name?.includes("عملاء") &&
                                      !a.name?.includes("خصم")) ||
                                    a.name?.includes("المدينون"),
                                )?.id ||
                                "1010301";
                              await addClient({
                                name: bookingForm.customerName,
                                phone: bookingForm.customerPhone.trim(),
                                linkedAccountId: clientAccId,
                              });
                              toast.success(
                                `تم تسجيل العميل (${bookingForm.customerName}) بنجاح!`,
                              );
                            } catch (err) {
                              toast.error("حدث خطأ أثناء التسجيل");
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3 py-1.5 rounded-lg text-[9px] transition shrink-0 cursor-pointer"
                        >
                          ➕ إضافة لسجل العملاء الآن
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* BRAND NEW: CUSTOMER IDENTITY & AI SMART OCR */}
              <div className="col-span-1 md:col-span-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsClientIdOpen(!isClientIdOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      🪪
                    </span>
                    <div className="text-right">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">
                        بيانات هوية العميل والتحقق الذكي بالذكاء الاصطناعي (AI
                        OCR)
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                        {isClientIdOpen
                          ? "اضغط لإخفاء تفاصيل الهوية"
                          : "اضغط لعرض وإدخال بيانات الهوية أو استخدام المسح الذكي"}
                      </p>
                    </div>
                  </div>
                  {isClientIdOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isClientIdOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="p-4 pt-0 space-y-4 border-t border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                          أرفق صور الهوية الوطنية أو جواز السفر لتقوم تقنية
                          الذكاء الاصطناعي باستخراج البيانات تلقائياً.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleIdOcr}
                        disabled={
                          isProcessingIdOcr ||
                          (!bookingForm.customerIdFrontImage &&
                            !bookingForm.customerIdBackImage)
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black text-white shadow-sm transition shrink-0 cursor-pointer ${
                          !bookingForm.customerIdFrontImage &&
                          !bookingForm.customerIdBackImage
                            ? "bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                        }`}
                      >
                        <Sparkles
                          className={`w-3.5 h-3.5 ${isProcessingIdOcr ? "animate-spin" : ""}`}
                        />
                        {isProcessingIdOcr
                          ? "جاري قراءة الصور وتحليلها..."
                          : "قراءة بيانات الهوية بالذكاء الاصطناعي"}
                      </button>
                    </div>

                    {/* ID Images Upload Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Front ID Card */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block">
                          صورة الهوية الأمامية (أو الصفحة الرئيسية للجواز)
                        </label>
                        <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 p-4 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition duration-150 flex flex-col items-center justify-center min-h-[110px]">
                          {bookingForm.customerIdFrontImage ? (
                            <div className="relative w-full h-24 flex items-center justify-center">
                              <img
                                src={bookingForm.customerIdFrontImage}
                                alt="الهوية الأمامية"
                                className="max-h-full max-w-full object-contain rounded-lg shadow border border-slate-200 dark:border-slate-800"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setBookingForm((prev) => ({
                                    ...prev,
                                    customerIdFrontImage: "",
                                  }))
                                }
                                className="absolute -top-2 -left-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center text-center w-full h-full">
                              <Camera className="w-6 h-6 text-slate-450 dark:text-slate-500 mb-1" />
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                إرفاق أو التقاط صورة الوجه الأمامي
                              </span>
                              <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
                                PNG, JPG up to 10MB
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleIdFrontImageChange}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Back ID Card */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block">
                          صورة الهوية الخلفية (أو صفحة التمديد/الرقم الوطني)
                        </label>
                        <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 p-4 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition duration-150 flex flex-col items-center justify-center min-h-[110px]">
                          {bookingForm.customerIdBackImage ? (
                            <div className="relative w-full h-24 flex items-center justify-center">
                              <img
                                src={bookingForm.customerIdBackImage}
                                alt="الهوية الخلفية"
                                className="max-h-full max-w-full object-contain rounded-lg shadow border border-slate-200 dark:border-slate-800"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setBookingForm((prev) => ({
                                    ...prev,
                                    customerIdBackImage: "",
                                  }))
                                }
                                className="absolute -top-2 -left-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition shadow"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center text-center w-full h-full">
                              <Camera className="w-6 h-6 text-slate-450 dark:text-slate-500 mb-1" />
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                إرفاق أو التقاط صورة الوجه الخلفي
                              </span>
                              <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
                                PNG, JPG up to 10MB
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleIdBackImageChange}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Structured Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                      {/* Identity Type */}
                      <div>
                        <label className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                          نوع الهوية
                        </label>
                        <select
                          value={bookingForm.customerIdType || ""}
                          onChange={(e) =>
                            setBookingForm((prev) => ({
                              ...prev,
                              customerIdType: e.target.value,
                            }))
                          }
                          className="w-full text-[11px] text-slate-850 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- اختر --</option>
                          <option value="بطاقة شخصية">بطاقة شخصية</option>
                          <option value="جواز سفر">جواز سفر</option>
                          <option value="بطاقة عائلية">بطاقة عائلية</option>
                          <option value="رخصة قيادة">رخصة قيادة</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </div>

                      {/* Identity Number */}
                      <div>
                        <label className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                          رقم الهوية
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: 01011234567"
                          value={bookingForm.customerIdNumber || ""}
                          onChange={(e) =>
                            setBookingForm((prev) => ({
                              ...prev,
                              customerIdNumber: e.target.value,
                            }))
                          }
                          className="w-full text-[11px] text-slate-850 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-indigo-500 text-left"
                          dir="ltr"
                        />
                      </div>

                      {/* Issue Date */}
                      <div>
                        <label className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                          تاريخ الإصدار
                        </label>
                        <input
                          type="text"
                          placeholder="اليوم/الشهر/السنة"
                          value={bookingForm.customerIdIssueDate || ""}
                          onChange={(e) =>
                            setBookingForm((prev) => ({
                              ...prev,
                              customerIdIssueDate: e.target.value,
                            }))
                          }
                          className="w-full text-[11px] text-slate-850 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-indigo-500 text-center"
                          dir="ltr"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <label className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                          تاريخ الانتهاء
                        </label>
                        <input
                          type="text"
                          placeholder="اليوم/الشهر/السنة"
                          value={bookingForm.customerIdExpiryDate || ""}
                          onChange={(e) =>
                            setBookingForm((prev) => ({
                              ...prev,
                              customerIdExpiryDate: e.target.value,
                            }))
                          }
                          className="w-full text-[11px] text-slate-850 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-indigo-500 text-center"
                          dir="ltr"
                        />
                      </div>

                      {/* Issuing Authority */}
                      <div className="sm:col-span-2 md:col-span-1">
                        <label className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                          جهة الإصدار
                        </label>
                        <input
                          type="text"
                          placeholder="جهة أو مكان الإصدار"
                          value={bookingForm.customerIdIssuePlace || ""}
                          onChange={(e) =>
                            setBookingForm((prev) => ({
                              ...prev,
                              customerIdIssuePlace: e.target.value,
                            }))
                          }
                          className="w-full text-[11px] text-slate-850 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 font-bold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* BRAND NEW: BROKER & GUARANTOR INTEGRATION */}
              <div className="col-span-1 md:col-span-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setIsBrokerGuarantorOpen(!isBrokerGuarantorOpen)
                  }
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      🤝
                    </span>
                    <div className="text-right">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">
                        بيانات الوسيط / المسوّق والضمين / الكفيل (اختياري)
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                        {isBrokerGuarantorOpen
                          ? "اضغط لإخفاء تفاصيل الوسيط والضمين"
                          : "اضغط لعرض وإدخال بيانات الوسيط والضمين"}
                      </p>
                    </div>
                  </div>
                  {isBrokerGuarantorOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isBrokerGuarantorOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="p-4 pt-0 border-t border-slate-200 dark:border-slate-800"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* 1. Broker / Mediator Field */}
                      <div className="relative text-right">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1 flex items-center justify-between">
                          <span>الوسيط / المسوّق (اختياري)</span>
                          <span className="text-[8px] text-indigo-500 bg-indigo-500/10 px-1.5 py-0.2 rounded font-bold">
                            سجل الوسطاء
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="ابحث عن وسيط أو اكتب اسماً جديداً..."
                          value={bookingForm.brokerName || ""}
                          onFocus={() => setShowBrokerSuggestions(true)}
                          onBlur={() =>
                            setTimeout(
                              () => setShowBrokerSuggestions(false),
                              200,
                            )
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = brokers.find((b) => b.name === val);
                            setBookingForm({
                              ...bookingForm,
                              brokerName: val,
                              brokerId: matched ? matched.id : "",
                            });
                          }}
                          className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-bold font-sans"
                        />
                        {showBrokerSuggestions && bookingForm.brokerName && (
                          <div className="absolute z-50 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 shadow-xl max-h-40 overflow-y-auto text-right">
                            {brokers
                              .filter((b) =>
                                (b.name || "").includes(bookingForm.brokerName),
                              )
                              .map((b) => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setBookingForm({
                                      ...bookingForm,
                                      brokerName: b.name,
                                      brokerId: b.id,
                                    });
                                    setShowBrokerSuggestions(false);
                                  }}
                                  className="w-full text-right px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 font-medium block"
                                >
                                  👤 {b.name}
                                </button>
                              ))}
                          </div>
                        )}

                        {bookingForm.brokerName.trim().length > 2 &&
                        !brokers.find(
                          (b) => b.name === bookingForm.brokerName,
                        ) ? (
                          <div className="mt-1 flex items-center justify-between text-[9px] bg-amber-500/5 p-1 rounded border border-amber-500/10">
                            <span className="text-amber-500 font-bold">
                              وسيط غير مسجل
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const newId = await addBroker({
                                    name: bookingForm.brokerName,
                                  });
                                  setBookingForm((prev) => ({
                                    ...prev,
                                    brokerId: newId,
                                  }));
                                  toast.success(
                                    `تم تسجيل الوسيط (${bookingForm.brokerName}) بنجاح!`,
                                  );
                                } catch (err) {
                                  toast.error("فشل تسجيل الوسيط");
                                }
                              }}
                              className="text-indigo-500 hover:underline font-black cursor-pointer"
                            >
                              ➕ تسجيل بالسجل
                            </button>
                          </div>
                        ) : (
                          bookingForm.brokerName.trim().length > 2 && (
                            <span className="text-[8px] text-emerald-500 font-black mt-1 block text-right">
                              🟢 وسيط معتمد ومسجل
                            </span>
                          )
                        )}
                      </div>

                      {/* 2. Guarantor / Surety Field */}
                      <div className="relative text-right">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1 flex items-center justify-between">
                          <span>الضمين / الكفيل (اختياري)</span>
                          <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">
                            سجل الضامنين
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="ابحث عن ضمين أو اكتب اسماً جديداً..."
                          value={bookingForm.guarantorName || ""}
                          onFocus={() => setShowGuarantorSuggestions(true)}
                          onBlur={() =>
                            setTimeout(
                              () => setShowGuarantorSuggestions(false),
                              200,
                            )
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            const matched = guarantors.find(
                              (g) => g.name === val,
                            );
                            setBookingForm({
                              ...bookingForm,
                              guarantorName: val,
                              guarantorId: matched ? matched.id : "",
                            });
                          }}
                          className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-bold font-sans"
                        />
                        {showGuarantorSuggestions &&
                          bookingForm.guarantorName && (
                            <div className="absolute z-50 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 shadow-xl max-h-40 overflow-y-auto text-right">
                              {guarantors
                                .filter((g) =>
                                  (g.name || "").includes(
                                    bookingForm.guarantorName,
                                  ),
                                )
                                .map((g) => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                      setBookingForm({
                                        ...bookingForm,
                                        guarantorName: g.name,
                                        guarantorId: g.id,
                                      });
                                      setShowGuarantorSuggestions(false);
                                    }}
                                    className="w-full text-right px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 font-medium block"
                                  >
                                    🛡️ {g.name}
                                  </button>
                                ))}
                            </div>
                          )}

                        {bookingForm.guarantorName.trim().length > 2 &&
                        !guarantors.find(
                          (g) => g.name === bookingForm.guarantorName,
                        ) ? (
                          <div className="mt-1 flex items-center justify-between text-[9px] bg-amber-500/5 p-1 rounded border border-amber-500/10">
                            <span className="text-amber-500 font-bold">
                              ضمين غير مسجل
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const newId = await addGuarantor({
                                    name: bookingForm.guarantorName,
                                  });
                                  setBookingForm((prev) => ({
                                    ...prev,
                                    guarantorId: newId,
                                  }));
                                  toast.success(
                                    `تم تسجيل الضمين (${bookingForm.guarantorName}) بنجاح!`,
                                  );
                                } catch (err) {
                                  toast.error("فشل تسجيل الضمين");
                                }
                              }}
                              className="text-indigo-500 hover:underline font-black cursor-pointer"
                            >
                              ➕ تسجيل بالسجل
                            </button>
                          </div>
                        ) : (
                          bookingForm.guarantorName.trim().length > 2 && (
                            <span className="text-[8px] text-emerald-500 font-black mt-1 block text-right">
                              🟢 ضمين مسجل بالنظام
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* DATE SELECTION (Interactive Visual Calendar) */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <label className="text-[11px] text-slate-700 dark:text-slate-300 font-extrabold block">
                      اختر تواريخ المناسبة (
                      {bookingForm.eventDates?.length || 0} أيام مختارة)
                    </label>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400">
                      انقر على الأيام الشاغرة لتحديدها أو إلغاء تحديدها
                    </p>
                  </div>

                  {bookingForm.hallId && (
                    <div className="flex items-center gap-1.5 text-[9px] font-black bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg shrink-0">
                      <span className="text-slate-500">الفترة الحالية:</span>
                      {bookingForm.period === "morning" ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          صباحية 🌅
                        </span>
                      ) : bookingForm.period === "evening" ? (
                        <span className="text-indigo-600 dark:text-indigo-400">
                          مسائية 🌃
                        </span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">
                          ليلية 🌌
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!bookingForm.hallId ? (
                  <div className="text-center p-6 bg-amber-500/10 border border-dashed border-amber-500/30 rounded-xl space-y-1">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto animate-bounce" />
                    <span className="block text-[10px] font-black text-amber-600 dark:text-amber-400">
                      تنبيه: يجب اختيار الصالة أولاً لعرض الأيام المحجوزة
                      والمتاحة بشكل دقيق!
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Month Navigator for Picker */}
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-2 rounded-xl">
                      <button
                        type="button"
                        onClick={() =>
                          setPickerMonth(
                            new Date(
                              pickerMonth.setMonth(pickerMonth.getMonth() - 1),
                            ),
                          )
                        }
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition"
                        title="الشهر السابق"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {pickerMonth.toLocaleDateString("ar-SA", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPickerMonth(
                            new Date(
                              pickerMonth.setMonth(pickerMonth.getMonth() + 1),
                            ),
                          )
                        }
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition"
                        title="الشهر التالي"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Mini Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-250/50 dark:border-slate-850">
                      {[
                        "أحد",
                        "اثنين",
                        "ثلاثاء",
                        "أربعاء",
                        "خميس",
                        "جمعة",
                        "سبت",
                      ].map((day) => (
                        <div
                          key={day}
                          className="text-center text-[9px] font-black text-slate-500 py-1 bg-slate-50 dark:bg-slate-950/40 rounded-md"
                        >
                          {day}
                        </div>
                      ))}

                      {/* Render empty cells for day offset */}
                      {Array.from({
                        length: new Date(
                          pickerMonth.getFullYear(),
                          pickerMonth.getMonth(),
                          1,
                        ).getDay(),
                      }).map((_, i) => (
                        <div
                          key={`picker-empty-${i}`}
                          className="p-1 rounded-md bg-transparent select-none opacity-0"
                        />
                      ))}

                      {/* Render Month Days */}
                      {Array.from(
                        {
                          length: new Date(
                            pickerMonth.getFullYear(),
                            pickerMonth.getMonth() + 1,
                            0,
                          ).getDate(),
                        },
                        (_, i) => i + 1,
                      ).map((day) => {
                        const dateStr = `${pickerMonth.getFullYear()}-${(pickerMonth.getMonth() + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
                        const isSelected = (
                          bookingForm.eventDates || []
                        ).includes(dateStr);

                        // Bookings for this day
                        const dayBookings = bookings.filter(
                          (b) =>
                            b.hallId === bookingForm.hallId &&
                            (b.eventDates || []).includes(dateStr) &&
                            b.status !== "cancelled" &&
                            b.id !== editingBooking?.id,
                        );

                        const hasPeriodConflict = dayBookings.some(
                          (b) => b.period === bookingForm.period,
                        );
                        const hasOtherPeriodBooking =
                          dayBookings.length > 0 && !hasPeriodConflict;

                        let btnClass = "";
                        let statusText = "متاح 🟢";

                        if (isSelected) {
                          btnClass =
                            "bg-indigo-600 text-white font-extrabold ring-2 ring-indigo-400 border border-indigo-500 scale-102 shadow-sm";
                          statusText = "محدد حالياً 📌";
                        } else if (hasPeriodConflict) {
                          btnClass =
                            "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 border border-rose-400 dark:border-rose-900/50 cursor-not-allowed opacity-80";
                          statusText = "محجوز بنفس الفترة 🔴";
                        } else if (hasOtherPeriodBooking) {
                          btnClass =
                            "bg-amber-50 dark:bg-amber-950/15 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800/80";
                          statusText = "محجوز بفترة أخرى 🟡";
                        } else {
                          btnClass =
                            "bg-slate-50/70 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800";
                        }

                        // Tooltip text
                        const tooltip =
                          `تاريخ ${dateStr}:\n• الحالة: ${statusText}\n` +
                          dayBookings
                            .map(
                              (b) =>
                                `- فترة ${b.period === "morning" ? "صباحية" : b.period === "evening" ? "مسائية" : "ليلية"}: العميل ${b.customerName}`,
                            )
                            .join("\n");

                        const handleDayClick = () => {
                          if (hasPeriodConflict) {
                            toast.error(
                              `هذا اليوم (${dateStr}) محجوز مسبقاً في الفترة الحالية! يرجى اختيار فترة أخرى أو قاعة أخرى.`,
                            );
                            return;
                          }

                          if (isSelected) {
                            // Remove
                            setBookingForm({
                              ...bookingForm,
                              eventDates: (bookingForm.eventDates || []).filter(
                                (d) => d !== dateStr,
                              ),
                            });
                          } else {
                            // Add
                            setBookingForm({
                              ...bookingForm,
                              eventDates: [
                                ...(bookingForm.eventDates || []),
                                dateStr,
                              ].sort(),
                            });

                            if (hasOtherPeriodBooking) {
                              toast.info(
                                `تنبيه: اليوم (${dateStr}) به حجز في فترة أخرى، لكنه متاح للحجز في الفترة الحالية.`,
                              );
                            }
                          }
                        };

                        return (
                          <button
                            key={`picker-day-${day}`}
                            type="button"
                            onClick={handleDayClick}
                            className={`p-1.5 rounded-lg text-center text-xs font-bold transition flex flex-col items-center justify-center min-h-[36px] ${btnClass}`}
                            title={tooltip}
                          >
                            <div className="flex items-baseline gap-0.5">
                              <span>{day}</span>
                              {/* Icon indicators for bookings */}
                              {dayBookings.length > 0 && (
                                <div className="flex gap-0.5 ml-0.5">
                                  {dayBookings.some(
                                    (b) => b.period === "morning",
                                  ) && (
                                    <Sun className="w-2.5 h-2.5 text-amber-500" />
                                  )}
                                  {dayBookings.some(
                                    (b) => b.period === "evening",
                                  ) && (
                                    <Moon className="w-2.5 h-2.5 text-indigo-500" />
                                  )}
                                </div>
                              )}
                            </div>
                            {/* Dot indicator if not selected and has conflict */}
                            {!isSelected && hasPeriodConflict && (
                              <span className="h-1 w-1 rounded-full mt-0.5 bg-rose-500 animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Color guide */}
                    <div className="flex flex-wrap items-center justify-center gap-3 text-[9px] text-slate-500 border-t border-slate-200/50 dark:border-slate-800/60 pt-2 font-black">
                      <div className="flex items-center gap-1">
                        <Sun className="w-2.5 h-2.5 text-amber-500" />
                        <span>صباحي ☀️</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Moon className="w-2.5 h-2.5 text-indigo-500" />
                        <span>مسائي 🌙</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span>محجوز بنفس الفترة (غير متاح) 🔴</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>محجوز بفترات أخرى (متاح هنا) 🟡</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-indigo-600" />
                        <span>محدد ومختار 📌</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Selected dates list as pills */}
                {(bookingForm.eventDates || []).length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-200/50 dark:border-slate-800/60 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowDayDetails(!showDayDetails)}
                      className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block underline"
                    >
                      {showDayDetails
                        ? "إخفاء تفاصيل الأيام"
                        : "تعديل تفاصيل الأيام"}
                    </button>
                    {showDayDetails && (() => {
                      const currentHall = halls.find((h) => h.id === bookingForm.hallId);
                      const hallEventPrices = currentHall?.eventPrices || [];
                      const defaultList = [
                        "غداء ومقيل",
                        "مقيل وسمر",
                        "عرس بنت",
                        "غداء ومقيل وسمر",
                        "إحتفالات",
                        "زواج",
                        "زواج (عريس)",
                        "زواج (عروسة)",
                        "عزاء",
                        "خطوبة",
                        "تخرج",
                        "عيد ميلاد",
                      ];
                      const dayEventTypes = Array.from(
                        new Set([
                          ...hallEventPrices.map((ep) => ep.eventType),
                          ...(bookingSettings?.eventTypes || []),
                          ...defaultList,
                        ])
                      );

                      return (
                        <div className="flex flex-wrap gap-1.5 w-full">
                          {/* Mobile View: Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:hidden">
                            {(bookingForm.days || []).map((day, idx) => (
                              <div key={day.date} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{day.date}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setBookingForm({
                                        ...bookingForm,
                                        eventDates: bookingForm.eventDates.filter((d) => d !== day.date),
                                      })
                                    }
                                    className="text-rose-500 hover:text-rose-700"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Event Type for this Day */}
                                <div>
                                  <label className="text-[8px] text-slate-400 block mb-1 font-bold">نوع الفعالية لهذا اليوم</label>
                                  <select
                                    value={day.eventType || bookingForm.eventType || ""}
                                    className="w-full p-1.5 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const matchedEp = hallEventPrices.find((ep) => ep.eventType === val);
                                      const newDays = [...bookingForm.days];
                                      newDays[idx].eventType = val;
                                      if (matchedEp) {
                                        newDays[idx].price = matchedEp.price;
                                      }
                                      setBookingForm({ ...bookingForm, days: newDays });
                                    }}
                                  >
                                    <option value="">-- اختر فعالية هذا اليوم --</option>
                                    {dayEventTypes.map((t) => {
                                      const ep = hallEventPrices.find((p) => p.eventType === t);
                                      return (
                                        <option key={t} value={t}>
                                          {t} {ep ? `(${ep.price.toLocaleString()} ريال)` : ""}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-400 block mb-1">السعر</label>
                                    <input
                                      type="number"
                                      value={day.price}
                                      className="w-full p-1.5 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                                      onChange={(e) => {
                                        const newDays = [...bookingForm.days];
                                        newDays[idx].price = Number(e.target.value);
                                        setBookingForm({ ...bookingForm, days: newDays });
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-400 block mb-1">الخصم</label>
                                    <input
                                      type="number"
                                      value={day.discount}
                                      className="w-full p-1.5 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                                      onChange={(e) => handleDayDiscountChange(idx, Number(e.target.value))}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] text-slate-400 block mb-1">البدء</label>
                                    <select
                                      value={day.startTime}
                                      className="w-full p-1 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-center"
                                      onChange={(e) => {
                                        const newDays = [...bookingForm.days];
                                        newDays[idx].startTime = e.target.value;
                                        setBookingForm({ ...bookingForm, days: newDays });
                                      }}
                                    >
                                      {get12hOptions().map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-slate-400 block mb-1">الانتهاء</label>
                                    <select
                                      value={day.endTime}
                                      className="w-full p-1 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-center"
                                      onChange={(e) => {
                                        const newDays = [...bookingForm.days];
                                        newDays[idx].endTime = e.target.value;
                                        setBookingForm({ ...bookingForm, days: newDays });
                                      }}
                                    >
                                      {get12hOptions().map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop View: Table */}
                          <div className="hidden md:block w-full overflow-x-auto">
                            <table className="w-full text-[10px] mt-2 border-collapse">
                              <thead>
                                <tr className="text-slate-500 border-b dark:border-slate-800 text-[10px]">
                                  <th className="py-2 text-right">التاريخ</th>
                                  <th className="py-2 text-right">نوع الفعالية</th>
                                  <th className="py-2 text-right">السعر</th>
                                  <th className="py-2 text-right">الخصم</th>
                                  <th className="py-2 text-right w-20">البدء</th>
                                  <th className="py-2 text-right w-20">الانتهاء</th>
                                  <th className="py-2 text-right w-8"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(bookingForm.days || []).map((day, idx) => (
                                  <tr key={day.date} className="border-b dark:border-slate-800">
                                    <td className="py-2 font-black text-slate-700 dark:text-slate-300 text-[10px]">
                                      {day.date}
                                    </td>
                                    <td className="py-2">
                                      <select
                                        value={day.eventType || bookingForm.eventType || ""}
                                        className="w-36 p-1 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const matchedEp = hallEventPrices.find((ep) => ep.eventType === val);
                                          const newDays = [...bookingForm.days];
                                          newDays[idx].eventType = val;
                                          if (matchedEp) {
                                            newDays[idx].price = matchedEp.price;
                                          }
                                          setBookingForm({ ...bookingForm, days: newDays });
                                        }}
                                      >
                                        <option value="">-- اختر الفعالية --</option>
                                        {dayEventTypes.map((t) => {
                                          const ep = hallEventPrices.find((p) => p.eventType === t);
                                          return (
                                            <option key={t} value={t}>
                                              {t} {ep ? `(${ep.price.toLocaleString()})` : ""}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </td>
                                    <td className="py-2">
                                      <input
                                        type="number"
                                        value={day.price}
                                        className="w-20 p-1 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                                        onChange={(e) => {
                                          const newDays = [...bookingForm.days];
                                          newDays[idx].price = Number(e.target.value);
                                          setBookingForm({ ...bookingForm, days: newDays });
                                        }}
                                      />
                                    </td>
                                    <td className="py-2">
                                      <input
                                        type="number"
                                        value={day.discount}
                                        className="w-16 p-1 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                                        onChange={(e) => handleDayDiscountChange(idx, Number(e.target.value))}
                                      />
                                    </td>
                                    <td className="py-2">
                                      <select
                                        value={day.startTime}
                                        className="w-20 p-0.5 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-center"
                                        onChange={(e) => {
                                          const newDays = [...bookingForm.days];
                                          newDays[idx].startTime = e.target.value;
                                          setBookingForm({ ...bookingForm, days: newDays });
                                        }}
                                      >
                                        {get12hOptions().map((opt) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2">
                                      <select
                                        value={day.endTime}
                                        className="w-20 p-0.5 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-center"
                                        onChange={(e) => {
                                          const newDays = [...bookingForm.days];
                                          newDays[idx].endTime = e.target.value;
                                          setBookingForm({ ...bookingForm, days: newDays });
                                        }}
                                      >
                                        {get12hOptions().map((opt) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setBookingForm({
                                            ...bookingForm,
                                            eventDates: bookingForm.eventDates.filter((d) => d !== day.date),
                                          })
                                        }
                                        className="text-rose-500 hover:text-rose-700"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* ADDITIONAL SERVICES */}
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                  خدمات إضافية
                </label>

                {services && services.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold block mb-1">
                      الخدمات المتاحة (انقر للتفعيل السريع):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {services.map((s, idx) => {
                        const isSelected = (
                          bookingForm.additionalServices || []
                        ).some((item) => item.name === s.name);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setBookingForm({
                                  ...bookingForm,
                                  additionalServices: (
                                    bookingForm.additionalServices || []
                                  ).filter((item) => item.name !== s.name),
                                });
                              } else {
                                setBookingForm({
                                  ...bookingForm,
                                  additionalServices: [
                                    ...(bookingForm.additionalServices || []),
                                    { name: s.name, cost: s.price },
                                  ],
                                });
                              }
                            }}
                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow"
                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span>{s.name}</span>
                            <span
                              className={`px-1 py-0.5 rounded text-[8px] font-mono ${isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}
                            >
                              {s.price} {bookingForm.currency}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="اسم الخدمة"
                    className="text-xs p-2 rounded-lg border w-full"
                    id="service-name-input"
                  />
                  <input
                    type="number"
                    placeholder="التكلفة"
                    className="text-xs p-2 rounded-lg border w-24"
                    id="service-cost-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nameEl = document.getElementById(
                        "service-name-input",
                      ) as HTMLInputElement;
                      const costEl = document.getElementById(
                        "service-cost-input",
                      ) as HTMLInputElement;
                      if (nameEl.value && costEl.value) {
                        setBookingForm({
                          ...bookingForm,
                          additionalServices: [
                            ...(bookingForm.additionalServices || []),
                            { name: nameEl.value, cost: Number(costEl.value) },
                          ],
                        });
                        nameEl.value = "";
                        costEl.value = "";
                      }
                    }}
                    className="bg-indigo-600 text-white px-3 rounded-lg text-xs"
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 text-[10px] space-y-1">
                  {(bookingForm.additionalServices || []).map((s, i) => (
                    <div
                      key={i}
                      className="flex flex-col bg-slate-100 p-2 rounded"
                    >
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          {s.name} :
                          <input
                            type="number"
                            value={s.cost}
                            onChange={(e) => {
                              const newServices = [...(bookingForm.additionalServices || [])];
                              newServices[i] = { ...newServices[i], cost: Number(e.target.value) };
                              setBookingForm({...bookingForm, additionalServices: newServices});
                            }}
                            className="w-16 p-1 text-[8px] rounded border"
                          />
                          {bookingForm.currency}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setBookingForm({
                              ...bookingForm,
                              additionalServices: (
                                bookingForm.additionalServices || []
                              ).filter((_, idx) => idx !== i),
                            })
                          }
                          className="text-red-500"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 text-[8px]">
                        {bookingForm.eventDates.map(date => (
                           <label key={date} className="flex items-center gap-0.5">
                             <input type="checkbox"
                                    checked={s.appliedDates?.includes(date) || false}
                                    onChange={(e) => {
                                      const newServices = [...(bookingForm.additionalServices || [])];
                                      const service = { ...newServices[i] };
                                      if (e.target.checked) {
                                        service.appliedDates = [...(service.appliedDates || []), date];
                                      } else {
                                        service.appliedDates = (service.appliedDates || []).filter(d => d !== date);
                                      }
                                      newServices[i] = service;
                                      setBookingForm({...bookingForm, additionalServices: newServices});
                                    }}
                             />
                             {date}
                           </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-indigo-50/20 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100/50">
                <div>
                  <label className="text-[9px] text-slate-550 dark:text-slate-400 block mb-1 font-bold">
                    الخصم الكلي
                  </label>
                  <input
                    type="number"
                    disabled={lockBookingAmounts || lockBookingDetails}
                    value={bookingForm.totalDiscount || ""}
                    className="w-full text-xs p-2 rounded-lg border border-slate-250 dark:border-slate-850 font-bold"
                    onChange={(e) =>
                      handleTotalDiscountChange(Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-550 dark:text-slate-400 block mb-1 font-bold">
                    قيمة العقد الصافية (شاملة الخصم)
                  </label>
                  <div className="w-full text-xs text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-250 dark:border-slate-850 font-mono font-bold">
                    {(bookingForm.totalPrice || 0).toLocaleString()}{" "}
                    {bookingForm.currency}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-[9px] text-slate-550 dark:text-slate-400 block mb-1 font-bold">
                    المقدم المدفوع حالياً (العربون)
                  </label>
                  <input
                    type="number"
                    max={bookingForm.totalPrice}
                    min={0}
                    disabled={lockBookingAmounts || lockBookingDetails}
                    value={bookingForm.paidAmount || ""}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        paidAmount: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs text-slate-850 dark:text-white bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-250 dark:border-slate-850 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-slate-550 dark:text-slate-400 block mb-1 font-mono font-bold">
                    المتبقي المطلوب لاحقاً
                  </label>
                  <div className="w-full text-xs bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-2 rounded-lg border border-slate-200 font-mono font-black py-2.5 text-center">
                    {Math.max(
                      0,
                      (bookingForm.totalPrice || 0) -
                        (bookingForm.paidAmount || 0),
                    ).toLocaleString()}{" "}
                    {bookingForm.currency}
                  </div>
                </div>
              </div>

              {/* الضمانات والتأمين والرهونات */}
              <div className="bg-slate-50/70 dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 mt-3">
                <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span>🔒 الضمانات، الرهونات والتأمين المسترد</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-550 dark:text-slate-400 block mb-1 font-bold">
                      مبلغ التأمين النقدي (مسترد)
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={lockBookingAmounts || lockBookingDetails}
                      placeholder="أدخل مبلغ التأمين..."
                      value={bookingForm.insuranceAmount || ""}
                      onChange={(e) =>
                        setBookingForm({
                          ...bookingForm,
                          insuranceAmount: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs text-slate-850 dark:text-white bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-250 dark:border-slate-850 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-550 dark:text-slate-400 block mb-1 font-bold">
                      مبلغ الرهن النقدي (Cash Mortgage)
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={lockBookingAmounts || lockBookingDetails}
                      placeholder="أدخل مبلغ الرهن النقدي..."
                      value={bookingForm.mortgageAmount || ""}
                      onChange={(e) =>
                        setBookingForm({
                          ...bookingForm,
                          mortgageAmount: Number(e.target.value),
                        })
                      }
                      className="w-full text-xs text-slate-850 dark:text-white bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-250 dark:border-slate-850 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-550 dark:text-slate-400 block mb-1 font-bold">
                      الرهونات العينية المستلمة (ذهب، مستندات...)
                    </label>
                    <input
                      type="text"
                      placeholder="مثل: بطاقة شخصية، رهن ذهب، إلخ..."
                      value={bookingForm.pledgesDescription || ""}
                      onChange={(e) =>
                        setBookingForm({
                          ...bookingForm,
                          pledgesDescription: e.target.value,
                        })
                      }
                      className="w-full text-xs text-slate-850 dark:text-white bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-250 dark:border-slate-850 font-bold"
                    />
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                  <label className="text-[9px] text-slate-550 dark:text-slate-400 block mb-1.5 font-bold">
                    صورة الرهن / الضمانة المستلمة
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-250 dark:border-slate-850">
                    <div className="flex-1 w-full">
                      <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        <Camera className="w-4 h-4 text-indigo-500" />
                        <span>
                          {bookingForm.pledgeImage
                            ? "تغيير صورة الرهن"
                            : "إرفاق أو تصوير صورة الرهن"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePledgeImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {bookingForm.pledgeImage && (
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 w-full sm:w-auto justify-between">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={bookingForm.pledgeImage}
                            alt="رهن"
                            className="w-10 h-10 object-cover rounded border border-slate-300 dark:border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[9px] text-slate-550 dark:text-slate-400 font-bold">
                            صورة الرهن مرفقة
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBookingForm((prev) => ({
                              ...prev,
                              pledgeImage: "",
                            }))
                          }
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition"
                          title="حذف الصورة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                  الحالة البدئية للحجز
                </label>
                <select
                  value={bookingForm.status || ""}
                  onChange={(e) =>
                    setBookingForm({
                      ...bookingForm,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none font-bold"
                >
                  <option value="confirmed">حجز مؤكد (مرحل)</option>
                  <option value="pending">معلق بانتظار استلام الوديعة</option>
                  <option value="cancelled">ملغى</option>
                </select>
              </div>

              {/* INTEGRATION CORNER (AUTOMATIC posting entries) */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-150 space-y-3">
                <div
                  className="flex items-center justify-between pb-1.5 border-b border-separate border-slate-200/80 cursor-pointer"
                  onClick={() => setIsTransactionSectionOpen(!isTransactionSectionOpen)}
                >
                  <span className="text-[11px] font-black text-indigo-400 flex items-center gap-1">
                    ⚡ ميزة ترحيل القيد المالي المزدوج الفوري {isTransactionSectionOpen ? '▲' : '▼'}
                  </span>

                  <label className="flex items-center gap-1 font-bold font-sans text-[10px] cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={bookingForm.generateTransaction}
                      onChange={() =>
                        setBookingForm({
                          ...bookingForm,
                          generateTransaction: !bookingForm.generateTransaction,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    تفعيل الترحيل الفوري الموزون
                  </label>
                </div>

                {isTransactionSectionOpen ? (
                  <div className="space-y-3.5 text-xs">
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      عند اتمام التسجيل، سيولد النظام تلقائياً قيداً محاسبياً
                      مرحلاً يؤثر على الأرصدة التراكمية في دليل الحسابات لـ{" "}
                      <strong>أحمد العلي</strong> (المسؤول الميداني).
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold block mb-0.5">
                          الحساب المدين (+) (استلام النقدية / البنك)
                        </label>
                        <select
                          id="select-debit-account"
                          value={bookingForm.debitAccountId || ""}
                          onChange={(e) =>
                            setBookingForm({
                              ...bookingForm,
                              debitAccountId: e.target.value,
                            })
                          }
                          className="w-full text-[10px] text-slate-800 dark:text-white bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        >
                          <option value="">
                            -- تفقد حساب الصندوق / البنك --
                          </option>
                          {accounts
                            .filter(
                              (a) =>
                                a.type === "asset" &&
                                a.balance >= 0 &&
                                a.isTransactional,
                            )
                            .map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.code}) [رصيد:{" "}
                                {(acc.balance ?? 0).toLocaleString()}{" "}
                                {acc.currency}]
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-550 dark:text-slate-400 font-extrabold block mb-0.5">
                          الحساب الدائن (-) (زيادة الايرادات المحققة)
                        </label>
                        <div className="space-y-1">
                          <select
                            id="select-credit-account"
                            value={bookingForm.creditAccountId || ""}
                            onChange={(e) =>
                              setBookingForm({
                                ...bookingForm,
                                creditAccountId: e.target.value,
                              })
                            }
                            className="w-full text-[10px] text-slate-800 dark:text-white bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                          >
                            <option value="">-- اختر حساب الإيرادات --</option>
                            {accounts
                              .filter(
                                (a) =>
                                  (a.type === "revenue" ||
                                    a.type === "liability") &&
                                  a.isTransactional,
                              )
                              .map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.code}) [رصيد:{" "}
                                  {(acc.balance ?? 0).toLocaleString()}{" "}
                                  {acc.currency}]
                                </option>
                              ))}
                          </select>

                          {/* Offer creating dedicated hall revenue if not present in list */}
                          {!accounts.some((a) => a.code === "4102") && (
                            <button
                              type="button"
                              onClick={handleCreateHallsRevenueAccount}
                              disabled={creatingRevenueAccount}
                              className="text-[9px] text-emerald-500 font-extrabold flex items-center gap-0.5 hover:underline"
                            >
                              🚀{" "}
                              {creatingRevenueAccount
                                ? "جاري الإنشاء..."
                                : "إنشاء حساب دليل الحسابات الخاص بـ (إيرادات القاعات) الآن"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 border border-dashed border-emerald-500/20 bg-emerald-500/5 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold rounded-lg">
                      معاينة القيد المزدوج: [من حـ/{" "}
                      {accounts.find((a) => a.id === bookingForm.debitAccountId)
                        ?.name || "الصندوق"}{" "}
                      ] بـ {bookingForm.paidAmount} {bookingForm.currency} •
                      [إلى حـ/{" "}
                      {accounts.find(
                        (a) => a.id === bookingForm.creditAccountId,
                      )?.name || "إيرادات القاعات"}{" "}
                      ] بنفس القيمة.
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-450 italic leading-snug">
                    تفهم الموقف الحذر. لن تدرج أي حركات في الميزانية ودفاتر
                    اليومية الذكية، وسيقتصر السجل على تسجيل موعد الحجز التنسيقي
                    فقط.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold block mb-1">
                  شروط خاصة وتنسيقات الحفل
                </label>
                <textarea
                  placeholder="مثال: يطلب العميل تجهيز الكوشة بصورة مسبقة الساعة الثالثة مساءً، مع تقديم البوفيه مباشرة عقب فقرة الزفة..."
                  value={bookingForm.notes || ""}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, notes: e.target.value })
                  }
                  className="w-full text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 font-medium h-16 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setEditingBooking(null);
                  }}
                  className="text-xs bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 p-2.5 rounded-xl font-bold text-slate-700 dark:text-white cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  disabled={isSavingBooking}
                  className="text-xs bg-indigo-650 hover:bg-indigo-700 p-2.5 px-5 rounded-xl font-bold text-white shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingBooking
                    ? "جارٍ المعالجة..."
                    : editingBooking
                      ? "تعديل وحفظ"
                      : "اعتماد الحجز وترحيل العقود"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </>
      )}

      {/* ======================================= */}
      {/* 🖨️ Contract Preview and Printing Modal */}
      {/* ======================================= */}
      {previewBooking &&
        (() => {
          const selectedHall = halls.find(
            (h) => h.id === previewBooking.hallId,
          );
          // Calculate financial summaries safely
          const daysBaseSum = (previewBooking.days || [])
            .filter((d) => d.status !== "cancelled")
            .reduce((sum, d) => sum + d.price, 0);
          const addServicesSum = (
            previewBooking.additionalServices || []
          ).filter(s => s.status !== 'cancelled')
          .reduce((sum, s) => {
            const daysCount =
              s.appliedDates && s.appliedDates.length > 0
                ? s.appliedDates.length
                : (previewBooking.days || []).filter(d => d.status !== 'cancelled').length || 1;
            return sum + s.cost * daysCount;
          }, 0);
          const rawTotalValue = daysBaseSum + addServicesSum;
          const discountValue = Number(previewBooking.totalDiscount) || 0;
          const netValue = previewBooking.totalPrice;

          // Calculate total rent paid excluding mortgage and insurance
          const directPayments = transactions
            .filter(
              (t) =>
                t.sourceId === previewBooking.id && t.sourceType === "booking",
            )
            .reduce((sum, t) => sum + t.amount, 0);

          const rentVouchers = (vouchers || []).filter((v) => {
            const bId = v.linkedBookingId || (v as any).bookingId;
            const matchesBooking =
              Boolean(bId) &&
              (bId === previewBooking.id ||
                (Boolean(previewBooking.sequenceCode) &&
                  bId === previewBooking.sequenceCode));
            const content = (v.description || "") + (v.note || "");
            const isRent =
              v.type === "receipt" &&
              !content.includes("رهن") &&
              !content.includes("تأمين");
            return matchesBooking && isRent;
          });

          const rentVoucherTotal = rentVouchers.reduce(
            (sum, v) => sum + v.amount,
            0,
          );

          // Calculate Refunded and Fines
          const bookingRefundRequests = (depositRefundRequests || []).filter(
            (r) => r.bookingId === previewBooking.id && r.status === "approved",
          );
          const totalRefundedAmount = bookingRefundRequests
            .filter((r) => r.refunded)
            .reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
          const totalFineAmount = bookingRefundRequests.reduce(
            (sum, r) => sum + (r.fineAmount || 0),
            0,
          );

          // Check if deposit is already in vouchers
          const hasDepositVoucher = rentVouchers.some((v) => {
            const content = (v.description || "") + (v.note || "");
            return content.includes("عربون");
          });

          const netDeposit = hasDepositVoucher
            ? Math.max(
                0,
                (previewBooking.paidAmount || 0) -
                  totalRefundedAmount -
                  totalFineAmount,
              )
            : 0;
          const subsequentPaymentsSum = Math.max(
            0,
            rentVoucherTotal +
              directPayments -
              (hasDepositVoucher ? previewBooking.paidAmount || 0 : 0),
          );

          const totalPaidForRent = netDeposit + subsequentPaymentsSum;
          const remainingVal = Math.max(0, netValue - totalPaidForRent);

          return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-6 z-[150] overflow-hidden md:overflow-y-auto print:p-0 print:bg-white">
              <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-none md:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[100dvh] md:h-auto md:max-h-[95vh] print:h-auto print:max-h-full print:rounded-none print:shadow-none">
                {/* Actions Bar */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3 md:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-3 print:hidden">
                  <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto pb-2 lg:pb-0">
                    <div className="flex items-center gap-2 flex-wrap p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl">
                      <button
                        onClick={() => setPrintDocType("contract")}
                        className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${printDocType === "contract" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                      >
                        عقد الحجز (الرقمي)
                      </button>
                      <button
                        onClick={() => setPrintDocType("official_lease_agreement")}
                        className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 shadow-sm ${printDocType === "official_lease_agreement" ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"}`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>عقد إتفاق إيجار (النموذج الرسمي الورقي)</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-black ${printDocType === "official_lease_agreement" ? "bg-white text-emerald-800" : "bg-emerald-600 text-white"}`}>
                          جديد
                        </span>
                      </button>
                      <button
                        onClick={() => setPrintDocType("deposit")}
                        className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${printDocType === "deposit" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                      >
                        سند قبض (عربون)
                      </button>
                      <button
                        onClick={() => setPrintDocType("insurance")}
                        className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${printDocType === "insurance" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                      >
                        سند قبض (تأمين)
                      </button>
                      {previewBooking.mortgageAmount &&
                        previewBooking.mortgageAmount > 0 && (
                          <button
                            onClick={() => setPrintDocType("mortgage")}
                            className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${printDocType === "mortgage" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}
                          >
                            سند قبض (رهن)
                          </button>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 w-full lg:w-auto flex-wrap pb-2 lg:pb-0 lg:justify-end">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hasPermission("print-booking") && (
                        <button
                          onClick={() => {
                            window.print();
                          }}
                          className="flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm cursor-pointer transition-all"
                        >
                          <Printer className="h-3 w-3" />
                          <span>طباعة</span>
                        </button>
                      )}
                      <PermissionGuard elementId="btn-accrue-revenue">
                        {hasPermission("accrue-booking") && (
                          <button
                            onClick={() => handleAccrueBooking(previewBooking)}
                            disabled={previewBooking.revenueAccrued}
                            className={`flex-none ${previewBooking.revenueAccrued ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all`}
                          >
                            <TrendingUp className="h-3 w-3" />
                            <span>
                              {previewBooking.revenueAccrued
                                ? "تم ترحيل الإيراد"
                                : "ترحيل الإيراد"}
                            </span>
                          </button>
                        )}
                      </PermissionGuard>
                      <PermissionGuard elementId="btn-refund-insurance">
                        {hasPermission("refund-insurance") && (
                          <button
                            onClick={() => {
                              if (previewBooking.insuranceRefunded) {
                                toast.info("تم رد التأمين مسبقاً");
                                return;
                              }
                              setRefundCashAccountId(
                                currentUser?.defaultCashboxId ||
                                  (bookingSettings as any)?.cashBankAccountId ||
                                  "",
                              );
                              setShowRefundInsuranceModal(true);
                            }}
                            disabled={previewBooking.insuranceRefunded}
                            className={`flex-none ${previewBooking.insuranceRefunded ? "bg-slate-400 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700"} text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all`}
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>
                              {previewBooking.insuranceRefunded
                                ? "تم رد التأمين"
                                : "رد التأمين"}
                            </span>
                          </button>
                        )}
                      </PermissionGuard>
                      {hasPermission("refund-insurance") && (
                        <button
                          onClick={() => setShowAmendmentModal(true)}
                          className="flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>طلب تعديل</span>
                        </button>
                      )}
                      <PermissionGuard elementId="btn-refund-insurance">
                        {hasPermission("refund-insurance") &&
                          (() => {
                            const hasApprovedRequest = depositRefundRequests.some(
                              (r) =>
                                r.bookingId === previewBooking.id &&
                                r.status === "approved" &&
                                !r.refunded &&
                                (r.approvedAmount || 0) > 0,
                            );
                            const hasCompletedZeroRefund =
                              depositRefundRequests.some(
                                (r) =>
                                  r.bookingId === previewBooking.id &&
                                  r.status === "approved" &&
                                  (r.approvedAmount === 0 || r.refunded),
                              );

                            if (
                              !hasApprovedRequest &&
                              (hasCompletedZeroRefund ||
                                previewBooking.depositRefunded)
                            ) {
                              return null;
                            }

                            return (
                              <button
                                onClick={() => {
                                  const approvedRequest =
                                    depositRefundRequests.find(
                                      (r) =>
                                        r.bookingId === previewBooking.id &&
                                        r.status === "approved" &&
                                        !r.refunded &&
                                        (r.approvedAmount || 0) > 0,
                                    );

                                  if (!approvedRequest) {
                                    toast.error(
                                      "يرجى تقديم طلب رد عربون أولاً واعتماده من المدير.",
                                    );
                                    return;
                                  }

                                  setRefundDepositCashAccountId(
                                    currentUser?.defaultCashboxId ||
                                      (bookingSettings as any)
                                        ?.cashBankAccountId ||
                                      "",
                                  );
                                  setShowRefundDepositModal(true);
                                }}
                                disabled={!hasApprovedRequest}
                                className={`flex-none ${!hasApprovedRequest ? "bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700"} text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all`}
                                title={
                                  !hasApprovedRequest
                                    ? "يتطلب طلب رد عربون معتمد من المدير"
                                    : ""
                                }
                              >
                                <Undo2 className="h-3 w-3" />
                                <span>
                                  {previewBooking.depositRefundedAmount &&
                                  previewBooking.depositRefundedAmount > 0
                                    ? `رد عربون (${previewBooking.depositRefundedAmount.toLocaleString()})`
                                    : "رد العربون"}
                                </span>
                              </button>
                            );
                          })()}
                      </PermissionGuard>
                      <PermissionGuard elementId="btn-refund-mortgage">
                        {hasPermission("refund-mortgage") &&
                        previewBooking.mortgageAmount &&
                        previewBooking.mortgageAmount > 0 ? (
                          <button
                            onClick={() => {
                              if (previewBooking.mortgageStatus === "returned") {
                                toast.info("تم رد الرهن مسبقاً");
                                return;
                              }
                              setRefundMortgageCashAccountId(
                                currentUser?.defaultCashboxId ||
                                  effectiveLinkedAccounts.cashBankAccountId ||
                                  "1010101",
                              );
                              setShowRefundMortgageModal(true);
                            }}
                            disabled={
                              previewBooking.mortgageStatus === "returned"
                            }
                            className={`flex-none whitespace-nowrap ${previewBooking.mortgageStatus === "returned" ? "bg-slate-400 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700"} text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all`}
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>
                              {previewBooking.mortgageStatus === "returned"
                                ? "تم رد الرهن"
                                : "رد الرهن النقدي"}
                            </span>
                          </button>
                        ) : null}
                      </PermissionGuard>
                      <PermissionGuard elementId="btn-refund-mortgage">
                        {hasPermission("refund-mortgage") &&
                        previewBooking.pledgesDescription ? (
                          <button
                            onClick={() => setShowRefundPledgeModal(true)}
                            disabled={previewBooking.pledgeStatus === "returned"}
                            className={`flex-none whitespace-nowrap ${previewBooking.pledgeStatus === "returned" ? "bg-slate-400 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700"} text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all`}
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>
                              {previewBooking.pledgeStatus === "returned"
                                ? "تم رد الرهن العيني"
                                : "رد الرهن العيني"}
                            </span>
                          </button>
                        ) : null}
                      </PermissionGuard>
                      <PermissionGuard elementId="btn-collect-payment">
                        {hasPermission("collect-booking-payment") && (
                          <button
                            onClick={() => {
                              const remaining =
                                previewBooking.totalPrice -
                                previewBooking.paidAmount -
                                (previewBooking.subsequentPayments || 0);
                              setCollectionAmount(remaining > 0 ? remaining : 0);
                              setCollectionAccountId(
                                currentUser?.defaultCashboxId ||
                                  effectiveLinkedAccounts.cashBankAccountId ||
                                  "1010101",
                              );

                              let creditAccId =
                                effectiveLinkedAccounts.accountsReceivableId ||
                                effectiveLinkedAccounts.depositCreditAccountId ||
                                "1010301";

                              if (!creditAccId) {
                                const name = previewBooking.customerName
                                  .trim()
                                  .toLowerCase();
                                const phone =
                                  previewBooking.customerPhone?.trim() || "";
                                if (clients) {
                                  const client = clients.find(
                                    (c) =>
                                      (c.name &&
                                        c.name.trim().toLowerCase() ===
                                          name) ||
                                      (phone &&
                                        c.phone &&
                                        c.phone.trim() === phone) ||
                                      (phone.length >= 5 &&
                                        (c.phone || "").includes(phone)),
                                  );
                                  if (client && client.linkedAccountId) {
                                    creditAccId = client.linkedAccountId;
                                  }
                                }
                              }

                              if (
                                !creditAccId &&
                                effectiveLinkedAccounts.accountsReceivableId
                              ) {
                                creditAccId =
                                  effectiveLinkedAccounts.accountsReceivableId;
                              }
                              setCollectionCreditAccountId(creditAccId);

                              setShowCollectionModal(true);
                            }}
                            disabled={
                              previewBooking.totalPrice -
                                previewBooking.paidAmount -
                                (previewBooking.subsequentPayments || 0) <=
                              0
                            }
                            className={`flex-none whitespace-nowrap ${previewBooking.totalPrice - previewBooking.paidAmount - (previewBooking.subsequentPayments || 0) <= 0 ? "bg-slate-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"} text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all`}
                          >
                            <CreditCard className="h-3 w-3" />
                            <span>تحصيل الدفعات</span>
                          </button>
                        )}
                      </PermissionGuard>
                      <PermissionGuard elementId="btn-accrue-revenue">
                        {hasPermission("accrue-booking") &&
                          (transactions.some((t) =>
                            t.sourceId?.includes(previewBooking.id),
                          ) ||
                          vouchers?.some(
                            (v) => {
                              const bId = v.linkedBookingId || (v as any).bookingId;
                              return (
                                Boolean(bId) &&
                                (bId === previewBooking.id ||
                                  (Boolean(previewBooking.sequenceCode) &&
                                    bId === previewBooking.sequenceCode))
                              );
                            },
                          ) ? (
                            <button
                              onClick={() => handleUnpostBooking(previewBooking)}
                              className="flex-none whitespace-nowrap bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all"
                            >
                              <Undo2 className="h-3 w-3" />
                              <span>إلغاء القيود</span>
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                handlePostInitialEntries(previewBooking)
                              }
                              className="flex-none whitespace-nowrap bg-teal-600 hover:bg-teal-700 text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all"
                            >
                              <TrendingUp className="h-3 w-3" />
                              <span>ترحيل القيود</span>
                            </button>
                          ))}
                      </PermissionGuard>
                      {hasPermission("view-accounts") && (
                        <button
                          onClick={() => {
                            setShowBookingAccountsStatementModal(true);
                          }}
                          className="flex-none whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                          title="عرض بطاقة الحسابات المالية المرتبطة بالحجز (العميل والرهونات والتأمينات)"
                        >
                          <Receipt className="h-3 w-3" />
                          <span>كشف حساب</span>
                        </button>
                      )}
                      <PermissionGuard permission="manage-discounts">
                        <button
                          onClick={() => {
                            setSelectedBookingForDiscount(previewBooking);
                            setIsBookingDiscountModalOpen(true);
                          }}
                          className="flex-none whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                          title="تعديل وتوزيع الخصومات على أيام الحجز"
                        >
                          <Tag className="h-3 w-3" />
                          <span>إدارة الخصومات</span>
                        </button>
                      </PermissionGuard>
                      <button
                        onClick={() => {
                          setPreviewBooking(null);
                          setPrintDocType("contract");
                          if (openedExternally && onReturnToPreviousView) {
                            onReturnToPreviousView();
                            setOpenedExternally(false);
                          }
                        }}
                        className="flex-none whitespace-nowrap bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[9px] md:text-[10px] px-2.5 py-2 rounded-lg cursor-pointer transition-all print:hidden"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scrollable Printable Content Frame */}
                <div className="p-2 md:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950/40 print:p-0 print:bg-white scrollbar-hide">
                  <div className="bg-white text-slate-900 p-4 md:p-8 shadow-lg w-full md:max-w-[210mm] mx-auto rounded-lg border border-slate-200 print:shadow-none print:border-none print:p-0 overflow-x-auto md:overflow-x-visible">
                    <div className="min-w-[320px] md:min-w-0">
                      {(() => {
                        let docNum =
                          previewBooking.sequenceCode ||
                          `BOK-${previewBooking.id.split("-").pop()?.toUpperCase()}`;
                        let docLabel = "رقم العقد:";
                        let matchedVoucher;

                        if (vouchers) {
                          const bookingVouchers = vouchers.filter((v: any) => {
                            const bId = v.linkedBookingId || v.bookingId;
                            return (
                              Boolean(bId) &&
                              (bId === previewBooking.id ||
                                (Boolean(previewBooking.sequenceCode) &&
                                  bId === previewBooking.sequenceCode))
                            );
                          });
                          if (
                            printDocType === "deposit" ||
                            printDocType === "contract" ||
                            printDocType === "official_lease_agreement"
                          ) {
                            matchedVoucher = bookingVouchers.find((v: any) =>
                              ((v.description || "") + (v.note || "")).includes("عربون"),
                            ) || bookingVouchers[0];
                          } else if (printDocType === "insurance") {
                            matchedVoucher = bookingVouchers.find((v: any) =>
                              ((v.description || "") + (v.note || "")).includes("تأمين"),
                            );
                          } else if (printDocType === "mortgage") {
                            matchedVoucher = bookingVouchers.find((v: any) =>
                              ((v.description || "") + (v.note || "")).includes("رهن"),
                            );
                          }

                          if (printDocType !== "contract" && printDocType !== "official_lease_agreement") {
                            docLabel = "رقم سند القبض:";
                            docNum = matchedVoucher
                              ? matchedVoucher.sequenceCode ||
                                `REC-${matchedVoucher.id.split("-").pop()?.toUpperCase()}`
                              : "";
                          } else {
                            if (matchedVoucher) {
                              docNum =
                                matchedVoucher.sequenceCode ||
                                `REC-${matchedVoucher.id.split("-").pop()?.toUpperCase()}`;
                              docLabel = "رقم سند القبض (للعربون):";
                            } else {
                              docNum = ""; // Don't show receipt number if none
                            }
                          }
                        }

                        if (printDocType === "official_lease_agreement") {
                          const matchedHall = halls.find((h) => h.id === previewBooking.hallId);
                          return (
                            <OfficialLeaseAgreementPrint
                              booking={previewBooking}
                              company={company}
                              documentNumber={docNum}
                              hall={matchedHall}
                            />
                          );
                        }

                        return (
                          <PrintTemplate
                            company={company}
                            title={
                              printDocType === "contract"
                                ? "عقد حجز قاعات ومناسبات"
                                : printDocType === "deposit"
                                  ? "سند قبض (عربون)"
                                  : printDocType === "mortgage"
                                    ? "سند قبض (رهن نقدي)"
                                    : "سند قبض (تأمين)"
                            }
                            documentNumber={docNum}
                            documentLabel={docLabel}
                            manualNumber={previewBooking.manualNumber}
                            bookingNumber={
                              previewBooking.sequenceCode &&
                              previewBooking.sequenceCode.includes("-")
                                ? previewBooking.sequenceCode.includes(
                                    new Date(
                                      previewBooking.createdAt || Date.now(),
                                    )
                                      .getFullYear()
                                      .toString(),
                                  )
                                  ? previewBooking.sequenceCode
                                  : `BOK-${new Date(previewBooking.createdAt || Date.now()).getFullYear()}-${previewBooking.sequenceCode.split("-").pop()}`
                                : `BOK-${new Date(previewBooking.createdAt || Date.now()).getFullYear()}-${(previewBooking.id || "").split("-").pop()?.toUpperCase()}`
                            }
                            date={new Date(
                              previewBooking.voucherDate ||
                                previewBooking.createdAt ||
                                Date.now(),
                            ).toLocaleDateString("ar-YE", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                            createdBy={
                              previewBooking.createdBy ||
                              currentUser?.username ||
                              currentUser?.name ||
                              "System"
                            }
                            createdAt={previewBooking.createdAt}
                          >
                            {printDocType === "contract" ? (
                              <>
                                {/* Introduction Statement */}
                                <div className="text-center font-bold text-[9px] md:text-[10px] text-slate-800 mb-3 leading-tight bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  الحمد لله وحده، والصلاة والسلام على من لا نبي
                                  بعده، وبعد.. فإنه في يوم المذكور أعلاه، تم
                                  إبرام هذا العقد والاتفاق بين الطرفين الموضحة
                                  بياناتهم أدناه لغرض حجز صالة المناسبات وإقامة{" "}
                                  {(previewBooking.eventType || "").includes(
                                    "عزاء",
                                  ) ||
                                  (previewBooking.eventType || "").includes(
                                    "مأتم",
                                  )
                                    ? "مجلس العزاء والتأبين والمواساة المتفق عليه:"
                                    : (previewBooking.eventType || "").includes(
                                          "زواج",
                                        ) ||
                                        (
                                          previewBooking.eventType || ""
                                        ).includes("عريس") ||
                                        (
                                          previewBooking.eventType || ""
                                        ).includes("عروس")
                                      ? `حفل الزفاف السعيد والمناسبة المباركة (${previewBooking.eventType}):`
                                      : `الفعالية المتفق عليها وإقامة حفل سعيد (${previewBooking.eventType || "حفل سعيد"}):`}
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-[9px] md:text-[10px] mb-3">
                                  {/* Party 1 */}
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-black text-slate-900 border-b border-slate-100 pb-1 mb-1.5 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-indigo-600">
                                          ■
                                        </span>
                                        <span>الطرف الأول (المؤجر):</span>
                                      </div>
                                    </h4>
                                    <div className="space-y-1 text-slate-800">
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-bold">
                                          الجهة:
                                        </span>
                                        <span className="font-black text-slate-900">
                                          {company?.name || "قاعة الزين الكبرى"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-bold">
                                          الهاتف:
                                        </span>
                                        <span
                                          className="font-mono font-black text-slate-900"
                                          dir="ltr"
                                        >
                                          {company?.phone || "+967 770 770 998"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-bold">
                                          الموقع:
                                        </span>
                                        <span className="font-black text-slate-900">
                                          {company?.address ||
                                            "خط الثلاثين، إب"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Party 2 */}
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                                    <h4 className="font-black text-slate-900 border-b border-slate-100 pb-1 mb-1.5 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-indigo-600">
                                          ■
                                        </span>
                                        <span>الطرف الثاني (المستأجر):</span>
                                      </div>
                                    </h4>
                                    <div className="space-y-1 text-slate-800">
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-bold">
                                          الاسم:
                                        </span>
                                        <span className="font-black text-slate-900">
                                          {previewBooking.customerName}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-bold">
                                          الجوال:
                                        </span>
                                        <span
                                          className="font-mono font-black text-slate-900"
                                          dir="ltr"
                                        >
                                          {previewBooking.customerPhone || "—"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-bold">
                                          الغرض:
                                        </span>
                                        <span className="font-black text-slate-900">
                                          {previewBooking.eventType ||
                                            "غير محدد"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Booking Details Table */}
                                <div className="mb-3">
                                  {(() => {
                                    const effectiveContractDays = (() => {
                                      if (previewBooking.days && previewBooking.days.length > 0) {
                                        const active = previewBooking.days.filter((d) => d.status !== "cancelled");
                                        if (active.length > 0) return active;
                                      }
                                      if (previewBooking.eventDates && previewBooking.eventDates.length > 0) {
                                        const count = previewBooking.eventDates.length;
                                        return previewBooking.eventDates.map((date) => ({
                                          date,
                                          startTime: previewBooking.startTime || "",
                                          endTime: previewBooking.endTime || "",
                                          price: (previewBooking.totalPrice + (previewBooking.totalDiscount || 0)) / count,
                                          discount: (previewBooking.totalDiscount || 0) / count,
                                          status: previewBooking.status,
                                        }));
                                      }
                                      if ((previewBooking as any).eventDate) {
                                        return [
                                          {
                                            date: (previewBooking as any).eventDate,
                                            startTime: previewBooking.startTime || "",
                                            endTime: previewBooking.endTime || "",
                                            price: previewBooking.totalPrice + (previewBooking.totalDiscount || 0),
                                            discount: previewBooking.totalDiscount || 0,
                                            status: previewBooking.status,
                                          },
                                        ];
                                      }
                                      return [];
                                    })();

                                    return (
                                      <>
                                        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                                          <h4 className="font-black text-[10px] md:text-[11px] text-slate-950 flex items-center gap-2">
                                            <span className="text-indigo-600">■</span>
                                            <span>تفاصيل الحجز والفترات:</span>
                                            {effectiveContractDays.length > 1 && (
                                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                حجز متعدد الأيام ({effectiveContractDays.length} أيام)
                                              </span>
                                            )}
                                          </h4>
                                          {effectiveContractDays.length > 1 && (
                                            <div className="flex flex-wrap gap-1">
                                              {effectiveContractDays.map((d, idx) => (
                                                <span key={idx} className="bg-slate-100 text-slate-800 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                                  {d.date}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <table className="w-full text-[8px] border-collapse border border-slate-300 rounded-lg overflow-hidden">
                                          <thead>
                                            <tr className="bg-slate-50 text-slate-900 font-black border-b border-slate-300">
                                              <th className="p-1.5 border-l border-slate-200 text-center">
                                                التاريخ
                                              </th>
                                              <th className="p-1.5 border-l border-slate-200 text-center">
                                                القاعة
                                              </th>
                                              <th className="p-1.5 border-l border-slate-200 text-center">
                                                الفترة
                                              </th>
                                              <th className="p-1.5 border-l border-slate-200 text-center">
                                                التوقيت
                                              </th>
                                              <th className="p-1.5 border-l border-slate-200 text-center">
                                                السعر
                                              </th>
                                              <th className="p-1.5 border-l border-slate-200 text-center">
                                                الخصم
                                              </th>
                                              <th className="p-1.5 text-center">
                                                الصافي
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {effectiveContractDays.map((day, dIdx) => (
                                              <tr
                                                key={dIdx}
                                                className="border-b border-slate-200 font-bold"
                                              >
                                                <td className="p-1.5 border-l border-slate-200 text-center font-mono">
                                                  {day.date}
                                                </td>
                                                <td className="p-1.5 border-l border-slate-200 text-center">
                                                  {selectedHall?.name || "صالة"}
                                                </td>
                                                <td className="p-1.5 border-l border-slate-200 text-center">
                                                  {previewBooking.period ===
                                                  "morning"
                                                    ? "صباحية"
                                                    : "مسائية"}
                                                </td>
                                                <td className="p-1.5 border-l border-slate-200 font-mono text-[8px] text-center">
                                                  {formatTimeTo12h(
                                                    day.startTime ||
                                                      previewBooking.startTime,
                                                  )}{" "}
                                                  -{" "}
                                                  {formatTimeTo12h(
                                                    day.endTime ||
                                                      previewBooking.endTime,
                                                  )}
                                                </td>
                                                <td className="p-1.5 border-l border-slate-200 font-mono text-center">
                                                  {(
                                                    day.price || 0
                                                  ).toLocaleString()}
                                                </td>
                                                <td className="p-1.5 border-l border-slate-200 font-mono text-red-600 text-center">
                                                  {(
                                                    day.discount || 0
                                                  ).toLocaleString()}
                                                </td>
                                                <td className="p-1.5 font-mono font-black text-slate-950 text-center">
                                                  {Math.max(
                                                    0,
                                                    day.price - (day.discount || 0),
                                                  ).toLocaleString()}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Additional Services if any */}
                                {previewBooking.additionalServices &&
                                  previewBooking.additionalServices.length >
                                    0 && (
                                    <div className="mb-3">
                                      <h4 className="font-black text-[10px] md:text-[11px] text-slate-950 mb-1.5 flex items-center gap-2">
                                        <span className="text-indigo-600">
                                          ■
                                        </span>
                                        <span>الخدمات والضيافة:</span>
                                      </h4>
                                      <table className="w-full text-[8px] border-collapse border border-slate-300 rounded-lg overflow-hidden">
                                        <thead>
                                          <tr className="bg-slate-50 text-slate-900 font-black border-b border-slate-300">
                                            <th className="p-1.5 text-center border-l border-slate-200">
                                              بيان الخدمة الإضافية
                                            </th>
                                            <th className="p-1.5 text-center border-l border-slate-200">
                                              سعر الوحدة
                                            </th>
                                            <th className="p-1.5 text-center border-l border-slate-200">
                                              عدد الأيام
                                            </th>
                                            <th className="p-1.5 text-center">
                                              الإجمالي
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {previewBooking.additionalServices.map(
                                            (s, sIdx) => {
                                              const daysCount =
                                                s.appliedDates &&
                                                s.appliedDates.length > 0
                                                  ? s.appliedDates.length
                                                  : (previewBooking.days || []).filter(d => d.status !== 'cancelled').length || 1;
                                              const serviceTotal =
                                                s.cost * daysCount;
                                              return (
                                                <tr
                                                  key={sIdx}
                                                  className="border-b border-slate-100 last:border-0 font-bold"
                                                >
                                                  <td className="p-1.5 text-center text-slate-800 border-l border-slate-100">
                                                    {s.name}
                                                  </td>
                                                  <td className="p-1.5 text-center font-mono text-slate-700 border-l border-slate-100">
                                                    {previewBooking.currency}{" "}
                                                    {s.cost.toLocaleString()}
                                                  </td>
                                                  <td className="p-1.5 text-center font-mono text-slate-700 border-l border-slate-100">
                                                    {daysCount}
                                                  </td>
                                                  <td className="p-1.5 text-center font-mono font-black text-slate-950">
                                                    {previewBooking.currency}{" "}
                                                    {serviceTotal.toLocaleString()}
                                                  </td>
                                                </tr>
                                              );
                                            },
                                          )}
                                          {/* Total Row for Services */}
                                          <tr className="bg-slate-50/50 font-black border-t border-slate-300">
                                            <td
                                              colSpan={3}
                                              className="p-1.5 text-left pr-4 border-l border-slate-100 text-slate-900"
                                            >
                                              إجمالي الخدمات الإضافية:
                                            </td>
                                            <td className="p-1.5 text-center font-mono text-indigo-700">
                                              {previewBooking.currency}{" "}
                                              {addServicesSum.toLocaleString()}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                {/* Financial Summary & Calculations Card */}
                                <PermissionGuard elementId="card-booking-financials">
                                  <div className="bg-white p-3 rounded-2xl border border-slate-200 mb-3">
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 text-center mb-3">
                                      <div className="space-y-1">
                                        <div className="text-[9px] text-slate-500 font-black">
                                          القيمة الإجمالية
                                        </div>
                                        <div className="font-black text-slate-900 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100">
                                          {previewBooking.currency}{" "}
                                          {rawTotalValue.toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[9px] text-red-500 font-black">
                                          الخصم
                                        </div>
                                        <div className="font-black text-red-600 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100">
                                          {previewBooking.currency} -
                                          {discountValue.toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[9px] text-slate-900 font-black">
                                          الصافي
                                        </div>
                                        <div className="font-black text-slate-950 font-mono bg-white p-2 rounded-xl border-2 border-slate-900">
                                          {previewBooking.currency}{" "}
                                          {netValue.toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[9px] text-indigo-700 font-black">
                                          العربون
                                        </div>
                                        <div className="font-black text-white font-mono bg-indigo-600 p-2 rounded-xl border border-indigo-700 shadow-md">
                                          {previewBooking.currency}{" "}
                                          {netDeposit.toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="text-[9px] text-emerald-700 font-black">
                                          الدفعات اللاحقة
                                        </div>
                                        <div className="font-black text-white font-mono bg-emerald-600 p-2 rounded-xl border border-emerald-700 shadow-md">
                                          {previewBooking.currency}{" "}
                                          {subsequentPaymentsSum.toLocaleString()}
                                        </div>
                                      </div>
                                      {(previewBooking.insuranceAmount || 0) >
                                        0 && (
                                        <div className="space-y-1">
                                          <div className="text-[9px] text-orange-600 font-black">
                                            مبلغ التأمين
                                          </div>
                                          <div className="font-black text-orange-700 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            {previewBooking.currency}{" "}
                                            {(
                                              previewBooking.insuranceAmount || 0
                                            ).toLocaleString()}
                                          </div>
                                        </div>
                                      )}
                                      {(previewBooking.mortgageAmount || 0) >
                                        0 && (
                                        <div className="space-y-1">
                                          <div className="text-[9px] text-amber-600 font-black">
                                            الرهن النقدي
                                          </div>
                                          <div className="font-black text-amber-700 font-mono bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            {previewBooking.currency}{" "}
                                            {(
                                              previewBooking.mortgageAmount || 0
                                            ).toLocaleString()}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Payment Vouchers List (Only visible in Preview, hidden on Print per user request) */}
                                    {rentVouchers.length > 0 && (
                                      <div className="print:hidden bg-slate-100/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 mb-2 space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-black text-slate-700 dark:text-slate-300">
                                          <span className="flex items-center gap-1.5">
                                            <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                                            سجل الدفعات وسندات القبض المسجلة ({rentVouchers.length}):
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-normal">عرض في المعاينة فقط</span>
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                          {rentVouchers.map((v: any, vIdx: number) => {
                                            const content = (v.description || "") + (v.note || "");
                                            const isDep = content.includes("عربون");
                                            return (
                                              <div key={v.id || vIdx} className="flex justify-between items-center text-[10px] bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-200/60 font-mono">
                                                <div className="flex items-center gap-2">
                                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${isDep ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {isDep ? 'عربون أولي' : 'دفعة لاحقة'}
                                                  </span>
                                                  <span className="text-slate-600 dark:text-slate-400">{(v.voucherDate || v.date || "").split("T")[0]}</span>
                                                  {v.manualNumber && (
                                                    <span className="text-slate-400 text-[9px]">سند يدوي: #{v.manualNumber}</span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-black text-emerald-600">
                                                    {Number(v.amount).toLocaleString()} {v.currency || previewBooking.currency}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setOfficialVoucherToPrint(v);
                                                      setIsOfficialVoucherPrintOpen(true);
                                                    }}
                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                                    title="طباعة السند الرسمي"
                                                  >
                                                    <Printer className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                  <div className="flex justify-between items-center bg-amber-50 p-2.5 rounded-xl border border-amber-100 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-amber-900 font-black text-[11px]">
                                        المتبقي:
                                      </span>
                                      <span className="text-[9px] text-amber-700 font-bold">
                                        (قبل الفعالية بـ 48 ساعة)
                                      </span>
                                    </div>
                                    <span className="font-black font-mono text-[13px] text-amber-900 bg-white px-3 py-0.5 rounded-lg border border-amber-200 shadow-sm">
                                      {previewBooking.currency}{" "}
                                      {remainingVal.toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Guarantees, Security Deposits & Pledges Section */}
                                  {((previewBooking.insuranceAmount || 0) > 0 ||
                                    (previewBooking.mortgageAmount || 0) > 0 ||
                                    previewBooking.pledgesDescription) && (
                                    <div className="mt-3 bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/70 text-[9px] md:text-[10px]">
                                      <h4 className="font-black text-[10px] md:text-[11px] text-indigo-950 mb-2 flex items-center gap-2">
                                        <span className="text-indigo-600">
                                          ■
                                        </span>
                                        <span>
                                          الضمانات والتأمينات والرهونات
                                          المستلمة:
                                        </span>
                                      </h4>
                                      <div className="grid grid-cols-2 gap-4 font-bold text-slate-800">
                                        <div className="space-y-1.5">
                                          {(previewBooking.insuranceAmount ||
                                            0) > 0 && (
                                            <>
                                              <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                                <span className="text-slate-500">
                                                  مبلغ التأمين النقدي المستلم:
                                                </span>
                                                <span className="font-black text-slate-950 font-mono">
                                                  {(
                                                    previewBooking.insuranceAmount ||
                                                    0
                                                  ).toLocaleString()}{" "}
                                                  {previewBooking.currency}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-slate-500">
                                                  حالة التأمين:
                                                </span>
                                                <span
                                                  className={
                                                    previewBooking.insuranceRefunded
                                                      ? "text-emerald-600 font-black"
                                                      : "text-amber-600 font-black"
                                                  }
                                                >
                                                  {previewBooking.insuranceRefunded
                                                    ? "تم إرجاعه للعميل"
                                                    : "قيد الحفظ (مستلم)"}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                        <div className="space-y-1.5">
                                          {(previewBooking.mortgageAmount ||
                                            0) > 0 && (
                                            <>
                                              <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                                <span className="text-slate-500">
                                                  مبلغ الرهن النقدي المستلم:
                                                </span>
                                                <span className="font-black text-slate-950 font-mono">
                                                  {(
                                                    previewBooking.mortgageAmount ||
                                                    0
                                                  ).toLocaleString()}{" "}
                                                  {previewBooking.currency}
                                                </span>
                                              </div>
                                              <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                                <span className="text-slate-500">
                                                  حالة الرهن النقدي:
                                                </span>
                                                <span
                                                  className={
                                                    previewBooking.mortgageStatus ===
                                                    "returned"
                                                      ? "text-emerald-600 font-black"
                                                      : "text-amber-600 font-black"
                                                  }
                                                >
                                                  {previewBooking.mortgageStatus ===
                                                  "returned"
                                                    ? "تم إرجاعه"
                                                    : "قيد الحفظ (مستلم)"}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                          {previewBooking.pledgesDescription && (
                                            <>
                                              <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                                <span className="text-slate-500">
                                                  بيان الرهونات العينية /
                                                  الأخرى:
                                                </span>
                                                <span className="font-black text-slate-900">
                                                  {previewBooking.pledgesDescription ||
                                                    "لا يوجد رهونات أخرى"}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-slate-500">
                                                  حالة الرهن العيني:
                                                </span>
                                                <span
                                                  className={
                                                    previewBooking.pledgeStatus ===
                                                    "returned"
                                                      ? "text-emerald-600 font-black"
                                                      : "text-amber-600 font-black"
                                                  }
                                                >
                                                  {previewBooking.pledgeStatus ===
                                                  "returned"
                                                    ? "تم إرجاعه"
                                                    : previewBooking.pledgesDescription
                                                      ? "قيد الحفظ (مستلم)"
                                                      : "-"}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </PermissionGuard>

                              {/* Reservation Terms & Policy Notes */}
                                <div className="text-[9px] text-slate-600 leading-tight">
                                  <h5 className="font-black text-[11px] text-slate-950 mb-1.5 flex items-center gap-2">
                                    <span className="text-orange-500 text-base">
                                      ✨
                                    </span>
                                    <span>شروط العقد والملاحظات:</span>
                                  </h5>

                                  {/* Special Booking Notes (Dynamic) */}
                                  {previewBooking.notes && (
                                    <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100 mb-2 font-bold text-indigo-900 flex items-start gap-2">
                                      <span className="text-indigo-600 mt-1">
                                        ●
                                      </span>
                                      <div className="flex-1">
                                        <span className="font-black ml-1">
                                          ملاحظات العميل:
                                        </span>
                                        {previewBooking.notes}
                                      </div>
                                    </div>
                                  )}

                                  <div className="font-bold space-y-1 text-slate-700 pr-2">
                                    {bookingSettings?.policyNotes &&
                                    bookingSettings.policyNotes.length > 0 ? (
                                      bookingSettings.policyNotes.map(
                                        (note, idx) => (
                                          <p key={idx} className="flex gap-2">
                                            <span>{idx + 1}.</span>
                                            <span>{note}</span>
                                          </p>
                                        ),
                                      )
                                    ) : (
                                      <div className="space-y-1">
                                        <p>
                                          1. يحق للطرف الأول إلغاء الحجز في حال
                                          عدم استكمال الدفعات قبل موعد الفعالية
                                          بـ 72 ساعة.
                                        </p>
                                        <p>
                                          2. لا تقع المسؤولية على الطرف الأول عن
                                          فقدان الممتلكات الشخصية لرواد الفعالية
                                          أو المدعوين.
                                        </p>
                                        <p>
                                          3. يعتبر التوقيت والجدولة الزمنية
                                          المتفق عليها معتمدة ونهائياً للطرفين.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="h-4 print:hidden"></div>
                              </>
                            ) : (
                              <div className="flex flex-col gap-4 py-4 text-sm font-bold text-slate-800">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                  <div className="text-xl font-black mb-8 flex items-center justify-between">
                                    <span className="text-slate-600">
                                      المبلغ المقبوض:
                                    </span>
                                    <span
                                      className="font-mono bg-white px-8 py-3 rounded-xl border-2 border-slate-900 text-slate-900 shadow-sm text-2xl"
                                      dir="ltr"
                                    >
                                      {previewBooking.currency}{" "}
                                      {(printDocType === "deposit"
                                        ? previewBooking.paidAmount || 0
                                        : printDocType === "mortgage"
                                          ? previewBooking.mortgageAmount || 0
                                          : previewBooking.insuranceAmount || 0
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="space-y-8">
                                    <div className="flex items-end border-b border-slate-200 pb-3 gap-4">
                                      <span className="text-slate-500 whitespace-nowrap">
                                        استلمنا من الأخ/ة:
                                      </span>
                                      <span className="flex-1 font-black text-slate-950 text-lg border-b border-dashed border-slate-300 pb-1">
                                        {previewBooking.customerName}
                                      </span>
                                    </div>
                                    <div className="flex items-end border-b border-slate-200 pb-3 gap-4">
                                      <span className="text-slate-500 whitespace-nowrap">
                                        مبلغاً وقدره:
                                      </span>
                                      <span className="flex-1 font-black text-slate-950 text-lg border-b border-dashed border-slate-300 pb-1">
                                        {(printDocType === "deposit"
                                          ? previewBooking.paidAmount || 0
                                          : printDocType === "mortgage"
                                            ? previewBooking.mortgageAmount || 0
                                            : previewBooking.insuranceAmount ||
                                              0
                                        ).toLocaleString()}{" "}
                                        {previewBooking.currency}
                                      </span>
                                    </div>
                                    <div className="flex items-end border-b border-slate-200 pb-3 gap-4">
                                      <span className="text-slate-500 whitespace-nowrap">
                                        وذلك عن:
                                      </span>
                                      <span className="flex-1 font-black text-slate-950 text-lg border-b border-dashed border-slate-300 pb-1 leading-relaxed">
                                        {printDocType === "deposit"
                                          ? "دفعة مقدمة (عربون) لحجز"
                                          : printDocType === "mortgage"
                                            ? "مبلغ رهن نقدي لحجز"
                                            : "مبلغ تأمين (ضمان) لحجز"}{" "}
                                        {selectedHall?.name || "صالة"} للفترة من{" "}
                                        {(() => {
                                          const allDates = getBookingAllDates(previewBooking);
                                          return allDates.length > 0 ? allDates.join(" و ") : "تاريخ غير محدد";
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Payments & Deposits Table */}
                            <div className="mt-3">
                              <h4 className="font-black text-[10px] text-indigo-950 mb-1">
                                سجل الدفعات والعربون:
                              </h4>
                              {(() => {
                                // Extract records once to avoid duplication
                                const bookingTxs = transactions
                                  .filter((t) => {
                                    const sId = t.sourceId || "";
                                    const bId = previewBooking.id;
                                    const bSeq = previewBooking.sequenceCode;
                                    const matchesBooking =
                                      sId === bId ||
                                      (bSeq && sId === bSeq) ||
                                      sId.startsWith(`${bId}-`) ||
                                      (bSeq &&
                                        bSeq !== "-" &&
                                        sId.startsWith(`${bSeq}-`));
                                    const isNotInsuranceOrMortgage =
                                      !sId.includes("-insurance") &&
                                      !sId.includes("-mortgage") &&
                                      !t.description?.includes("رهن") &&
                                      !t.description?.includes("تأمين");
                                    const isExcludedFromPaymentsLog =
                                      sId.includes("-contract") ||
                                      sId.includes("-discount") ||
                                      sId.includes("-accrue-") ||
                                      sId.includes("-execute");
                                    return (
                                      matchesBooking &&
                                      isNotInsuranceOrMortgage &&
                                      !isExcludedFromPaymentsLog &&
                                      t.sourceType === "booking"
                                    );
                                  })
                                  .map((t) => {
                                    let opName = "دفعة حجز";
                                    if (t.sourceId?.includes("-deposit"))
                                      opName = "عربون الحجز";
                                    else if (t.sourceId?.includes("-contract"))
                                      opName = "إثبات عقد الحجز";
                                    else if (t.sourceId?.includes("-discount"))
                                      opName = "مبلغ خصم الحجز";
                                    else if (t.sourceId?.includes("-accrue-hall"))
                                      opName = "مبلغ إيجار القاعة (استحقاق)";
                                    else if (t.sourceId?.includes("-accrue-services"))
                                      opName = "مبلغ الخدمات الإضافية (استحقاق)";
                                    else if (t.sourceId?.includes("-execute"))
                                      opName = "تحويل إيراد الفعالية";

                                    const account = accounts.find((a) => a.id === t.debitAccountId);
                                    return {
                                      id: t.id,
                                      txId: t.id,
                                      date: t.date,
                                      amount: t.amount,
                                      sequenceCode: t.sequenceCode || "-",
                                      manualNumber: t.manualNumber || (t.sourceId?.includes("-deposit") ? previewBooking.manualNumber : undefined) || "-",
                                      type: opName,
                                      cashbox: account?.name || t.debitAccountId || "-",
                                      user: t.createdBy || "-",
                                      status:
                                        t.status === "audited"
                                          ? "مدقق"
                                          : t.status === "rejected"
                                            ? "مرفوض"
                                            : "غير مدقق",
                                      auditNotes: t.auditNotes || "-",
                                    };
                                  });

                                const rentReceiptVouchers = (vouchers || [])
                                  .filter((v) => {
                                    const bId = v.linkedBookingId || (v as any).bookingId;
                                    const matchesBooking =
                                      Boolean(bId) && (bId === previewBooking.id || (Boolean(previewBooking.sequenceCode) && bId === previewBooking.sequenceCode));
                                    const isRent =
                                      v.type === "receipt" &&
                                      !v.description?.includes("رهن") &&
                                      !v.description?.includes("تأمين") &&
                                      !v.note?.includes("رهن") &&
                                      !v.note?.includes("تأمين");
                                    return matchesBooking && isRent;
                                  })
                                  .map((v) => {
                                    const account = accounts.find((a) => a.id === v.cashBankAccountId);
                                    const transaction = transactions.find(
                                      (t) => t.sourceId === v.id && t.sourceType === "voucher"
                                    );
                                    const opType = v.description?.includes("عربون")
                                      ? "سند قبض عربون"
                                      : "سند قبض دفعة";
                                    return {
                                      id: v.id,
                                      txId: transaction?.id,
                                      date: v.date,
                                      amount: v.amount,
                                      sequenceCode: v.sequenceCode || "-",
                                      manualNumber: v.manualNumber || transaction?.manualNumber || "-",
                                      type: opType,
                                      cashbox: account?.name || v.cashBankAccountId || "-",
                                      user: v.createdBy || "-",
                                      status:
                                        transaction?.status === "audited"
                                          ? "مدقق"
                                          : transaction?.status === "rejected"
                                            ? "مرفوض"
                                            : "غير مدقق",
                                      auditNotes: transaction?.auditNotes || "-",
                                    };
                                  });

                                const refundRecords = (vouchers || [])
                                  .filter((v) => {
                                    const bId = v.linkedBookingId || (v as any).bookingId;
                                    const matchesBooking =
                                      Boolean(bId) && (bId === previewBooking.id || (Boolean(previewBooking.sequenceCode) && bId === previewBooking.sequenceCode));
                                    const isRefund =
                                      v.type === "payment" &&
                                      (v.description?.includes("عربون") || v.note?.includes("عربون"));
                                    return matchesBooking && isRefund;
                                  })
                                  .map((v) => {
                                    const account = accounts.find(
                                      (a) => a.id === v.cashBankAccountId || a.id === (v as any).accountId
                                    );
                                    const transaction = transactions.find(
                                      (t) => t.sourceId === v.id && t.sourceType === "voucher"
                                    );
                                    return {
                                      id: v.id,
                                      txId: transaction?.id,
                                      date: v.date,
                                      amount: -v.amount,
                                      sequenceCode: v.sequenceCode || "-",
                                      manualNumber: v.manualNumber || transaction?.manualNumber || "-",
                                      type: "سند رد عربون",
                                      cashbox: account?.name || v.cashBankAccountId || (v as any).accountId || "-",
                                      user: v.createdBy || "-",
                                      status:
                                        transaction?.status === "audited"
                                          ? "مدقق"
                                          : transaction?.status === "rejected"
                                            ? "مرفوض"
                                            : "غير مدقق",
                                      auditNotes: transaction?.auditNotes || "-",
                                    };
                                  });

                                const fineRecords = (vouchers || [])
                                  .filter((v) => {
                                    const bId = v.linkedBookingId || (v as any).bookingId;
                                    const matchesBooking =
                                      Boolean(bId) && (bId === previewBooking.id || (Boolean(previewBooking.sequenceCode) && bId === previewBooking.sequenceCode));
                                    const isFine =
                                      v.type === "journal" &&
                                      (v.description?.includes("غرامة") || v.note?.includes("غرامة"));
                                    return matchesBooking && isFine;
                                  })
                                  .map((v) => {
                                    const transaction = transactions.find(
                                      (t) => t.sourceId === v.id && t.sourceType === "voucher"
                                    );
                                    return {
                                      id: v.id,
                                      txId: transaction?.id,
                                      date: v.date,
                                      amount: -v.amount,
                                      sequenceCode: v.sequenceCode || "-",
                                      manualNumber: v.manualNumber || transaction?.manualNumber || "-",
                                      type: "غرامة إلغاء",
                                      cashbox: "-",
                                      user: v.createdBy || "-",
                                      status:
                                        transaction?.status === "audited"
                                          ? "مدقق"
                                          : transaction?.status === "rejected"
                                            ? "مرفوض"
                                            : "غير مدقق",
                                      auditNotes: transaction?.auditNotes || "-",
                                    };
                                  });

                                const rentRecords = [
                                  ...bookingTxs,
                                  ...rentReceiptVouchers,
                                  ...refundRecords,
                                  ...fineRecords,
                                ].sort((a, b) => {
                                  if (a.sequenceCode === "-") return 1;
                                  if (b.sequenceCode === "-") return -1;
                                  return a.sequenceCode.localeCompare(b.sequenceCode);
                                });

                                return (
                                  <>
                                    {/* Mobile View: Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:hidden">
                                      {rentRecords.map((r, idx) => (
                                        <div key={r.id || idx} className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-[8px]">
                                          <div className="flex justify-between items-center border-b pb-1 mb-1">
                                            <span className="font-black text-indigo-600">{new Date(r.date).toLocaleDateString("ar-YE")}</span>
                                            <span className={`px-2 py-0.5 rounded-full font-black ${
                                              r.status === "مدقق" ? "bg-emerald-100 text-emerald-600" :
                                              r.status === "مرفوض" ? "bg-rose-100 text-rose-600" :
                                              "bg-amber-100 text-amber-600"
                                            }`}>
                                              {r.status}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                            <div className="flex justify-between">
                                              <span className="text-slate-400">المبلغ:</span>
                                              <span className={`font-bold ${r.amount < 0 ? "text-red-600" : ""}`}>
                                                {(r.amount || 0).toLocaleString()} {previewBooking.currency}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-400">رقم السند:</span>
                                              <span className="font-bold">{r.sequenceCode}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-400">السند اليدوي:</span>
                                              <span className="font-bold font-mono">{r.manualNumber}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-400">نوع العملية:</span>
                                              <span className="font-bold">{r.type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-400">الصندوق:</span>
                                              <span className="font-bold">{r.cashbox}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-slate-400">المستخدم:</span>
                                              <span className="font-bold">{r.user}</span>
                                            </div>
                                          </div>
                                          {r.status === "غير مدقق" && hasPermission("audit-booking-transactions") && (
                                            <div className="flex gap-2 pt-1 mt-1 border-t">
                                              <button
                                                onClick={() => handleAuditAction(r.txId || r.id, "audited")}
                                                className="flex-1 py-1 bg-emerald-500 text-white rounded text-[7px] font-black"
                                              >
                                                اعتماد
                                              </button>
                                              <button
                                                onClick={() => handleAuditAction(r.txId || r.id, "rejected")}
                                                className="flex-1 py-1 bg-rose-500 text-white rounded text-[7px] font-black"
                                              >
                                                رفض
                                              </button>
                                            </div>
                                          )}
                                          {r.auditNotes !== "-" && (
                                            <div className="text-slate-400 italic text-[7px] mt-1 border-t pt-1">
                                              ملاحظات: {r.auditNotes}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>

                                    {/* Desktop View: Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                      <table className="w-full text-[8px] text-center border-collapse">
                                        <thead>
                                          <tr className="bg-slate-100">
                                            <th className="border p-1">التاريخ</th>
                                            <th className="border p-1">المبلغ</th>
                                            <th className="border p-1">رقم السند</th>
                                            <th className="border p-1">السند اليدوي</th>
                                            <th className="border p-1">نوع العملية</th>
                                            <th className="border p-1">الصندوق</th>
                                            <th className="border p-1">المستخدم</th>
                                            <th className="border p-1">حالة التدقيق</th>
                                            <th className="border p-1">ملاحظات التدقيق</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rentRecords.map((r, idx) => (
                                            <tr key={r.id || idx}>
                                              <td className="border p-1">{new Date(r.date).toLocaleDateString("ar-YE")}</td>
                                              <td className={`border p-1 ${r.amount < 0 ? "text-red-600 font-bold" : ""}`}>
                                                {(r.amount || 0).toLocaleString()} {previewBooking.currency}
                                              </td>
                                              <td className="border p-1">{r.sequenceCode}</td>
                                              <td className="border p-1 font-mono font-bold text-slate-700 dark:text-slate-300">{r.manualNumber}</td>
                                              <td className="border p-1">{r.type}</td>
                                              <td className="border p-1">{r.cashbox}</td>
                                              <td className="border p-1">{r.user}</td>
                                              <td className="border p-1">
                                                <div className="flex flex-col items-center gap-1">
                                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                                                    r.status === "مدقق" ? "bg-emerald-100 text-emerald-600" :
                                                    r.status === "مرفوض" ? "bg-rose-100 text-rose-600" :
                                                    "bg-amber-100 text-amber-600"
                                                  }`}>
                                                    {r.status}
                                                  </span>
                                                  {r.status === "غير مدقق" && hasPermission("audit-booking-transactions") && (
                                                    <div className="flex gap-1 mt-1">
                                                      <button
                                                        onClick={() => handleAuditAction(r.txId || r.id, "audited")}
                                                        className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition"
                                                        title="اعتماد"
                                                      >
                                                        <Check className="h-2.5 w-2.5" />
                                                      </button>
                                                      <button
                                                        onClick={() => handleAuditAction(r.txId || r.id, "rejected")}
                                                        className="p-1 bg-rose-500 text-white rounded hover:bg-rose-600 transition"
                                                        title="رفض"
                                                      >
                                                        <X className="h-2.5 w-2.5" />
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="border p-1">{r.auditNotes}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Remaining Balance Breakdown Table */}
                            <div className="mt-3">
                              <h4 className="font-black text-[10px] text-indigo-950 mb-1">
                                تفاصيل الرصيد المتبقي:
                              </h4>
                              {(() => {
                                const bId = previewBooking.id;
                                const bSeq = previewBooking.sequenceCode;

                                // Discount txs
                                const discountTxs = transactions.filter(
                                  (t) =>
                                    t.sourceType === "booking" &&
                                    (t.sourceId === `${bId}-discount` ||
                                      t.sourceId.startsWith(`${bId}-discount-day-`) ||
                                      (bSeq &&
                                        bSeq !== "-" &&
                                        (t.sourceId === `${bSeq}-discount` ||
                                          t.sourceId.startsWith(`${bSeq}-discount-day-`))))
                                );
                                const discountTx = discountTxs[0];
                                const allDiscountAudited = discountTxs.length > 0 && discountTxs.every((t) => t.status === "audited");
                                const anyDiscountRejected = discountTxs.length > 0 && discountTxs.some((t) => t.status === "rejected");
                                const discountStatus = discountTxs.length > 0
                                  ? allDiscountAudited ? "مدقق" : anyDiscountRejected ? "مرفوض" : "غير مدقق"
                                  : null;

                                // Core accrual txs (-contract, -accrue-hall, -accrue-services, -execute)
                                const coreBookingTxs = transactions.filter((t) => {
                                  const sId = t.sourceId || "";
                                  const matchesBooking =
                                    sId === bId || (bSeq && bSeq !== "-" && sId === bSeq) || sId.startsWith(`${bId}-`) || (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
                                  const isCore = sId.includes("-contract") || sId.includes("-accrue-") || sId.includes("-execute");
                                  return matchesBooking && isCore && t.sourceType === "booking";
                                });

                                const anyBookingTx = transactions.find((t) => {
                                  const sId = t.sourceId || "";
                                  return sId === bId || (bSeq && bSeq !== "-" && sId === bSeq) || sId.startsWith(`${bId}-`) || (bSeq && bSeq !== "-" && sId.startsWith(`${bSeq}-`));
                                });

                                const isCoreAudited = coreBookingTxs.length > 0 && coreBookingTxs.every((t) => t.status === "audited");
                                const firstCoreTxId = coreBookingTxs[0]?.id || anyBookingTx?.id;
                                const coreStatus = coreBookingTxs.length > 0
                                  ? isCoreAudited ? "مدقق" : coreBookingTxs.some((t) => t.status === "rejected") ? "مرفوض" : "غير مدقق"
                                  : anyBookingTx ? (anyBookingTx.status === "audited" ? "مدقق" : anyBookingTx.status === "rejected" ? "مرفوض" : "غير مدقق") : null;

                                const hasDepositVoucher = rentVouchers.some((v) => ((v.description || "") + (v.note || "")).includes("عربون"));
                                const depositVoucher = rentVouchers.find((v) => ((v.description || "") + (v.note || "")).includes("عربون"));
                                const depAmt = hasDepositVoucher ? (depositVoucher ? depositVoucher.amount : (previewBooking.paidAmount || 0)) : 0;
                                const isSingleVoucher = rentVouchers.length === 1 && depositVoucher;
                                const totalPaid = isSingleVoucher ? depositVoucher.amount : rentVouchers.reduce((sum, v) => sum + v.amount, 0);

                                const breakdownItems = [
                                  { label: "الإجمالي قبل الخصم", value: rawTotalValue, status: coreStatus, txId: firstCoreTxId, auditTitle: "اعتماد الإجمالي وقيود الاستحقاق" },
                                  { label: "مبلغ الخصم", value: discountValue, status: discountStatus, txId: discountTx?.id, auditTitle: "اعتماد قيد الخصم" },
                                  { label: "الصافي بعد الخصم", value: netValue, bold: true },
                                  { label: "العربون", value: depAmt },
                                  { label: "إجمالي الدفعات", value: totalPaidForRent - depAmt },
                                  { label: "المتبقي النهائي", value: remainingVal, highlight: true },
                                ];

                                return (
                                  <>
                                    {/* Mobile View: Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:hidden">
                                      {breakdownItems.map((item, idx) => (
                                        <div key={idx} className={`p-2 rounded-lg border text-[8px] flex flex-col items-center justify-center text-center space-y-1 ${item.highlight ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200"}`}>
                                          <span className="text-slate-400 font-bold">{item.label}</span>
                                          <span className={`text-[10px] font-black ${item.highlight ? "text-indigo-600" : "text-slate-900"}`}>
                                            {(item.value || 0).toLocaleString()}
                                          </span>
                                          {item.status && item.txId && (
                                            <div className="flex flex-col items-center gap-1">
                                              <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black ${
                                                item.status === "مدقق" ? "bg-emerald-100 text-emerald-600" :
                                                item.status === "مرفوض" ? "bg-rose-100 text-rose-600" :
                                                "bg-amber-100 text-amber-600"
                                              }`}>
                                                {item.status}
                                              </span>
                                              {item.status !== "مدقق" && hasPermission("audit-booking-transactions") && (
                                                <div className="flex gap-1">
                                                  <button onClick={() => handleAuditAction(item.txId, "audited")} className="p-0.5 bg-emerald-500 text-white rounded"><Check className="h-2.5 w-2.5" /></button>
                                                  <button onClick={() => handleAuditAction(item.txId, "rejected")} className="p-0.5 bg-rose-500 text-white rounded"><X className="h-2.5 w-2.5" /></button>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>

                                    {/* Desktop View: Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                      <table className="w-full text-[8px] text-center border-collapse">
                                        <thead>
                                          <tr className="bg-slate-100">
                                            <th className="border p-1">الإجمالي قبل الخصم</th>
                                            <th className="border p-1">مبلغ الخصم</th>
                                            <th className="border p-1">الصافي بعد الخصم</th>
                                            <th className="border p-1">العربون</th>
                                            <th className="border p-1">إجمالي الدفعات</th>
                                            <th className="border p-1">المتبقي النهائي</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td className="border p-1">
                                              <div className="flex flex-col items-center justify-center gap-1">
                                                <span className="font-bold">{(rawTotalValue || 0).toLocaleString()}</span>
                                                {coreStatus && firstCoreTxId && (
                                                  <div className="inline-flex items-center gap-1">
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                                                      coreStatus === "مدقق" ? "bg-emerald-100 text-emerald-600" :
                                                      coreStatus === "مرفوض" ? "bg-rose-100 text-rose-600" :
                                                      "bg-amber-100 text-amber-600"
                                                    }`}>
                                                      {coreStatus}
                                                    </span>
                                                    {coreStatus !== "مدقق" && hasPermission("audit-booking-transactions") && (
                                                      <div className="inline-flex gap-0.5">
                                                        <button onClick={() => handleAuditAction(firstCoreTxId, "audited")} className="p-0.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition" title="اعتماد الإجمالي وقيود الاستحقاق"><Check className="h-2.5 w-2.5" /></button>
                                                        <button onClick={() => handleAuditAction(firstCoreTxId, "rejected")} className="p-0.5 bg-rose-500 text-white rounded hover:bg-rose-600 transition" title="رفض"><X className="h-2.5 w-2.5" /></button>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td className="border p-1">
                                              <div className="flex flex-col items-center justify-center gap-1">
                                                <span className="font-bold">{(discountValue || 0).toLocaleString()}</span>
                                                {discountStatus && discountTx && (
                                                  <div className="inline-flex items-center gap-1">
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                                                      discountStatus === "مدقق" ? "bg-emerald-100 text-emerald-600" :
                                                      discountStatus === "مرفوض" ? "bg-rose-100 text-rose-600" :
                                                      "bg-amber-100 text-amber-600"
                                                    }`}>
                                                      {discountStatus}
                                                    </span>
                                                    {discountStatus !== "مدقق" && hasPermission("audit-booking-transactions") && (
                                                      <div className="inline-flex gap-0.5">
                                                        <button onClick={() => handleAuditAction(discountTx.id, "audited")} className="p-0.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition" title="اعتماد قيد الخصم"><Check className="h-2.5 w-2.5" /></button>
                                                        <button onClick={() => handleAuditAction(discountTx.id, "rejected")} className="p-0.5 bg-rose-500 text-white rounded hover:bg-rose-600 transition" title="رفض قيد الخصم"><X className="h-2.5 w-2.5" /></button>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            <td className="border p-1 font-bold">{(netValue || 0).toLocaleString()}</td>
                                            <td className="border p-1">{depAmt.toLocaleString()}</td>
                                            <td className="border p-1">{(totalPaidForRent - depAmt).toLocaleString()}</td>
                                            <td className="border p-1 font-black text-indigo-700 bg-indigo-50/30">{(remainingVal || 0).toLocaleString()}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Refund Records Table */}
                            {(() => {
                              const hasRelevantVoucher = (vouchers || []).some(
                                (v) => {
                                  const bId =
                                    v.linkedBookingId || (v as any).bookingId;
                                  const matchesBooking =
                                    Boolean(bId) &&
                                    (bId === previewBooking.id ||
                                      (Boolean(previewBooking.sequenceCode) &&
                                        bId === previewBooking.sequenceCode));
                                  const content =
                                    (v.description || "") + (v.note || "");
                                  const isMortgageOrInsurance =
                                    content.includes("رهن") ||
                                    content.includes("تأمين");
                                  return (
                                    matchesBooking && isMortgageOrInsurance
                                  );
                                },
                              );
                              return (
                                (previewBooking.insuranceAmount || 0) > 0 ||
                                (previewBooking.mortgageAmount || 0) > 0 ||
                                hasRelevantVoucher
                              );
                            })() && (
                              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <h4 className="font-black text-[11px] text-indigo-950 dark:text-indigo-300 mb-3 flex items-center gap-2">
                                  <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                                  سجل استرداد التأمينات والرهونات:
                                </h4>
                                {(() => {
                                      const relevantVouchers = (vouchers || [])
                                        .filter((v) => {
                                          const bId =
                                            v.linkedBookingId ||
                                            (v as any).bookingId;
                                          const matchesBooking =
                                            Boolean(bId) &&
                                            (bId === previewBooking.id ||
                                              (Boolean(previewBooking.sequenceCode) &&
                                                bId === previewBooking.sequenceCode));
                                          const content =
                                            (v.description || "") +
                                            (v.note || "");
                                          const isMortgageOrInsurance =
                                            content.includes("رهن") ||
                                            content.includes("تأمين");
                                          return (
                                            matchesBooking &&
                                            isMortgageOrInsurance
                                          );
                                        })
                                        .map((v) => {
                                          const account = accounts.find(
                                            (a) =>
                                              a.id === v.cashBankAccountId ||
                                              a.id === (v as any).accountId,
                                          );
                                          const transaction = transactions.find(
                                            (t) =>
                                              t.sourceId === v.id &&
                                              t.sourceType === "voucher",
                                          );
                                          const content =
                                            (v.description || "") +
                                            (v.note || "");
                                          let opType = "";
                                          if (v.type === "receipt") {
                                            opType = content.includes("رهن")
                                              ? "قبض رهن"
                                              : "قبض تأمين";
                                          } else {
                                            opType = content.includes("رهن")
                                              ? "استرداد رهن"
                                              : "استرداد تأمين";
                                          }
                                          return {
                                            id: v.id,
                                            txId: transaction?.id,
                                            date: v.date,
                                            amount: v.amount,
                                            sequenceCode: v.sequenceCode || "-",
                                            manualNumber: v.manualNumber || transaction?.manualNumber || "-",
                                            type: opType,
                                            cashbox:
                                              account?.name ||
                                              v.cashBankAccountId ||
                                              (v as any).accountId ||
                                              "-",
                                            user: v.createdBy || "-",
                                            status:
                                              transaction?.status === "audited"
                                                ? "مدقق"
                                                : transaction?.status ===
                                                    "rejected"
                                                  ? "مرفوض"
                                                  : "غير مدقق",
                                            auditNotes:
                                              transaction?.auditNotes || "-",
                                            isRefund: v.type === "payment",
                                          };
                                        })
                                        .sort((a, b) => {
                                          if (a.sequenceCode === "-") return 1;
                                          if (b.sequenceCode === "-") return -1;
                                          return a.sequenceCode.localeCompare(
                                            b.sequenceCode,
                                          );
                                        });

                                  return (
                                    <>
                                      {/* Mobile View: Cards */}
                                      <div className="grid grid-cols-1 gap-3 md:hidden">
                                        {relevantVouchers.map((r, idx) => (
                                          <div key={r.id || idx} className="bg-slate-50 dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800 space-y-0.5 text-[8px]">
                                            <div className="flex justify-between items-center border-b pb-0.5 mb-0.5">
                                              <span className="font-black text-indigo-600">{new Date(r.date).toLocaleDateString("ar-YE")}</span>
                                              <span className={`px-1 py-0 rounded font-black ${
                                                r.status === "مدقق" ? "bg-emerald-100 text-emerald-600" :
                                                r.status === "مرفوض" ? "bg-rose-100 text-rose-600" :
                                                "bg-amber-100 text-amber-600"
                                              }`}>
                                                {r.status}
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-slate-400 text-[9px]">المبلغ:</span>
                                                <span className={`font-black ${r.isRefund ? "text-red-600" : "text-slate-900 dark:text-white"}`}>
                                                  {r.isRefund ? "-" : ""}{r.amount.toLocaleString()} {previewBooking.currency}
                                                </span>
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-slate-400 text-[9px]">رقم السند:</span>
                                                <span className="font-black text-slate-900 dark:text-white">{r.sequenceCode}</span>
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-slate-400 text-[9px]">السند اليدوي:</span>
                                                <span className="font-black font-mono text-slate-900 dark:text-white">{r.manualNumber}</span>
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-slate-400 text-[9px]">نوع العملية:</span>
                                                <span className="font-black text-slate-900 dark:text-white">{r.type}</span>
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-slate-400 text-[9px]">الصندوق:</span>
                                                <span className="font-black text-slate-900 dark:text-white whitespace-normal break-words leading-tight">{r.cashbox}</span>
                                              </div>
                                              <div className="flex flex-col gap-0.5 col-span-2 border-t border-slate-50 dark:border-slate-800 pt-2">
                                                <span className="text-slate-400 text-[9px]">المستخدم:</span>
                                                <span className="font-black text-slate-900 dark:text-white leading-tight break-words">{r.user}</span>
                                              </div>
                                            </div>
                                            {r.status === "غير مدقق" && hasPermission("audit-booking-transactions") && (
                                              <div className="flex gap-2 pt-1 mt-1 border-t">
                                                <button
                                                  onClick={() => handleAuditAction(r.txId || r.id, "audited")}
                                                  className="flex-1 py-1 bg-emerald-500 text-white rounded text-[7px] font-black"
                                                >
                                                  اعتماد
                                                </button>
                                                <button
                                                  onClick={() => handleAuditAction(r.txId || r.id, "rejected")}
                                                  className="flex-1 py-1 bg-rose-500 text-white rounded text-[7px] font-black"
                                                >
                                                  رفض
                                                </button>
                                              </div>
                                            )}
                                            {r.auditNotes !== "-" && (
                                              <div className="text-slate-400 italic text-[7px] mt-1 border-t pt-1">
                                                ملاحظات: {r.auditNotes}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      {/* Desktop View: Table */}
                                      <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-[8px] text-center border-collapse">
                                          <thead>
                                            <tr className="bg-slate-100">
                                              <th className="border p-1">التاريخ</th>
                                              <th className="border p-1">المبلغ</th>
                                              <th className="border p-1">رقم السند</th>
                                              <th className="border p-1">السند اليدوي</th>
                                              <th className="border p-1">نوع العملية</th>
                                              <th className="border p-1">الصندوق</th>
                                              <th className="border p-1">المستخدم</th>
                                              <th className="border p-1">حالة التدقيق</th>
                                              <th className="border p-1">ملاحظات التدقيق</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {relevantVouchers.map((r, idx) => (
                                              <tr key={r.id || idx}>
                                                <td className="border p-1">
                                                  {new Date(r.date).toLocaleDateString("ar-YE")}
                                                </td>
                                                <td className={`border p-1 ${r.isRefund ? "text-red-600 font-bold" : ""}`}>
                                                  {r.isRefund ? "-" : ""}
                                                  {r.amount.toLocaleString()}{" "}
                                                  {previewBooking.currency}
                                                </td>
                                                <td className="border p-1">{r.sequenceCode}</td>
                                                <td className="border p-1 font-mono font-bold text-slate-700 dark:text-slate-300">{r.manualNumber}</td>
                                                <td className="border p-1">{r.type}</td>
                                                <td className="border p-1">{r.cashbox}</td>
                                                <td className="border p-1">{r.user}</td>
                                                <td className="border p-1">
                                                  <div className="flex flex-col items-center gap-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                                                      r.status === "مدقق" ? "bg-emerald-100 text-emerald-600" :
                                                      r.status === "مرفوض" ? "bg-rose-100 text-rose-600" :
                                                      "bg-amber-100 text-amber-600"
                                                    }`}>
                                                      {r.status}
                                                    </span>
                                                    {r.status === "غير مدقق" && hasPermission("audit-booking-transactions") && (
                                                      <div className="flex gap-1 mt-1">
                                                        <button
                                                          onClick={() => handleAuditAction(r.txId || r.id, "audited")}
                                                          className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition"
                                                          title="اعتماد"
                                                        >
                                                          <Check className="h-2.5 w-2.5" />
                                                        </button>
                                                        <button
                                                          onClick={() => handleAuditAction(r.txId || r.id, "rejected")}
                                                          className="p-1 bg-rose-500 text-white rounded hover:bg-rose-600 transition"
                                                          title="رفض"
                                                        >
                                                          <X className="h-2.5 w-2.5" />
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="border p-1">{r.auditNotes}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </>
                                  );
                                    })()}
                              </div>
                            )}
                          </PrintTemplate>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      {/* Security Deposit Refund Modal */}
      {showRefundInsuranceModal && previewBooking && (() => {
        const bookingRefundRequests = depositRefundRequests.filter(
          (r) => r.bookingId === previewBooking.id,
        );
        const totalRefundedAmount = bookingRefundRequests
          .filter((r) => r.refunded)
          .reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
        const totalFineAmount = bookingRefundRequests.reduce(
          (sum, r) => sum + (r.fineAmount || 0),
          0,
        );
        const rentVouchers = (vouchers || []).filter((v) => {
          const bId = v.linkedBookingId || (v as any).bookingId;
          return (
            Boolean(bId) && (bId === previewBooking.id || (Boolean(previewBooking.sequenceCode) && bId === previewBooking.sequenceCode)) &&
            v.type === "receipt" &&
            !v.description?.includes("رهن") &&
            !v.description?.includes("تأمين") &&
            !v.note?.includes("رهن") &&
            !v.note?.includes("تأمين")
          );
        });
        const hasDepositVoucher = rentVouchers.some((v) => {
          const content = (v.description || "") + (v.note || "");
          return content.includes("عربون");
        });
        const rentVoucherTotal = rentVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
        const directPayments = transactions
          .filter((t) => {
            const sId = t.sourceId || "";
            const matchesBooking =
              sId === previewBooking.id ||
              (previewBooking.sequenceCode && sId === previewBooking.sequenceCode) ||
              sId.startsWith(`${previewBooking.id}-`) ||
              (previewBooking.sequenceCode &&
                previewBooking.sequenceCode !== "-" &&
                sId.startsWith(`${previewBooking.sequenceCode}-`));
            const isNotInsuranceOrMortgage =
              !sId.includes("-insurance") &&
              !sId.includes("-mortgage") &&
              !t.description?.includes("رهن") &&
              !t.description?.includes("تأمين");
            const isExcludedFromPaymentsLog =
              sId.includes("-contract") ||
              sId.includes("-discount") ||
              sId.includes("-accrue-") ||
              sId.includes("-execute");
            return (
              matchesBooking &&
              isNotInsuranceOrMortgage &&
              !isExcludedFromPaymentsLog &&
              t.sourceType === "booking"
            );
          })
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const netDeposit = hasDepositVoucher
          ? Math.max(
              0,
              (previewBooking.paidAmount || 0) -
                totalRefundedAmount -
                totalFineAmount,
            )
          : 0;
        const subsequentPaymentsSum = Math.max(
          0,
          rentVoucherTotal +
            directPayments -
            (hasDepositVoucher ? previewBooking.paidAmount || 0 : 0),
        );

        return (
          <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl">
                      <Undo2 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1">
                        رد مبلغ التأمين
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        إرجاع التأمين للعميل وتوليد قيد صرف
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRefundInsuranceModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl mb-6 border border-orange-100 dark:border-orange-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">
                      اسم العميل:
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {previewBooking.customerName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-orange-100 dark:border-orange-900/10">
                    <span className="text-xs font-bold text-slate-500">
                      مبلغ التأمين:
                    </span>
                    <span className="text-lg font-black text-orange-600">
                      {(previewBooking.insuranceAmount || 0).toLocaleString()}{" "}
                      {previewBooking.currency}
                    </span>
                  </div>

                  {/* Separated deposit and collections */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-orange-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 block mb-0.5">مبلغ العربون:</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                        {previewBooking.currency} {netDeposit.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-orange-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 block mb-0.5">مبالغ التحصيلات للدفعات:</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                        {previewBooking.currency} {subsequentPaymentsSum.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                      تاريخ السند (Voucher Date)
                    </label>
                    <input
                      type="date"
                      value={refundVoucherDate || ""}
                      onChange={(e) => setRefundVoucherDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                      حساب الصرف (الصندوق/البنك)
                    </label>
                    <select
                      value={refundCashAccountId || ""}
                      onChange={(e) => setRefundCashAccountId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                    >
                      <option value="">اختر الحساب...</option>
                      {accounts
                        .filter(
                          (acc) =>
                            (acc.type === "asset" || acc.code.startsWith("1")) &&
                            acc.isTransactional,
                        )
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowRefundInsuranceModal(false)}
                      className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleRefundInsurance}
                      className="flex-[2] px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-5 w-5" />
                      تأكيد الرد والصرف
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Deposit Refund Modal */}
      {showRefundDepositModal &&
        previewBooking &&
        (() => {
          const approvedRequest = depositRefundRequests.find(
            (r) =>
              r.bookingId === previewBooking.id &&
              r.status === "approved" &&
              !r.refunded &&
              (r.approvedAmount || 0) > 0,
          );
          const refundAmount = approvedRequest
            ? (approvedRequest.approvedAmount ??
              approvedRequest.requestedAmount)
            : 0;

          return (
            <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl">
                        <Undo2 className="h-6 w-6 text-rose-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1">
                          رد مبلغ العربون المعتمد
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          إرجاع العربون للعميل بناءً على طلب معتمد
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRefundDepositModal(false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <X className="h-5 w-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl mb-6 border border-rose-100 dark:border-rose-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">
                        اسم العميل:
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {previewBooking.customerName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-rose-100 dark:border-rose-900/10">
                      <span className="text-xs font-bold text-slate-500">
                        المبلغ المعتمد للرد:
                      </span>
                      <span className="text-lg font-black text-rose-600">
                        {refundAmount.toLocaleString()}{" "}
                        {previewBooking.currency}
                      </span>
                    </div>

                    {/* Separated deposit and collections */}
                    {(() => {
                      const bookingRefundRequests = depositRefundRequests.filter(
                        (r) => r.bookingId === previewBooking.id,
                      );
                      const totalRefundedAmount = bookingRefundRequests
                        .filter((r) => r.refunded)
                        .reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
                      const totalFineAmount = bookingRefundRequests.reduce(
                        (sum, r) => sum + (r.fineAmount || 0),
                        0,
                      );
                      const rentVouchers = (vouchers || []).filter((v) => {
                        const bId = v.linkedBookingId || (v as any).bookingId;
                        return (
                          Boolean(bId) &&
                          (bId === previewBooking.id ||
                            (Boolean(previewBooking.sequenceCode) &&
                              bId === previewBooking.sequenceCode)) &&
                          v.type === "receipt" &&
                          !v.description?.includes("رهن") &&
                          !v.description?.includes("تأمين") &&
                          !v.note?.includes("رهن") &&
                          !v.note?.includes("تأمين")
                        );
                      });
                      const hasDepositVoucher = rentVouchers.some((v) => {
                        const content = (v.description || "") + (v.note || "");
                        return content.includes("عربون");
                      });
                      const rentVoucherTotal = rentVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
                      const directPayments = transactions
                        .filter((t) => {
                          const sId = t.sourceId || "";
                          const matchesBooking =
                            sId === previewBooking.id ||
                            (previewBooking.sequenceCode && sId === previewBooking.sequenceCode) ||
                            sId.startsWith(`${previewBooking.id}-`) ||
                            (previewBooking.sequenceCode &&
                              previewBooking.sequenceCode !== "-" &&
                              sId.startsWith(`${previewBooking.sequenceCode}-`));
                          const isNotInsuranceOrMortgage =
                            !sId.includes("-insurance") &&
                            !sId.includes("-mortgage") &&
                            !t.description?.includes("رهن") &&
                            !t.description?.includes("تأمين");
                          const isExcludedFromPaymentsLog =
                            sId.includes("-contract") ||
                            sId.includes("-discount") ||
                            sId.includes("-accrue-") ||
                            sId.includes("-execute");
                          return (
                            matchesBooking &&
                            isNotInsuranceOrMortgage &&
                            !isExcludedFromPaymentsLog &&
                            t.sourceType === "booking"
                          );
                        })
                        .reduce((sum, t) => sum + (t.amount || 0), 0);

                      const netDeposit = hasDepositVoucher
                        ? Math.max(
                            0,
                            (previewBooking.paidAmount || 0) -
                              totalRefundedAmount -
                              totalFineAmount,
                          )
                        : 0;
                      const subsequentPaymentsSum = Math.max(
                        0,
                        rentVoucherTotal +
                          directPayments -
                          (hasDepositVoucher ? previewBooking.paidAmount || 0 : 0),
                      );

                      return (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-rose-100 dark:border-slate-700/50">
                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 block mb-0.5">مبلغ العربون:</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                              {previewBooking.currency} {netDeposit.toLocaleString()}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-rose-100 dark:border-slate-700/50">
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 block mb-0.5">مبالغ التحصيلات للدفعات:</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                              {previewBooking.currency} {subsequentPaymentsSum.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {approvedRequest && (
                      <div className="mt-2 text-[9px] text-slate-400 font-bold border-t border-rose-100 dark:border-rose-900/30 pt-2 flex justify-between">
                        <span>رقم طلب الاعتماد:</span>
                        <span>
                          {approvedRequest.sequenceCode ||
                            approvedRequest.id.substring(0, 8)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                        تاريخ السند (Voucher Date)
                      </label>
                      <input
                        type="date"
                        value={refundVoucherDate || ""}
                        onChange={(e) => setRefundVoucherDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                        حساب الصرف (الصندوق/البنك)
                      </label>
                      <select
                        value={refundDepositCashAccountId || ""}
                        onChange={(e) =>
                          setRefundDepositCashAccountId(e.target.value)
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                      >
                        <option value="">اختر الحساب...</option>
                        {accounts
                          .filter(
                            (acc) =>
                              (acc.type === "asset" ||
                                acc.code.startsWith("1")) &&
                              acc.isTransactional,
                          )
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({acc.code})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowRefundDepositModal(false)}
                        className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl transition-all cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleRefundDeposit}
                        className="flex-[2] px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-5 w-5" />
                        تأكيد الرد والصرف
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}

      {/* Mortgage Deposit Refund Modal */}
      {showRefundMortgageModal && previewBooking && (() => {
        const bookingRefundRequests = depositRefundRequests.filter(
          (r) => r.bookingId === previewBooking.id,
        );
        const totalRefundedAmount = bookingRefundRequests
          .filter((r) => r.refunded)
          .reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
        const totalFineAmount = bookingRefundRequests.reduce(
          (sum, r) => sum + (r.fineAmount || 0),
          0,
        );
        const rentVouchers = (vouchers || []).filter((v) => {
          const bId = v.linkedBookingId || (v as any).bookingId;
          return (
            Boolean(bId) && (bId === previewBooking.id || (Boolean(previewBooking.sequenceCode) && bId === previewBooking.sequenceCode)) &&
            v.type === "receipt" &&
            !v.description?.includes("رهن") &&
            !v.description?.includes("تأمين") &&
            !v.note?.includes("رهن") &&
            !v.note?.includes("تأمين")
          );
        });
        const hasDepositVoucher = rentVouchers.some((v) => {
          const content = (v.description || "") + (v.note || "");
          return content.includes("عربون");
        });
        const rentVoucherTotal = rentVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
        const directPayments = transactions
          .filter((t) => {
            const sId = t.sourceId || "";
            const matchesBooking =
              sId === previewBooking.id ||
              (previewBooking.sequenceCode && sId === previewBooking.sequenceCode) ||
              sId.startsWith(`${previewBooking.id}-`) ||
              (previewBooking.sequenceCode &&
                previewBooking.sequenceCode !== "-" &&
                sId.startsWith(`${previewBooking.sequenceCode}-`));
            const isNotInsuranceOrMortgage =
              !sId.includes("-insurance") &&
              !sId.includes("-mortgage") &&
              !t.description?.includes("رهن") &&
              !t.description?.includes("تأمين");
            const isExcludedFromPaymentsLog =
              sId.includes("-contract") ||
              sId.includes("-discount") ||
              sId.includes("-accrue-") ||
              sId.includes("-execute");
            return (
              matchesBooking &&
              isNotInsuranceOrMortgage &&
              !isExcludedFromPaymentsLog &&
              t.sourceType === "booking"
            );
          })
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const netDeposit = hasDepositVoucher
          ? Math.max(
              0,
              (previewBooking.paidAmount || 0) -
                totalRefundedAmount -
                totalFineAmount,
            )
          : 0;
        const subsequentPaymentsSum = Math.max(
          0,
          rentVoucherTotal +
            directPayments -
            (hasDepositVoucher ? previewBooking.paidAmount || 0 : 0),
        );

        return (
          <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                      <Undo2 className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1">
                        رد مبلغ الرهن النقدي
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        إرجاع الرهن المالي النقدي للعميل وتوليد قيد صرف
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRefundMortgageModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl mb-6 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">
                      اسم العميل:
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {previewBooking.customerName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-amber-100 dark:border-amber-900/10">
                    <span className="text-xs font-bold text-slate-500">
                      مبلغ الرهن المالي:
                    </span>
                    <span className="text-lg font-black text-amber-600">
                      {(previewBooking.mortgageAmount || 0).toLocaleString()}{" "}
                      {previewBooking.currency}
                    </span>
                  </div>

                  {/* Separated deposit and collections */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-amber-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 block mb-0.5">مبلغ العربون:</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                        {previewBooking.currency} {netDeposit.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-amber-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 block mb-0.5">مبالغ التحصيلات للدفعات:</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                        {previewBooking.currency} {subsequentPaymentsSum.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                      تاريخ السند (Voucher Date)
                    </label>
                    <input
                      type="date"
                      value={refundVoucherDate || ""}
                      onChange={(e) => setRefundVoucherDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                      حساب الصرف (الصندوق/البنك)
                    </label>
                    <select
                      value={refundMortgageCashAccountId || ""}
                      onChange={(e) =>
                        setRefundMortgageCashAccountId(e.target.value)
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-amber-500 transition-all outline-none"
                    >
                      <option value="">اختر الحساب...</option>
                      {accounts
                        .filter(
                          (acc) =>
                            (acc.type === "asset" || acc.code.startsWith("1")) &&
                            acc.isTransactional,
                        )
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowRefundMortgageModal(false)}
                      className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleRefundMortgage}
                      className="flex-[2] px-6 py-4 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl shadow-lg shadow-amber-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-5 w-5" />
                      تأكيد الرد والصرف
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Physical Pledge Refund Modal */}
      {showRefundPledgeModal && previewBooking && (() => {
        const bookingRefundRequests = depositRefundRequests.filter(
          (r) => r.bookingId === previewBooking.id,
        );
        const totalRefundedAmount = bookingRefundRequests
          .filter((r) => r.refunded)
          .reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
        const totalFineAmount = bookingRefundRequests.reduce(
          (sum, r) => sum + (r.fineAmount || 0),
          0,
        );
        const rentVouchers = (vouchers || []).filter((v) => {
          const bId = v.linkedBookingId || (v as any).bookingId;
          return (
            Boolean(bId) && (bId === previewBooking.id || (Boolean(previewBooking.sequenceCode) && bId === previewBooking.sequenceCode)) &&
            v.type === "receipt" &&
            !v.description?.includes("رهن") &&
            !v.description?.includes("تأمين") &&
            !v.note?.includes("رهن") &&
            !v.note?.includes("تأمين")
          );
        });
        const hasDepositVoucher = rentVouchers.some((v) => {
          const content = (v.description || "") + (v.note || "");
          return content.includes("عربون");
        });
        const rentVoucherTotal = rentVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
        const directPayments = transactions
          .filter((t) => {
            const sId = t.sourceId || "";
            const matchesBooking =
              sId === previewBooking.id ||
              (previewBooking.sequenceCode && sId === previewBooking.sequenceCode) ||
              sId.startsWith(`${previewBooking.id}-`) ||
              (previewBooking.sequenceCode &&
                previewBooking.sequenceCode !== "-" &&
                sId.startsWith(`${previewBooking.sequenceCode}-`));
            const isNotInsuranceOrMortgage =
              !sId.includes("-insurance") &&
              !sId.includes("-mortgage") &&
              !t.description?.includes("رهن") &&
              !t.description?.includes("تأمين");
            const isExcludedFromPaymentsLog =
              sId.includes("-contract") ||
              sId.includes("-discount") ||
              sId.includes("-accrue-") ||
              sId.includes("-execute");
            return (
              matchesBooking &&
              isNotInsuranceOrMortgage &&
              !isExcludedFromPaymentsLog &&
              t.sourceType === "booking"
            );
          })
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const netDeposit = hasDepositVoucher
          ? Math.max(
              0,
              (previewBooking.paidAmount || 0) -
                totalRefundedAmount -
                totalFineAmount,
            )
          : 0;
        const subsequentPaymentsSum = Math.max(
          0,
          rentVoucherTotal +
            directPayments -
            (hasDepositVoucher ? previewBooking.paidAmount || 0 : 0),
        );

        return (
          <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl">
                      <Undo2 className="h-6 w-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1">
                        رد الرهن العيني (المادي)
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        إرجاع الرهونات العينية للعميل وتسجيل العملية
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRefundPledgeModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>

                <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl mb-6 border border-rose-100 dark:border-rose-900/30">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-rose-100 dark:border-rose-900/10">
                    <span className="text-xs font-bold text-slate-500">
                      اسم العميل:
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {previewBooking.customerName}
                    </span>
                  </div>

                  {/* Separated deposit and collections */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-rose-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 block mb-0.5">مبلغ العربون:</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                        {previewBooking.currency} {netDeposit.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-rose-100 dark:border-slate-700/50">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 block mb-0.5">مبالغ التحصيلات للدفعات:</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
                        {previewBooking.currency} {subsequentPaymentsSum.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      وصف الرهن العيني:
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {previewBooking.pledgesDescription || "لا يوجد وصف مسجل"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3">
                    <Info className="h-5 w-5 text-blue-500 shrink-0" />
                    <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
                      هذا الإجراء سيقوم بتحديث حالة الرهن العيني إلى "تم الرد" ولن
                      يتم توليد قيد محاسبي لأن الرهن مادي وليس نقدي.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowRefundPledgeModal(false)}
                      className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleRefundPledge}
                      className="flex-[2] px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-5 w-5" />
                      تأكيد رد الرهن
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Lightbox Modal for Pledge Image */}
      {activePledgeImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-right"
          dir="rtl"
        >
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                📷 صورة الرهن المرفقة كضمانة
              </span>
              <button
                onClick={() => setActivePledgeImage(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-950">
              <img
                src={activePledgeImage}
                alt="معاينة الرهن"
                className="max-h-[70vh] object-contain rounded-lg border border-slate-850 shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActivePledgeImage(null)}
                className="px-5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {showCollectionModal && previewBooking && (
        <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      تحصيل دفعة جديدة
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      حجز #
                      {(previewBooking.id || "")
                        .split("-")
                        .pop()
                        ?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCollectionModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {(() => {
                const bSeq = previewBooking.sequenceCode || "";
                const bId = previewBooking.id || "";
                const bVouchers = (vouchers || []).filter((v) => {
                  const vBId = v.linkedBookingId || (v as any).bookingId;
                  const matchId = Boolean(vBId) && (vBId === bId || (Boolean(bSeq) && vBId === bSeq));
                  const matchDesc = (Boolean(bSeq) && (v.description || "").includes(bSeq)) || (Boolean(bId) && (v.description || "").includes(bId));
                  return matchId || matchDesc;
                });
                const hasDepVoucher = bVouchers.some((v) => ((v.description || "") + (v.note || "")).includes("عربون"));
                const depositDisplay = hasDepVoucher ? (previewBooking.paidAmount || 0) : 0;
                const subsequentDisplay = hasDepVoucher
                  ? (previewBooking.subsequentPayments || 0)
                  : ((previewBooking.paidAmount || 0) + (previewBooking.subsequentPayments || 0));
                const totalPaidDisplay = depositDisplay + subsequentDisplay;
                const remainingDisplay = Math.max(0, previewBooking.totalPrice - totalPaidDisplay);

                return (
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 mb-6 border border-emerald-100 dark:border-emerald-900/30">
                    <div className="flex justify-between items-center text-xs mb-2 pb-2 border-b border-emerald-100 dark:border-emerald-800/40">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        إجمالي قيمة الحجز / العقد:
                      </span>
                      <span className="text-emerald-800 dark:text-emerald-300 font-black font-mono">
                        {previewBooking.totalPrice.toLocaleString()}{" "}
                        {previewBooking.currency}
                      </span>
                    </div>

                    <div className="space-y-1 my-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-bold">
                          • مبلغ العربون الأولي:
                        </span>
                        <span className="text-indigo-700 dark:text-indigo-300 font-black font-mono">
                          {depositDisplay.toLocaleString()}{" "}
                          {previewBooking.currency}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-bold">
                          • إجمالي الدفعات اللاحقة:
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-black font-mono">
                          {subsequentDisplay.toLocaleString()}{" "}
                          {previewBooking.currency}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs mb-3 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                      <span className="text-emerald-900 dark:text-emerald-100 font-black">
                        إجمالي المدفوع المسدد:
                      </span>
                      <span className="text-emerald-800 dark:text-emerald-300 font-black font-mono">
                        {totalPaidDisplay.toLocaleString()}{" "}
                        {previewBooking.currency}
                      </span>
                    </div>

                    <div className="h-px bg-emerald-200 dark:bg-emerald-800 mb-3" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-emerald-900 dark:text-emerald-100">
                        المتبقي المطلوب:
                      </span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {remainingDisplay.toLocaleString()}{" "}
                        {previewBooking.currency}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                    المبلغ المراد تحصيله الآن
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">
                      {previewBooking.currency}
                    </div>
                    <input
                      type="number"
                      value={collectionAmount || ""}
                      onChange={(e) =>
                        setCollectionAmount(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pl-12 text-xl font-black focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                    تاريخ السند
                  </label>
                  <input
                    type="date"
                    value={refundVoucherDate || ""}
                    onChange={(e) => setRefundVoucherDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2 mr-1">
                    🔢 رقم سند التحصيل اليدوي (أرقام فقط)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="أدخل رقم السند الورقي (أرقام فقط - مثال: 1045)"
                    value={collectionManualNumber}
                    onChange={(e) =>
                      setCollectionManualNumber(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                    حساب التحصيل (الصندوق/البنك)
                  </label>
                  <select
                    value={collectionAccountId || ""}
                    onChange={(e) => setCollectionAccountId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  >
                    <option value="">اختر الحساب...</option>
                    {accounts
                      .filter(
                        (acc) =>
                          (acc.type === "asset" || acc.code.startsWith("1")) &&
                          acc.isTransactional,
                      )
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 mr-1">
                    الحساب الدائن (العميل)
                  </label>
                  <select
                    value={collectionCreditAccountId || ""}
                    onChange={(e) =>
                      setCollectionCreditAccountId(e.target.value)
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  >
                    <option value="">تلقائي (حساب الصالة/الإيراد)</option>
                    {accounts
                      .filter(
                        (acc) =>
                          (acc.type === "revenue" ||
                            acc.type === "asset" ||
                            acc.type === "liability") &&
                          acc.isTransactional,
                      )
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCollectionModal(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCollectInternal}
                    disabled={
                      isCollecting ||
                      collectionAmount <= 0 ||
                      !collectionAccountId
                    }
                    className="flex-[2] px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isCollecting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )}
                    تأكيد التحصيل والقبض
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Amendment Modal */}
      {showAmendmentModal && previewBooking && (
        <BookingAmendmentModal
          booking={previewBooking}
          onClose={() => setShowAmendmentModal(false)}
          currentUser={currentUser}
        />
      )}

      {/* Booking Financial Accounts & Multi-Statement Modal Card */}
      {showBookingAccountsStatementModal && previewBooking && (() => {
        // Resolve Client Account
        const clientName = (previewBooking.customerName || "").trim().toLowerCase();
        const clientPhone = (previewBooking.customerPhone || "").trim();
        const normName = normalizeArabic(clientName);
        const matchedClient = clients.find((c) => {
          const normCName = normalizeArabic(c.name || "");
          return (
            (Boolean(normName) && normCName === normName) ||
            (Boolean(clientPhone) && c.phone && c.phone.trim() === clientPhone)
          );
        }) || clients.find((c) => {
          const normCName = normalizeArabic(c.name || "");
          return Boolean(normName && normCName) && (normCName.includes(normName) || normName.includes(normCName));
        });

        const targetClientAccId = matchedClient?.linkedAccountId || effectiveLinkedAccounts.accountsReceivableId || "1010301";
        const clientAccount = accounts.find((a) => a.id === targetClientAccId || a.code === targetClientAccId) ||
          accounts.find((a) => a.code === "1010301" || a.name?.includes("الزبائن والحجوزات"));

        // Resolve Mortgage Account
        const targetMortgageAccId = effectiveLinkedAccounts.bookingMortgageAccountId || effectiveLinkedAccounts.mortgageCreditAccountId || "2010203";
        const mortgageAccount = accounts.find((a) => a.id === targetMortgageAccId || a.code === targetMortgageAccId) ||
          accounts.find((a) => a.code === "2010203" || a.name?.includes("رهون") || a.name?.includes("الرهونات"));

        // Resolve Insurance / Guarantee Account
        const targetInsuranceAccId = effectiveLinkedAccounts.insuranceCreditAccountId || effectiveLinkedAccounts.guaranteeAccountId || "2010202";
        const insuranceAccount = accounts.find((a) => a.id === targetInsuranceAccId || a.code === targetInsuranceAccId) ||
          accounts.find((a) => a.code === "2010202" || a.name?.includes("تأمين") || a.name?.includes("التأمينات") || a.name?.includes("أمانات"));

        // Filter vouchers and transactions specifically related to this booking
        const bookingSeq = previewBooking.sequenceCode || "";
        const bookingId = previewBooking.id || "";

        const relatedVouchers = (vouchers || []).filter((v) => {
          const vBId = v.linkedBookingId || (v as any).bookingId;
          const matchId = Boolean(vBId) && (vBId === bookingId || (Boolean(bookingSeq) && vBId === bookingSeq));
          const matchDesc = (Boolean(bookingSeq) && (v.description || "").includes(bookingSeq)) || (Boolean(bookingId) && (v.description || "").includes(bookingId));
          return matchId || matchDesc;
        });

        const hasDepVoucher = relatedVouchers.some((v) => ((v.description || "") + (v.note || "")).includes("عربون"));
        const depositPaid = hasDepVoucher ? (previewBooking.paidAmount || 0) : 0;
        const subsequentPaid = hasDepVoucher
          ? (previewBooking.subsequentPayments || 0)
          : ((previewBooking.paidAmount || 0) + (previewBooking.subsequentPayments || 0));
        const totalContract = previewBooking.totalPrice || 0;
        const totalPaid = depositPaid + subsequentPaid;
        const remainingOnClient = Math.max(0, totalContract - totalPaid);
        const refundedDeposit = previewBooking.depositRefundedAmount || 0;

        const mortgageAmount = previewBooking.mortgageAmount || 0;
        const mortgageStatusText = 
          previewBooking.mortgageStatus === "returned" ? "مسترد بالكامل" :
          previewBooking.mortgageStatus === "held" ? "محتجز ومثبت" :
          previewBooking.mortgageStatus === "forfeited" ? "مصادَر" : "قيد الانتظار";

        const insuranceAmount = previewBooking.insuranceAmount || 0;
        const insuranceStatusText = previewBooking.insuranceRefunded ? "مسترد بالكامل للعميل" : "محتجز كأمانة تأمين";

        const relatedTransactions = (transactions || []).filter((t) => {
          const matchSource = Boolean(t.sourceId) && (
            t.sourceId === bookingId || 
            (Boolean(bookingSeq) && t.sourceId === bookingSeq) || 
            (t.sourceId && t.sourceId.startsWith(`${bookingId}-`)) || 
            (Boolean(bookingSeq) && t.sourceId && t.sourceId.startsWith(`${bookingSeq}-`))
          );
          const matchLinked = Boolean(previewBooking.linkedTransactionId) && t.id === previewBooking.linkedTransactionId;
          const matchDesc = (Boolean(bookingSeq) && (t.description || "").includes(bookingSeq)) || (Boolean(bookingId) && (t.description || "").includes(bookingId));
          return matchSource || matchLinked || matchDesc;
        });

        const targetClientId = matchedClient?.id || `temp-name-${previewBooking.customerName}`;

        return (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                      <span>كشف حساب المركز المالي للحجز</span>
                      <span className="font-mono text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                        {previewBooking.sequenceCode || previewBooking.id}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 flex items-center gap-3 mt-0.5 flex-wrap">
                      <span>العميل: <strong className="text-white">{previewBooking.customerName}</strong></span>
                      {previewBooking.customerPhone && (
                        <span>الهاتف: <strong className="text-white font-mono">{previewBooking.customerPhone}</strong></span>
                      )}
                      <span>العملة: <strong className="text-indigo-200 font-mono">{previewBooking.currency}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer text-xs flex items-center gap-1.5 font-bold"
                    title="طباعة كشف حسابات الحجز"
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">طباعة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBookingAccountsStatementModal(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
                {/* 3 Main Linked Accounts Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Client Account */}
                  <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                              حساب العميل والذمم
                            </span>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {clientAccount ? `[${clientAccount.code}] ${clientAccount.name}` : "الزبائن والحجوزات (1010301)"}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">قيمة العقد الإجمالية:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {totalContract.toLocaleString()} {previewBooking.currency}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">مبلغ العربون الأولي:</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {depositPaid.toLocaleString()} {previewBooking.currency}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">إجمالي الدفعات اللاحقة:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {subsequentPaid.toLocaleString()} {previewBooking.currency}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">إجمالي المسدد الكلي:</span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {totalPaid.toLocaleString()} {previewBooking.currency}
                          </span>
                        </div>
                        {refundedDeposit > 0 && (
                          <div className="flex justify-between items-center text-rose-600">
                            <span className="text-[11px]">العربون المسترد:</span>
                            <span className="font-mono font-bold">
                              {refundedDeposit.toLocaleString()} {previewBooking.currency}
                            </span>
                          </div>
                        )}
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center font-black">
                          <span className="text-slate-600 dark:text-slate-400 text-[11px]">المتبقي على العميل:</span>
                          <span className={`font-mono ${remainingOnClient > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {remainingOnClient.toLocaleString()} {previewBooking.currency}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowBookingAccountsStatementModal(false);
                        onOpenAccountStatement?.(
                          clientAccount?.id || "1010301",
                          `booking-exact-${previewBooking.id}`,
                          previewBooking.customerName,
                        );
                      }}
                      className="mt-3 w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>فتح كشف حساب العميل بالدفتر</span>
                      <ExternalLink className="h-3 w-3 opacity-80" />
                    </button>
                  </div>

                  {/* Card 2: Mortgage / Guarantee Account */}
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                              حساب الرهونات والضمانات
                            </span>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {mortgageAccount ? `[${mortgageAccount.code}] ${mortgageAccount.name}` : "الرهونات والضمانات (2010203)"}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">الرهن المالي النقدي:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {mortgageAmount.toLocaleString()} {previewBooking.currency}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">حالة الرهن المالي:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            previewBooking.mortgageStatus === "returned"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : previewBooking.mortgageStatus === "held"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {mortgageStatusText}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-500 text-[11px]">الرهن العيني:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              previewBooking.pledgeStatus === "returned"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {previewBooking.pledgeStatus === "returned" ? "مسترد" : previewBooking.pledgeStatus === "held" ? "محتجز" : "قيد الانتظار"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate italic">
                            {previewBooking.pledgesDescription || "لا يوجد وصف للرهن العيني"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowBookingAccountsStatementModal(false);
                        onOpenAccountStatement?.(
                          mortgageAccount?.id || "2010203",
                          undefined,
                          previewBooking.customerName,
                        );
                      }}
                      className="mt-3 w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>فتح كشف حساب الرهونات</span>
                      <ExternalLink className="h-3 w-3 opacity-80" />
                    </button>
                  </div>

                  {/* Card 3: Insurance Account */}
                  <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                              حساب التأمينات والأمانات
                            </span>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {insuranceAccount ? `[${insuranceAccount.code}] ${insuranceAccount.name}` : "تأمينات الحفلات (2010202)"}
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">مبلغ التأمين المسترد:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {insuranceAmount.toLocaleString()} {previewBooking.currency}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[11px]">حالة استرداد التأمين:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            previewBooking.insuranceRefunded
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                          }`}>
                            {insuranceStatusText}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            أمانة نقدية مستردة للعميل بعد نهاية الفعالية والتأكد من سلامة الصالة ومرافقها.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowBookingAccountsStatementModal(false);
                        onOpenAccountStatement?.(
                          insuranceAccount?.id || "2010202",
                          undefined,
                          previewBooking.customerName,
                        );
                      }}
                      className="mt-3 w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>فتح كشف حساب التأمينات</span>
                      <ExternalLink className="h-3 w-3 opacity-80" />
                    </button>
                  </div>
                </div>

                {/* Section 4: Movement history on this booking */}
                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-indigo-600" />
                      <span>حركات وسندات هذا الحجز المسجلة في النظام ({relatedVouchers.length + relatedTransactions.length})</span>
                    </h4>
                  </div>

                  {relatedVouchers.length === 0 && relatedTransactions.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      لم يتم تسجيل قيود أو سندات قبض/صرف مباشرة بعد لهذا الحجز.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold text-[11px]">
                            <th className="pb-2">التاريخ</th>
                            <th className="pb-2">النوع / الرقم</th>
                            <th className="pb-2">البيان</th>
                            <th className="pb-2 text-left">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                          {relatedVouchers.map((v) => (
                            <tr key={v.id} className="py-2 hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                              <td className="py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {(v.voucherDate || v.date || "").split("T")[0]}
                              </td>
                              <td className="py-2 font-bold">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${v.type === "receipt" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"}`}>
                                  {v.type === "receipt" ? "سند قبض" : "سند صرف"} ({v.sequenceCode || v.manualNumber || "سند"})
                                </span>
                              </td>
                              <td className="py-2 text-slate-700 dark:text-slate-300">
                                {v.description || v.note || "-"}
                              </td>
                              <td className="py-2 text-left font-mono font-bold text-slate-900 dark:text-white">
                                <div className="flex items-center justify-end gap-2">
                                  <span>{(v.amount || 0).toLocaleString()} {v.currency}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOfficialVoucherToPrint(v);
                                      setIsOfficialVoucherPrintOpen(true);
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                    title="طباعة السند الرسمي"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {relatedTransactions.map((t) => (
                            <tr key={t.id} className="py-2 hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                              <td className="py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {(t.voucherDate || t.date || "").split("T")[0]}
                              </td>
                              <td className="py-2 font-bold">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                  قيد محاسبي ({t.sequenceCode || t.manualNumber || "قيد"})
                                </span>
                              </td>
                              <td className="py-2 text-slate-700 dark:text-slate-300">
                                {t.description || "-"}
                              </td>
                              <td className="py-2 text-left font-mono font-bold text-slate-900 dark:text-white">
                                {(t.amount || 0).toLocaleString()} {t.currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-3">
                <span className="text-[11px] text-slate-500 font-semibold">
                  📌 يمكنك الانتقال لكشف حساب أي بند بالنقر على الزر المخصص داخل بطاقة الحساب.
                </span>
                <button
                  type="button"
                  onClick={() => setShowBookingAccountsStatementModal(false)}
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  إغلاق البطاقة
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Official Voucher Print Modal - Al-Zain Grand Hall Book Design */}
      <OfficialVoucherPrintModal
        isOpen={isOfficialVoucherPrintOpen}
        voucher={officialVoucherToPrint}
        booking={previewBooking}
        company={company}
        accounts={accounts}
        currencies={currencies}
        currentUser={currentUser}
        onClose={() => {
          setIsOfficialVoucherPrintOpen(false);
          setOfficialVoucherToPrint(null);
        }}
      />

      {/* Booking Discount Management Modal */}
      {selectedBookingForDiscount && (
        <BookingDiscountModal
          isOpen={isBookingDiscountModalOpen}
          booking={selectedBookingForDiscount}
          accounts={accounts}
          currencies={currencies}
          company={company}
          currentUser={currentUser}
          onClose={() => {
            setIsBookingDiscountModalOpen(false);
            setSelectedBookingForDiscount(null);
          }}
          onSaveDiscount={async (bookingId, totalDiscount, daysDiscounts, reason) => {
            const bookingToUpdate = bookings.find(b => b.id === bookingId);
            if (!bookingToUpdate) return;
            const rawBase = (bookingToUpdate.days || []).reduce((sum, d) => sum + Number(d.price || 0), 0) || bookingToUpdate.totalPrice;
            const newTotalPrice = Math.max(0, rawBase - totalDiscount);
            const updatedDays = (bookingToUpdate.days || []).map(d => {
              const matched = daysDiscounts.find(x => x.date === d.date);
              return { ...d, discount: matched ? matched.discount : 0 };
            });

            await updateBooking(bookingToUpdate.id, {
              totalPrice: newTotalPrice,
              totalDiscount: totalDiscount,
              days: updatedDays,
              discountReason: reason
            });
          }}
        />
      )}
    </div>
  );
}
