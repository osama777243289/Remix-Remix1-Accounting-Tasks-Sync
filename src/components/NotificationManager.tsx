import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, 
  Settings, 
  CheckCircle2, 
  MessageSquare, 
  Info, 
  Copy, 
  Send, 
  Save, 
  AlertTriangle, 
  Eye, 
  X, 
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Plus,
  Users,
  CornerDownLeft,
  Calendar,
  Clock,
  Briefcase,
  Gift,
  Coffee,
  Volume2,
  History,
  Search,
  CheckSquare,
  Square
} from "lucide-react";
import { toast } from "sonner";
import { NotificationSetting, ManualNotification } from "../types";

interface NotificationManagerProps {
  settings: NotificationSetting[];
  users: any[]; // UserType[]
  onSaveSetting: (id: string, updates: Partial<NotificationSetting>) => Promise<any>;
  manualNotifications?: ManualNotification[];
  onSendManualNotification?: (notification: Omit<ManualNotification, "id">) => Promise<any>;
  onDeleteManualNotification?: (id: string) => Promise<any>;
  currentUser?: any;
}

// Mock values for the live preview matching variables of each type
const MOCK_VARIABLES_MAP: Record<string, Record<string, string | number>> = {
  journal: {
    type: "قيد يومية",
    code: "JRN-2026-0421",
    amount: "750,000",
    currency: "YER",
    description: "سداد دفعة حجز الصالة الكبرى",
    user: "أحمد صالح (محاسب)",
    date: "2026-06-30",
    notes: "حساب الإيرادات اليومية للصالة الكبرى فرع صنعاء",
    status: "مرحّل ومرحّب به",
    paymentMethod: "نقداً"
  },
  booking: {
    code: "BOK-2026-0035",
    customer: "مجموعة النخبة التجارية",
    price: "1,200,000",
    currency: "YER",
    user: "ريم خالد (موظفة استقبال)",
    date: "2026-07-15",
    notes: "حفل سنوي للموظفين مع وجبة عشاء وضيافة كاملة",
    hallName: "صالة الملكة - القاعة الكبرى",
    status: "مؤكد ومحجوز"
  },
  amendment: {
    code: "REQ-2026-0004",
    bookingCode: "BOK-2026-0012",
    reason: "تغيير تاريخ الفعالية بطلب من الجهة المنظمة لتداخل التوقيت",
    user: "محمد علي (مشرف العمليات)",
    date: "2026-06-30",
    oldDate: "2026-07-15",
    newDate: "2026-07-22",
    status: "قيد الانتظار والمراجعة"
  },
  refund: {
    code: "REF-2026-0002",
    bookingCode: "BOK-2026-0089",
    customer: "صالح المجهلي",
    amount: "300,000",
    currency: "YER",
    user: "أحمد صالح (محاسب)",
    date: "2026-06-30",
    justification: "إلغاء حفل تخرج الطلاب بسبب ظروف طارئة خارجة عن الإرادة",
    status: "موافقة مبدئية من الإدارة"
  },
  voucher: {
    type: "سند قبض",
    code: "VCH-2026-0156",
    amount: "450,000",
    currency: "YER",
    description: "دفعة مقدمة لحفل تخرج جامعة سبأ",
    user: "سامي منصور (أمين صندوق)",
    date: "2026-06-30",
    notes: "سداد نقدي عبر أمين الصندوق الفرعي في الصالة الكبرى",
    status: "معتمد",
    paymentMethod: "تحويل بنكي - الكريمي"
  },
  tasks: {
    title: "مراجعة كشوفات بنك التضامن لشهر مايو",
    priority: "عالية",
    dueDate: "2026-07-02",
    description: "يرجى مطابقة الرصيد الدفتري مع رصيد كشف الحساب الفعلي لمعالجة الفروقات.",
    date: "2026-06-30",
    assignedBy: "أ. علي الخطيب (المدير العام)",
    status: "قيد التنفيذ"
  },
  payroll: {
    monthYear: "يونيو 2026",
    totalAmount: "3,850,000",
    currency: "YER",
    date: "2026-06-30",
    employeeName: "خالد ياسين المرادي",
    allowances: "45,000 YER",
    deductions: "12,000 YER",
    netSalary: "3,883,000 YER"
  }
};

