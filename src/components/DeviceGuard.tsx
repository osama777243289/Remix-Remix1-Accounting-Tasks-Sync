import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  ShieldAlert,
  Laptop,
  Smartphone,
  Tablet,
  Key,
  Check,
  X,
  Lock,
  Unlock,
  Settings,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  ShieldCheck,
  MoreVertical,
  Sliders,
  Radio,
  Wifi,
  WifiOff,
  LogOut
} from "lucide-react";
import { AuthorizedDevice } from "../types";
import { subscribeDevices, addDevice, updateDevice, deleteDevice, isUsingLocalFallback, forceCloudConnection, subscribeAppUsers } from "../lib/dbService";

// Generates offscreen rendering text to detect exact GPU and OS rendering characteristics (Canvas Fingerprint)
const generateCanvasFingerprint = (): string => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "CFP-GENERIC";
    ctx.textBaseline = "top";
    ctx.font = "12px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(80, 5, 45, 12);
    ctx.fillStyle = "#069";
    ctx.fillText("SafeCloudFinance,🔒2026!", 2, 8);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("SafeCloudFinance,🔒2026!", 4, 10);
    
    // Simple fast DJB2-like string hashing of dataUrl
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return "CFP-" + Math.abs(hash).toString(16).toUpperCase();
  } catch (e) {
    return "CFP-UNSUPPORTED";
  }
};

// Returns a rich set of physical hardware and browser specs
const getDeviceDetails = () => {
  const ua = navigator.userAgent;
  let deviceType = "desktop";
  let deviceName = "حاسوب مكتبي / محمول";

  if (/Mobi|Android|iPhone|iPad|Phone/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua)) {
      deviceType = "tablet";
      deviceName = "جهاز لوحي (Tablet)";
    } else {
      deviceType = "mobile";
      deviceName = "هاتف محمول (Mobile)";
    }
  }

  // Extract browser and OS
  let os = "نظام غير معروف";
  if (ua.indexOf("Win") !== -1) os = "Windows OS";
  if (ua.indexOf("Mac") !== -1) os = "macOS";
  if (ua.indexOf("Linux") !== -1) os = "Linux";
  if (ua.indexOf("Android") !== -1) os = "Android";
  if (ua.indexOf("like Mac") !== -1) os = "iOS";

  let browser = "متصفح ويب";
  if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (ua.indexOf("Safari") !== -1) browser = "Safari";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Edge") !== -1) browser = "Edge";

  const width = window.screen?.width || 0;
  const height = window.screen?.height || 0;
  const colorDepth = window.screen?.colorDepth || 0;
  const pixelRatio = window.devicePixelRatio || 1;
  const logicalCores = navigator.hardwareConcurrency || "غير معروف";
  const language = navigator.language || "ar-EG";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const canvasHash = generateCanvasFingerprint();

  return {
    deviceType,
    deviceName: `${deviceName} - ${os} (${browser})`,
    userAgent: ua,
    os,
    browser,
    canvasHash,
    hardwareSpecs: `أنوية المعالج: ${logicalCores} • عمق الألوان: ${colorDepth}-bit • معدل بكسل الشاشة: ${pixelRatio}x • عرض الشاشة: ${width}x${height} • المنطقة الزمنية: ${timezone} • اللغة: ${language}`,
    screenResolution: `${width}X${height}`
  };
};

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage.getItem failed for key:", key, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage.setItem failed for key:", key, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage.removeItem failed for key:", key, e);
    }
  }
};

// Generates a browser fingerprint uuid embedded with device hardware properties
const getOrCreateDeviceUuid = (): string => {
  let uuid = safeLocalStorage.getItem("accounting_device_uuid");

  const ua = navigator.userAgent;
  let osAbbr = "OTH"; // Other/unknown
  if (ua.indexOf("Win") !== -1) osAbbr = "WIN";
  else if (ua.indexOf("Mac") !== -1) osAbbr = "MAC";
  else if (ua.indexOf("Linux") !== -1) osAbbr = "LIN";
  else if (ua.indexOf("Android") !== -1) osAbbr = "AND";
  else if (ua.indexOf("like Mac") !== -1) osAbbr = "IOS";

  let browserAbbr = "WEB"; // generic browser
  if (ua.indexOf("Chrome") !== -1) browserAbbr = "CHR";
  else if (ua.indexOf("Safari") !== -1) browserAbbr = "SAF";
  else if (ua.indexOf("Firefox") !== -1) browserAbbr = "FOX";
  else if (ua.indexOf("Edge") !== -1) browserAbbr = "EDG";

  // Get screen resolution to make the signature represent hardware characteristics
  const width = window.screen?.width || 0;
  const height = window.screen?.height || 0;
  const resStr = width && height ? `${width}X${height}` : "000";

  // Canvas render fingerprint signature
  const rawCanvas = generateCanvasFingerprint();
  const canvasSuffix = rawCanvas.replace("CFP-", "");

  // Generate a brief random sign-off tag to prevent duplicates for matching models
  const randStr = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const tag = randStr();

  // The code incorporates: DEV-[OS]-[BROWSER]-[WIDTH]X[HEIGHT]-[CANVAS_HASH_SUFFIX]-[TAG]
  // Example result: DEV-WIN-CHR-1920X1080-BC89-F4G2
  const newFormat = `DEV-${osAbbr}-${browserAbbr}-${resStr}-${canvasSuffix}-${tag}`;

  if (!uuid) {
    uuid = newFormat;
    safeLocalStorage.setItem("accounting_device_uuid", uuid);
  } else {
    // If it is an old UUID format (has less than 6 segments), upgrade it so the user's signature reflects hardware details
    const parts = uuid.split("-");
    if (parts.length < 6) {
      uuid = newFormat;
      safeLocalStorage.setItem("accounting_device_uuid", uuid);
    }
  }
  return uuid;
};

// MASTER ACCESS PASSCODE FOR INSTANT AUTHORIZATION/RESET
const MASTER_PASSCODE = "secure-2026";

