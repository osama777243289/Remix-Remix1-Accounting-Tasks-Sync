import React from 'react';
import { Booking } from '../types';

interface BookingStatsProps {
  bookings: Booking[];
}

export default function BookingStats({ bookings }: BookingStatsProps) {
  const total = bookings.length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const pending = bookings.filter(b => b.status === 'pending').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;
  const completed = bookings.filter(b => b.status === 'completed').length;

  const stats = [
    { label: 'مؤكدة', count: confirmed, color: 'bg-emerald-500' },
    { label: 'معلقة', count: pending, color: 'bg-amber-400' },
    { label: 'مكتملة', count: completed, color: 'bg-blue-500' },
    { label: 'ملغاة', count: cancelled, color: 'bg-rose-500' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
      <h3 className="font-bold text-lg mb-4">احصائيات الحجوزات</h3>
      <div className="space-y-4">
        {stats.map(s => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1">
                <span>{s.label}</span>
                <span className="font-bold">{s.count}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className={`${s.color} h-full`} style={{ width: `${total ? (s.count / total) * 100 : 0}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
