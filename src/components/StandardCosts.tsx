import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
  PieChart,
  DollarSign,
  Briefcase,
  Layers,
  ChevronDown,
  Building,
  Target,
  FileText,
  Percent,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Flame,
  UserCheck,
  PlusCircle,
  BarChart2,
  Coins,
  Download,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Printer,
  Filter,
  Package,
  ClipboardList,
} from "lucide-react";
import { Booking, Hall, StandardCostTemplate, BookingActualCost, Account, Service, CostItem } from "../types";
import { toast } from "sonner";

interface StandardCostsProps {
  bookings: Booking[];
  halls: Hall[];
  standardCosts: StandardCostTemplate[];
  actualCosts: BookingActualCost[];
  accounts: Account[];
  bookingSettings: any;
  services: Service[];
  costItems?: CostItem[];
  onAddStandardCost: (template: Omit<StandardCostTemplate, "id" | "createdAt">) => Promise<string>;
  onUpdateStandardCost: (id: string, updates: Partial<StandardCostTemplate>) => Promise<void>;
  onDeleteStandardCost: (id: string) => Promise<void>;
  onAddActualCost: (cost: Omit<BookingActualCost, "id" | "createdAt">) => Promise<string>;
  onUpdateActualCost: (id: string, updates: Partial<BookingActualCost>) => Promise<void>;
  onAddCostItem?: (item: Omit<CostItem, "id" | "createdAt">) => Promise<string>;
  onUpdateCostItem?: (id: string, updates: Partial<CostItem>) => Promise<void>;
  onDeleteCostItem?: (id: string) => Promise<void>;
  onUpdateService?: (id: string, updates: Partial<Service>) => Promise<void>;
}

