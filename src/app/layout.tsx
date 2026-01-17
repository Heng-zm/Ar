import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

// 1. Optimize Font Loading using next/font
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// 2. AR-Specific Viewport Settings
// This is crucial for mobile AR to feel like a native app.
export const viewport: Viewport = {
  themeColor: '#000000', // Matches the camera background
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,      // Prevents page zooming when manipulating 3D models
  userScalable: false,  // Disables pinch-zoom on the UI layer
};

export const metadata: Metadata = {
  title: 'ARchitect',
  description: 'Interactive 3D model placement in AR',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 3. Force dark mode class and handle hydration warnings
    <html lang="en" className="dark" suppressHydrationWarning>
      <body 
        className={`${inter.className} antialiased h-screen w-screen overflow-hidden bg-black text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}