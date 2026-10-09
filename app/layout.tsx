import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const khoBaiFont = localFont({
  variable: "--font-geist-sans",
  display: "swap",
  src: [
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-Regular.ttf", weight: "400" },
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-Medium.ttf", weight: "500" },
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-SemiBold.ttf", weight: "600" },
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-Bold.ttf", weight: "700" },
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-ExtraBold.ttf", weight: "800" },
  ],
});

export const metadata: Metadata = {
  title: "KhoBai",
  description: "Ứng dụng quản lý học tập",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${khoBaiFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