export default function StandardCosts({
  bookings,
  halls,
  standardCosts,
  actualCosts,
  accounts,
  bookingSettings,
  services = [],
  costItems = [],
  onAddStandardCost,
  onUpdateStandardCost,
  onDeleteStandardCost,
  onAddActualCost,
  onUpdateActualCost,
  onAddCostItem,
  onUpdateCostItem,
  onDeleteCostItem,
  onUpdateService,
}: StandardCostsProps) {
  const [activeTab, setActiveTab] = useState<"budgets" | "services" | "cost-items" | "reports">("budgets");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StandardCostTemplate | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [showActualCostForm, setShowActualCostForm] = useState(false);

  // New Search queries
  const [servicesSearchQuery, setServicesSearchQuery] = useState("");
  const [costItemsSearchQuery, setCostItemsSearchQuery] = useState("");

  // Cost Item Form State
  const [showCostItemModal, setShowCostItemModal] = useState(false);
  const [editingCostItem, setEditingCostItem] = useState<CostItem | null>(null);
  const [costItemForm, setCostItemForm] = useState({
    name: "",
    defaultStandardCost: 0,
    accountId: ""
  });

  // Services standard cost inline editing
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceCostInput, setServiceCostInput] = useState<number>(0);

  // Profitability Report filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEventType, setFilterEventType] = useState("");
  const [filterHallId, setFilterHallId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Retrieve dynamic event types
  const eventTypesList = bookingSettings?.eventTypes && bookingSettings.eventTypes.length > 0
    ? bookingSettings.eventTypes
    : ["زواج", "عزاء", "مؤتمر", "حفلة تخرج", "أخرى"];

  // Template Form State
  const [templateForm, setTemplateForm] = useState({
    entityType: "hall" as "hall" | "service",
    eventType: eventTypesList[0] || "زواج",
    hallId: "",
    serviceId: "",
    currency: "YER",
    items: [{ name: "أعمال النظافة والترتيب", standardCost: 0, accountId: "" }],
  });

  // Actual Cost Form State
  const [actualCostItems, setActualCostItems] = useState<{ name: string; actualCost: number; accountId?: string; notes: string }[]>([]);

  // Calculate Standard templates
  const handleAddTemplateItem = () => {
    setTemplateForm({
      ...templateForm,
      items: [...templateForm.items, { name: "", standardCost: 0, accountId: "" }],
    });
  };

  const handleRemoveTemplateItem = (index: number) => {
    const updated = templateForm.items.filter((_, i) => i !== index);
    setTemplateForm({ ...templateForm, items: updated });
  };

  const handleTemplateItemChange = (index: number, field: "name" | "standardCost" | "accountId", value: any) => {
    const updated = [...templateForm.items];
    if (field === "standardCost") {
      updated[index][field] = Math.max(0, Number(value) || 0);
    } else {
      updated[index][field] = value;
    }
    setTemplateForm({ ...templateForm, items: updated });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (templateForm.items.some((it) => !it.name || it.standardCost <= 0)) {
      toast.error("يرجى إدخال اسم البند وتكلفة معيارية أكبر من الصفر");
      return;
    }

    const totalStandardCost = templateForm.items.reduce((sum, it) => sum + it.standardCost, 0);

    const payload = {
      items: templateForm.items,
      currency: templateForm.currency,
      totalStandardCost,
      ...(templateForm.entityType === "hall" 
        ? { hallId: templateForm.hallId, eventType: templateForm.eventType, serviceId: "" } 
        : { serviceId: templateForm.serviceId, hallId: "", eventType: "" })
    };

    try {
      if (editingTemplate) {
        await onUpdateStandardCost(editingTemplate.id, payload);
        toast.success("تم تحديث قالب التكاليف المعيارية بنجاح");
      } else {
        await onAddStandardCost(payload);
        toast.success("تم إنشاء قالب التكاليف المعيارية بنجاح");
      }

      // Auto-save new cost items to registry
      if (onAddCostItem) {
        for (const item of templateForm.items) {
          const exists = costItems.some(ci => ci.name.trim() === item.name.trim());
          if (!exists && item.name.trim()) {
            try {
              await onAddCostItem({
                name: item.name.trim(),
                defaultStandardCost: item.standardCost,
                accountId: item.accountId
              });
            } catch (e) {
              console.error("Error auto-adding cost item to registry:", e);
            }
          }
        }
      }

      setShowTemplateModal(false);
      resetTemplateForm();
    } catch (err) {
      toast.error("حدث خطأ أثناء حفظ القالب");
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      entityType: "hall",
      eventType: eventTypesList[0] || "زواج",
      hallId: "",
      serviceId: "",
      currency: "YER",
      items: [{ name: "أعمال النظافة والترتيب", standardCost: 0, accountId: "" }],
    });
    setEditingTemplate(null);
  };

  const handleEditTemplate = (tmpl: StandardCostTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      entityType: tmpl.serviceId ? "service" : "hall",
      eventType: tmpl.eventType || eventTypesList[0],
      hallId: tmpl.hallId || "",
      serviceId: tmpl.serviceId || "",
      currency: tmpl.currency || "YER",
      items: tmpl.items.map((it) => ({
        name: it.name,
        standardCost: it.standardCost,
        accountId: it.accountId || "",
      })),
    });
    setShowTemplateModal(true);
  };

  // Actual costs handling
  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);
  const existingActualCost = actualCosts.find((ac) => ac.bookingId === selectedBookingId);

  // Auto-load matching standard template to pre-fill actual costs
  const handleLoadTemplateForBooking = () => {
    if (!selectedBooking) return;

    // Try finding template specific to this hall + eventType, or just eventType
    const matched =
      standardCosts.find((t) => !t.serviceId && t.hallId === selectedBooking.hallId && t.eventType === selectedBooking.eventType) ||
      standardCosts.find((t) => !t.serviceId && t.eventType === selectedBooking.eventType) ||
      standardCosts.find((t) => !t.serviceId && t.hallId === selectedBooking.hallId) ||
      standardCosts.find((t) => !t.serviceId);

    let allItems: { name: string; actualCost: number; accountId?: string; notes: string }[] = [];

    if (matched) {
      allItems = matched.items.map((it) => ({
        name: it.name,
        actualCost: 0,
        accountId: it.accountId || "",
        notes: "",
      }));
    } else {
      allItems = [
        { name: "أعمال النظافة والترتيب", actualCost: 0, accountId: "", notes: "" },
        { name: "كهرباء وتشغيل ديزل", actualCost: 0, accountId: "", notes: "" },
        { name: "أجور عمال وضيافة", actualCost: 0, accountId: "", notes: "" },
      ];
      toast.info("لم يتم العثور على قالب مطابق، تم توفير بنود تكلفة افتراضية.");
    }

    // Now, also check if any booked additional services have templates, and append their cost items!
    if (selectedBooking.additionalServices && selectedBooking.additionalServices.length > 0) {
      selectedBooking.additionalServices.forEach(bs => {
        // Find the service in the services list
        const service = services.find(s => s.name === bs.name);
        if (service) {
          // Find if this service has a template
          const serviceTemplate = standardCosts.find(t => t.serviceId === service.id);
          if (serviceTemplate) {
            // Append its items
            const serviceItems = serviceTemplate.items.map(it => ({
              name: `[${service.name}] ${it.name}`,
              actualCost: 0,
              accountId: it.accountId || "",
              notes: "",
            }));
            allItems = [...allItems, ...serviceItems];
          }
        }
      });
    }

    setActualCostItems(allItems);
    if (matched || (selectedBooking.additionalServices && selectedBooking.additionalServices.length > 0)) {
      toast.success("تم تعبئة بنود التكاليف استناداً إلى التكاليف المعيارية للمناسبة وللخدمات الإضافية المختارة.");
    }

    setShowActualCostForm(true);
  };

  const handleSaveActualCosts = async () => {
    if (actualCostItems.some((it) => !it.name || it.actualCost < 0)) {
      toast.error("يرجى ملء جميع بنود التكلفة الفعلية بقيمة صحيحة");
      return;
    }

    const totalActualCost = actualCostItems.reduce((sum, it) => sum + it.actualCost, 0);

    try {
      if (existingActualCost) {
        await onUpdateActualCost(existingActualCost.id, {
          items: actualCostItems,
          totalActualCost,
        });
        toast.success("تم تحديث التكاليف الفعلية للمناسبة بنجاح.");
      } else {
        await onAddActualCost({
          bookingId: selectedBookingId,
          items: actualCostItems,
          totalActualCost,
        });
        toast.success("تم حفظ التكاليف الفعلية للفعالية وإجراء تحليل الانحرافات.");
      }
      setShowActualCostForm(false);
    } catch (err) {
      toast.error("حدث خطأ أثناء حفظ التكاليف الفعلية");
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("هل تريد حذف هذا القالب المعياري؟")) {
      onDeleteStandardCost(id).then(() => toast.success("تم حذف القالب"));
    }
  };

  // Get days count for a booking
  const getBookingDaysCount = (b: Booking): number => {
    if (b.days && b.days.length > 0) {
      return b.days.filter(d => d.status !== 'cancelled').length;
    }
    if (b.eventDates && b.eventDates.length > 0) {
      return b.eventDates.length;
    }
    return 1; // Default to 1 day
  };

  // Get matching template for a booking
  const getMatchedTemplateForBooking = (b: Booking) => {
    return (
      standardCosts.find((t) => !t.serviceId && t.hallId === b.hallId && t.eventType === b.eventType) ||
      standardCosts.find((t) => !t.serviceId && t.eventType === b.eventType) ||
      standardCosts.find((t) => !t.serviceId && t.hallId === b.hallId) ||
      standardCosts.find((t) => !t.serviceId) ||
      null
    );
  };

  const getBookingServicesRevenue = (b: Booking): number => {
    if (!b.additionalServices || b.additionalServices.length === 0) return 0;
    return b.additionalServices.reduce((sum, s) => sum + (s.cost || 0), 0);
  };

  const getBookingServicesStandardCost = (b: Booking): number => {
    if (!b.additionalServices || b.additionalServices.length === 0) return 0;
    return b.additionalServices.reduce((sum, s) => {
      const matched = services.find(srv => srv.name === s.name);
      if (!matched) return sum;
      
      const serviceTemplate = standardCosts.find(t => t.serviceId === matched.id);
      const standardCost = serviceTemplate ? serviceTemplate.totalStandardCost : (matched.standardCost || 0);
      
      return sum + (standardCost * getBookingDaysCount(b));
    }, 0);
  };

  // Filtered bookings for Profitability Reports
  const activeBookingsForReports = bookings.filter((b) => {
    if (b.status !== "confirmed" && b.status !== "completed") return false;

    // Search query
    if (searchQuery && !b.customerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Event Type
    if (filterEventType && b.eventType !== filterEventType) return false;

    // Hall Id
    if (filterHallId && b.hallId !== filterHallId) return false;

    // Month Filter
    if (filterMonth) {
      const dateStr = b.eventDate || (b.days && b.days[0]?.date) || "";
      if (!dateStr.startsWith(filterMonth)) return false;
    }

    return true;
  });

  // Calculate aggregations for reports
  let totalActualRevenue = 0;
  let totalEstimatedStandardCost = 0;
  let totalActualCostsRecorded = 0;
  let bookingsWithActualCostsCount = 0;

  let totalRentRevenue = 0;
  let totalRentStdCosts = 0;

  let totalServicesRevenue = 0;
  let totalServicesStdCosts = 0;

  activeBookingsForReports.forEach((b) => {
    const bTotalPrice = b.totalPrice;
    totalActualRevenue += bTotalPrice;

    const bServicesRevenue = getBookingServicesRevenue(b);
    const bRentRevenue = Math.max(0, bTotalPrice - bServicesRevenue);

    const bRentStdCost = (() => {
      const tmpl = getMatchedTemplateForBooking(b);
      return tmpl ? tmpl.totalStandardCost * getBookingDaysCount(b) : 0;
    })();
    const bServicesStdCost = getBookingServicesStandardCost(b);

    totalRentRevenue += bRentRevenue;
    totalRentStdCosts += bRentStdCost;

    totalServicesRevenue += bServicesRevenue;
    totalServicesStdCosts += bServicesStdCost;

    totalEstimatedStandardCost += (bRentStdCost + bServicesStdCost);

    const actCost = actualCosts.find((ac) => ac.bookingId === b.id);
    if (actCost) {
      totalActualCostsRecorded += actCost.totalActualCost;
      bookingsWithActualCostsCount++;
    }
  });

  const totalEstimatedStandardProfit = totalActualRevenue - totalEstimatedStandardCost;
  const standardProfitMarginPct = totalActualRevenue > 0 ? (totalEstimatedStandardProfit / totalActualRevenue) * 100 : 0;

  const totalEstimatedRentProfit = totalRentRevenue - totalRentStdCosts;
  const rentProfitMarginPct = totalRentRevenue > 0 ? (totalEstimatedRentProfit / totalRentRevenue) * 100 : 0;

  const totalEstimatedServicesProfit = totalServicesRevenue - totalServicesStdCosts;
  const servicesProfitMarginPct = totalServicesRevenue > 0 ? (totalEstimatedServicesProfit / totalServicesRevenue) * 100 : 0;

  // Actual values based only on bookings that have actual costs recorded
  let revenueWithActualCosts = 0;
  activeBookingsForReports.forEach((b) => {
    const actCost = actualCosts.find((ac) => ac.bookingId === b.id);
    if (actCost) {
      revenueWithActualCosts += b.totalPrice;
    }
  });
  const totalActualProfit = revenueWithActualCosts - totalActualCostsRecorded;
  const actualProfitMarginPct = revenueWithActualCosts > 0 ? (totalActualProfit / revenueWithActualCosts) * 100 : 0;

  // Print function
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header and Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Target className="h-8 w-8 text-indigo-500 animate-pulse" />
            نظام إدارة التكاليف المعيارية وأرباح الفعاليات
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">
            تخطيط وربط بنود التكلفة بالحسابات المالية ومقارنة الإيرادات الفعلية مع التكاليف المعيارية والفعلية
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 gap-1">
          <button
            onClick={() => setActiveTab("budgets")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === "budgets"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md animate-fade-in"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            التكاليف المعيارية والانحرافات
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === "services"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md animate-fade-in"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Package className="h-3.5 w-3.5 text-amber-500" />
            تكاليف الخدمات الإضافية
          </button>
          <button
            onClick={() => setActiveTab("cost-items")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === "cost-items"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md animate-fade-in"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
            سجل بنود التكاليف
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === "reports"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md animate-fade-in"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5 text-blue-500" />
            تقارير أرباح الفعاليات
          </button>
        </div>
      </div>

      {activeTab === "budgets" && (
        <div className="space-y-6">
          {/* BUDGETS TAB */}
          <div className="flex justify-between items-center">
            <div className="text-xs font-medium text-slate-400">
              قم بإنشاء وتعديل تقديرات التكلفة للمناسبات، وربطها بالحسابات الفرعية من شجرة الحسابات.
            </div>
            <button
              onClick={() => {
                resetTemplateForm();
                setShowTemplateModal(true);
              }}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              إنشاء ميزانية / قالب معياري
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: List of standard templates */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-500" />
                    قوالب التكلفة المعيارية الحالية
                  </h3>
                  <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">
                    {standardCosts.length} قوالب
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {standardCosts.map((tmpl) => {
                    const isServiceTemplate = !!tmpl.serviceId;
                    const hallName = halls.find((h) => h.id === tmpl.hallId)?.name || "كل القاعات (عام)";
                    const serviceName = services.find((s) => s.id === tmpl.serviceId)?.name || "خدمة غير معروفة";

                    return (
                      <div
                        key={tmpl.id}
                        className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition group shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black px-3 py-1 rounded-full ${
                            isServiceTemplate 
                              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400" 
                              : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                          }`}>
                            {isServiceTemplate ? "خدمة إضافية" : tmpl.eventType}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditTemplate(tmpl)}
                              className="p-1 text-slate-400 hover:text-indigo-500 rounded bg-white dark:bg-slate-800 shadow-sm hover:scale-105 transition"
                              title="تعديل القالب"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(tmpl.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded bg-white dark:bg-slate-800 shadow-sm hover:scale-105 transition"
                              title="حذف القالب"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2 flex items-center gap-1.5">
                          {isServiceTemplate ? (
                            <>
                              <Package className="h-3.5 w-3.5 text-slate-400" />
                              الخدمة: {serviceName}
                            </>
                          ) : (
                            <>
                              <Building className="h-3.5 w-3.5 text-slate-400" />
                              القاعة: {hallName}
                            </>
                          )}
                        </div>

                        {/* Cost items listing with connected accounts */}
                        <div className="mt-3 space-y-1 bg-white dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                          {tmpl.items.map((it, idx) => {
                            const acc = accounts.find((a) => a.id === it.accountId);
                            return (
                              <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 border-b border-dashed border-slate-100 dark:border-slate-800/80 pb-1 last:border-0 last:pb-0">
                                <span>{it.name}</span>
                                <div className="flex items-center gap-1.5">
                                  {acc && (
                                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded" title={`كود الحساب: ${acc.code}`}>
                                      {acc.name}
                                    </span>
                                  )}
                                  <span className="text-slate-800 dark:text-white">{it.standardCost.toLocaleString()} YER</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="text-slate-400 font-bold">إجمالي التكلفة المقدرة:</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">
                            {tmpl.totalStandardCost.toLocaleString()} {tmpl.currency}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {standardCosts.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-xs font-bold space-y-2">
                      <Target className="h-10 w-10 text-slate-300 mx-auto" />
                      <p>لم يتم إنشاء أي قالب تكاليف معيارية مسبقاً.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Variance Analysis & Booking Costs Input */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-indigo-500" />
                      تحليل تكاليف الفعاليات الحية والانحرافات
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                      اختر حجزاً لتسجيل تكلفته الحقيقية ومقارنتها بالتكلفة المعيارية المحددة في القالب
                    </p>
                  </div>

                  <div className="shrink-0">
                    <select
                      value={selectedBookingId}
                      onChange={(e) => {
                        setSelectedBookingId(e.target.value);
                        setShowActualCostForm(false);
                      }}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    >
                      <option value="">-- اختر فعالية / حجزاً --</option>
                      {bookings
                        .filter((b) => b.status === "confirmed" || b.status === "completed")
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.customerName} - {b.eventType} ({(() => {
                              const dates = (b.eventDates && b.eventDates.length > 0)
                                ? b.eventDates
                                : (b.days && b.days.length > 0)
                                  ? b.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                                  : b.eventDate ? [b.eventDate] : [];
                              return dates.length > 1 ? `${dates.join(', ')} (${dates.length} أيام)` : (dates[0] || '-');
                            })()})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {selectedBooking ? (
                  <div className="space-y-6">
                    {/* Selected Booking Info Card */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
                      <div>
                        <span className="text-slate-400 block font-bold">قيمة العقد (الإيراد الفعلي)</span>
                        <span className="font-black text-slate-800 dark:text-white text-sm mt-1 block">
                          {selectedBooking.totalPrice.toLocaleString()} {selectedBooking.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">نوع الفعالية</span>
                        <span className="font-bold text-slate-800 dark:text-white block mt-1">
                          {selectedBooking.eventType}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">حالة الحجز</span>
                        <span className="font-bold text-indigo-600 block mt-1">
                          {selectedBooking.status === "completed" ? "منتهية" : "مؤكدة"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">التاريخ</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mt-1">
                          {(() => {
                            const dates = (selectedBooking.eventDates && selectedBooking.eventDates.length > 0)
                              ? selectedBooking.eventDates
                              : (selectedBooking.days && selectedBooking.days.length > 0)
                                ? selectedBooking.days.filter((d: any) => d.status !== 'cancelled').map((d: any) => d.date)
                                : selectedBooking.eventDate ? [selectedBooking.eventDate] : [];
                            return dates.length > 1 ? `${dates.join(' | ')} (${dates.length} أيام)` : (dates[0] || '-');
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Costs Display / Form */}
                    {!showActualCostForm && !existingActualCost && (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 bg-slate-50/50">
                        <Target className="h-10 w-10 text-slate-300 mx-auto" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white">لم يتم رصد تكاليف فعلية لهذه الفعالية بعد</h4>
                          <p className="text-[10px] text-slate-500">
                            لإجراء مقارنة انحرافات صحيحة ومعرفة صافي ربح الفعالية، قم بتغذية التكاليف الحقيقية التي دفعت
                          </p>
                        </div>
                        <button
                          onClick={handleLoadTemplateForBooking}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow cursor-pointer transition-all hover:scale-105"
                        >
                          تغذية وتحديد تكاليف الفعالية
                        </button>
                      </div>
                    )}

                    {showActualCostForm && (
                      <div className="bg-slate-50/50 dark:bg-slate-800/10 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white border-b pb-2">تسجيل التكاليف الحقيقية المدفوعة للمناسبة</h4>

                        <div className="space-y-3">
                          {actualCostItems.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-white dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">بند التكلفة</label>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    const updated = [...actualCostItems];
                                    updated[idx].name = e.target.value;
                                    setActualCostItems(updated);
                                  }}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                                  placeholder="البند..."
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">التكلفة الفعلية YER *</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.actualCost || ""}
                                  onChange={(e) => {
                                    const updated = [...actualCostItems];
                                    updated[idx].actualCost = Math.max(0, Number(e.target.value) || 0);
                                    setActualCostItems(updated);
                                  }}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-black text-indigo-600"
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-1">الحساب المالي المرتبط</label>
                                <select
                                  value={item.accountId || ""}
                                  onChange={(e) => {
                                    const updated = [...actualCostItems];
                                    updated[idx].accountId = e.target.value;
                                    setActualCostItems(updated);
                                  }}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white"
                                >
                                  <option value="">-- ربط بحساب --</option>
                                  {accounts.filter(a => a.isTransactional).map(a => (
                                    <option key={a.id} value={a.id}>
                                      {a.code} - {a.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] text-slate-400 font-bold block mb-1">ملاحظات</label>
                                  <input
                                    type="text"
                                    value={item.notes}
                                    onChange={(e) => {
                                      const updated = [...actualCostItems];
                                      updated[idx].notes = e.target.value;
                                      setActualCostItems(updated);
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs"
                                    placeholder="ملاحظة..."
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = actualCostItems.filter((_, i) => i !== idx);
                                    setActualCostItems(updated);
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              setActualCostItems([
                                ...actualCostItems,
                                { name: "", actualCost: 0, accountId: "", notes: "" },
                              ])
                            }
                            className="flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:underline"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            إضافة بند تكلفة إضافي
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSaveActualCosts}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-xs cursor-pointer"
                            >
                              حفظ التكاليف الفعلية
                            </button>
                            <button
                              onClick={() => setShowActualCostForm(false)}
                              className="px-4 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 rounded-lg font-bold text-xs cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Analysis Display (if actual cost exists) */}
                    {existingActualCost && !showActualCostForm && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            تقرير مقارنة وتحليل الانحرافات
                          </h4>
                          <button
                            onClick={() => {
                              setActualCostItems(
                                existingActualCost.items.map((it) => ({
                                  name: it.name,
                                  actualCost: it.actualCost,
                                  accountId: it.accountId || "",
                                  notes: it.notes || "",
                                }))
                              );
                              setShowActualCostForm(true);
                            }}
                            className="text-xs text-indigo-500 font-bold hover:underline cursor-pointer"
                          >
                            تعديل التكاليف الفعلية
                          </button>
                        </div>

                        {/* Detailed Variance Table - Responsive Wrapper */}
                        <div className="space-y-4">
                          {/* Desktop View Table */}
                          <div className="hidden md:block border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden text-xs shadow-sm">
                            <table className="w-full text-right border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">
                                  <th className="p-3">البند / المصروف</th>
                                  <th className="p-3">الحساب المالي</th>
                                  <th className="p-3">التكلفة المعيارية</th>
                                  <th className="p-3">التكلفة الفعلية</th>
                                  <th className="p-3">الانحراف (المطلق)</th>
                                  <th className="p-3">النسبة والأثر</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                                {(() => {
                                  const matchedTmpl = getMatchedTemplateForBooking(selectedBooking);
                                  if (!matchedTmpl) return null;
                                  const daysCount = getBookingDaysCount(selectedBooking);

                                  return matchedTmpl.items.map((stdItem) => {
                                    const actItem = existingActualCost.items.find((i) => i.name === stdItem.name);
                                    const actCost = actItem ? actItem.actualCost : 0;
                                    const itemStdCost = stdItem.standardCost * daysCount;
                                    const variance = itemStdCost - actCost;
                                    const isFavorable = variance >= 0; // Standard > Actual means favorable (saving)
                                    const accId = actItem?.accountId || stdItem.accountId;
                                    const acc = accounts.find(a => a.id === accId);

                                    return (
                                      <tr key={stdItem.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                        <td className="p-3 font-bold text-slate-800 dark:text-white">{stdItem.name}</td>
                                        <td className="p-3">
                                          {acc ? (
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-500 font-bold">
                                              {acc.code} - {acc.name}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-slate-400">غير مرتبط بالحساب</span>
                                          )}
                                        </td>
                                        <td className="p-3 text-slate-500">
                                          {itemStdCost.toLocaleString()} YER
                                          <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                                            ({stdItem.standardCost.toLocaleString()} × {daysCount} {daysCount === 1 ? 'يوم' : 'أيام'})
                                          </span>
                                        </td>
                                        <td className="p-3 text-slate-900 dark:text-white font-black">{actCost.toLocaleString()} YER</td>
                                        <td className={`p-3 font-black ${isFavorable ? "text-emerald-600" : "text-rose-500"}`}>
                                          {isFavorable ? "+" : ""}
                                          {variance.toLocaleString()} YER
                                        </td>
                                        <td className="p-3">
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                              isFavorable
                                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                                                : "bg-rose-50 text-rose-500 dark:bg-rose-950/20"
                                            }`}
                                          >
                                            {isFavorable ? "مُفضّل (وفر)" : "غير مفضّل (عجز)"} ({itemStdCost > 0 ? ((Math.abs(variance) / itemStdCost) * 100).toFixed(0) : "0"}%)
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile View Card Grid */}
                          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(() => {
                              const matchedTmpl = getMatchedTemplateForBooking(selectedBooking);
                              if (!matchedTmpl) return null;
                              const daysCount = getBookingDaysCount(selectedBooking);

                              return matchedTmpl.items.map((stdItem) => {
                                const actItem = existingActualCost.items.find((i) => i.name === stdItem.name);
                                const actCost = actItem ? actItem.actualCost : 0;
                                const itemStdCost = stdItem.standardCost * daysCount;
                                const variance = itemStdCost - actCost;
                                const isFavorable = variance >= 0;
                                const accId = actItem?.accountId || stdItem.accountId;
                                const acc = accounts.find(a => a.id === accId);

                                return (
                                  <div key={stdItem.name} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">بند التكلفة</span>
                                        <div className="text-xs font-black text-slate-800 dark:text-white">{stdItem.name}</div>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                          isFavorable
                                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                                            : "bg-rose-50 text-rose-500 dark:bg-rose-950/20"
                                        }`}
                                      >
                                        {isFavorable ? "وفر" : "عجز"} {itemStdCost > 0 ? ((Math.abs(variance) / itemStdCost) * 100).toFixed(0) : "0"}%
                                      </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                                      <div>
                                        <span className="text-[9px] text-slate-400 block mb-0.5 font-bold">التكلفة المعيارية</span>
                                        <div className="text-[11px] font-mono font-black text-slate-700 dark:text-slate-300">
                                          {itemStdCost.toLocaleString()}
                                        </div>
                                        <div className="text-[8px] text-slate-400 font-medium">
                                          ({stdItem.standardCost.toLocaleString()} × {daysCount} يوم)
                                        </div>
                                      </div>
                                      <div className="text-left">
                                        <span className="text-[9px] text-slate-400 block mb-0.5 font-bold">التكلفة الفعلية</span>
                                        <span className="text-[11px] font-mono font-black text-slate-900 dark:text-white">{actCost.toLocaleString()}</span>
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                                      <span className="text-[9px] font-black text-slate-400 uppercase">الانحراف المطلق</span>
                                      <span className={`text-xs font-mono font-black ${isFavorable ? "text-emerald-600" : "text-rose-600"}`}>
                                        {isFavorable ? "+" : ""}{variance.toLocaleString()} YER
                                      </span>
                                    </div>
                                    
                                    {acc && (
                                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                        <Building className="h-3 w-3" />
                                        {acc.name}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Overall profitability analysis card */}
                        {(() => {
                          const matchedTmpl = getMatchedTemplateForBooking(selectedBooking);
                          if (!matchedTmpl) return null;
                          const daysCount = getBookingDaysCount(selectedBooking);
                          const totalStandardCostForBooking = matchedTmpl.totalStandardCost * daysCount;

                          const varianceTotal = totalStandardCostForBooking - existingActualCost.totalActualCost;
                          const isFavorableTotal = varianceTotal >= 0;
                          const profitActual = selectedBooking.totalPrice - existingActualCost.totalActualCost;
                          const marginPct = selectedBooking.totalPrice > 0 ? ((profitActual / selectedBooking.totalPrice) * 100).toFixed(0) : "0";

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center gap-3">
                                {isFavorableTotal ? (
                                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5" />
                                  </div>
                                )}
                                <div>
                                  <div className="text-[10px] text-slate-400 font-bold">الانحراف المالي الإجمالي للميزانية</div>
                                  <div className={`text-sm font-black mt-1 ${isFavorableTotal ? "text-emerald-600" : "text-rose-500"}`}>
                                    {isFavorableTotal ? "وفر مالي بقيمة: " : "عجز مالي بقيمة: "}
                                    {Math.abs(varianceTotal).toLocaleString()} YER
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-900 text-white flex items-center gap-3 shadow-md">
                                <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center">
                                  <PieChart className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 font-bold">صافي الربح الفعلي وهامش الفعالية</div>
                                  <div className="text-sm font-black mt-1 text-indigo-300">
                                    {profitActual.toLocaleString()} YER (هامش: {marginPct}%)
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs font-bold space-y-2">
                    <BarChart2 className="h-12 w-12 text-slate-300 mx-auto" />
                    <p>يرجى اختيار حجز أو فعالية من القائمة المنسدلة للبدء في تحليل التكاليف</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* PROFITABILITY REPORTS TAB */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-indigo-500" />
                  تقرير مقارنة وتحليل أرباح الفعاليات (الفعلي vs المعياري)
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
                  مقارنة إيرادات العقود لجميع الفعاليات مع تكلفتها المعيارية والربحية المقدرة والربحية الفعلية.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  طباعة التقرير
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">البحث بالعميل</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم العميل..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-medium"
                  />
                  <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">نوع الفعالية</label>
                <select
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="">كل أنواع الفعاليات</option>
                  {eventTypesList.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">القاعة</label>
                <select
                  value={filterHallId}
                  onChange={(e) => setFilterHallId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="">كل القاعات</option>
                  {halls.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">الشهر</label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Aggregated Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-950/30 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">إجمالي الإيرادات الفعلية</span>
                  <span className="text-base font-black text-slate-800 dark:text-white mt-1 block">
                    {totalActualRevenue.toLocaleString()} YER
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-950/30 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shrink-0">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">إجمالي التكاليف المعيارية المقدرة</span>
                  <span className="text-base font-black text-slate-800 dark:text-white mt-1 block">
                    {totalEstimatedStandardCost.toLocaleString()} YER
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-950/30 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">الربح المعياري المتوقع (الربحية المقدرة)</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {totalEstimatedStandardProfit.toLocaleString()} YER ({standardProfitMarginPct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/60 dark:border-rose-950/30 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">إجمالي التكاليف الفعلية المسجلة ({bookingsWithActualCostsCount} فعالية)</span>
                  <span className="text-base font-black text-slate-800 dark:text-white mt-1 block">
                    {totalActualCostsRecorded.toLocaleString()} YER
                  </span>
                </div>
              </div>
            </div>

            {/* Custom styled visualization chart (Visual comparison block) */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Percent className="h-4 w-4 text-indigo-500" />
                هيكل الربحية والمصروفات التراكمي
              </h4>

              <div className="space-y-4">
                {/* Rent vs Services split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-black text-indigo-600 dark:text-indigo-400">
                      <span>إيجار القاعة</span>
                      <span className="font-mono">الهامش: {rentProfitMarginPct.toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-bold text-center">
                      <div>
                        <span className="text-slate-400 block text-[9px]">الإيرادات</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{totalRentRevenue.toLocaleString()} YER</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">التكلفة</span>
                        <span className="font-mono text-slate-500">{totalRentStdCosts.toLocaleString()} YER</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">الربح المتوقع</span>
                        <span className={`font-mono ${totalEstimatedRentProfit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{totalEstimatedRentProfit.toLocaleString()} YER</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-black text-amber-600 dark:text-amber-400">
                      <span>الخدمات الإضافية</span>
                      <span className="font-mono">الهامش: {servicesProfitMarginPct.toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-bold text-center">
                      <div>
                        <span className="text-slate-400 block text-[9px]">الإيرادات</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{totalServicesRevenue.toLocaleString()} YER</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">التكلفة</span>
                        <span className="font-mono text-slate-500">{totalServicesStdCosts.toLocaleString()} YER</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">الربح المتوقع</span>
                        <span className={`font-mono ${totalEstimatedServicesProfit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{totalEstimatedServicesProfit.toLocaleString()} YER</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expected vs Actual profit comparison */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">الربحية المقدرة (بناءً على التكاليف المعيارية):</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">
                      {totalEstimatedStandardProfit.toLocaleString()} YER ({standardProfitMarginPct.toFixed(1)}% هامش ربح)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, standardProfitMarginPct))}%` }}
                    />
                  </div>
                </div>

                {bookingsWithActualCostsCount > 0 && (
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-500">الربحية الفعلية (للفعاليات المسجلة):</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        {totalActualProfit.toLocaleString()} YER ({actualProfitMarginPct.toFixed(1)}% هامش ربح)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, actualProfitMarginPct))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Data Table - Responsive Wrapper */}
            <div className="space-y-4">
              {/* Desktop View Table */}
              <div className="hidden lg:block border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4">الفعالية / العميل</th>
                      <th className="p-4">القاعة</th>
                      <th className="p-4">التاريخ / نوع الفعالية</th>
                      <th className="p-4">إجمالي الإيراد (العقد)</th>
                      <th className="p-4">التكلفة المعيارية</th>
                      <th className="p-4">الربح المعياري المقدر</th>
                      <th className="p-4">التكلفة الفعلية</th>
                      <th className="p-4">الربح الفعلي لليوم</th>
                      <th className="p-4">الانحراف الفعلي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {activeBookingsForReports.map((b) => {
                      const hallName = halls.find((h) => h.id === b.hallId)?.name || "قاعة غير معروفة";
                      const matchedTmpl = getMatchedTemplateForBooking(b);
                      const daysCount = getBookingDaysCount(b);
                      
                      const bTotalPrice = b.totalPrice || 0;
                      const bServicesRevenue = getBookingServicesRevenue(b);
                      const bRentRevenue = Math.max(0, bTotalPrice - bServicesRevenue);

                      const rentStdCost = matchedTmpl ? matchedTmpl.totalStandardCost * daysCount : 0;
                      const servicesStdCost = getBookingServicesStandardCost(b);
                      const totalStdCost = rentStdCost + servicesStdCost;

                      const estProfit = bTotalPrice - totalStdCost;
                      const estMargin = bTotalPrice > 0 ? ((estProfit / bTotalPrice) * 100).toFixed(0) : "0";

                      const rentProfit = bRentRevenue - rentStdCost;
                      const servicesProfit = bServicesRevenue - servicesStdCost;

                      const actCostRecord = actualCosts.find((ac) => ac.bookingId === b.id);
                      const actCost = actCostRecord ? actCostRecord.totalActualCost : null;
                      const actProfit = actCost !== null ? bTotalPrice - actCost : null;
                      const actMargin = actCost !== null && bTotalPrice > 0 ? ((actProfit! / bTotalPrice) * 100).toFixed(0) : "0";

                      const costVariance = actCost !== null ? totalStdCost - actCost : null;
                      const isFavorable = costVariance !== null && costVariance >= 0;

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="p-4">
                            <div className="font-bold text-slate-800 dark:text-white">{b.customerName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{b.customerPhone}</div>
                          </td>
                          <td className="p-4 font-bold">{hallName}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-600 dark:text-slate-400">{b.eventType}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {b.eventDate || (b.days && b.days[0]?.date)}
                              <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1 py-0.5 rounded text-[9px] font-bold">
                                {daysCount} {daysCount === 1 ? 'يوم' : 'أيام'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-black text-slate-900 dark:text-white">
                              {bTotalPrice.toLocaleString()} YER
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 font-normal">
                              (إيجار: {bRentRevenue.toLocaleString()} / خدمات: {bServicesRevenue.toLocaleString()})
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-slate-500 font-bold">
                              {totalStdCost.toLocaleString()} YER
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 font-normal">
                              (قاعة: {rentStdCost.toLocaleString()} / خدمات: {servicesStdCost.toLocaleString()})
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-indigo-600 dark:text-indigo-400 font-black">
                              {estProfit.toLocaleString()} YER
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 font-normal">
                              (هامش: {estMargin}% | إيجار: <span className={rentProfit >= 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>{rentProfit.toLocaleString()}</span> / خدمات: <span className={servicesProfit >= 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>{servicesProfit.toLocaleString()}</span>)
                            </div>
                          </td>
                          <td className="p-4 font-bold">
                            {actCost !== null ? (
                              <span className="text-slate-900 dark:text-white">{actCost.toLocaleString()} YER</span>
                            ) : (
                              <span className="text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">لم يرصد بعد</span>
                            )}
                          </td>
                          <td className="p-4 font-bold">
                            {actProfit !== null ? (
                              <div>
                                <div className="text-emerald-600 dark:text-emerald-400 font-black">{actProfit.toLocaleString()} YER</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">هامش الربح {actMargin}%</div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-4">
                            {costVariance !== null ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isFavorable
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                                    : "bg-rose-50 text-rose-500 dark:bg-rose-950/20"
                                }`}
                              >
                                {isFavorable ? "وفر +" : "عجز -"} {Math.abs(costVariance).toLocaleString()} YER
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {activeBookingsForReports.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-black">
                          لا توجد فعاليات مسجلة مطابقة للفلاتر المحددة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card Grid */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeBookingsForReports.map((b) => {
                  const hallName = halls.find((h) => h.id === b.hallId)?.name || "قاعة غير معروفة";
                  const matchedTmpl = getMatchedTemplateForBooking(b);
                  const daysCount = getBookingDaysCount(b);
                  
                  const bTotalPrice = b.totalPrice || 0;
                  const bServicesRevenue = getBookingServicesRevenue(b);
                  const bRentRevenue = Math.max(0, bTotalPrice - bServicesRevenue);

                  const rentStdCost = matchedTmpl ? matchedTmpl.totalStandardCost * daysCount : 0;
                  const servicesStdCost = getBookingServicesStandardCost(b);
                  const totalStdCost = rentStdCost + servicesStdCost;

                  const estProfit = bTotalPrice - totalStdCost;
                  const estMargin = bTotalPrice > 0 ? ((estProfit / bTotalPrice) * 100).toFixed(0) : "0";

                  const actCostRecord = actualCosts.find((ac) => ac.bookingId === b.id);
                  const actCost = actCostRecord ? actCostRecord.totalActualCost : null;
                  const actProfit = actCost !== null ? bTotalPrice - actCost : null;
                  const actMargin = actCost !== null && bTotalPrice > 0 ? ((actProfit! / bTotalPrice) * 100).toFixed(0) : "0";

                  const costVariance = actCost !== null ? totalStdCost - actCost : null;
                  const isFavorable = costVariance !== null && costVariance >= 0;

                  return (
                    <div key={b.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-slate-50 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-800/20">
                        <div className="flex justify-between items-start mb-2">
                          <div className="space-y-0.5">
                            <div className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{b.customerName}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{hallName}</div>
                          </div>
                          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg text-[9px] font-black shrink-0">
                            {b.eventType}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                          <Calendar className="h-3 w-3" />
                          {b.eventDate || (b.days && b.days[0]?.date)}
                          <span className="mx-1">•</span>
                          {daysCount} {daysCount === 1 ? 'يوم' : 'أيام'}
                        </div>
                      </div>

                      <div className="p-4 flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 block font-bold">الإيراد الكلي</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {bTotalPrice.toLocaleString()} YER
                            </span>
                          </div>
                          <div className="space-y-1 text-left">
                            <span className="text-[10px] text-slate-400 block font-bold">التكلفة المعيارية</span>
                            <span className="text-xs font-bold text-slate-500">
                              {totalStdCost.toLocaleString()} YER
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/20">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black">الربح المعياري المقدر</span>
                            <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-mono">{estMargin}%</span>
                          </div>
                          <div className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                            {estProfit.toLocaleString()} YER
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 block font-bold">التكلفة الفعلية</span>
                            {actCost !== null ? (
                              <span className="text-xs font-black text-slate-900 dark:text-white">{actCost.toLocaleString()} YER</span>
                            ) : (
                              <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold italic">لم يرصد</span>
                            )}
                          </div>
                          <div className="space-y-1 text-left">
                            <span className="text-[10px] text-slate-400 block font-bold">الربح الفعلي</span>
                            {actProfit !== null ? (
                              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{actProfit.toLocaleString()} YER</div>
                            ) : (
                              <span className="text-[9px] text-slate-300 font-bold italic">-</span>
                            )}
                          </div>
                        </div>

                        {costVariance !== null && (
                          <div className={`flex justify-between items-center p-2 rounded-xl text-[10px] font-black ${
                            isFavorable ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/10" : "bg-rose-50 text-rose-500 dark:bg-rose-950/10"
                          }`}>
                            <span>الانحراف الفعلي:</span>
                            <span>{isFavorable ? "وفر +" : "عجز -"} {Math.abs(costVariance).toLocaleString()} YER</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {activeBookingsForReports.length === 0 && (
                  <div className="col-span-full p-12 text-center text-slate-400 font-black bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    لا توجد فعاليات مسجلة مطابقة للفلاتر المحددة.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "services" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-amber-500 animate-pulse" />
                  التكاليف المعيارية للخدمات الإضافية والمساندة
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
                  حدد التكلفة المعيارية لكل خدمة إضافية لحساب الأرباح المستقلة للخدمات بدقة عن أرباح الإيجار.
                </p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="البحث عن خدمة..."
                  value={servicesSearchQuery}
                  onChange={(e) => setServicesSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 text-right text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 font-black">اسم الخدمة الإضافية</th>
                      <th className="p-4 font-black">التصنيف</th>
                      <th className="p-4 font-black">سعر البيع للعميل</th>
                      <th className="p-4 font-black">التكلفة المعيارية الحالية</th>
                      <th className="p-4 font-black">الربح المتوقع للوحدة</th>
                      <th className="p-4 text-left font-black">العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {services
                      .filter((s) => s.name.toLowerCase().includes(servicesSearchQuery.toLowerCase()) || (s.category || "").toLowerCase().includes(servicesSearchQuery.toLowerCase()))
                      .map((s) => {
                        const serviceTemplate = standardCosts.find((t) => t.serviceId === s.id);
                        const totalStandardCost = serviceTemplate ? serviceTemplate.totalStandardCost : (s.standardCost || 0);
                        
                        const profit = s.price - totalStandardCost;
                        const profitMargin = s.price > 0 ? (profit / s.price) * 100 : 0;

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="p-4 font-bold text-slate-800 dark:text-white">{s.name}</td>
                            <td className="p-4">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                                {s.category || "عام"}
                              </span>
                            </td>
                            <td className="p-4 font-black text-slate-900 dark:text-white">
                              {s.price.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">{s.currency}</span>
                            </td>
                            <td className="p-4">
                              {serviceTemplate ? (
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-slate-600 dark:text-slate-300">
                                    {totalStandardCost.toLocaleString()} <span className="text-[10px] text-slate-400">{s.currency}</span>
                                  </span>
                                  <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded w-fit">
                                    قالب متعدد البنود ({serviceTemplate.items.length})
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-slate-600 dark:text-slate-300">
                                  {totalStandardCost.toLocaleString()} <span className="text-[10px] text-slate-400">{s.currency}</span>
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                  {profit.toLocaleString()} <span className="text-[10px]">{s.currency}</span>
                                </span>
                                <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.2 rounded font-bold">
                                  {profitMargin.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-left">
                              <button
                                onClick={() => {
                                  if (serviceTemplate) {
                                    handleEditTemplate(serviceTemplate);
                                  } else {
                                    // Create new template for this service
                                    setTemplateForm({
                                      entityType: "service",
                                      serviceId: s.id,
                                      hallId: "",
                                      eventType: "",
                                      currency: s.currency,
                                      items: [
                                        { name: "تكلفة شراء/تشغيل", standardCost: s.standardCost || 0, accountId: "" }
                                      ],
                                    });
                                    setEditingTemplate(null);
                                    setShowTemplateModal(true);
                                  }
                                }}
                                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-[11px] font-black border border-amber-100 dark:border-amber-900/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 inline-block cursor-pointer"
                              >
                                {serviceTemplate ? <Edit3 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                {serviceTemplate ? "تعديل القالب" : "إنشاء قالب معيارية"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                    {services.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                          لا توجد خدمات مضافة بعد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card Grid */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services
                  .filter((s) => s.name.toLowerCase().includes(servicesSearchQuery.toLowerCase()) || (s.category || "").toLowerCase().includes(servicesSearchQuery.toLowerCase()))
                  .map((s) => {
                    const serviceTemplate = standardCosts.find((t) => t.serviceId === s.id);
                    const totalStandardCost = serviceTemplate ? serviceTemplate.totalStandardCost : (s.standardCost || 0);
                    const profit = s.price - totalStandardCost;
                    const profitMargin = s.price > 0 ? (profit / s.price) * 100 : 0;

                    return (
                      <div key={s.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <div className="text-xs font-black text-slate-800 dark:text-white">{s.name}</div>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 font-bold uppercase">
                              {s.category || "عام"}
                            </span>
                          </div>
                          <div className="text-left">
                            <div className="text-[10px] text-slate-400 font-bold">سعر البيع</div>
                            <div className="text-xs font-black text-slate-900 dark:text-white">{s.price.toLocaleString()} {s.currency}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">التكلفة المعيارية</span>
                            <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                              {totalStandardCost.toLocaleString()} {s.currency}
                            </div>
                            {serviceTemplate && (
                              <span className="text-[8px] text-indigo-500 font-bold">قالب متعدد ({serviceTemplate.items.length})</span>
                            )}
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">الربح المتوقع</span>
                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {profit.toLocaleString()} {s.currency}
                            </div>
                            <span className="text-[8px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 px-1 py-0.5 rounded-sm font-black">{profitMargin.toFixed(0)}%</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (serviceTemplate) {
                              handleEditTemplate(serviceTemplate);
                            } else {
                              setTemplateForm({
                                entityType: "service",
                                serviceId: s.id,
                                hallId: "",
                                eventType: "",
                                currency: s.currency,
                                items: [{ name: "تكلفة شراء/تشغيل", standardCost: s.standardCost || 0, accountId: "" }],
                              });
                              setEditingTemplate(null);
                              setShowTemplateModal(true);
                            }
                          }}
                          className="w-full text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 text-xs font-black border border-amber-100 dark:border-amber-900/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          {serviceTemplate ? <Edit3 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {serviceTemplate ? "تعديل القالب المعياري" : "إنشاء قالب معيارية للخدمة"}
                        </button>
                      </div>
                    );
                  })}
                {services.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/20 rounded-3xl">
                    لا توجد خدمات مضافة بعد.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "cost-items" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-500 animate-pulse" />
                  سجل بنود التكاليف المعتمدة
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
                  سجل لتخزين بنود التكاليف المتكررة مع تكاليفها الافتراضية وحساباتها المالية لسهولة اختيارها عند إنشاء قوالب جديدة.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="البحث عن بند..."
                    value={costItemsSearchQuery}
                    onChange={(e) => setCostItemsSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 text-right text-slate-800 dark:text-white"
                  />
                </div>

                <button
                  onClick={() => {
                    setEditingCostItem(null);
                    setCostItemForm({ name: "", defaultStandardCost: 0, accountId: "" });
                    setShowCostItemModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  إضافة بند تكلفة
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4 font-black">اسم بند التكلفة</th>
                      <th className="p-4 font-black">التكلفة الافتراضية</th>
                      <th className="p-4 font-black">الحساب المالي المرتبط</th>
                      <th className="p-4 text-left font-black">العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {costItems
                      .filter((ci) => ci.name.toLowerCase().includes(costItemsSearchQuery.toLowerCase()))
                      .map((ci) => {
                        const linkedAcc = accounts.find((a) => a.id === ci.accountId);
                        return (
                          <tr key={ci.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="p-4 font-bold text-slate-800 dark:text-white">{ci.name}</td>
                            <td className="p-4 font-black text-slate-900 dark:text-white">
                              {ci.defaultStandardCost ? `${ci.defaultStandardCost.toLocaleString()} YER` : "غير محدد"}
                            </td>
                            <td className="p-4 font-bold text-slate-500 dark:text-slate-400">
                              {linkedAcc ? `${linkedAcc.code} - ${linkedAcc.name}` : <span className="text-slate-400 italic">غير مرتبط</span>}
                            </td>
                            <td className="p-4 text-left flex gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  setEditingCostItem(ci);
                                  setCostItemForm({
                                    name: ci.name,
                                    defaultStandardCost: ci.defaultStandardCost || 0,
                                    accountId: ci.accountId || "",
                                  });
                                  setShowCostItemModal(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-500 cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("هل تريد حذف بند التكلفة هذا من السجل؟")) {
                                    if (onDeleteCostItem) {
                                      try {
                                        await onDeleteCostItem(ci.id);
                                        toast.success("تم حذف بند التكلفة بنجاح");
                                      } catch (err) {
                                        toast.error("حدث خطأ أثناء الحذف");
                                      }
                                    }
                                  }
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                    {costItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-400 font-bold">
                          لا توجد بنود مضافة في سجل التكاليف بعد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card Grid */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                {costItems
                  .filter((ci) => ci.name.toLowerCase().includes(costItemsSearchQuery.toLowerCase()))
                  .map((ci) => {
                    const linkedAcc = accounts.find((a) => a.id === ci.accountId);
                    return (
                      <div key={ci.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase">اسم البند</span>
                            <div className="text-xs font-black text-slate-800 dark:text-white">{ci.name}</div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingCostItem(ci);
                                setCostItemForm({
                                  name: ci.name,
                                  defaultStandardCost: ci.defaultStandardCost || 0,
                                  accountId: ci.accountId || "",
                                });
                                setShowCostItemModal(true);
                              }}
                              className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-500"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm("هل تريد حذف بند التكلفة هذا من السجل؟")) {
                                  if (onDeleteCostItem) {
                                    try {
                                      await onDeleteCostItem(ci.id);
                                      toast.success("تم حذف بند التكلفة بنجاح");
                                    } catch (err) {
                                      toast.error("حدث خطأ أثناء الحذف");
                                    }
                                  }
                                }
                              }}
                              className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">التكلفة الافتراضية</span>
                            <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                              {ci.defaultStandardCost ? ci.defaultStandardCost.toLocaleString() : "0"} YER
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold">الحساب المرتبط</span>
                            <div className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">
                              {linkedAcc ? linkedAcc.name : <span className="italic opacity-50">غير مرتبط</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {costItems.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/20 rounded-2xl">
                    لا توجد بنود مضافة في سجل التكاليف بعد.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Item Modal */}
      <AnimatePresence>
        {showCostItemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCostItemModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-right"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/10">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-500" />
                  {editingCostItem ? "تعديل بند التكلفة المعتمد" : "إضافة بند تكلفة جديد للسجل"}
                </h3>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!costItemForm.name.trim()) {
                    toast.error("يرجى إدخال اسم البند");
                    return;
                  }
                  try {
                    if (editingCostItem) {
                      if (onUpdateCostItem) {
                        await onUpdateCostItem(editingCostItem.id, costItemForm);
                        toast.success("تم تحديث بند التكلفة بنجاح");
                      }
                    } else {
                      if (onAddCostItem) {
                        await onAddCostItem(costItemForm);
                        toast.success("تمت إضافة بند التكلفة الجديد بنجاح");
                      }
                    }
                    setShowCostItemModal(false);
                  } catch (err) {
                    toast.error("حدث خطأ أثناء حفظ البند");
                  }
                }}
                className="p-6 space-y-4 text-right"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">اسم بند التكلفة</label>
                  <input
                    type="text"
                    required
                    value={costItemForm.name}
                    onChange={(e) => setCostItemForm({ ...costItemForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white text-right"
                    placeholder="مثال: أجور عمال ومباشرين، ديزل"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">التكلفة المعيارية الافتراضية (YER)</label>
                  <input
                    type="number"
                    min="0"
                    value={costItemForm.defaultStandardCost || ""}
                    onChange={(e) => setCostItemForm({ ...costItemForm, defaultStandardCost: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white text-right"
                    placeholder="مثال: 10000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">الحساب المالي المرتبط افتراضياً</label>
                  <select
                    value={costItemForm.accountId}
                    onChange={(e) => setCostItemForm({ ...costItemForm, accountId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white text-right"
                  >
                    <option value="">-- اختر حساباً مالياً --</option>
                    {accounts.filter(a => a.isTransactional).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs transition animate-pulse"
                  >
                    حفظ البند
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCostItemModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Modal Form */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-right"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/10">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-500" />
                  {editingTemplate ? "تعديل قالب التكلفة المعيارية" : "إنشاء قالب تكلفة معيارية (ميزانية افتراضية)"}
                </h3>
              </div>

              <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
                <div className="flex gap-4 mb-4 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTemplateForm({ ...templateForm, entityType: "hall" })}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                      templateForm.entityType === "hall" 
                        ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    التكاليف المعيارية للقاعات
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateForm({ ...templateForm, entityType: "service" })}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                      templateForm.entityType === "service" 
                        ? "bg-white dark:bg-slate-900 shadow-sm text-amber-600 dark:text-amber-400" 
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    التكاليف المعيارية للخدمات
                  </button>
                </div>

                {templateForm.entityType === "hall" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">نوع الفعالية المربوط بها *</label>
                      <select
                        value={templateForm.eventType}
                        onChange={(e) => setTemplateForm({ ...templateForm, eventType: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      >
                        {eventTypesList.map((et) => (
                          <option key={et} value={et}>
                            {et}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">مربوط بقاعة محددة (اختياري)</label>
                      <select
                        value={templateForm.hallId}
                        onChange={(e) => setTemplateForm({ ...templateForm, hallId: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                      >
                        <option value="">كل القاعات (عام)</option>
                        {halls.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">الخدمة الإضافية المربوط بها *</label>
                    <select
                      value={templateForm.serviceId}
                      onChange={(e) => setTemplateForm({ ...templateForm, serviceId: e.target.value })}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-white"
                    >
                      <option value="">-- اختر الخدمة --</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} - ({s.category || "عام"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400">البنود المعيارية المقدرة للتكلفة وربطها المالي</label>

                  <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar p-1">
                    {templateForm.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] text-slate-400 font-bold block">اسم بند التكلفة</label>
                            {costItems && costItems.length > 0 && (
                              <select
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) return;
                                  const selected = costItems.find(c => c.id === val);
                                  if (selected) {
                                    handleTemplateItemChange(idx, "name", selected.name);
                                    if (selected.defaultStandardCost) {
                                      handleTemplateItemChange(idx, "standardCost", selected.defaultStandardCost);
                                    }
                                    if (selected.accountId) {
                                      handleTemplateItemChange(idx, "accountId", selected.accountId);
                                    }
                                  }
                                  e.target.value = "";
                                }}
                                className="text-[9px] bg-slate-100 dark:bg-slate-700 border-none rounded px-1.5 py-0.5 text-indigo-600 dark:text-indigo-400 font-bold focus:ring-0 max-w-[130px] cursor-pointer"
                              >
                                <option value="">-- اختر من السجل --</option>
                                {costItems.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={(e) => handleTemplateItemChange(idx, "name", e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white"
                            placeholder="مثال: أجور تنظيف، ديزل"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">التكلفة المعيارية (YER)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={item.standardCost || ""}
                            onChange={(e) => handleTemplateItemChange(idx, "standardCost", e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-indigo-600"
                            placeholder="المبلغ YER"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-400 font-bold block mb-1">الحساب المالي المرتبط</label>
                            <select
                              value={item.accountId || ""}
                              onChange={(e) => handleTemplateItemChange(idx, "accountId", e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white"
                            >
                              <option value="">-- ربط بحساب مالي --</option>
                              {accounts.filter(a => a.isTransactional).map(a => (
                                <option key={a.id} value={a.id}>
                                  {a.code} - {a.name} ({a.currency})
                                </option>
                              ))}
                            </select>
                          </div>

                          {templateForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTemplateItem(idx)}
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-500 text-slate-400 rounded-lg transition mt-4"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddTemplateItem}
                    className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة بند مالي جديد
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    حفظ التكاليف المعيارية
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
