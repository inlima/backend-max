import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/providers";
import { SimpleAuthProvider } from "@/providers/simple-auth-provider";
import { Toaster } from "sonner";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Working Login - Advocacia Direta",
  description: "Página de login funcional",
};

export default function WorkingLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SimpleAuthProvider>
            {children}
            <Toaster 
              position="top-right"
              richColors
              closeButton
              duration={4000}
            />
          </SimpleAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}