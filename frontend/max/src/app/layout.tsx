import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  WebSocketProvider,
  ThemeProvider,
  AuthProvider,
  ReactQueryProvider,
} from "@/providers";
import { SecurityProvider } from "@/components/security/security-provider";
import { Toaster } from "sonner";
import { ClientOnlyWrapper } from "@/components/client-only-wrapper";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { SkipToContent } from "@/components/accessibility/accessibility-utils";
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
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
        <SkipToContent />
        <SecurityProvider>
          <ThemeProvider>
            <ReactQueryProvider>
              <AuthProvider>
                <WebSocketProvider>
                  {children}
                  <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    duration={4000}
                    toastOptions={{
                      // Accessibility improvements for toasts
                      role: "status",
                      "aria-live": "polite",
                      "aria-atomic": "true",
                    }}
                  />
                  <ClientOnlyWrapper>
                    <ServiceWorkerRegistration />
                    <PerformanceMonitor />
                  </ClientOnlyWrapper>
                </WebSocketProvider>
              </AuthProvider>
            </ReactQueryProvider>
          </ThemeProvider>
        </SecurityProvider>
      </body>
    </html>
  );
}
