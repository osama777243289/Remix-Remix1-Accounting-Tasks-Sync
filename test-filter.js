const involvedAccountIds = ["acc2", "acc3"];
const subscribedAccountIds = ["acc1"];
const hasMatch = involvedAccountIds.some(id => subscribedAccountIds.includes(id));
console.log({ hasMatch });
