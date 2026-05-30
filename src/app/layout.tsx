import type { Metadata } from "next";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schulung und Unterweisung – Sozialkonzept",
  description:
    "Interne 222 Schulung nach Einstellung: Unterweisung in das betriebliche Sozialkonzept",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
