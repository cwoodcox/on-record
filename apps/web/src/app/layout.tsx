import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "On Record — Contact Your Utah Legislator",
  description:
    "Write your Utah state representative or senator in minutes. On Record helps you find your legislator, surface their voting record, and send a personal, cited message — using AI you already have.",
  keywords:
    "contact Utah legislator, write my state representative Utah, email Utah state senator",
  openGraph: {
    title: "On Record — Contact Your Utah Legislator",
    description:
      "Find your Utah legislator, surface their record, and send a personal cited message in minutes.",
    url: "https://getonrecord.org",
    siteName: "On Record",
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://getonrecord.org",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${atkinson.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
