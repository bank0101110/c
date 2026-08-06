import { IBM_Plex_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";

// IBM Plex Sans Thai มีทั้งไทยและละตินในตระกูลเดียว ตัวไทยเป็นแบบไม่มีหัว
// อ่านง่ายที่ขนาดเล็ก และผสมกับคำอังกฤษ (ชื่อสินค้า/ปุ่ม) แล้วน้ำหนักตัวอักษรไม่แตกกัน
const sans = IBM_Plex_Sans_Thai({
  variable: "--font-sans",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="th"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
