import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "./providers";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Taskonate",
  description: "Tasks that expire on schedule unless completed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#050814] text-slate-50 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
