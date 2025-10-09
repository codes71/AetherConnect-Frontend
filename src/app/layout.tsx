import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "./client-layout";
import { AuthProvider } from "@/context/auth-context"; // Import AuthProvider

export const metadata: Metadata = {
  title: "Aether Connect",
  description: "The future of communication.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider> {/* Wrap with AuthProvider */}
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
