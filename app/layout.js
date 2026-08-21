import { IBM_Plex_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";
import { ToastProvider } from "@/components/ui/toast";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { CartBar } from "@/components/cart/cart-bar";

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
  // template ทำให้หน้าลูกส่งแค่ชื่อของตัวเองมา แล้วได้ "ชื่อสินค้า — Stockly" อัตโนมัติ
  title: { default: siteConfig.name, template: `%s — ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  // iOS ไม่อ่าน manifest ตอน "เพิ่มไปยังหน้าจอโฮม" ต้องบอกผ่าน meta พวกนี้แทน
  // ไม่ใส่ = เปิดจากไอคอนแล้วยังโผล่แถบ URL ของ Safari อยู่ดี
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  // ค่าตั้งต้นของพรีวิวตอนแชร์ หน้าไหนมีของตัวเอง (เช่นหน้าสินค้า) จะเขียนทับเฉพาะที่ตั้ง
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "th_TH",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

// themeColor = สีแถบสถานะ/แถบชื่อแอปตอนเปิดแบบติดตั้งแล้ว ต้องตรงกับ --background ของธีม
// แอปนี้ยังเป็นโหมดสว่างอย่างเดียว เลยตรึง colorScheme ไว้ ไม่ให้ระบบไปกลับสีช่องกรอกเอง
export const viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="th"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          {children}
          {/* ตะกร้าเบิกของตามไปทุกหน้า เดินหยิบของข้ามสินค้าแล้วกดบันทึกทีเดียวจบ
              (ซ่อนตัวเองอยู่แล้วถ้าตะกร้าว่าง) */}
          <CartBar />
        </ToastProvider>
        <ServiceWorkerRegistrar />
        <InstallPrompt />
      </body>
    </html>
  );
}
