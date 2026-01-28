import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminAuthProvider } from "@/lib/adminAuth";
import { AlertProvider } from "@/components/Alert";
import { ThemeProvider } from "@/lib/theme";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Vertix Admin - Painel Administrativo",
  description: "Painel administrativo Vertix",
};

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
      <Loader2 size={40} className="animate-spin text-primary" />
    </div>
  );
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <AlertProvider>
          <Suspense fallback={<LoadingFallback />}>
            {children}
          </Suspense>
        </AlertProvider>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
