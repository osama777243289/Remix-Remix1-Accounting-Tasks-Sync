/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Account, Currency, Task, SmartInsight } from "../types";
import { Sparkles, Brain, RefreshCw, AlertTriangle, CheckCircle, Info, ChevronRight } from "lucide-react";

interface SmartAIInsightsProps {
  accounts: Account[];
  currencies: Currency[];
  tasks: Task[];
}

export default function SmartAIInsights({ accounts, currencies, tasks }: SmartAIInsightsProps) {
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const getInsights = async (force: boolean = false) => {
    // Check localStorage first
    const cached = localStorage.getItem("accounting_smart_insights");
    const cachedTime = localStorage.getItem("accounting_smart_insights_time");

    if (cached && cachedTime && !force) {
      setInsights(JSON.parse(cached));
      setLastUpdated(cachedTime);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/smart-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts, tasks, currencies }),
      });

      const data = await response.json();
      if (data.insights) {
        setInsights(data.insights);
        const nowStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastUpdated(nowStr);
        localStorage.setItem("accounting_smart_insights", JSON.stringify(data.insights));
        localStorage.setItem("accounting_smart_insights_time", nowStr);
      }
    } catch (err) {
      console.error("Error fetching insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getInsights();
  }, [accounts, tasks]);

  const getTypeStyle = (type: SmartInsight["type"]) => {
    switch (type) {
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
          icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
          titleColor: "text-amber-800 dark:text-amber-300",
          bulletBg: "bg-amber-600",
        };
      case "success":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900",
          icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
          titleColor: "text-emerald-800 dark:text-emerald-300",
          bulletBg: "bg-emerald-600",
        };
      case "info":
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
          icon: <Info className="h-4 w-4 text-blue-600" />,
          titleColor: "text-blue-800 dark:text-blue-300",
          bulletBg: "bg-blue-600",
        };
    }
  };

  return (
    <div id="ai-insights-root" className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-indigo-950 rtl animate-slideup">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/20 rounded-xl relative pulse-glow">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 id="ai-insights-heading" className="text-base font-bold flex items-center gap-1">
              المستشار المالي الذكي (Gemini AI)
              <span className="text-[10px] bg-indigo-500 text-white font-extrabold px-1.5 py-0.5 rounded">
                مباشر
              </span>
            </h2>
            <p id="ai-insights-sub" className="text-[10px] text-slate-300">
              تحليل فوري للمركز المالي للدليل الهرمي وصلاحية أسعار المتداول والمهام اليومية.
            </p>
          </div>
        </div>

        <button
          id="btn-re-analyze-ai"
          onClick={() => getInsights(true)}
          disabled={loading}
          className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-2.5 py-1.5 rounded-lg border border-white/15 transition cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          إعادة التحليل الذكي
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Brain className="h-8 w-8 text-indigo-400 animate-pulse" />
            <p className="text-xs text-indigo-200 animate-pulse">جاري تفحص الدليل المالي والمهام وصرف العملات عبر مستشعرات الذكاء...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-slate-400">لا توجد توصيات متاحة حالياً. قم بطلب تحديث يدوي للتحليل الذكي.</p>
          </div>
        ) : (
          insights.map((insight, idx) => {
            const styles = getTypeStyle(insight.type);
            return (
              <div
                key={insight.id || idx}
                id={`insight-item-${idx}`}
                className={`p-3.5 rounded-xl border text-slate-800 dark:text-white transition duration-150 hover:translate-x-1 ${styles.bg}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{styles.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold leading-tight flex items-center gap-1.5 ${styles.titleColor}`}>
                      {insight.title}
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.bulletBg}`} />
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed mt-1">
                      {insight.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-3.5 border-t border-indigo-950 flex justify-between items-center text-[10px] text-slate-400">
        <span>🤖 تحليلات معززة بنموذج <strong className="text-indigo-400">Gemini 2.5 Flash</strong></span>
        <span>تحديث: {lastUpdated || "الآن"}</span>
      </div>
    </div>
  );
}
