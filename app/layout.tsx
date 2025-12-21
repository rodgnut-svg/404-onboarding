import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "404Found - Client Onboarding Portal",
  description: "Secure onboarding portal for 404Found clients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

