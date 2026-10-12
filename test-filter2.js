const involvedAccountIds = ["Customer B", "Cash"];
const subscribedAccountIds = ["Customer A"];
const hasMatch = involvedAccountIds.some(id => subscribedAccountIds.includes(id));
console.log({ hasMatch });
