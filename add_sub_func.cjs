const fs = require('fs');
let code = fs.readFileSync('src/lib/dbService.ts', 'utf8');

const newFuncs = `
export const updateAccountSubscription = (id: string, updates: Partial<AccountNotificationSubscription>) =>
  genericUpdate<AccountNotificationSubscription>(
    "account_notification_subscriptions",
    id,
    updates,
    LOCAL_STORAGE_KEYS.ACCOUNT_SUBSCRIPTIONS,
    accountSubscriptionsCallbacks,
  );

export const addAccountSubscription = (item: Omit<AccountNotificationSubscription, "id">) =>
  genericAdd<AccountNotificationSubscription>(
    "account_notification_subscriptions",
    item,
    LOCAL_STORAGE_KEYS.ACCOUNT_SUBSCRIPTIONS,
    accountSubscriptionsCallbacks,
  );
`;

code += newFuncs;
fs.writeFileSync('src/lib/dbService.ts', code);
