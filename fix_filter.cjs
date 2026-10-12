const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the notifyWithSetting filtering logic
const oldFilterRegex = /if \(tx\) \{[\s\S]*?\/\/ Filter out notifications if targetUserIds is set/m;

const newFilter = `if (tx) {
        // Strict Enforcement for Financial Contexts
        const isFinancialType = ['journal', 'voucher', 'booking', 'amendment', 'refund'].includes(settingId);
        
        if (isFinancialType) {
          const userSubs = accountNotificationSubscriptions.filter(s => s.userId === currentUserId);
          
          // If the user has NO subscription records, they shouldn't receive financial notifications
          // or maybe they should receive everything? The user's expectation is that if they have subscriptions,
          // they only receive matching ones.
          
          if (userSubs.length > 0) {
            const subscribedAccountIds = Array.from(new Set(userSubs.flatMap(s => s.accountIds || []))).filter(Boolean);
            
            let involvedIds = new Set<string>();

            if (Array.isArray(tx)) {
              tx.forEach((id: any) => typeof id === 'string' && id && involvedIds.add(id));
            } else if (typeof tx === 'object' && tx !== null) {
              if (tx.debitAccountId) involvedIds.add(tx.debitAccountId);
              if (tx.creditAccountId) involvedIds.add(tx.creditAccountId);
              if (tx.cashBankAccountId) involvedIds.add(tx.cashBankAccountId);
              if (tx.fromToAccountId) involvedIds.add(tx.fromToAccountId);
              if (tx.accountId) involvedIds.add(tx.accountId);
              
              if (Array.isArray(tx.entries)) {
                tx.entries.forEach((e: any) => e && e.accountId && involvedIds.add(e.accountId));
              }
              if (Array.isArray(tx.debitEntries)) {
                tx.debitEntries.forEach((e: any) => e && e.accountId && involvedIds.add(e.accountId));
              }
              if (Array.isArray(tx.creditEntries)) {
                tx.creditEntries.forEach((e: any) => e && e.accountId && involvedIds.add(e.accountId));
              }
            }

            const involvedAccountIds = Array.from(involvedIds).filter(Boolean);
            
            // Allow if there is any overlap
            const hasMatch = involvedAccountIds.some(id => subscribedAccountIds.includes(id));
            
            if (!hasMatch) {
              console.log(\`[Root Filter] Blocking \${settingId}: No matching account subscriptions.\`);
              return true; // Mark as handled (blocked)
            }
          }
        }
      }

      // Filter out notifications if targetUserIds is set`;

code = code.replace(oldFilterRegex, newFilter);

fs.writeFileSync('src/App.tsx', code);
