import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WebSocketProvider, ThemeProvider, AuthProvider } from "@/providers";
import { SecurityProvider } from "@/components/security/security-provider";
import { Toaster } from "sonner";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PerformanceMonitor } from "@/components/performance-monitor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Advocacia Direta - Dashboard",
  description: "Sistema de gestão de atendimento jurídico via WhatsApp",
  keywords: ["advocacia", "whatsapp", "atendimento", "jurídico", "dashboard"],
  authors: [{ name: "Advocacia Direta" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Advocacia Direta",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Advocacia Direta",
    title: "Advocacia Direta - Dashboard",
    description: "Sistema de gestão de atendimento jurídico via WhatsApp",
  },
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SecurityProvider>
          <ThemeProvider>
            <AuthProvider>
              <WebSocketProvider>
                {children}
                <Toaster 
                  position="top-right"
                  richColors
                  closeButton
                  duration={4000}
                />
                <ServiceWorkerRegistration />
                <PerformanceMonitor />
              </WebSocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </SecurityProvider>
      </body>
    </html>
  );
}
