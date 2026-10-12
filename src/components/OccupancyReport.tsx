import React from 'react';
import { Booking, Hall } from '../types';

interface OccupancyReportProps {
  bookings: Booking[];
  halls: Hall[];
}

export default function OccupancyReport({ bookings, halls }: OccupancyReportProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg mb-4">تقرير الإشغال</h3>
        <div className="space-y-2">
            {halls.map(hall => {
                const hallBookings = bookings.filter(b => b.hallId === hall.id);
                return (
                    <div key={hall.id} className="flex justify-between p-2 border-b">
                        <span className="font-bold">{hall.name}</span>
                        <span>عدد الحجوزات: {hallBookings.length}</span>
                    </div>
                );
            })}
        </div>
    </div>
  );
}
