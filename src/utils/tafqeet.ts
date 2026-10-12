export function tafqeet(amount: number, currency = 'YER'): string {
  if (isNaN(amount) || amount === 0) return 'صفر ريال';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(num: number): string {
    let result = '';
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    if (h > 0) result += hundreds[h];
    if (remainder > 0) {
      if (result) result += ' و';
      if (remainder < 20) {
        result += ones[remainder];
      } else {
        const o = remainder % 10;
        const t = Math.floor(remainder / 10);
        if (o > 0) result += ones[o] + ' و';
        result += tens[t];
      }
    }
    return result;
  }

  let num = Math.floor(Math.abs(amount));
  const parts: string[] = [];

  const billions = Math.floor(num / 1000000000);
  num %= 1000000000;
  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else parts.push(convertGroup(billions) + ' مليارات');
  }

  const millions = Math.floor(num / 1000000);
  num %= 1000000;
  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else parts.push(convertGroup(millions) + ' ملايين');
  }

  const thousands = Math.floor(num / 1000);
  num %= 1000;
  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else parts.push(convertGroup(thousands) + ' آلاف');
  }

  if (num > 0) {
    parts.push(convertGroup(num));
  }

  let currencyName = 'ريال يمني';
  if (currency === 'SAR') currencyName = 'ريال سعودي';
  else if (currency === 'USD') currencyName = 'دولار أمريكي';

  return (parts.join(' و') || 'صفر') + ' ' + currencyName + ' فقط لا غير';
}
