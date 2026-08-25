export function toEn(s: string): string { 
  return s.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
          .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()); 
}

export function fmtPrice(p: string): string { 
  const n = toEn(p).replace(/\D/g, ""); 
  return n ? n.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""; 
}