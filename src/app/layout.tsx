import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth";
import { AlertProvider } from "@/components/Alert";
import { ThemeProvider } from "@/lib/theme";
import { Loader2 } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vertix - Painel da Clínica",
  description: "Sistema de gestão para clínicas de estética",
};

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <Loader2 size={40} className="animate-spin text-[#10b981]" />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <AlertProvider>
              <Suspense fallback={<LoadingFallback />}>
                {children}
              </Suspense>
            </AlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}