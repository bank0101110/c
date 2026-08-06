export const siteConfig = {
  // ชื่อแบรนด์ไม่แปล
  name: "Stockly",
  tagline: "รู้ยอดสต็อกได้ตลอดเวลา",
  description: "ดูสต็อกสินค้าทุกตัวทุกหน่วยแบบเรียลไทม์",
  nav: [
    { label: "หน้าแรก", href: "/" },
    { label: "สินค้า", href: "#products" },
    { label: "จัดการ", href: "/manage" },
  ],
  hero: {
    eyebrow: "สต็อกเรียลไทม์",
    title: "ของในสต็อก ค้นหาเจอในคลิกเดียว",
    subtitle: "ค้นหาสินค้าทั้งหมด แล้วดูยอดคงเหลือได้ละเอียดถึงหน่วยย่อยที่สุด",
    searchPlaceholder: "ค้นหาสินค้า...",
  },
  footer: {
    text: `© ${new Date().getFullYear()} Stockly สงวนลิขสิทธิ์`,
  },
};
