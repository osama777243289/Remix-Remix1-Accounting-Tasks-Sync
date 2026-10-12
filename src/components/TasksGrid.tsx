/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Account, Task } from "../types";
import { Calendar, CheckCircle2, Circle, AlertCircle, Plus, Trash2, Tag, Link } from "lucide-react";
import { addTask, updateTask, deleteTask } from "../lib/dbService";
import { toast } from "sonner";

interface TasksGridProps {
  tasks: Task[];
  accounts: Account[];
}

export default function TasksGrid({ tasks, accounts }: TasksGridProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "completed">("all");

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title || !dueDate) {
      setErrorMsg("الرجاء إدخال عنوان المهمة وتاريخ الاستحقاق المحدد.");
      return;
    }

    try {
      await addTask({
        title,
        description,
        dueDate,
        status: "pending",
        priority,
        linkedAccountId: linkedAccountId || null,
      });

      // Reset
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("medium");
      setLinkedAccountId("");
      setIsAdding(false);
      toast.success("تمت إضافة المهمة بنجاح");
    } catch (err) {
      setErrorMsg("فشل فتح المهمة اليومية.");
      toast.error("خطأ في إضافة المهمة");
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    try {
      await updateTask(task.id, { status: nextStatus });
      toast.success(nextStatus === 'completed' ? "تم إكمال المهمة" : "تمت إعادة المهمة للانتظار");
    } catch (err) {
      console.error("Error toggling status:", err);
      toast.error("خطأ في تحديث الحالة");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm("هل تريد شطب هذه المهمة اليومية نهائياً من المفكرة؟")) {
      try {
        await deleteTask(id);
        toast.success("تم حذف المهمة بنجاح");
      } catch (err) {
        console.error("Error deleting task:", err);
        toast.error("خطأ في حذف المهمة");
      }
    }
  };

  const getAccountName = (id: string | null) => {
    if (!id) return null;
    const acc = accounts.find((a) => a.id === id);
    return acc ? `(${acc.code}) - ${acc.name}` : null;
  };

  const getPriorityStyle = (pr: Task["priority"]) => {
    switch (pr) {
      case "high":
        return "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900";
      case "medium":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900";
      case "low":
      default:
        return "bg-slate-50 text-slate-600 dark:bg-slate-850 dark:text-slate-400 border-slate-100 dark:border-slate-850";
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === "pending") return t.status === "pending";
    if (activeFilter === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div id="tasks-grid-root" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 rtl animate-slideup">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 id="tasks-heading" className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
            متابعة المهام التشغيلية اليومية
          </h2>
          <p id="tasks-sub" className="text-xs text-slate-500 mt-1">
            مفكرة يومية لتتبع الأنشطة المالية والامتثالات الضريبية وربطها مباشرة بالدليل المحاسبي.
          </p>
        </div>

        <button
          id="btn-add-task-toggle"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          إضافة مهمة جديدة
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <button
          id="task-filter-all"
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeFilter === "all"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          كافة المهام ({tasks.length})
        </button>
        <button
          id="task-filter-pending"
          onClick={() => setActiveFilter("pending")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeFilter === "pending"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          قيد الانتظار ({tasks.filter(t => t.status === "pending").length})
        </button>
        <button
          id="task-filter-completed"
          onClick={() => setActiveFilter("completed")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeFilter === "completed"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-955/40 dark:text-emerald-400"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          المكتملة ({tasks.filter(t => t.status === "completed").length})
        </button>
      </div>

      {isAdding && (
        <form
          id="add-task-form"
          onSubmit={handleAddTaskSubmit}
          className="mb-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 text-xs animate-slideup"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center justify-between">
            <span>تسجيل وتوكيل مهمة عمل جديدة</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250"
            >
              إلغاء ×
            </button>
          </h3>

          {errorMsg && <div className="p-2.5 mb-3 bg-red-50 text-red-600 rounded-lg">{errorMsg}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">عنوان المهمة التشغيلية:</label>
              <input
                id="input-task-title"
                type="text"
                placeholder="مثال: تقديم الإقرار الضريبي للربع الثاني..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">تاريخ الاستحقاق النهائي (Due Date):</label>
              <input
                id="input-task-duedate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">تحديد أولوية التنفيذ والسرعة:</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((pr) => (
                  <button
                    id={`btn-select-priority-${pr}`}
                    key={pr}
                    type="button"
                    onClick={() => setPriority(pr)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      priority === pr
                        ? "bg-indigo-600 text-white border-indigo-600 shadow"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {pr === "high" ? "🚨 حرجة جداً" : pr === "medium" ? "⚡ متوسطة الأهمية" : "☕ اعتيادية/منخفضة"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">ربط الحساب المرتبط بالدليل (اختياري):</label>
              <select
                id="select-task-link-account"
                value={linkedAccountId}
                onChange={(e) => setLinkedAccountId(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none"
              >
                <option value="">-- فك الارتباط / لا يوجد حساب مرتبط --</option>
                {accounts.filter(a => !!a.parentId).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    ({acc.code}) {acc.name} - ({acc.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">تفاصيل وتعليمات إضافية لحل المهمة:</label>
            <textarea
              id="input-task-desc"
              rows={2}
              placeholder="وصف الإجراءات الواجب اتباعها لإغلاق المهمة بنجاح..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              id="btn-add-task-cancel"
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350 hover:bg-slate-300 transition duration-150 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              id="btn-add-task-submit"
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-bold transition duration-150 cursor-pointer"
            >
              حفظ المهمة في المزامنة
            </button>
          </div>
        </form>
      )}

      {/* Grid of Tasks */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-sm text-slate-500">لا توجد مهام حالية في مصفاة الفرز هذه.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const priorityClass = getPriorityStyle(task.priority);
            const linkedName = getAccountName(task.linkedAccountId);

            return (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                className={`p-4 rounded-2xl border transition duration-150 hover:shadow-md flex flex-col justify-between ${
                  isCompleted
                    ? "bg-emerald-50/20 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/40 opacity-75"
                    : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button
                      id={`btn-toggle-task-${task.id}`}
                      onClick={() => toggleTaskStatus(task)}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer self-start mt-0.5"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 hover:scale-105 transition" />
                      )}
                    </button>

                    <div className="flex-1 mr-2 text-right">
                      <h4 className={`text-xs font-extrabold pb-0.5 ${isCompleted ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                        {task.title}
                      </h4>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${priorityClass}`}>
                          {task.priority === "high" ? "🚨 عاجلة جداً" : task.priority === "medium" ? "⚡ متوسطة" : "☕ اعتيادية"}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-[9px] text-slate-500 font-semibold flex items-center gap-1 border border-slate-200/50">
                          <Calendar className="h-2.5 w-2.5" />
                          استحقاق: {task.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {task.description && (
                    <p className={`text-[11px] leading-relaxed mb-3 mr-7 ${isCompleted ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-350"}`}>
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="mr-7 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[10px]">
                  {linkedName ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 shrink-0">
                      <Link className="h-3 w-3" />
                      مرتبط بـ: {linkedName}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">مستقلة وغير مرتبطة</span>
                  )}

                  <button
                    id={`btn-del-task-${task.id}`}
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                    title="شطب المهمة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
