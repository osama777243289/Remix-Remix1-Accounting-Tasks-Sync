import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  Users, 
  Banknote, 
  Calendar, 
  MapPin, 
  Info,
  Maximize2,
  X,
  Star,
  Zap,
  ArrowRight
} from "lucide-react";
import { Hall, Booking } from "../types";
import { subscribeHalls, subscribeBookings } from "../lib/dbService";

interface HallsDirectoryProps {
  halls: Hall[];
  bookings: Booking[];
}

export default function HallsDirectory({ halls, bookings }: HallsDirectoryProps) {
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);

  // Helper to get total bookings for a hall
  const getHallBookingCount = (hallId: string) => {
    return bookings.filter(b => b.hallId === hallId).length;
  };

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -ml-32 -mt-32" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <Building2 className="w-7 h-7" />
            </span>
            دليل القاعات والمرافق
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold max-w-xl">
            استعرض كافة القاعات والمرافق المتاحة للمناسبات والفعاليات. يمكنك الاطلاع على التفاصيل، السعات، والمميزات الخاصة بكل قاعة.
          </p>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{halls.length}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">قاعة متاحة</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex flex-col items-center">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{bookings.length}</span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">حجز مسجل</span>
          </div>
        </div>
      </div>

      {/* Grid of Halls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {halls.map((hall, idx) => (
            <motion.div
              key={hall.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden relative flex flex-col"
            >
              {/* Image / Icon Area */}
              <div className="h-48 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
                <Building2 className="w-20 h-20 text-slate-200 dark:text-slate-700 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                
                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-slate-800 dark:text-white shadow-sm flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    مميزة
                  </span>
                </div>
                
                <div className="absolute bottom-4 right-4 left-4 flex justify-between items-end">
                   <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-lg">
                      {hall.capacity} شخص
                   </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {hall.name}
                    </h3>
                    <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-1 font-bold">
                      <MapPin className="w-3 h-3" />
                      <span>{hall.location || "الموقع الرئيسي للمؤسسة"}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-black text-slate-400 block mb-1">السعر الأساسي للحجز</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">{hall.price.toLocaleString()} {hall.currency}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                   <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500">إجمالي الحجوزات</span>
                      <span className="text-indigo-600">{getHallBookingCount(hall.id)} حجز</span>
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full" 
                        style={{ width: `${Math.min(100, (getHallBookingCount(hall.id) / 20) * 100)}%` }}
                      />
                   </div>
                </div>

                <div className="pt-4 mt-auto flex gap-2">
                   <button 
                    onClick={() => setSelectedHall(hall)}
                    className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs py-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                   >
                     <Info className="w-4 h-4" />
                     عرض التفاصيل
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Hall Details Modal */}
      <AnimatePresence>
        {selectedHall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHall(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="h-64 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                 <Building2 className="w-32 h-32 text-slate-200 dark:text-slate-700" />
                 <button 
                   onClick={() => setSelectedHall(null)}
                   className="absolute top-6 left-6 p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:rotate-90 transition-all"
                 >
                   <X className="w-5 h-5" />
                 </button>
                 <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
              </div>

              <div className="p-10 -mt-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{selectedHall.name}</h2>
                    <div className="flex items-center gap-2 text-slate-500 font-bold">
                       <MapPin className="w-4 h-4" />
                       <span>{selectedHall.location || "الموقع الرئيسي للمؤسسة"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="p-3 px-6 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/20 text-center">
                        <span className="text-[10px] block opacity-80 font-bold uppercase">سعة القاعة</span>
                        <span className="text-xl font-black">{selectedHall.capacity} شخص</span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                      <div className="w-10 h-10 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                         <Banknote className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-black text-slate-400 mb-1 uppercase">السعر الأساسي للحجز</h4>
                      <div className="text-xl font-black text-slate-900 dark:text-white">{selectedHall.price.toLocaleString()} {selectedHall.currency}</div>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                      <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                         <Zap className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-black text-slate-400 mb-1 uppercase">حالة القاعة</h4>
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {selectedHall.status === 'active' ? 'نشطة ومتاحة' : selectedHall.status === 'maintenance' ? 'تحت الصيانة' : 'غير متاحة'}
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Info className="w-4 h-4 text-indigo-600" />
                      وصف وتفاصيل إضافية
                   </h4>
                   <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      هذه القاعة مجهزة بأحدث أنظمة الصوت والإضاءة، وتوفر بيئة مثالية لمختلف المناسبات سواء كانت اجتماعات عمل، حفلات تخرج، أو مناسبات خاصة. تتميز القاعة بمرونة في ترتيب المقاعد وتوفير خدمات الضيافة المتكاملة حسب الطلب.
                   </p>
                </div>

                <div className="mt-12 flex justify-end">
                   <button 
                     onClick={() => setSelectedHall(null)}
                     className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-black text-sm px-10 py-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                   >
                     إغلاق النافذة
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
