import React, { useEffect, useState } from "react";
import { BookingAmendmentRequest } from "../types";
import {
  subscribeBookingAmendmentRequests,
  updateBookingAmendmentRequest,
  updateBooking,
  subscribeBookings,
} from "../lib/dbService";
import { toast } from "sonner";
import { Check, X, Clock, User, Calendar, RefreshCcw } from "lucide-react";
import { Booking } from "../types";

interface AmendmentRequestsViewProps {
  highlightId?: string | null;
  onClearHighlight?: () => void;
}

export default function AmendmentRequestsView({ highlightId, onClearHighlight }: AmendmentRequestsViewProps = {}) {
  const [requests, setRequests] = useState<BookingAmendmentRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "processed">(
    "pending",
  );

  useEffect(() => {
    if (highlightId && requests.length > 0) {
      const found = requests.find(r => r.id === highlightId || r.sequenceCode === highlightId);
      if (found) {
        setActiveTab(found.status === "pending" ? "pending" : "processed");
        if (onClearHighlight) {
          onClearHighlight();
        }
      }
    }
  }, [highlightId, requests, onClearHighlight]);

  useEffect(() => {
    const unsubRequests = subscribeBookingAmendmentRequests((data) =>
      setRequests(data),
    );
    const unsubBookings = subscribeBookings((data) => setBookings(data));
    return () => {
      unsubRequests();
      unsubBookings();
    };
  }, []);

  const handleAction = async (
    id: string,
    status: "approved" | "rejected",
    bookingId?: string,
    requestedChanges?: any,
  ) => {
    await updateBookingAmendmentRequest(id, {
      status,
      approvedAt: new Date().toISOString(),
    });

    if (status === "approved" && bookingId && requestedChanges) {
      // Handle both new array format and old singular string format
      const rawDates =
        requestedChanges.newDates ||
        (requestedChanges.newDate ? [requestedChanges.newDate] : []);
      const newDates = Array.isArray(rawDates) ? rawDates.filter(Boolean) : [];

      if (newDates.length > 0) {
        const startTime = requestedChanges.newStartTime || "";
        const endTime = requestedChanges.newEndTime || "";

        const currentBooking = bookings.find((b) => b.id === bookingId);

        await updateBooking(bookingId, {
          days: newDates.map((date: string, idx: number) => {
            let p = 0;
            let d = 0;
            if (
              currentBooking &&
              currentBooking.days &&
              currentBooking.days[idx]
            ) {
              p = currentBooking.days[idx].price || 0;
              d = currentBooking.days[idx].discount || 0;
            } else if (
              currentBooking &&
              currentBooking.days &&
              currentBooking.days.length > 0
            ) {
              // fallback to the last day's price if they added more days than before
              p =
                currentBooking.days[currentBooking.days.length - 1].price || 0;
              d =
                currentBooking.days[currentBooking.days.length - 1].discount ||
                0;
            }
            return {
              date,
              startTime,
              endTime,
              price: p,
              discount: d,
            };
          }),
          eventDates: newDates,
          eventDate: newDates[0],
          startTime: startTime,
          endTime: endTime,
        });
      }
    }

    toast.success(`تم ${status === "approved" ? "قبول" : "رفض"} الطلب`);
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">طلبات تعديل الحجوزات</h2>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600"
                : "text-slate-500"
            }`}
          >
            تحت الاعتماد ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("processed")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "processed"
                ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600"
                : "text-slate-500"
            }`}
          >
            المعتمدة ({processedRequests.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(activeTab === "pending" ? pendingRequests : processedRequests)
          .length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>لا توجد طلبات في هذا القسم</p>
          </div>
        ) : (
          (activeTab === "pending" ? pendingRequests : processedRequests).map(
            (req) => {
              const booking = bookings.find((b) => b.id === req.bookingId);
              const bookingRequests = requests
                .filter(
                  (r) =>
                    r.bookingId === req.bookingId &&
                    r.status === "approved" &&
                    r.id !== req.id,
                )
                .sort(
                  (a, b) =>
                    new Date(b.approvedAt || 0).getTime() -
                    new Date(a.approvedAt || 0).getTime(),
                );

              const amendmentCount = bookingRequests.length;
              const lastAmendment = bookingRequests[0];

              const isHighlighted = !!(highlightId && (req.id === highlightId || req.sequenceCode === highlightId));

              return (
                <div
                  key={req.id}
                  className={`p-4 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group transition-all ${
                    isHighlighted 
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md font-extrabold" 
                      : "dark:border-slate-800 hover:border-blue-200"
                  }`}
                >
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {req.bookingCode}
                      </span>
                      {req.status !== "pending" && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            req.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {req.status === "approved" ? "مقبول" : "مرفوض"}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(req.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">العميل:</span>
                        <span className="font-bold">
                          {booking?.customerName || "غير معروف"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">الفعالية:</span>
                        <span className="font-bold">
                          {booking?.eventType || "غير محدد"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">التاريخ الحالي:</span>
                        <span className="font-bold">
                          {booking?.days && booking.days.length > 0
                            ? booking.days.map((d) => d.date).join(", ")
                            : booking?.eventDate || "---"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <RefreshCcw className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-500">
                          مرات التعديل السابقة:
                        </span>
                        <span className="font-bold">{amendmentCount}</span>
                      </div>
                      {lastAmendment && (
                        <div className="col-span-1 md:col-span-2 flex items-center gap-2 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            آخر تعديل معتمد بتاريخ:{" "}
                            {new Date(
                              lastAmendment.approvedAt!,
                            ).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-bold mb-1">سبب الطلب:</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {req.reason}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2">
                        مقدم الطلب: {req.requestedBy}
                      </p>
                    </div>

                    {req.requestedChanges && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl mt-3 border border-blue-100 dark:border-blue-800">
                        <p className="text-blue-600 font-bold text-sm mb-2">
                          التعديل المقترح:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium">التواريخ:</span>{" "}
                            {req.requestedChanges.newDates?.join(", ") ||
                              req.requestedChanges.newDate}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-medium">الوقت:</span>{" "}
                            {req.requestedChanges.newStartTime} -{" "}
                            {req.requestedChanges.newEndTime}
                          </p>
                        </div>
                      </div>
                    )}

                    {req.approvedAt && (
                      <div className="mt-3 pt-3 border-t dark:border-slate-800 flex items-center gap-4 text-[10px] text-slate-400">
                        <p className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-green-500" />
                          تاريخ المعالجة:{" "}
                          {new Date(req.approvedAt).toLocaleDateString(
                            "ar-EG",
                          )}{" "}
                          {new Date(req.approvedAt).toLocaleTimeString(
                            "ar-EG",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                        {req.approvedBy && <p>بواسطة: {req.approvedBy}</p>}
                      </div>
                    )}
                  </div>

                  {req.status === "pending" && (
                    <div className="flex md:flex-col gap-2">
                      <button
                        onClick={() =>
                          handleAction(
                            req.id,
                            "approved",
                            req.bookingId,
                            req.requestedChanges,
                          )
                        }
                        className="p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all active:scale-95"
                        title="قبول"
                      >
                        <Check className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => handleAction(req.id, "rejected")}
                        className="p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all active:scale-95"
                        title="رفض"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </div>
              );
            },
          )
        )}
      </div>
    </div>
  );
}
