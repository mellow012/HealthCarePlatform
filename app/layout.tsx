import type { Metadata } from "next";
import { Geist, Geist_Mono,Inter } from "next/font/google";
import MainLayout from '@/components/layout/MainLayout';
import {ErrorBoundary} from "@/components/ErrorBoundary";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",               // show fallback instantly
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'HealthCare Platform',
  description: 'Multi-tenant healthcare management system',
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
