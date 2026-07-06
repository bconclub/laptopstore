import type { Metadata, Viewport } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import SmoothScroll from "@/components/SmoothScroll";
import { CartProvider } from "@/components/cart/CartProvider";
import CartDrawer from "@/components/cart/CartDrawer";

// Retail Precision design system: Work Sans across all levels
const workSans = Work_Sans({
  variable: "--font-work",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Laptop Store India | Laptops, Refurbished Laptops, Spares & Service",
    template: "%s · Laptop Store India",
  },
  description:
    "The Laptop Specialist since 2007. Authorised Dell, HP, Lenovo & Asus store. New and certified refurbished laptops, 2,600+ genuine spare parts, and expert repair across 6 cities.",
};

export const viewport: Viewport = {
  themeColor: "#006195",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${workSans.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: browser extensions inject attributes into <body> */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <SmoothScroll />
        <CartProvider>
          <Header />
          <main className="flex-1 pb-20 lg:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
