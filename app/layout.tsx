import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import "./globals.css";
import { SiteNavbar } from "@/components/site-navbar";

const afacad = Afacad({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LabLink",
  description: "The research marketplace connecting students with labs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${afacad.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteNavbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
