import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Signal",
  description: "Private messenger",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark antialiased`}>
      <body className="h-full overflow-hidden bg-[var(--bg-app)] text-[var(--text)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
