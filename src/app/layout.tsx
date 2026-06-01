import type { Metadata } from "next";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import { APP_NAME, CUSTOMER_LOGIN_TITLE } from "@/lib/branding";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: CUSTOMER_LOGIN_TITLE,
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
