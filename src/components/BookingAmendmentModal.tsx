import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Booking } from "../types";
import {
  addBookingAmendmentRequest,
  subscribeBookings,
} from "../lib/dbService";
import { toast } from "sonner";

interface BookingAmendmentModalProps {
  booking: Booking;
  onClose: () => void;
  currentUser: any;
}

export default function BookingAmendmentModal({
  booking,
  onClose,
  currentUser,
}: BookingAmendmentModalProps) {
  const [reason, setReason] = useState("");
  const [newDays, setNewDays] = useState<{ date: string }[]>(
    booking.days && booking.days.length > 0
      ? booking.days.map((d) => ({ date: d.date }))
      : booking.eventDates && booking.eventDates.length > 0
        ? booking.eventDates.map((d) => ({ date: d }))
        : [{ date: booking.eventDate || "" }],
  );
  const [newStartTime, setNewStartTime] = useState(booking.startTime || "");
  const [newEndTime, setNewEndTime] = useState(booking.endTime || "");
  const [newAdditionalServices, setNewAdditionalServices] = useState(
    booking.additionalServices || [],
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pickerMonth, setPickerMonth] = useState(new Date());

  useEffect(() => {
    const currentSelectedDates = newDays.map((d) => d.date).filter(Boolean);
    setNewAdditionalServices((prev) =>
      prev.map((s) => ({
        ...s,
        appliedDates: (s.appliedDates || []).filter((d) =>
          currentSelectedDates.includes(d),
        ),
      })),
    );
  }, [newDays]);

  useEffect(() => {
    return subscribeBookings((data) => setBookings(data));
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("يرجى ذكر سبب التعديل");
      return;
    }

    const selectedDatesCount = newDays.filter((d) => d.date).length;
    if (selectedDatesCount === 0) {
      toast.error("يرجى تحديد تاريخ واحد على الأقل");
      return;
    }

    const originalDates =
      booking.days && booking.days.length > 0
        ? booking.days.filter((d) => d.status !== "cancelled").map((d) => d.date)
        : booking.eventDates && booking.eventDates.length > 0
          ? booking.eventDates
          : booking.eventDate ? [booking.eventDate] : [];
    const originalDaysCount = Math.max(1, originalDates.length);
    if (selectedDatesCount !== originalDaysCount) {
      toast.error(`يجب اختيار نفس عدد أيام الحجز الأصلي (${originalDaysCount} أيام). طلب التعديل مخصص لنقل التواريخ فقط وليس لتقليلها أو زيادتها.`);
      return;
    }

    await addBookingAmendmentRequest({
      bookingId: booking.id,
      bookingCode: booking.sequenceCode,
      reason,
      requestedChanges: {
        newDates: newDays.map((d) => d.date).filter(Boolean),
        newStartTime,
        newEndTime,
        newAdditionalServices,
      },
      requestedBy: currentUser?.name || currentUser?.username || "مستخدم",
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    toast.success("تم إرسال طلب التعديل بنجاح");
    onClose();
  };

  const selectedDates = newDays.map((d) => d.date).filter(Boolean);

  const renderCalendar = () => {
    const daysInMonth = new Date(
      pickerMonth.getFullYear(),
      pickerMonth.getMonth() + 1,
      0,
    ).getDate();
    const firstDayOfMonth = new Date(
      pickerMonth.getFullYear(),
      pickerMonth.getMonth(),
      1,
    ).getDay();
    const monthName = pickerMonth.toLocaleString("ar-EG", {
      month: "long",
      year: "numeric",
    });

    const prevMonth = () =>
      setPickerMonth(
        new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1),
      );
    const nextMonth = () =>
      setPickerMonth(
        new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1),
      );

    return (
      <div className="border dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">{monthName}</span>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {["ح", "ن", "ث", "ر", "خ", "ج", "س"].map((d) => (
            <div key={d} className="text-[10px] text-slate-400 font-bold">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${pickerMonth.getFullYear()}-${(pickerMonth.getMonth() + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
            const isSelected = selectedDates.includes(dateStr);

            const dayBookings = bookings.filter(
              (b) =>
                b.hallId === booking.hallId &&
                (b.eventDates || []).includes(dateStr) &&
                b.status !== "cancelled" &&
                b.id !== booking.id,
            );

            const isOccupied = dayBookings.length > 0;

            return (
              <button
                key={day}
                onClick={() => {
                  if (isSelected) {
                    setNewDays(newDays.filter((d) => d.date !== dateStr));
                  } else {
                    if (newDays.length === 1 && !newDays[0].date) {
                      setNewDays([{ date: dateStr }]);
                    } else {
                      setNewDays([...newDays, { date: dateStr }]);
                    }
                  }
                }}
                className={`
                  h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-all relative
                  ${isSelected ? "bg-blue-600 text-white font-bold shadow-sm" : ""}
                  ${!isSelected && isOccupied ? "bg-rose-50 text-rose-600 border border-rose-100" : ""}
                  ${!isSelected && !isOccupied ? "hover:bg-slate-200 dark:hover:bg-slate-800 bg-white dark:bg-slate-800" : ""}
                `}
              >
                {day}
                {isOccupied && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-600 rounded-full" /> مختار
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-rose-500 rounded-full" /> محجوز
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 border border-slate-300 rounded-full" />{" "}
            متاح
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-none sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[100dvh] sm:max-h-[95vh]"
      >
        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            طلب تعديل حجز ({booking.sequenceCode})
          </h3>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-slate-400 hover:text-slate-600 transition-colors" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh]">
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm border border-blue-100 dark:border-blue-800">
            <p className="font-bold text-blue-800 dark:text-blue-300 mb-2">
              التفاصيل الحالية:
            </p>
            <div className="space-y-1 text-blue-700 dark:text-blue-400">
              <p className="flex items-center gap-2">
                <span className="font-medium">التواريخ:</span>
                {(() => {
                  const dates =
                    booking.days && booking.days.length > 0
                      ? booking.days.map((d) => d.date)
                      : booking.eventDates && booking.eventDates.length > 0
                        ? booking.eventDates
                        : booking.eventDate ? [booking.eventDate] : [];
                  return dates.length > 0 ? dates.join(", ") : "غير محدد";
                })()}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium">الوقت:</span> {booking.startTime}{" "}
                - {booking.endTime}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                سبب التعديل
              </label>
              <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                  {(() => {
                    const originalDates =
                      booking.days && booking.days.length > 0
                        ? booking.days.filter((d) => d.status !== "cancelled").map((d) => d.date)
                        : booking.eventDates && booking.eventDates.length > 0
                          ? booking.eventDates
                          : booking.eventDate ? [booking.eventDate] : [];
                    return `يجب اختيار ${Math.max(1, originalDates.length)} أيام بالضبط`;
                  })()}
                </span>
              </div>
            </div>
            <div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 border dark:border-slate-800 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="يرجى توضيح سبب رغبتك في تعديل الحجز..."
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  اختيار التواريخ الجديدة
                </label>
                <span className={`text-[10px] font-black ${
                  newDays.filter(d => d.date).length === (booking.days || []).filter(d => d.status !== 'cancelled').length
                    ? 'text-emerald-600'
                    : 'text-rose-500'
                }`}>
                  تم اختيار {newDays.filter(d => d.date).length} من {(booking.days || []).filter(d => d.status !== 'cancelled').length}
                </span>
              </div>
              {renderCalendar()}
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedDates.map((date, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                  >
                    {date}
                    <button
                      onClick={() =>
                        setNewDays(newDays.filter((d) => d.date !== date))
                      }
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">
                  وقت البدء الجديد
                </label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full p-3 border dark:border-slate-800 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">
                  وقت الانتهاء الجديد
                </label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full p-3 border dark:border-slate-800 rounded-xl dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {newAdditionalServices.length > 0 && (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  الخدمات الإضافية (اختر التواريخ لكل خدمة)
                </label>
                {newAdditionalServices.map((service, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                        <span className="text-sm font-bold">{service.name}</span>
                      </div>
                      <button
                        onClick={() =>
                          setNewAdditionalServices(
                            newAdditionalServices.filter((_, i) => i !== idx),
                          )
                        }
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        title="إلغاء الخدمة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {selectedDates.map((date) => {
                        const isApplied = (service.appliedDates || []).includes(date);
                        return (
                          <button
                            key={date}
                            onClick={() => {
                              const updatedServices = [...newAdditionalServices];
                              const currentApplied = service.appliedDates || [];
                              if (isApplied) {
                                updatedServices[idx] = {
                                  ...service,
                                  appliedDates: currentApplied.filter((d) => d !== date),
                                };
                              } else {
                                updatedServices[idx] = {
                                  ...service,
                                  appliedDates: [...currentApplied, date],
                                };
                              }
                              setNewAdditionalServices(updatedServices);
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${
                              isApplied
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            {date}
                          </button>
                        );
                      })}
                    </div>
                    {(service.appliedDates || []).length === 0 && (
                      <p className="text-[10px] text-rose-500 font-medium">
                        * لم يتم تحديد تواريخ لهذه الخدمة
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSubmit}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
            >
              إرسال طلب التعديل
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