// Friendly variable descriptions for the UI
const VARIABLES_INFO: Record<string, Record<string, string>> = {
  journal: {
    "{type}": "نوع الحركة (قيد يومية، سند قبض، إلخ)",
    "{code}": "كود الحركة المتسلسل",
    "{amount}": "المبلغ الإجمالي للحركة",
    "{currency}": "العملة المستخدمة",
    "{description}": "البيان أو الوصف المالي",
    "{user}": "المستخدم منفذ العملية",
    "{date}": "تاريخ الحركة الفعلي",
    "{notes}": "الملاحظات أو التفاصيل والبيان الإضافي",
    "{status}": "حالة الحركة (معتمد، معلق، مسودة)",
    "{paymentMethod}": "طريقة الدفع المقترنة (نقداً، شيك، تحويل)"
  },
  booking: {
    "{code}": "كود الحجز المتسلسل",
    "{customer}": "اسم العميل صاحب الحجز",
    "{price}": "مبلغ الحجز الإجمالي",
    "{currency}": "عملة الحجز المعتمدة",
    "{user}": "منشئ الحجز ومسجله",
    "{date}": "تاريخ أو تواريخ الفعالية المحجوزة",
    "{dates}": "تواريخ الحجز بالكامل",
    "{notes}": "ملاحظات وشروط الحجز والتفاصيل",
    "{hallName}": "اسم الصالة المحجوزة في العقد",
    "{status}": "حالة الحجز (مؤكد، مبدئي، ملغى)"
  },
  amendment: {
    "{code}": "كود طلب التعديل",
    "{bookingCode}": "كود الحجز الأصلي المراد تعديله",
    "{reason}": "سبب أو تبرير طلب التعديل",
    "{user}": "الموظف مقدم الطلب",
    "{date}": "تاريخ تقديم طلب التعديل",
    "{oldDate}": "تاريخ الفعالية القديم المراد تغييره",
    "{newDate}": "التاريخ الجديد المقترح للفعالية",
    "{status}": "حالة طلب التعديل الحالية"
  },
  refund: {
    "{code}": "كود طلب استرجاع العربون",
    "{bookingCode}": "كود الحجز المراد إلغاؤه وتصفيته",
    "{customer}": "اسم العميل المسترجع لعربونه",
    "{amount}": "المبلغ المطلوب استرجاعه ورده",
    "{currency}": "العملة المعتمدة",
    "{user}": "المحاسب مدخل طلب الرد",
    "{date}": "تاريخ تقديم طلب الاسترجاع والرد",
    "{justification}": "تبرير ومبرر إلغاء الحجز والرد المالي",
    "{status}": "حالة طلب الاسترجاع حالياً"
  },
  voucher: {
    "{type}": "نوع السند (سند قبض / سند صرف)",
    "{code}": "كود السند المالي المتسلسل",
    "{amount}": "قيمة السند المصروف أو المقبوض",
    "{currency}": "عملة السند المالي",
    "{description}": "البيان المكتوب في السند",
    "{user}": "أمين الصندوق مدخل السند",
    "{date}": "تاريخ السند المالي الفعلي",
    "{notes}": "ملاحظات السند وتفاصيل الصرف/القبض",
    "{status}": "حالة السند المالي",
    "{paymentMethod}": "طريقة الدفع (نقداً، شيك، تحويل)"
  },
  tasks: {
    "{title}": "عنوان المهمة المسندة",
    "{priority}": "درجة الأولوية (عالية، متوسطة، منخفضة)",
    "{dueDate}": "تاريخ استحقاق إنجاز المهمة",
    "{description}": "التفاصيل والتعليمات الخاصة بالمهمة",
    "{date}": "تاريخ إسناد وإنشاء المهمة",
    "{assignedBy}": "منشئ ومسند المهمة للموظف",
    "{status}": "حالة المهمة الحالية في النظام"
  },
  payroll: {
    "{monthYear}": "الشهر والعام المستحق عنه الرواتب",
    "{totalAmount}": "إجمالي مبالغ الرواتب المصروفة",
    "{currency}": "العملة المالية المصروف بها",
    "{date}": "تاريخ اعتماد ومسير الصرف",
    "{employeeName}": "اسم الموظف المستهدف بالمسير",
    "{allowances}": "البدلات والإضافات المالية",
    "{deductions}": "الخصومات والاستقطاعات والجزاءات",
    "{netSalary}": "صافي الراتب المستحق للموظف"
  }
};

// Preset manual notification templates
interface ManualPreset {
  title: string;
  body: string;
}

const MANUAL_PRESETS: Record<string, ManualPreset[]> = {
  congratulations: [
    { title: "🎉 تهنئة بمناسبة ترقية موظف", body: "تتقدم إدارة الشركة بأطيب التهاني والتبريكات للزميل/الزميلة بمناسبة الترقية الجديدة، متمنين له/لها دوام التوفيق والنجاح المستمر." },
    { title: "🎂 تهنئة بمناسبة قدوم مولود جديد", body: "ببالغ الفرح والسرور، نبارك للزميل العزيز بمناسبة قدوم مولوده الجديد. جعله الله من مواليد السعادة وقرة عين لوالديه." },
    { title: "🤝 شكر وتقدير لإنجاز متميز", body: "تتوجه الإدارة بخالص الشكر والتقدير لكافة الزملاء على جهودهم الاستثنائية التي أدت لنجاح الموسم المحاسبي الحالي وتحقيق كافة الأهداف." }
  ],
  meeting: [
    { title: "📅 دعوة لحضور اجتماع مالي طارئ", body: "يرجى من جميع موظفي القسم المالي والمحاسبة الاستعداد لحضور الاجتماع الطارئ لمناقشة تسويات حجز الصالات وإغلاق الشهر بتمام الساعة 11:00 صباحاً في قاعة الاجتماعات." },
    { title: "🏢 اجتماع الإدارة الأسبوعي الدوري", body: "نذكركم بانعقاد اجتماع الإدارة الأسبوعي لمناقشة نسب الإشغال والتقارير المالية اليومية غداً بتمام الساعة 10:00 صباحاً." },
    { title: "💻 ورشة عمل تدريبية على النظام", body: "ندعوكم للمشاركة في ورشة العمل التدريبية المخصصة للتعريف بالآلية الجديدة لتعديل الحجوزات ورد العربون، وذلك يوم الخميس القادم بتمام الساعة 2:00 ظهراً." }
  ],
  work_hours: [
    { title: "⏰ إعلان ببدء الدوام الرسمي الفعلي", body: "ننوه لجميع الموظفين الكرام بأن مواعيد الدوام الرسمي تبدأ من الساعة 8:30 صباحاً وحتى الساعة 4:30 مساءً. يرجى الالتزام بتسجيل الحضور عبر الأجهزة المعتمدة." },
    { title: "🌙 مواعيد العمل الخاصة بـ شهر رمضان", body: "بمناسبة حلول شهر رمضان المبارك، نعلن بأن الدوام الرسمي سيكون من الساعة 10:00 صباحاً وحتى الساعة 3:00 ظهراً. كل عام وأنتم بخير." },
    { title: "⛈️ تنبيه بخصوص العمل عن بعد لظروف الطقس", body: "نظراً للحالة الجوية الطارئة، يرجى من جميع موظفي المكاتب مباشرة أعمالهم اليوم عن بعد (من المنزل) حرصاً على سلامة الجميع." }
  ],
  holiday: [
    { title: "🏖️ إعلان إجازة عيد الأضحى المبارك", body: "بمناسبة عيد الأضحى المبارك، نعلن بأن الإجازة الرسمية للشركة تبدأ من صباح يوم عرفة وحتى نهاية رابع أيام العيد، على أن يستأنف الدوام بمشيئة الله كالمعتاد بعد الإجازة." },
    { title: "📆 إعلان إجازة رسمية بمناسبة العيد الوطني", body: "بموجب القرار الإداري، يعتبر يوم غدٍ إجازة رسمية مدفوعة الأجر لكافة العاملين بمناسبة العيد الوطني المجيد." },
    { title: "🧹 إجازة سنوية لأعمال الصيانة الشاملة والصيانة الفنية", body: "نحيطكم علماً بوجود إجازة جزئية لصالات الأفراح والفعاليات لمدة يومين بهدف إجراء الصيانة الدورية السنوية للمرافق." }
  ],
  other: [
    { title: "⚠️ إشعار هام لجميع مستخدمي النظام", body: "سيتوقف النظام مؤقتاً لأعمال التحديث البرمجي الدورية اليوم الساعة 11:00 مساءً ولمدة 30 دقيقة. يرجى حفظ جميع الحركات المالية المعلقة قبل هذا الوقت." },
    { title: "📢 تنويه بخصوص سياسة الصرف الجديدة", body: "تم تحديث سياسات الاعتماد والموافقة على طلبات رد العربون وتعديل الحجوزات. يرجى الاطلاع على الدليل الإرشادي المرفق بلوحة التحكم." }
  ]
};

