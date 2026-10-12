import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Cloud, Save } from 'lucide-react';

interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
}

interface FirebaseConfigFormProps {
  initialConfig: FirebaseConfig;
  onSave: (config: FirebaseConfig) => void;
}

export default function FirebaseConfigForm({ initialConfig, onSave }: FirebaseConfigFormProps) {
  const [formData, setFormData] = useState<FirebaseConfig>(initialConfig);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm" dir="rtl">
      <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-6">
        <Cloud className="h-6 w-6 text-indigo-500" />
        إعدادات الربط بالمشروع السحابي (Firebase)
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { name: 'projectId', label: 'معرف المشروع (Project ID)' },
          { name: 'appId', label: 'معرف التطبيق (App ID)' },
          { name: 'apiKey', label: 'مفتاح الـ API (API Key)' },
          { name: 'authDomain', label: 'نطاق المصادقة (Auth Domain)' },
          { name: 'firestoreDatabaseId', label: 'معرف قاعدة بيانات Firestore' },
          { name: 'storageBucket', label: 'مخزن التخزين (Storage Bucket)' },
          { name: 'messagingSenderId', label: 'معرف مرسل الرسائل (Messaging Sender ID)' },
          { name: 'measurementId', label: 'معرف القياس (Measurement ID)' },
        ].map(field => (
          <div key={field.name}>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{field.label}</label>
            <input
              type="text"
              name={field.name}
              value={(formData as any)[field.name]}
              onChange={handleChange}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
        <div className="pt-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-6 rounded-xl shadow-lg transition-all"
          >
            <Save className="h-4 w-4" />
            حفظ الإعدادات
          </motion.button>
        </div>
      </form>
    </div>
  );
}
