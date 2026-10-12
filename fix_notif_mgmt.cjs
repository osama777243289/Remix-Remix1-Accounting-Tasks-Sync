const fs = require('fs');
let code = fs.readFileSync('src/components/NotificationSubscriptionsManagement.tsx', 'utf8');

// Replace direct firebase calls with dbService calls.
// First, import them
code = code.replace("import { db } from '../lib/firebase';", "import { db } from '../lib/firebase';\nimport { subscribeAppUsers, subscribeAccounts, subscribeAccountSubscriptions, addAccountSubscription, updateAccountSubscription } from '../lib/dbService';");

// Replace the useEffect that subscribes to users, accounts, subs
const oldUseEffect = /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/m;
const newUseEffect = `useEffect(() => {
    const unsubUsers = subscribeAppUsers(setUsers);
    const unsubAccounts = subscribeAccounts(setAccounts);
    const unsubSubs = subscribeAccountSubscriptions(setSubscriptions);
    setLoading(false);
    return () => { unsubUsers(); unsubAccounts(); unsubSubs(); };
  }, []);`;
code = code.replace(oldUseEffect, newUseEffect);

// Replace handleToggleAccount
const oldToggle = /const handleToggleAccount = async \(userId: string, accountId: string\) => \{[\s\S]*?await setDoc\(subRef, \{ userId, accountIds: newAccountIds \}, \{ merge: true \}\);\n  \};/m;
const newToggle = `const handleToggleAccount = async (userId: string, accountId: string) => {
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
  };`;
code = code.replace(oldToggle, newToggle);

// Replace handleSelectAll
const oldSelectAll = /const handleSelectAll = async \(userId: string, shouldSelectAll: boolean\) => \{[\s\S]*?await setDoc\(subRef, \{ userId, accountIds: newAccountIds \}, \{ merge: true \}\);\n  \};/m;
const newSelectAll = `const handleSelectAll = async (userId: string, shouldSelectAll: boolean) => {
    const transactionalAccountIds = accounts.filter(a => a.isTransactional).map(a => a.id);
    const existingSub = subscriptions.find(s => s.userId === userId);
    
    const newAccountIds = shouldSelectAll ? transactionalAccountIds : [];
    
    if (existingSub) {
      await updateAccountSubscription(existingSub.id, { accountIds: newAccountIds });
    } else {
      await addAccountSubscription({ userId, accountIds: newAccountIds });
    }
  };`;
code = code.replace(oldSelectAll, newSelectAll);

fs.writeFileSync('src/components/NotificationSubscriptionsManagement.tsx', code);
