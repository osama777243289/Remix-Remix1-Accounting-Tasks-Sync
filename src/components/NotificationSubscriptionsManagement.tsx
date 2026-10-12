import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { subscribeAppUsers, subscribeAccounts, subscribeAccountSubscriptions, addAccountSubscription, updateAccountSubscription } from '../lib/dbService';
import { User, Account, AccountNotificationSubscription } from '../types';
import { Bell, User as UserIcon, Save } from 'lucide-react';

export default function NotificationSubscriptionsManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscriptions, setSubscriptions] = useState<AccountNotificationSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = subscribeAppUsers(setUsers);
    const unsubAccounts = subscribeAccounts(setAccounts);
    const unsubSubs = subscribeAccountSubscriptions(setSubscriptions);
    setLoading(false);
    return () => { unsubUsers(); unsubAccounts(); unsubSubs(); };
  }, []);

  const handleToggleAccount = async (userId: string, accountId: string) => {
    const existingSub = subscriptions.find(s => s.userId === userId);
    const newAccountIds = existingSub 
      ? existingSub.accountIds.includes(accountId) 
        ? existingSub.accountIds.filter(id => id !== accountId)
        : [...existingSub.accountIds, accountId]
      : [accountId];
    
    if (existingSub) {
      await updateAccountSubscription(existingSub.id, { accountIds: newAccountIds });
    } else {
      await addAccountSubscription({ userId, accountIds: newAccountIds });
    }
  };

  const handleSelectAll = async (userId: string, shouldSelectAll: boolean) => {
    const transactionalAccountIds = accounts.filter(a => a.isTransactional).map(a => a.id);
    const existingSub = subscriptions.find(s => s.userId === userId);
    
    const newAccountIds = shouldSelectAll ? transactionalAccountIds : [];
    
    if (existingSub) {
      await updateAccountSubscription(existingSub.id, { accountIds: newAccountIds });
    } else {
      await addAccountSubscription({ userId, accountIds: newAccountIds });
    }
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6 text-right">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
        <Bell className="h-8 w-8 text-indigo-500" />
        تخصيص إشعارات الحركات للمستخدمين
      </h2>
      <div className="space-y-4">
        {users.map(user => {
          const userSub = subscriptions.find(s => s.userId === user.id);
          const subAccountIds = userSub ? userSub.accountIds : [];
          const transactionalAccounts = accounts.filter(a => a.isTransactional);
          const isAllSelected = transactionalAccounts.length > 0 && subAccountIds.length === transactionalAccounts.length;
          const isExpanded = expandedUserId === user.id;

          return (
            <div key={user.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                className="w-full flex items-center justify-between gap-2 font-bold text-slate-800 dark:text-white"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-indigo-500" />
                  {user.name || user.username}
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full mr-2">
                    {subAccountIds.length} حساب
                  </span>
                </div>
                <span>{isExpanded ? '▲' : '▼'}</span>
              </button>
              
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-end border-b border-slate-200 dark:border-slate-700 pb-2">
                    <button
                      onClick={() => handleSelectAll(user.id, !isAllSelected)}
                      className="text-xs px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-black hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      {isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {transactionalAccounts.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => handleToggleAccount(user.id, acc.id)}
                        className={`text-xs p-2 rounded-lg font-bold transition-all text-center ${subAccountIds.includes(acc.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}
                      >
                        {acc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