interface DeviceGuardProps {
  children: React.ReactNode;
}

export default function DeviceGuard({ children }: DeviceGuardProps) {
  const [devices, setDevices] = useState<AuthorizedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDevice, setCurrentDevice] = useState<AuthorizedDevice | null>(null);
  
  // Security checks feedback simulation
  const [securityStage, setSecurityStage] = useState("بدء تشغيل النواة الأمنية...");
  const [securityProgress, setSecurityProgress] = useState(15);
  
  // Spoofing / Tampering detection state
  const [isTampered, setIsTampered] = useState(false);
  const [tamperDetails, setTamperDetails] = useState("");
  
  // Lock Screen States
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [showOwnerPasscodeBox, setShowOwnerPasscodeBox] = useState(false);
  const [_shieldClicks, setShieldClicks] = useState(0);
  const shieldClickTimeoutRef = useRef<any>(null);

  const handleShieldClick = () => {
    if (shieldClickTimeoutRef.current) {
      clearTimeout(shieldClickTimeoutRef.current);
    }
    shieldClickTimeoutRef.current = setTimeout(() => {
      setShieldClicks(0);
    }, 2500);

    setShieldClicks((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setShowOwnerPasscodeBox((show) => !show);
        return 0;
      }
      return next;
    });
  };

  const [customDeviceName, setCustomDeviceName] = useState("");
  const [licenseRequestSent, setLicenseRequestSent] = useState(false);
  const [securityPolicy, setSecurityPolicy] = useState("extreme"); // standard, high, extreme
  const [copied, setCopied] = useState(false);
  
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isPreviouslyAuthorized, setIsPreviouslyAuthorized] = useState(() => {
    try {
      return localStorage.getItem("accounting_device_authorized_at_least_once") === "true";
    } catch {
      return false;
    }
  });

  const [currentUserId, setCurrentUserId] = useState(() => typeof window !== 'undefined' ? localStorage.getItem("current_user_id") : null);

  useEffect(() => {
    const checkUser = setInterval(() => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem("current_user_id") : null;
      if (stored !== currentUserId) {
        setCurrentUserId(stored);
      }
    }, 1000);
    return () => clearInterval(checkUser);
  }, [currentUserId]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);
  
  // Sizing and flexible typography customization states
  const [cardDensity, setCardDensity] = useState<'compact' | 'standard' | 'spacious'>(() => {
    try {
      return (localStorage.getItem("guard_density") as 'compact' | 'standard' | 'spacious') || 'standard';
    } catch (_) {
      return 'standard';
    }
  });
  
  const [fontSizeScale, setFontSizeScale] = useState<'small' | 'medium' | 'large'>(() => {
    try {
      return (localStorage.getItem("guard_font_scale") as 'small' | 'medium' | 'large') || 'medium';
    } catch (_) {
      return 'medium';
    }
  });

  const [isAutoResponsive, setIsAutoResponsive] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem("guard_auto_responsive");
      return val === null ? true : val === 'true';
    } catch (_) {
      return true;
    }
  });

  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1000);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const changeCardDensity = (density: 'compact' | 'standard' | 'spacious') => {
    setCardDensity(density);
    try {
      localStorage.setItem("guard_density", density);
    } catch (_) {}
  };

  const changeFontSizeScale = (scale: 'small' | 'medium' | 'large') => {
    setFontSizeScale(scale);
    try {
      localStorage.setItem("guard_font_scale", scale);
    } catch (_) {}
  };

  const toggleAutoResponsive = () => {
    const nextVal = !isAutoResponsive;
    setIsAutoResponsive(nextVal);
    try {
      localStorage.setItem("guard_auto_responsive", String(nextVal));
    } catch (_) {}
  };

  // Determine active density and font classes considering viewport (Adapts to mobile vs desktop)
  const isMobileSize = windowWidth < 768;
  const activeDensity = isMobileSize && isAutoResponsive ? 'compact' : cardDensity;
  const activeFontScale = isMobileSize && isAutoResponsive ? 'small' : fontSizeScale;

  // Outer container size classes
  const containerSizeClass = 
    activeDensity === 'compact' ? "w-full max-w-md p-4 space-y-4 rounded-2xl" :
    activeDensity === 'spacious' ? "w-full max-w-4xl p-8 lg:p-10 space-y-8 rounded-[2rem]" :
    "w-full max-w-2xl p-6 lg:p-8 space-y-6 rounded-3xl";

  // Dynamic typography scale configuration
  const typography = {
    title: activeFontScale === 'small' ? "text-sm md:text-base font-extrabold" : activeFontScale === 'large' ? "text-xl md:text-2xl font-black" : "text-lg md:text-xl font-black",
    body: activeFontScale === 'small' ? "text-[10px] leading-relaxed text-slate-400" : activeFontScale === 'large' ? "text-xs md:text-sm leading-relaxed text-slate-300" : "text-[11px] md:text-xs leading-relaxed text-slate-400",
    sub: activeFontScale === 'small' ? "text-[8.5px] font-mono" : activeFontScale === 'large' ? "text-xs font-mono" : "text-[10px] font-mono",
    heading: activeFontScale === 'small' ? "text-[10px] font-bold" : activeFontScale === 'large' ? "text-sm md:text-base font-extrabold" : "text-xs md:text-sm font-black",
    input: activeFontScale === 'small' ? "py-2 px-3 text-[11px]" : activeFontScale === 'large' ? "py-3 px-4 text-sm" : "py-2.5 px-3.5 text-xs"
  };

  const [deviceId] = useState(() => getOrCreateDeviceUuid());

  const handleCopyDeviceId = () => {
    try {
      navigator.clipboard.writeText(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert(`معرف الجهاز الطالب هو:\n${deviceId}`);
    }
  };

  useEffect(() => {
    // Beautiful simulation of security tests before unlocking
    const timers = [
      setTimeout(() => { setSecurityStage("أخذ لقطة فنية لطبقة الـ Canvas ومعالجة الخطوط الرقمية..."); setSecurityProgress(35); }, 400),
      setTimeout(() => { setSecurityStage("استخلاص مواصفات معالج الجرافيكس وعدد الأنوية للعتاد الصلب..."); setSecurityProgress(60); }, 800),
      setTimeout(() => { setSecurityStage("التحقق من مرساة الذاكرة المحمية ومطابقتها ببيانات Firestore السحابية..."); setSecurityProgress(85); }, 1200),
      setTimeout(() => { setSecurityStage("إمضاء بروتوكول المصادقة وتوثيق سلامة البيانات الفورية..."); setSecurityProgress(100); }, 1600)
    ];

    return () => timers.forEach(clearTimeout);
  }, [loading]);

  useEffect(() => {
      // Subscribe to all registered devices
      const unsub = subscribeDevices(async (data) => {
        setDevices(data);
        
        const found = data.find(d => d.id === deviceId);
        const details = getDeviceDetails();
  
        if (found) {
          // Device is registered in the cloud database. Let's do anti-tamper hardware checks!
          // If we have canvas render characteristics or screen size on record, match them.
          let deviceSpoofed = false;
          let mismatchLog = "";
  
          if (found.canvasHash && found.canvasHash !== details.canvasHash) {
            deviceSpoofed = true;
            mismatchLog += `بصمة الـ Canvas غير متطابقة! (المسجل سحابياً: ${found.canvasHash} • الحالي للهيكل المادي: ${details.canvasHash})\n`;
          }
          
          // Match resolution if stored
          const resParts = found.id.split("-");
          const storedRes = resParts[3]; // segmented format
          if (storedRes && storedRes !== "000" && details.screenResolution !== storedRes) {
            deviceSpoofed = true;
            mismatchLog += `معدل دقة الشاشة المادية تم العبث به! (المقيد: ${storedRes} • المتصل حالياً: ${details.screenResolution})\n`;
          }
  
          if (deviceSpoofed) {
            setIsTampered(true);
            setTamperDetails(mismatchLog);
          }
  
          if (found.isAuthorized && !deviceSpoofed) {
            safeLocalStorage.setItem("accounting_device_authorized_at_least_once", "true");
            setIsPreviouslyAuthorized(true);
            safeLocalStorage.setItem("guard_allowed_user_ids", JSON.stringify(found.allowedUserIds || []));
          } else {
            safeLocalStorage.setItem("accounting_device_authorized_at_least_once", "false");
            setIsPreviouslyAuthorized(false);
            safeLocalStorage.setItem("guard_allowed_user_ids", "[]");
          }

          setCurrentDevice(found);
          
          // Update its last active time silently
          const timeDiff = Date.now() - new Date(found.lastActive).getTime();
          if (timeDiff > 60000 && !deviceSpoofed) { // update every 1 minute if active
            await updateDevice(deviceId, {
              lastActive: new Date().toISOString(),
              hardwareSpecs: details.hardwareSpecs, // refresh spec
              canvasHash: details.canvasHash,
              browser: details.browser,
              os: details.os
            });
          }
        } else {
          // Device is NOT registered, keep it unregistered/non-authorized for now
          setCurrentDevice(null);
          safeLocalStorage.setItem("accounting_device_authorized_at_least_once", "false");
          setIsPreviouslyAuthorized(false);
          safeLocalStorage.setItem("guard_allowed_user_ids", "[]");
        }
        
        // Remove the 1800ms loading delay for faster access if already approved
        setLoading(false);
      });
  
      return () => unsub();
  }, [deviceId]);

  // Handle manual registry request
  const handleRequestLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUsingLocalFallback()) {
      alert("⚠️ خطأ في الاتصال: لا يمكن تقديم طلب ترخيص وأنت في وضع عدم الاتصال (الوضع المحلي). يرجى التأكد من استقرار اتصالك السحابي!");
      return;
    }
    if (!isOnline && !isPreviouslyAuthorized) {
      alert("⚠️ خطأ في الاتصال: يجب أن تكون متصلاً بالإنترنت لرفع طلب الترخيص لأول مرة إلى السحابة!");
      return;
    }
    const details = getDeviceDetails();
    const finalName = customDeviceName.trim() || details.deviceName;

    const newRequest: AuthorizedDevice = {
      id: deviceId,
      deviceName: finalName,
      deviceType: details.deviceType,
      userAgent: details.userAgent,
      isAuthorized: false, // requires admin review or master code
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      hardwareSpecs: details.hardwareSpecs,
      canvasHash: details.canvasHash,
      os: details.os,
      browser: details.browser,
      tamperCount: 0,
      adminNotes: "طلب ترخيص معلق في انتظار موافقة معقدة من مالك الحسابات"
    };

    await addDevice(newRequest);
    setLicenseRequestSent(true);
  };

  // Handle instant bypass using master security key
  const handleBypassWithPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // We allow bypass even if offline, as long as the passcode is correct.
    // This helps in preview environments where connection might be flaky.
    if (passcode === MASTER_PASSCODE) {
      const details = getDeviceDetails();
      const finalName = customDeviceName.trim() || `${details.deviceName} (مرخص بـ رمز)`;

      const newAuthDevice: AuthorizedDevice = {
        id: deviceId,
        deviceName: finalName,
        deviceType: details.deviceType,
        userAgent: details.userAgent,
        isAuthorized: true,
        registeredAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        hardwareSpecs: details.hardwareSpecs,
        canvasHash: details.canvasHash,
        os: details.os,
        browser: details.browser,
        tamperCount: 0,
        adminNotes: "تم الترخيص الفوري المشفر وبناء البصمة الصارمة باستخدام مفتاح المالك المباشر"
      };

      // Try to sync to cloud if online, otherwise it stays in local storage via the callback/subscription logic
      await addDevice(newAuthDevice);
      
      safeLocalStorage.setItem("accounting_device_authorized_at_least_once", "true");
      setIsPreviouslyAuthorized(true);
      setPasscode("");
      setPasscodeError("");
      setIsTampered(false);
      alert("🔓 مبارك! تم صياغة بصمتك الحيوية واعتماد هذا الجهاز في جدران الحماية بنجاح!");
    } else {
      setPasscodeError("تم رفض المفتاح! الرقم السري المدخل غير صحيح أو انتهت صلاحية الجلسة الموحدة.");
    }
  };

  // Waiting screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-right p-6" dir="rtl">
        <div className="text-center space-y-6 max-w-lg">
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8 text-indigo-500 animate-pulse" />
            </div>
            <div className="absolute -inset-1 rounded-3xl border border-indigo-500/30 animate-ping -z-10" style={{ animationDuration: '3s' }} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-sm font-black text-white">درع الحماية المحاسبي الشامل (Zero-Trust Shield)</h2>
            <p className="text-[11px] text-slate-400 select-none">جاري الاستعلام عن البصمة الفيزيائية الفرعية ومطابقة عتاد الجهاز سحابياً...</p>
          </div>

          {/* Graphical Progress bar */}
          <div className="w-full bg-slate-900 border border-slate-800 h-2 px-0.5 rounded-full overflow-hidden flex items-center">
            <div 
              className="bg-indigo-500 h-1 rounded-full transition-all duration-500" 
              style={{ width: `${securityProgress}%` }}
            />
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="truncate">{securityStage}</span>
            <span className="font-bold text-indigo-400">{securityProgress}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Block screen if current device is NOT found or NOT authorized, OR if tampering is detected!
  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1') ||
    safeLocalStorage.getItem("accounting_app_use_local_fallback") === "true"
  );

  // If the device has never been authorized before (first-time boot), local bypass is STRICTLY DISABLED.
  // This enforces internet availability and uploads device authorization request to the cloud (Firestore).
  // If we have an active device record and it is revoked or tampered, we block it immediately.
  const isAuthorized = currentDevice 
    ? (currentDevice.isAuthorized && !isTampered) 
    : (isPreviouslyAuthorized && (!isOnline || isLocal));

  if (!isAuthorized) {
    const details = getDeviceDetails();
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-right select-none" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`w-full bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden transition-all duration-300 ${containerSizeClass}`}
        >
          {/* Customization Toolbar (لوحة التحكم السريعة في الأبعاد والخطوط المرنة) */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400 shrink-0 animate-pulse" />
                <span className="text-xs font-black text-white">تخصيص الواجهة والخط المرن (Flexible Layout & Font Control)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg shrink-0">
                <span>النافذة الحالية:</span>
                <span className="text-indigo-400 font-bold font-mono">{windowWidth}px</span>
                <span className="text-slate-500">|</span>
                <span className="font-bold text-slate-350">{windowWidth < 640 ? "📱 جوال" : windowWidth < 1024 ? "📟 لوحي" : "💻 حاسوب"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg shrink-0">
                <span>الحالة:</span>
                {isOnline ? (
                  isUsingLocalFallback() ? (
                    <button 
                      onClick={forceCloudConnection}
                      className="text-amber-400 font-bold flex items-center gap-1 hover:text-white transition cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      وضع محلي (أعد الاتصال) ⚠️
                    </button>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Wifi className="h-3 w-3 animate-pulse" />
                      نشط (متصل) 🟢
                    </span>
                  )
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <WifiOff className="h-3 w-3 animate-pulse" />
                    منقطع (أوفلاين) 🔴
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Size Profile Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">حجم النافذة المفروض (Container Size):</label>
                <div className="flex bg-slate-900 border border-slate-800/80 rounded-xl p-0.5 gap-0.5 w-full">
                  <button
                    onClick={() => changeCardDensity('compact')}
                    type="button"
                    className={`flex-1 text-[9.5px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center ${activeDensity === 'compact' ? 'bg-indigo-650 text-white font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    مضغوط
                  </button>
                  <button
                    onClick={() => changeCardDensity('standard')}
                    type="button"
                    className={`flex-1 text-[9.5px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center ${activeDensity === 'standard' ? 'bg-indigo-650 text-white font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    متوازن
                  </button>
                  <button
                    onClick={() => changeCardDensity('spacious')}
                    type="button"
                    className={`flex-1 text-[9.5px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center ${activeDensity === 'spacious' ? 'bg-indigo-650 text-white font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    سينمائي
                  </button>
                </div>
              </div>

              {/* Font Sizing scale */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">حجم ونوع الخطوط (Flexible Fonts):</label>
                <div className="flex bg-slate-900 border border-slate-800/80 rounded-xl p-0.5 gap-0.5 w-full">
                  <button
                    onClick={() => changeFontSizeScale('small')}
                    type="button"
                    className={`flex-1 text-[9.5px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center ${activeFontScale === 'small' ? 'bg-indigo-650 text-white font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    صغير
                  </button>
                  <button
                    onClick={() => changeFontSizeScale('medium')}
                    type="button"
                    className={`flex-1 text-[9.5px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center ${activeFontScale === 'medium' ? 'bg-indigo-650 text-white font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    افتراضي
                  </button>
                  <button
                    onClick={() => changeFontSizeScale('large')}
                    type="button"
                    className={`flex-1 text-[9.5px] font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center ${activeFontScale === 'large' ? 'bg-indigo-650 text-white font-black' : 'text-slate-400 hover:text-white'}`}
                  >
                    كبير جداً
                  </button>
                </div>
              </div>

              {/* Viewport adaptation toggle */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">التجاوب التلقائي للشاشات:</label>
                <button
                  onClick={toggleAutoResponsive}
                  type="button"
                  className={`w-full text-[9.5px] font-bold py-2 px-3 rounded-xl transition border text-center flex items-center justify-center gap-1.5 cursor-pointer ${isAutoResponsive ? 'bg-emerald-500/15 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isAutoResponsive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{isAutoResponsive ? "ملاءمة الجهاز تلقائياً: نشط" : "ملاءمة يدوية مقفلة"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Subtle warning backdrop glow */}
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -z-10 ${isTampered ? 'bg-rose-600/15 animate-pulse' : 'bg-rose-500/10'}`} />
          
          <div className="text-center space-y-3">
            <div 
              onClick={handleShieldClick}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 cursor-pointer select-none transition-transform active:scale-95 ${isTampered ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 'bg-rose-500/10 text-rose-500'}`}
              title="انقر 3 مرات هنا إذا كنت المالك لفتح الترخيص المباشر"
            >
              <ShieldAlert className={`h-9 w-9 ${isTampered ? 'animate-bounce' : ''}`} />
            </div>
            
            {isTampered ? (
              <div className="space-y-2">
                <span className="bg-rose-500 text-white text-[9px] px-3 py-1 rounded-full font-extrabold uppercase tracking-wider animate-pulse">
                  تم رصد محاولة اختراق (Fingerprint Spoof Blocked)
                </span>
                <h1 className={`font-black text-rose-500 ${typography.title}`}>
                  كشف انتحال البصمة الفنية المادية للجهاز!
                </h1>
                <p className={`${typography.body} text-slate-300 max-w-lg mx-auto`}>
                  حظر فوري: تم رفض الترخيص السحابي لحماية البيانات وسجلات المحاسبة التابعة لك! تم الكشف عن عدم تطابق مواصفات العتاد الصلبة للمتصفح الحالي، مما يمنع استنساخ المتصفحات أو نقل ملفات الارتباط وجلسات التوظيف.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h1 className={`font-black text-white flex items-center justify-center gap-2 ${typography.title}`}>
                  <span>جرس الأمان السحابي: جهاز مجهول الهوية</span>
                  <span className="bg-amber-500/10 text-amber-500 text-[9px] px-2 py-0.5 rounded-full font-black">مقيد</span>
                </h1>
                <p className={`${typography.body} text-slate-400 max-w-lg mx-auto`}>
                  هذا التطبيق مجهز بجدران حماية نشطة ومحمي سحابياً ضد التسريبات. لا يملك متصفحك ترخيص وصول بعد ولا يمكن تصفح الصناديق والقيود، حرصاً على سرية الحسابات والوثائق.
                </p>
              </div>
            )}
          </div>

          {/* Offline Alert Box if first time & offline */}
          {!isPreviouslyAuthorized && !isOnline && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl space-y-2 text-right">
              <div className="flex items-center gap-2 text-rose-500">
                <WifiOff className="h-5 w-5 shrink-0 animate-pulse" />
                <span className="text-xs font-black">قيد التشغيل لأول مرة: الاتصال بالإنترنت إلزامي!</span>
              </div>
              <p className={`${typography.body} text-slate-350 leading-relaxed`}>
                يمنع منعاً باتاً تشغيل النظام لأول مرة بالوضع المحلي دون وجود اتصال إنترنت فعال وتنشيط سحابي لجهازك. رفع طلب ترخيص جهازك وتأكيد هويته سحابياً خطوتان إلزاميتان لبناء توقيعك المحمي في قاعدة البيانات السحابية (Firestore). يرجى الاتصال بالشبكة للمتابعة.
              </p>
            </div>
          )}

          {/* Current Browser Spec Bar */}
          <div className={`p-4 rounded-2xl border space-y-3 ${isTampered ? 'bg-rose-950/20 border-rose-900/30' : 'bg-slate-950/60 border-slate-800'}`}>
            <span className={`font-bold block text-slate-400 ${typography.heading}`}>التوقيع الرقمي الحالي لجهازك والمكونات الصلبة:</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-right">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-900 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="text-[10px] text-slate-400 font-bold">طراز وبيئة التشغيل:</span>
                  </div>
                  <button
                    onClick={handleCopyDeviceId}
                    type="button"
                    className="text-[9.5px] bg-indigo-650/30 hover:bg-indigo-600 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 border border-indigo-500/35 text-indigo-300 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-lg cursor-pointer transition flex items-center gap-1 shrink-0"
                  >
                    <span>{copied ? "تم نسخ المعرف! ✓" : "نسخ المعرف 📋"}</span>
                  </button>
                </div>
                <div className="text-xs font-bold text-white truncate">{details.deviceName}</div>
                    <div className="text-[9px] text-indigo-400 font-mono select-all truncate">معرف الجهاز الطالب: {deviceId}</div>
              </div>

              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-900 space-y-1">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 font-bold">بصمة الرسوم الشجرية (Canvas Hash):</span>
                </div>
                <div className="text-xs font-bold text-emerald-400 font-mono truncate">{details.canvasHash}</div>
                <div className="text-[9px] text-slate-400 truncate">الفئة: {details.deviceType}</div>
              </div>
            </div>

            {/* Deep Hardware specs block */}
            <div className="bg-slate-950/40 p-2.5 rounded-xl text-[10px] text-slate-400 font-mono leading-relaxed space-y-1 border border-slate-900/50">
              <div className="font-bold text-indigo-350 text-[9px] border-b border-slate-800 pb-1 mb-1">تحديد الهوية الصلبة المكتشفة بالكامل (Hardware Spec Alignments):</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <div>• ممرات نوى العتاد: <span className="text-white font-bold">{navigator.hardwareConcurrency || "غير معروف"}</span></div>
                <div>• نسبة هرتز البكسل البصرية: <span className="text-white font-bold">{window.devicePixelRatio || "1"}x</span></div>
                <div>• مصفوفة الشاشة المادية: <span className="text-white font-bold">{details.screenResolution}</span></div>
                <div>• عمق تباين الإضاءة والألوان: <span className="text-white font-bold">{window.screen?.colorDepth || "24"}-bit</span></div>
              </div>
              <div className="pt-1 text-[9px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                {details.hardwareSpecs}
              </div>
            </div>

            {isTampered && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-1">
                <div className="text-xs font-black text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>تفاصيل كسر الأمان التلقائي:</span>
                </div>
                <pre className="text-[9px] text-rose-400 font-mono leading-relaxed whitespace-pre-wrap select-all bg-rose-950/40 p-2 rounded-lg">
                  {tamperDetails}
                  تنبيه: تم إغلاق مسار الجلسة المحاسبية حالياً للاشتباه بنقل الكوكيز أو العبث بالعتاد الصلب.
                </pre>
              </div>
            )}
          </div>

          {/* Authorization Methods */}
          <div className="space-y-4">
            
            {/* Method A: Direct Code Entry (Secret for Owner Only - Unlocked by clicking shield 3 times) */}
            {showOwnerPasscodeBox && (
              <form onSubmit={handleBypassWithPasscode} className="bg-slate-950/80 p-4 rounded-2xl border border-indigo-500/40 space-y-3 animate-slideup shadow-lg shadow-indigo-950/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-indigo-400 flex items-center gap-1">
                    <Key className="h-3.5 w-3.5 text-indigo-400" />
                    ترخيص ذاتي مباشر (خاص بمالك النظام)
                  </label>
                  <span className="text-[9px] text-slate-400 font-medium">أدخل رمز ترخيص المسؤول السري</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="أدخل رمز ترخيص المسؤول السري..."
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      setPasscodeError("");
                    }}
                    autoFocus
                    className="flex-1 bg-slate-950 border border-slate-750 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 text-center font-mono placeholder:text-slate-600 tracking-widest"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer"
                  >
                    تأكيد الترخيص والمطابقة
                  </button>
                </div>
                {passcodeError && (
                  <div className="text-[10px] text-rose-500 font-bold flex items-center gap-1 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passcodeError}</span>
                  </div>
                )}
              </form>
            )}

            {/* Method B: License Request (Send to database) */}
            {!currentDevice && !licenseRequestSent && !isTampered && (
              <form onSubmit={handleRequestLicense} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-300 block">طلب ترخيص جديد من مالك الحسابات:</label>
                  <p className="text-[10px] text-slate-500">سيظهر طلبك في لوحة السيطرة الرئيسية الخاصة بالمسؤول مباشرة.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="سمِّ هذا الجهاز ليسهل التعرف عليه (مثال: جوال أسامة المكتبي)"
                    value={customDeviceName}
                    onChange={(e) => setCustomDeviceName(e.target.value)}
                    required
                    className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-750 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer"
                  >
                    تقديم طلب ترخيص 📥
                  </button>
                </div>
              </form>
            )}

            {(licenseRequestSent || (currentDevice && !currentDevice.isAuthorized && !isTampered)) && (
              <div className="bg-indigo-950/20 border border-indigo-900/30 p-4 rounded-2xl flex items-start gap-3">
                <Clock className="h-5 w-5 text-indigo-400 animate-pulse mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2 text-right">
                  <h4 className="text-xs font-black text-white">تم إرسال وقيد طلب الترخيص بنجاح!</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    جهازك الآن مدرج في شجرة الأمان المعلقة بمعرف الجهاز الطالب <span className="text-indigo-400 font-mono font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900/50 select-all">{deviceId}</span>. يرجى الطلب من مسؤول النظام فتح لوحة السيطرة من جهازه المفعل والضغط على زر "ترخيص الجهاز" للموافقة الفورية.
                  </p>
                  <div>
                    <button
                      onClick={handleCopyDeviceId}
                      type="button"
                      className="mt-1 inline-flex items-center gap-1.5 text-[9px] bg-indigo-600/30 hover:bg-indigo-650 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-500/25 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                    >
                      <span>{copied ? "تم نسخ معرف الجهاز! ✓" : "نسخ معرف الجهاز الطالب للطلب 📋"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer branding details */}
          <div className="border-t border-slate-800/60 pt-4 text-center">
            <span className="text-[10px] text-slate-500 font-medium">سجل الأمان المالي السحابي يحفظ سلامتكم • {new Date().toLocaleTimeString("ar-EG")}</span>
          </div>

        </motion.div>
      </div>
    );
  }

  // Authorized! Provide normal access
  const hasUserRestriction = currentDevice?.allowedUserIds && currentDevice.allowedUserIds.length > 0;
  const isUserAllowed = !currentUserId || !hasUserRestriction || currentDevice.allowedUserIds.includes(currentUserId);

  if (!isUserAllowed) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-right select-none" dir="rtl">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden p-6 lg:p-8 space-y-6 rounded-3xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-2 border border-rose-500/20">
            <Lock className="h-9 w-9" />
          </div>

          <div className="space-y-1">
            <h1 className="font-black text-white text-sm md:text-base">
              حسابك غير مصرح له بالدخول من هذا الجهاز!
            </h1>
            <p className="text-[10px] leading-relaxed text-slate-400 max-w-sm mx-auto">
              عذراً، قام مسؤول النظام بتقييد هذا الجهاز (المتصفح) ليعمل فقط مع حسابات معينة من الموظفين لحماية سرية القيود والبيانات. حسابك الحالي لا يملك صلاحية استخدام هذا الترخيص.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-right text-xs">
            <div className="text-[10px] text-slate-500 font-bold">👤 تفاصيل الحساب الحالي والترخيص:</div>
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl">
              <span className="text-slate-400 font-bold">معرف الموظف المتصل:</span>
              <span className="font-mono text-indigo-400 font-bold select-all bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{currentUserId}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl">
              <span className="text-slate-400 font-bold">الجهاز المستخدم:</span>
              <span className="text-white font-bold">{currentDevice?.deviceName}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                localStorage.removeItem("current_user_id");
                window.location.reload();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <LogOut className="h-4 w-4" />
              <span>تبديل الحساب / تسجيل الخروج</span>
            </button>
            <div className="text-[10px] text-slate-500 font-medium">
              يرجى الاتصال بالمدير أو المسؤول المالي لإضافة حسابك لقائمة الأجهزة المرخصة.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


// =========================================================
// 🔒 ADMIN MANAGEMENT VIEW FOR LICENSED DEVICES
// =========================================================

interface DevicesManagementProps {
  systemTime: string;
}

export function DevicesManagement({ systemTime }: DevicesManagementProps) {
  const [devices, setDevices] = useState<AuthorizedDevice[]>([]);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesTemp, setNotesTemp] = useState("");
  const myDeviceId = getOrCreateDeviceUuid();

  useEffect(() => {
    const unsubDevices = subscribeDevices((data) => {
      setDevices(data);
      setLoading(false);
    });
    const unsubUsers = subscribeAppUsers((data) => {
      setAppUsers(data);
    });
    return () => {
      unsubDevices();
      unsubUsers();
    };
  }, []);

  const handleToggleAuthorization = async (device: AuthorizedDevice) => {
    if (device.id === myDeviceId && device.isAuthorized) {
      if (!confirm("⚠️ تحذير شديد: أنت تقوم بإلغاء ترخيص جهازك الحالي النشط! سيؤدي ذلك لقفل النظام عليك فوراً وإخراجك من الشاشة. هل أنت متأكد؟")) {
        return;
      }
    }
    
    await updateDevice(device.id, {
      isAuthorized: !device.isAuthorized,
      adminNotes: !device.isAuthorized 
        ? "تمت الموافقة وتوثيق الترخيص بواسطة المسؤول" 
        : "تم تعطيل وسحب ترخيص هذا الجهاز مؤقتاً"
    });
  };

  const handleDeleteDevice = async (id: string) => {
    if (id === myDeviceId) {
      alert("لا يمكنك حذف السجل الجاري لجهازك المتصل حالياً لتجنب توقف الاستجابة.");
      return;
    }
    if (confirm("هل أنت متأكد من إزالة هذا الجهاز نهائياً من سجلات الأمان؟ سيتعين عليه تقديم طلب ترخيص جديد.")) {
      await deleteDevice(id);
    }
  };

  const handleSaveNotes = async (id: string) => {
    await updateDevice(id, {
      adminNotes: notesTemp
    });
    setEditingNotesId(null);
  };

  const handleCleanupDuplicates = async () => {
    if (!confirm("هل أنت متأكد من تنظيف السجل من الطلبات القديمة أو المكررة (الأجهزة التي تم حفظها بمعرفات عشوائية سابقاً)؟")) return;
    
    // Check for Firebase IDs generated randomly before our fix
    // True device IDs contain a hyphen e.g. "WIN-CHR-1536-1234"
    const junkDevices = devices.filter(d => !d.id.includes('-') && d.id.length >= 20);
    
    if (junkDevices.length === 0) {
      alert("السجل نظيف! لا توجد طلبات عشوائية أو مكررة.");
      return;
    }

    setLoading(true);
    let count = 0;
    for (const d of junkDevices) {
      await deleteDevice(d.id);
      count++;
    }
    alert(`تم بنجاح تنظيف ${count} طلب عشوائي متكرر من قاعدة البيانات.`);
    setLoading(false);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Title */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-650/10 text-indigo-500 rounded-xl flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>إدارة الأجهزة المصرح لها بالوصول (الترخيص الرقمي)</span>
              <span className="bg-indigo-500/10 text-indigo-500 text-[9px] px-2 py-0.5 rounded-full font-bold">حماية مشددة</span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
              راقب وصرح وحظر الأجهزة والمتصفحات التي تحاول قراءة وتحديث دفاتر حساب العمل لفرع الصالات والمناسبات.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-xs shrink-0 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400 block text-[9.5px] font-bold">جهازك المتصل حالياً:</span>
            <span className="font-mono bg-indigo-500 text-white px-1.5 py-0.5 rounded text-[9.5px] font-bold">{myDeviceId}</span>
          </div>
          
          <button
            onClick={handleCleanupDuplicates}
            className="text-[10px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 transition"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            تنظيف الطلبات العشوائية القديمة التلقائية
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
          <span className="text-xs text-slate-450 font-bold block">جاري جلب سجل الأجهزة السحابي اللحظي...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
              <span>سجل الأجهزة ومتطلبات التراخيص ({devices.length})</span>
              <span className="text-[10px] text-slate-400">أجهزة مرخص لها الوصول السحابي المباشر</span>
            </div>

            <div className="divide-y divide-slate-150 dark:divide-slate-850">
              {devices.length === 0 ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <ShieldAlert className="h-10 w-10 text-slate-400" />
                  <h4 className="text-sm font-extrabold text-slate-850 dark:text-white">لا توجد أجهزة مسجلة</h4>
                  <p className="text-xs text-slate-450">
                    سيتم تلقائياً تتبع أي جهاز يحاول فتح التطبيق وتوفير خيارات ترخيصه برقم فني.
                  </p>
                </div>
              ) : (
                devices.map((device) => {
                  const isMe = device.id === myDeviceId;
                  const isActive = new Date(device.lastActive).getTime() > Date.now() - 300000; // active in last 5 min

                  return (
                    <div key={device.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                      
                      {/* Device Spec details */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {device.deviceType === "mobile" ? (
                            <Smartphone className="h-5 w-5 text-indigo-500 shrink-0" />
                          ) : device.deviceType === "tablet" ? (
                            <Tablet className="h-5 w-5 text-indigo-500 shrink-0" />
                          ) : (
                            <Laptop className="h-5 w-5 text-indigo-500 shrink-0" />
                          )}
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                            {device.deviceName}
                            {isMe && (
                              <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                                هذا جهازك المتصل حالياً
                              </span>
                            )}
                          </span>

                          {isActive ? (
                            <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                              متصل الآن (نشط)
                            </span>
                          ) : (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded-full font-semibold">
                              غير متصل (خامل)
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono space-y-2 mt-2">
                          <div className="flex items-center gap-2 flex-wrap text-[9px] bg-slate-100 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-850">
                            <div>
                              <span>معرف الجهاز الطالب: </span>
                              <code className="text-slate-900 dark:text-indigo-400 font-black bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded select-all font-mono">{device.id}</code>
                            </div>
                            <span className="text-slate-300 dark:text-slate-750">|</span>
                            <div>
                              <span>بصمة الرسوم (Canvas Hash): </span>
                              <code className="text-emerald-600 dark:text-emerald-400 font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded select-all font-mono">{device.canvasHash || "غير مسجل"}</code>
                            </div>
                            <span className="text-slate-300 dark:text-slate-750">|</span>
                            <div>
                              <span>أول حضور: </span>
                              <span className="text-slate-800 dark:text-slate-300 font-bold">{new Date(device.registeredAt).toLocaleString("ar-EG")}</span>
                            </div>
                            <span className="text-slate-300 dark:text-slate-750">|</span>
                            <div>
                              <span>آخر نشاط: </span>
                              <span className="text-slate-800 dark:text-slate-300 font-bold">{new Date(device.lastActive).toLocaleString("ar-EG")}</span>
                            </div>
                          </div>

                          {/* Render deeper hardware info if captured */}
                          {device.hardwareSpecs && (
                            <div className="text-[9.5px] text-slate-500 bg-slate-50 dark:bg-slate-950/20 px-3 py-1.5 rounded-xl border border-slate-200/40 dark:border-slate-850/40 divide-y divide-slate-100 dark:divide-slate-800">
                              <div className="pb-1 text-indigo-500 font-semibold flex items-center gap-1">
                                <span>المكونات الصلبة الموحدة للجهاز (Linked physical device signatures):</span>
                              </div>
                              <div className="pt-1 text-slate-400 dark:text-slate-350 leading-relaxed font-sans">
                                {device.hardwareSpecs}
                              </div>
                            </div>
                          )}

                          {/* Anti-tampering indicators */}
                          {device.tamperCount && device.tamperCount > 0 ? (
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[9px] text-rose-500 font-bold flex items-center gap-2 animate-pulse">
                              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                              <span>⚠️ درع الحماية الذاتي: تم رصد وإحباط {device.tamperCount} محاولة لتمرير ملفات كوكيز مسروقة أو انتحال المتصفح بدون تطابق في العتاد الصلب الفعلي!</span>
                            </div>
                          ) : null}

                          {editingNotesId === device.id ? (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={notesTemp}
                                onChange={(e) => setNotesTemp(e.target.value)}
                                className="bg-slate-200 dark:bg-slate-950 text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-white focus:outline-none"
                                placeholder="ملاحظات المالك أو التسمية..."
                              />
                              <button
                                onClick={() => handleSaveNotes(device.id)}
                                className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded hover:bg-indigo-500"
                              >
                                حفظ
                              </button>
                              <button
                                onClick={() => setEditingNotesId(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 pt-1 font-sans text-slate-500 dark:text-slate-400">
                              <span><strong>ملاحظات الحماية والترخيص:</strong> {device.adminNotes || "لا توجد ملاحظات إدارية مدونة لمسؤول هذا الفرع."}</span>
                              <button
                                onClick={() => {
                                  setEditingNotesId(device.id);
                                  setNotesTemp(device.adminNotes || "");
                                }}
                                className="text-indigo-500 hover:underline text-[9px] font-bold"
                              >
                                (تعديل 📝)
                              </button>
                            </div>
                          )}

                          {/* Users restriction section */}
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-450 block">👥 ربط الترخيص بمستخدمين محددين (اترك فارغاً لتمكين جميع الموظفين):</span>
                            <div className="flex flex-wrap gap-1.5">
                              {appUsers.map(user => {
                                const isAllowed = device.allowedUserIds?.includes(user.id);
                                return (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onClick={async () => {
                                      const currentAllowed = device.allowedUserIds || [];
                                      let nextAllowed: string[];
                                      if (isAllowed) {
                                        nextAllowed = currentAllowed.filter(id => id !== user.id);
                                      } else {
                                        nextAllowed = [...currentAllowed, user.id];
                                      }
                                      await updateDevice(device.id, { allowedUserIds: nextAllowed });
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                      isAllowed
                                        ? "bg-indigo-650 text-white shadow-xs"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    }`}
                                  >
                                    <span>{user.username || user.name}</span>
                                    <span className="text-[8.5px] opacity-70">({user.roleId})</span>
                                    {isAllowed && <Check className="w-2.5 h-2.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Power Controls (Toggle Auth & Delete) */}
                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleToggleAuthorization(device)}
                          className={`text-xs font-black px-4 py-2 rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                            device.isAuthorized
                              ? "bg-rose-500/10 text-rose-500 border-rose-200/40 hover:bg-rose-500/20"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
                          }`}
                        >
                          {device.isAuthorized ? (
                            <>
                              <X className="h-4 w-4" />
                              سحب وسد الترخيص مؤقتاً
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              الموافقة وترخيص هذا الجهاز
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-500 dark:text-slate-400 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                          title="حذف البيانات بالكامل"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Master Admin Passcode reset manual guideline */}
          <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-amber-500">ملاحظة أمنية فنية لمسؤول الحسابات:</h4>
              <p className="text-[10px] text-slate-450 leading-relaxed mt-1">
                الترخيص الرقمي يعتمد على تخزين "بصمة متصفح مميزة وقصيرة" لكل جهاز يحاول الدخول. في حال رغبتك بالوصول من متصفح أو جهاز غير مفعل مسبقاً، يمكنك كتابة رمز المسؤول السري المباشر الموحد <code className="text-indigo-400 font-mono font-bold font-sans">2026-secure</code> في شاشة الحظر، وسيتم على الفور قيد جهازك كجهاز موثق ونشط دون الرجوع لغيرك. احرص على حماية هذا الرمز وتغييره في الكود عند الإنتاج الفعلي.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
