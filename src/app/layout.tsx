import type { Metadata, Viewport } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";

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

/**
 * Root layout = fonts + globals only. Storefront chrome lives in
 * (site)/layout.tsx; the admin panel has its own shell in admin/layout.tsx.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${workSans.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: browser extensions inject attributes into <body> */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
