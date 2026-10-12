const fs = require('fs');
const file = 'src/components/AccountStatement.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\.toLocaleString\(undefined, \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)/g, '.toLocaleString(undefined, { maximumFractionDigits: 2 })');
content = content.replace(/\.toLocaleString\(undefined, \{ minimumFractionDigits: 2 \}\)/g, '.toLocaleString(undefined, { maximumFractionDigits: 2 })');
content = content.replace(/\.toLocaleString\(undefined, \{ minimumFractionDigits: 1, maximumFractionDigits: 1 \}\)/g, '.toLocaleString(undefined, { maximumFractionDigits: 2 })');
content = content.replace(/\.toLocaleString\(undefined, \{ minimumFractionDigits: 1 \}\)/g, '.toLocaleString(undefined, { maximumFractionDigits: 2 })');

// Also adjust font sizes and padding in print view table
content = content.replace(/<table className="w-full border-collapse text-right text-xs">/g, '<table className="w-full border-collapse text-right text-[10px]">');
content = content.replace(/<th className="p-3">/g, '<th className="py-1 px-2">');
content = content.replace(/<th className="p-3 bg-indigo-50 text-indigo-950 font-black">/g, '<th className="py-1 px-2 bg-indigo-50 text-indigo-950 font-black">');
content = content.replace(/<td className="p-3/g, '<td className="py-1 px-2');

content = content.replace(/<table className="w-full border-collapse text-right text-\[11px\] leading-tight">/g, '<table className="w-full border-collapse text-right text-[9px] leading-tight">');
content = content.replace(/<th className="p-2\.5 w-12 text-center">/g, '<th className="py-1 px-2 w-12 text-center">');
content = content.replace(/<th className="p-2\.5 w-24/g, '<th className="py-1 px-2 w-24');
content = content.replace(/<th className="p-2\.5 w-28/g, '<th className="py-1 px-2 w-28');
content = content.replace(/<th className="p-2\.5">/g, '<th className="py-1 px-2">');
content = content.replace(/<td className="p-2/g, '<td className="py-0.5 px-2');
content = content.replace(/<td className="p-2\.5/g, '<td className="py-0.5 px-2');

fs.writeFileSync(file, content);
console.log("Done updating AccountStatement.tsx");