export default function NotificationManager({ 
  settings, 
  users, 
  onSaveSetting,
  manualNotifications = [],
  onSendManualNotification,
  onDeleteManualNotification,
  currentUser
}: NotificationManagerProps) {
  // Main Tabs: "auto" (Automated Templates), "manual" (Send Manual), "history" (Sent History)
  const [mainTab, setMainTab] = useState<"auto" | "manual" | "history">("manual");

  // State for Automated Templates (Auto Tab)
  const [selectedId, setSelectedId] = useState<string | null>(settings[0]?.id || null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [pwaEnabled, setPwaEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [lastFocusedField, setLastFocusedField] = useState<"title" | "body" | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // State for Manual Notification Dispatch (Manual Tab)
  const [manualType, setManualType] = useState<'congratulations' | 'meeting' | 'work_hours' | 'holiday' | 'other'>('congratulations');
  const [manualTitle, setManualTitle] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [manualTargets, setManualTargets] = useState<string[]>([]);
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  // State for Manual Notification History Search & Filter (History Tab)
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all");

  const activeSetting = settings.find(s => s.id === selectedId);

  // Auto-load template data on choice
  const handleSelectSetting = (id: string) => {
    const setting = settings.find(s => s.id === id);
    if (setting) {
      setSelectedId(id);
      setEditingTitle(setting.customTitle || "");
      setEditingBody(setting.customBody || "");
      setPwaEnabled(setting.pwaEnabled !== false);
      setInAppEnabled(setting.inAppEnabled !== false);
      setTargetUserIds(setting.targetUserIds || []);
      setActiveTab("edit");
    }
  };

  useEffect(() => {
    if (!selectedId && settings.length > 0) {
      handleSelectSetting(settings[0].id);
    }
  }, [settings, selectedId]);

  // Handle template mock substitution
  const getPreviewText = (template: string, settingId: string) => {
    if (!template) return "";
    let text = template;
    const mockVals = MOCK_VARIABLES_MAP[settingId] || {};
    Object.entries(mockVals).forEach(([key, value]) => {
      text = text.replace(new RegExp(`{${key}}`, "g"), String(value));
    });
    return text;
  };

  // Insert variable into templates editor
  const handleInsertVariable = (variable: string) => {
    if (lastFocusedField === "title" && titleInputRef.current) {
      const input = titleInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const text = editingTitle;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + variable + after;
      setEditingTitle(newText);
      
      setTimeout(() => {
        input.focus();
        const cursorPosition = start + variable.length;
        input.setSelectionRange(cursorPosition, cursorPosition);
      }, 50);
      
      toast.success(`تم إنزال ${variable} في حقل العنوان`);
    } else if (lastFocusedField === "body" && bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const text = editingBody;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + variable + after;
      setEditingBody(newText);

      setTimeout(() => {
        textarea.focus();
        const cursorPosition = start + variable.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }, 50);

      toast.success(`تم إنزال ${variable} في حقل نص الرسالة`);
    } else {
      setEditingBody(prev => prev ? prev + " " + variable : variable);
      toast.success(`تم إضافة ${variable} لنهاية نص الرسالة`);
    }
  };

  const handleCopyVar = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    toast.success(`تم نسخ المتغير ${variable}`);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  // Browser push authorization
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error("متصفحك الحالي لا يدعم إشعارات المتصفح.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success("تم تفعيل صلاحية إشعارات المتصفح بنجاح!");
      } else {
        toast.warning("تم رفض إعطاء الصلاحية. يرجى تفعيلها يدوياً من إعدادات المتصفح.");
      }
    } catch (e) {
      toast.error("حدث خطأ أثناء طلب الصلاحيات.");
    }
  };

  // Multi-user target toggles
  const handleToggleUser = (userId: string) => {
    setTargetUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAllUsers = () => {
    setTargetUserIds(users.map(u => u.id));
  };

  const handleClearUsers = () => {
    setTargetUserIds([]);
  };

  // Save template configuration
  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await onSaveSetting(selectedId, {
        customTitle: editingTitle,
        customBody: editingBody,
        pwaEnabled,
        inAppEnabled,
        targetUserIds,
        updatedAt: new Date().toISOString()
      });
      toast.success("تم حفظ قالب الإشعارات والمستقبلين المحددين بنجاح!");
    } catch (e: any) {
      toast.error(`فشل حفظ الإعدادات: ${e.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger test template dispatch locally
  const handleSendTest = () => {
    if (!selectedId) return;

    const formattedTitle = getPreviewText(editingTitle, selectedId);
    const formattedBody = getPreviewText(editingBody, selectedId);

    if (inAppEnabled) {
      toast.info(formattedTitle, { 
        description: formattedBody,
        duration: 5000,
        icon: <Bell className="w-5 h-5 text-indigo-600 animate-bounce" />
      });
    }

    if (pwaEnabled) {
      if (!('Notification' in window)) return;
      
      if (Notification.permission === 'granted') {
        try {
          new Notification(formattedTitle, { body: formattedBody, icon: '/icon-192.png' });
        } catch (err) {
          console.warn("Direct notification fail, trying sw", err);
        }
      } else {
        toast.info("يرجى تفعيل صلاحية إشعارات المتصفح أولاً لإرسال إشعار فوري لسطح المكتب.");
      }
    }
  };

  // Send Manual Custom Notification
  const handleSendManual = async () => {
    if (!manualTitle.trim()) {
      toast.error("يرجى إدخال عنوان التنبيه اليدوي أولاً");
      return;
    }
    if (!manualBody.trim()) {
      toast.error("يرجى كتابة محتوى وتفاصيل التنبيه");
      return;
    }
    if (!onSendManualNotification) {
      toast.error("خدمة إرسال التنبيهات اليدوية غير متوفرة حالياً");
      return;
    }

    let scheduledAt: string | undefined = undefined;
    let status: 'scheduled' | 'sent' = 'sent';

    if (isScheduled) {
      if (!scheduledDateTime) {
        toast.error("يرجى تحديد تاريخ ووقت الجدولة أولاً");
        return;
      }
      const scheduleTime = new Date(scheduledDateTime).getTime();
      if (scheduleTime <= Date.now()) {
        toast.error("يرجى اختيار تاريخ ووقت مستقبلي للجدولة");
        return;
      }
      scheduledAt = new Date(scheduledDateTime).toISOString();
      status = 'scheduled';
    }

    setIsSendingManual(true);
    try {
      const senderName = currentUser?.username || currentUser?.name || "مشرف النظام";
      const senderId = currentUser?.id || "admin";

      await onSendManualNotification({
        title: manualTitle.trim(),
        body: manualBody.trim(),
        type: manualType,
        senderId,
        senderName,
        targetUserIds: manualTargets,
        createdAt: new Date().toISOString(),
        scheduledAt,
        status
      });

      if (isScheduled) {
        toast.success("تمت جدولة التنبيه اليدوي بنجاح وسيظهر في قائمة المهام المجدولة!");
      } else {
        toast.success("تم إرسال وحفظ التنبيه اليدوي المخصص بنجاح!");
      }
      
      // Clear inputs
      setManualTitle("");
      setManualBody("");
      setManualTargets([]);
      setIsScheduled(false);
      setScheduledDateTime("");
      
      // Switch tab to history log to see the newly sent/scheduled notification
      setMainTab("history");
    } catch (e: any) {
      toast.error(`فشل إرسال التنبيه اليدوي: ${e.message || e}`);
    } finally {
      setIsSendingManual(false);
    }
  };

  const handleApplyPreset = (preset: ManualPreset) => {
    setManualTitle(preset.title);
    setManualBody(preset.body);
    toast.success("تم تطبيق النموذج الجاهز بنجاح!");
  };

  const handleToggleManualTarget = (userId: string) => {
    setManualTargets(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAllManualTargets = () => {
    setManualTargets(users.map(u => u.id));
  };

  const handleClearManualTargets = () => {
    setManualTargets([]);
  };

  // Helper translations and badge styles
  const getManualTypeBadge = (type: string) => {
    switch (type) {
      case "congratulations":
        return {
          label: "تهنئة ومناسبة",
          styles: "bg-pink-100 text-pink-700 border-pink-200",
          icon: <Gift className="w-3.5 h-3.5" />
        };
      case "meeting":
        return {
          label: "دعوة لاجتماع",
          styles: "bg-blue-100 text-blue-700 border-blue-200",
          icon: <Users className="w-3.5 h-3.5" />
        };
      case "work_hours":
        return {
          label: "أوقات الدوام",
          styles: "bg-teal-100 text-teal-700 border-teal-200",
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case "holiday":
        return {
          label: "إعلان إجازة",
          styles: "bg-amber-100 text-amber-700 border-amber-200",
          icon: <Calendar className="w-3.5 h-3.5" />
        };
      default:
        return {
          label: "عام / أخرى",
          styles: "bg-slate-100 text-slate-700 border-slate-200",
          icon: <Volume2 className="w-3.5 h-3.5" />
        };
    }
  };

  // Filter history log items
  const filteredHistory = manualNotifications.filter((n) => {
    const matchesSearch = 
      n.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      n.body.toLowerCase().includes(historySearch.toLowerCase()) ||
      n.senderName.toLowerCase().includes(historySearch.toLowerCase());
    
    const matchesType = historyTypeFilter === "all" || n.type === historyTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div id="notification-manager-container" className="space-y-6 text-right" dir="rtl">
      {/* Page Header */}
      <div className="bg-gradient-to-l from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg animate-pulse">
                <Bell className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">إدارة التنبيهات والرسائل اليدوية والآلية</h1>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              تتيح لك هذه الواجهة إرسال رسائل وتنبيهات يدوية فورية لكافة الموظفين أو لأشخاص محددين، بالإضافة إلى تهيئة وتخصيص قوالب الإشعارات المحاسبية التلقائية وتتبع سجل الإرسال.
            </p>
          </div>
          <button
            onClick={requestNotificationPermission}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center justify-center gap-2 self-start md:self-center"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            تفعيل إشعارات المتصفح الفورية (Push)
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 p-1 bg-slate-100 rounded-xl max-w-2xl">
        <button
          onClick={() => setMainTab("manual")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mainTab === "manual"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Send className="w-4 h-4" />
          إرسال تنبيه يدوي مخصص
        </button>
        <button
          onClick={() => setMainTab("history")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mainTab === "history"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <History className="w-4 h-4" />
          سجل التنبيهات اليدوية ({manualNotifications.length})
        </button>
        <button
          onClick={() => setMainTab("auto")}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            mainTab === "auto"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Settings className="w-4 h-4" />
          قوالب التنبيهات الآلية
        </button>
      </div>

      {/* TABS WORKSPACES */}
      <AnimatePresence mode="wait">
        {/* TAB 1: SEND MANUAL NOTIFICATION */}
        {mainTab === "manual" && (
          <motion.div
            key="manual-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Form Section */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  إرسال وإعلان تنبيه يدوي جديد
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  أدخل البيانات أدناه لإرسال رسالة فورية إلى المتصفحات وصناديق تنبيهات المستخدمين المحددين بالأسفل.
                </p>
              </div>

              {/* 1. Category Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">1. اختر نوع وموضوع الإعلان المحفّز:</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(['congratulations', 'meeting', 'work_hours', 'holiday', 'other'] as const).map((type) => {
                    const info = getManualTypeBadge(type);
                    const isSelected = manualType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setManualType(type);
                          // Clear title/body or apply first preset of this category
                          if (MANUAL_PRESETS[type]?.[0]) {
                            setManualTitle(MANUAL_PRESETS[type][0].title);
                            setManualBody(MANUAL_PRESETS[type][0].body);
                          }
                        }}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md font-bold"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className={`p-1.5 rounded-lg ${isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 shadow-sm border border-slate-100"}`}>
                          {info.icon}
                        </span>
                        <span className="text-xs">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Presets Quick Load */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 space-y-2">
                <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  النماذج والقوالب الجاهزة السريعة لهذه الفئة:
                </span>
                <div className="flex flex-wrap gap-2">
                  {MANUAL_PRESETS[manualType]?.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-[10px] bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-sm font-semibold flex items-center gap-1"
                    >
                      <CornerDownLeft className="w-3 h-3 text-indigo-500" />
                      {preset.title.replace(/🎉 |📅 |⏰ |🏖️ |⚠️ /, "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Body Inputs */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">عنوان التنبيه:</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="مثال: 🎉 تهنئة بمناسبة ترقية الزملاء..."
                    className="w-full p-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">نص وتفاصيل التنبيه الكامل:</label>
                  <textarea
                    rows={4}
                    value={manualBody}
                    onChange={(e) => setManualBody(e.target.value)}
                    placeholder="اكتب هنا تفاصيل الخبر، الدعوة، أو التهنئة بمثالية ووضوح..."
                    className="w-full p-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm leading-relaxed"
                  />
                </div>
              </div>

              {/* Scheduling Options */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="is-scheduled-checkbox"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800 block">📅 جدولة هذا التنبيه لوقت لاحق</span>
                      <span className="text-[10px] text-slate-500 block">سيتم إرسال التنبيه تلقائياً في التاريخ والوقت المحدد</span>
                    </div>
                  </label>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isScheduled ? 'bg-indigo-100 text-indigo-800 animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
                    {isScheduled ? 'مجدول' : 'فوري'}
                  </span>
                </div>

                {isScheduled && (
                  <div className="pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-700 block">اختر تاريخ ووقت الإرسال:</span>
                        <div className="relative">
                          <input
                            type="datetime-local"
                            id="scheduled-date-time-input"
                            value={scheduledDateTime}
                            onChange={(e) => setScheduledDateTime(e.target.value)}
                            className="w-full p-2.5 bg-white rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </div>
                      <div className="bg-white/60 border border-indigo-100 rounded-lg p-2.5 flex items-start gap-2 self-end text-[10px] leading-normal text-slate-600">
                        <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <span>ملاحظة: سيظهر هذا التنبيه في قائمة المهام المجدولة والمسودة للمدير قبل حلول الموعد، ويمكن إلغاؤه في أي وقت.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-end border-t border-slate-100 pt-5">
                <button
                  type="button"
                  id="send-manual-notification-button"
                  onClick={handleSendManual}
                  disabled={isSendingManual}
                  className={`px-6 py-3 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${isScheduled ? 'bg-emerald-600 hover:bg-emerald-50' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                >
                  {isSendingManual ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isScheduled ? (
                    <Calendar className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isScheduled ? 'جدولة التنبيه المستقبلي' : 'إرسال التنبيه الآن'}</span>
                </button>
              </div>
            </div>

            {/* Target Selection Section */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  تحديد الموظفين المستهدفين:
                </span>
                <div className="flex items-center gap-2 text-[9px]">
                  <button 
                    onClick={handleSelectAllManualTargets}
                    className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition-all font-bold"
                  >
                    تحديد الكل
                  </button>
                  <button 
                    onClick={handleClearManualTargets}
                    className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-red-600 hover:bg-red-50 transition-all font-bold"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                حدد الأشخاص الواجب إرسال الإشعار إليهم. في حال <span className="font-bold text-slate-700">لم تقم باختيار أحد</span>، فسيتم اعتبار التنبيه <span className="font-bold text-indigo-600">إعلان عام لجميع الموظفين</span>.
              </p>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {users.map((user) => {
                  const isChecked = manualTargets.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleToggleManualTarget(user.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer select-none flex items-center justify-between transition-all ${
                        isChecked
                          ? "bg-indigo-600/10 border-indigo-400 text-indigo-950 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/50"
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="text-xs truncate leading-tight">{user.name || user.username}</span>
                        <span className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{user.email}</span>
                      </div>
                      {isChecked ? (
                        <span className="p-0.5 bg-indigo-600 text-white rounded-full">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded border border-slate-300 bg-white" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Targets Summary Status */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/80 space-y-1 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>إجمالي الموظفين:</span>
                  <span className="font-bold text-slate-700">{users.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>الحالة المستهدفة:</span>
                  {manualTargets.length === 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      📢 الجميع (إعلان عام)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                      🔒 مخصص لـ ({manualTargets.length}) زملاء فقط
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SENT MANUAL NOTIFICATIONS LOG */}
        {mainTab === "history" && (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Filter and Search header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="البحث في سجل الإرسال بالعنوان، نص الرسالة، أو اسم المرسل..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">تصنيف التنبيه:</span>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">الكل</option>
                  <option value="congratulations">تهنئة ومناسبة</option>
                  <option value="meeting">دعوة لاجتماع</option>
                  <option value="work_hours">أوقات الدوام</option>
                  <option value="holiday">إعلان إجازة</option>
                  <option value="other">عام / أخرى</option>
                </select>
              </div>
            </div>

            {/* List entries */}
            {filteredHistory.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-bold text-sm text-slate-700">لا توجد تنبيهات يدوية مسجلة</h3>
                <p className="text-xs text-slate-400 mt-1">تطابق بحثك الحالي أو لم يتم إرسال أي تنبيهات مخصصة مسبقاً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.map((item) => {
                  const info = getManualTypeBadge(item.type);
                  const isSentToAll = !item.targetUserIds || item.targetUserIds.length === 0;
                  
                  return (
                    <motion.div
                      layout
                      key={item.id}
                      className={`rounded-2xl border p-5 space-y-4 hover:shadow-md transition-all flex flex-col justify-between ${
                        item.status === 'scheduled'
                          ? "bg-amber-50/30 border-amber-200/80 hover:border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                          : "bg-white border-slate-200/80 hover:border-indigo-300 shadow-sm"
                      }`}
                    >
                      {/* Top bar with category and sender */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${info.styles}`}>
                            {info.icon}
                            <span>{info.label}</span>
                          </div>
                          {item.status === 'scheduled' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                              مستقبلي / معلّق
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                              ✓ تم البث
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {item.status === 'scheduled' && item.scheduledAt ? (
                            <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                              مجدول: {new Date(item.scheduledAt).toLocaleString('ar-YE', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>
                          ) : (
                            <span>
                              {new Date(item.createdAt).toLocaleString('ar-YE', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title and Content */}
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">{item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.body}</p>
                      </div>

                      {/* Footer with metadata */}
                      <div className="pt-3 border-t border-slate-50 flex flex-col gap-2 mt-auto">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">بواسطة المرسل:</span>
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {item.senderName}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 border-b border-slate-50 pb-2">
                          <span className="text-[9px] text-slate-400">المستهدفون بالرسالة:</span>
                          {isSentToAll ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md self-start font-semibold">
                              📢 الجميع (استهداف عام لجميع الموظفين)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {item.targetUserIds.map((targetId) => {
                                const targetUser = users.find(u => u.id === targetId);
                                return (
                                  <span key={targetId} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                    {targetUser ? (targetUser.name || targetUser.username) : targetId}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Cancel / Delete action for scheduled items */}
                        {item.status === 'scheduled' && onDeleteManualNotification && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm("هل أنت متأكد من رغبتك في إلغاء جدولة وحذف هذا التنبيه؟")) {
                                try {
                                  await onDeleteManualNotification(item.id);
                                  toast.success("تم إلغاء الجدولة وحذف التنبيه بنجاح.");
                                } catch (err: any) {
                                  toast.error(`فشل إلغاء التنبيه: ${err.message || err}`);
                                }
                              }
                            }}
                            className="w-full mt-1 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-rose-100"
                          >
                            <X className="w-3.5 h-3.5" />
                            إلغاء الجدولة وحذف التنبيه
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: AUTOMATED NOTIFICATION TEMPLATES */}
        {mainTab === "auto" && (
          <motion.div
            key="auto-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Navigation Sidebar List */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 px-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-400" />
                اختر الحركة لتهيئة إشعاراتها
              </h2>
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {settings.map((setting) => {
                  const isSelected = setting.id === selectedId;
                  const hasBothActive = setting.pwaEnabled && setting.inAppEnabled;
                  const hasPartialActive = setting.pwaEnabled || setting.inAppEnabled;
                  const isRestricted = setting.targetUserIds && setting.targetUserIds.length > 0;

                  return (
                    <button
                      key={setting.id}
                      onClick={() => handleSelectSetting(setting.id)}
                      className={`w-full text-right p-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                        isSelected 
                          ? "bg-slate-900 text-white shadow-sm" 
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm leading-none">{setting.title}</span>
                        <span className={`text-[10px] flex items-center gap-1.5 ${isSelected ? "text-slate-400" : "text-slate-400 group-hover:text-slate-500"}`}>
                          <span>كود الحركة: {setting.id}</span>
                          {isRestricted && (
                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-medium">
                              مخصص لـ {setting.targetUserIds?.length} مستخدمين
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {hasBothActive ? (
                          <span className={`h-2.5 w-2.5 rounded-full bg-emerald-500 ${isSelected ? "ring-2 ring-slate-800" : ""}`} />
                        ) : hasPartialActive ? (
                          <span className={`h-2.5 w-2.5 rounded-full bg-amber-500 ${isSelected ? "ring-2 ring-slate-800" : ""}`} />
                        ) : (
                          <span className={`h-2.5 w-2.5 rounded-full bg-slate-300 ${isSelected ? "ring-2 ring-slate-800" : ""}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">
                  يتم حفظ التغييرات لكل حركة على حدة. تأكد من الضغط على زر حفظ التغييرات بعد تعديل كل حركة محاسبية.
                </p>
              </div>
            </div>

            {/* Templates Editor & Control Workspace */}
            <div className="lg:col-span-8 space-y-6">
              {activeSetting ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Card Header */}
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        تهيئة وتخصيص إشعارات: <span className="text-indigo-600">{activeSetting.title}</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">تعديل قالب الإشعار والتحكم بقنوات التسليم الفعالة والمستقبلين.</p>
                    </div>
                    
                    <button
                      onClick={handleSendTest}
                      className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      إرسال إشعار تجريبي (مباشر)
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* 1. Toggle Channels */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                        قنوات تسليم الإشعارات الفعالة:
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border transition-all flex items-start gap-3 justify-between ${
                          pwaEnabled 
                            ? "bg-indigo-50/50 border-indigo-200 shadow-sm" 
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}>
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              إشعارات المتصفح الفورية (PWA Push)
                            </span>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              إرسال رسائل فورية تظهر على سطح مكتب النظام أو هاتف المستخدم حتى لو كان مغلقاً.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={pwaEnabled} 
                              onChange={(e) => setPwaEnabled(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        <div className={`p-4 rounded-xl border transition-all flex items-start gap-3 justify-between ${
                          inAppEnabled 
                            ? "bg-indigo-50/50 border-indigo-200 shadow-sm" 
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}>
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              الإشعارات والتنبيهات داخل التطبيق (In-App)
                            </span>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              تخزين الرسائل بمركز الإشعارات الجانبي وظهور تنبيهات toast مؤقتة أعلى الشاشة.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={inAppEnabled} 
                              onChange={(e) => setInAppEnabled(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 2. Target Users Selection */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-800">تحديد المستخدمين المستهدفين بتلقي هذا الإشعار:</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <button 
                            onClick={handleSelectAllUsers}
                            className="px-2 py-1 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-100 transition-all font-semibold"
                          >
                            تحديد الكل
                          </button>
                          <button 
                            onClick={handleClearUsers}
                            className="px-2 py-1 bg-white border border-slate-300 text-red-600 rounded hover:bg-red-50 transition-all font-semibold"
                          >
                            إلغاء التحديد (الجميع)
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        اختر المستخدمين الذين سيصلهم الإشعار عند حدوث هذه العملية. في حال <span className="font-bold text-slate-700">لم تقم باختيار أي مستخدم</span>، فستصل الإشعارات <span className="font-bold text-indigo-600">لجميع مستخدمي النظام</span> بشكل تلقائي وموسع.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-[150px] overflow-y-auto">
                        {users.map((user) => {
                          const isChecked = targetUserIds.includes(user.id);
                          return (
                            <div 
                              key={user.id}
                              onClick={() => handleToggleUser(user.id)}
                              className={`p-2 rounded-lg border cursor-pointer select-none flex items-center justify-between transition-all ${
                                isChecked 
                                  ? "bg-indigo-600/10 border-indigo-500 text-indigo-950 font-semibold" 
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/50"
                              }`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="text-[11px] truncate leading-tight">{user.name || user.username}</span>
                                <span className="text-[9px] text-slate-400 truncate leading-none">{user.email}</span>
                              </div>
                              {isChecked ? (
                                <span className="p-0.5 bg-indigo-600 text-white rounded-full">
                                  <Check className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400">حالة الاستهداف الحالية:</span>
                        {targetUserIds.length === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 text-[9px] font-bold">
                            📢 الجميع (استهداف عام)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-600/15 text-indigo-700 text-[9px] font-bold">
                            🔒 مخصص لـ ({targetUserIds.length}) مستخدمين فقط
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tab selector for templates editing and live previews */}
                    <div className="border-b border-slate-200 flex gap-4">
                      <button
                        onClick={() => setActiveTab("edit")}
                        className={`pb-2.5 font-bold text-sm border-b-2 transition-all ${
                          activeTab === "edit"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        محرر وقوالب الرسالة المتغيرة
                      </button>
                      <button
                        onClick={() => setActiveTab("preview")}
                        className={`pb-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
                          activeTab === "preview"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        المعاينة الحية الفورية
                      </button>
                    </div>

                    {activeTab === "edit" ? (
                      <div className="space-y-5">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <span>دليل المتغيرات المدعومة للحركة (انقر على المتغير لإنزاله في الحقل المختار):</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                            انقر على أي من أزرار الإنزال السريعة <span className="font-bold text-indigo-600">لإنزال المتغير</span> مباشرة في العنوان أو نص الإشعار، أو اضغط لنسخه:
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {Object.entries(VARIABLES_INFO[activeSetting.id] || {}).map(([token, desc]) => (
                              <div 
                                key={token} 
                                className="bg-white p-2 rounded-lg border border-slate-200 transition-all hover:border-indigo-300 flex items-center justify-between group"
                              >
                                <div className="flex flex-col min-w-0 pr-1">
                                  <code className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50 self-start">
                                    {token}
                                  </code>
                                  <span className="text-[10px] text-slate-600 mt-1 truncate">{desc}</span>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setLastFocusedField("title");
                                      handleInsertVariable(token);
                                    }}
                                    className="px-1.5 py-1 text-[9px] bg-slate-100 text-slate-700 rounded hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-0.5"
                                    title="إنزال في العنوان"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    <span>العنوان</span>
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      setLastFocusedField("body");
                                      handleInsertVariable(token);
                                    }}
                                    className="px-1.5 py-1 text-[9px] bg-slate-100 text-slate-700 rounded hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-0.5"
                                    title="إنزال في النص"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    <span>النص</span>
                                  </button>

                                  <button
                                    onClick={() => handleCopyVar(token)}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"
                                    title="نسخ المتغير"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Inputs */}
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <span>عنوان الرسالة (Title Template)</span>
                                {lastFocusedField === "title" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" title="الحقل النشط حالياً للإنزال" />
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">اضغط هنا ثم انقر على المتغير بالدليل لإنزاله مباشرة</span>
                            </label>
                            <input
                              type="text"
                              ref={titleInputRef}
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onFocus={() => setLastFocusedField("title")}
                              className="w-full p-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold"
                              placeholder="مثال: 🧾 حركة مالية جديدة - {type} [{code}]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <span>نص الرسالة والوصف التفصيلي (Body Template)</span>
                                {lastFocusedField === "body" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" title="الحقل النشط حالياً للإنزال" />
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">اضغط هنا ثم انقر على المتغير بالدليل لإنزاله مباشرة</span>
                            </label>
                            <textarea
                              rows={4}
                              ref={bodyTextareaRef}
                              value={editingBody}
                              onChange={(e) => setEditingBody(e.target.value)}
                              onFocus={() => setLastFocusedField("body")}
                              className="w-full p-3 rounded-xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm leading-relaxed"
                              placeholder="مثال: المبلغ: {amount} {currency} | البيان: {description} | المستخدم: {user}"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Live Preview Tab */
                      <div className="space-y-5 animate-fade-in">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-800 mb-2 block">
                            محاكاة شكل الإشعار عند صدوره (بالقيم الافتراضية والجديدة):
                          </span>
                          <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                            الرسومات أدناه توضح كيف سيشاهد مستلمو الإشعار الرسالة بشكل فعلي بناء على تعديلاتك وقالب الإدخال.
                          </p>

                          <div className="space-y-4">
                            {pwaEnabled ? (
                              <div className="bg-slate-900 text-white rounded-xl p-4 shadow-xl border border-slate-700 font-sans max-w-md mx-auto">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <Bell className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider">نظام الحجوزات والمحاسبة</span>
                                  </div>
                                  <span className="text-[9px] text-slate-400">الآن</span>
                                </div>
                                <div className="space-y-1 text-right">
                                  <h4 className="text-xs font-bold text-indigo-300">
                                    {getPreviewText(editingTitle, activeSetting.id) || "لا يوجد عنوان محدد"}
                                  </h4>
                                  <p className="text-[11px] text-slate-300 leading-relaxed">
                                    {getPreviewText(editingBody, activeSetting.id) || "لا يوجد نص محدد"}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-slate-200/50 rounded-xl border border-slate-300 text-center text-xs text-slate-500 max-w-md mx-auto">
                                إشعار المتصفح Push غير مفعل لهذه الحركة حالياً.
                              </div>
                            )}

                            {inAppEnabled ? (
                              <div className="bg-white text-slate-900 rounded-xl p-3.5 shadow-md border border-slate-200 flex items-start gap-3 max-w-md mx-auto">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                  <Bell className="w-4 h-4 animate-bounce" />
                                </div>
                                <div className="space-y-0.5 text-right min-w-0 flex-1">
                                  <h5 className="text-xs font-bold text-slate-900 truncate">
                                    {getPreviewText(editingTitle, activeSetting.id) || "عنوان الإشعار"}
                                  </h5>
                                  <p className="text-[10px] text-slate-500 leading-relaxed truncate">
                                    {getPreviewText(editingBody, activeSetting.id) || "تفاصيل وبيانات الحركة..."}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-slate-200/50 rounded-xl border border-slate-300 text-center text-xs text-slate-500 max-w-md mx-auto">
                                الإشعارات داخل التطبيق (In-App) غير مفعّلة لهذه الحركة حالياً.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Save Footer Action */}
                    <div className="flex items-center justify-end border-t border-slate-100 pt-5 gap-3">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        {isSaving ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>حفظ قالب وإعدادات الحركة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
                  <p className="text-sm font-semibold">يرجى اختيار حركة من القائمة الجانبية لبدء ضبط وتعديل إشعاراتها.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
