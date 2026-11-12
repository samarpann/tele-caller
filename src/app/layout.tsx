import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JewelERP Telecaller | West Delhi Jewellers Edition',
  description: 'JewelERP Telecaller CRM & Sales Dialer for West Delhi Showrooms & Diamond Merchants',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#090d16] text-[#f1f5f9] min-h-screen antialiased select-none">
        {children}
      </body>
    </html>
  );
}
