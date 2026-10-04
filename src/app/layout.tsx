import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ToastContext';
import { HotelProvider } from '@/components/HotelContext';
import { LanguageProvider } from '@/components/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { CheckOutAlertModal } from '@/components/CheckOutAlertModal';
import { MaintenanceAlertModal } from '@/components/MaintenanceAlertModal';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AtithiStay | Multi-Hotel Guest Management System',
  description: 'Production-ready guest check-in, Aadhaar verification, and stay management for Indian hotel chains and guest houses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="gu" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 pb-28 sm:pb-32 lg:pb-6">
        <HotelProvider>
          <LanguageProvider>
            <ToastProvider>
              <Navbar />
              <CheckOutAlertModal />
              <MaintenanceAlertModal />
              <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-6">
                {children}
              </main>
            </ToastProvider>
          </LanguageProvider>
        </HotelProvider>
      </body>
    </html>
  );
}
