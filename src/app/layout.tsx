import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { AlertProvider } from "@/components/Alert";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vertix - Painel da Clínica",
  description: "Sistema de gestão para clínicas de estética",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning>
      <body className="antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <ThemeProvider>
          <AuthProvider>
            <AlertProvider>
              {children}
            </AlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}