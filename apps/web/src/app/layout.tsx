import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";
import { Footer } from "../components/Footer";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getonrecord.org"),
  title: "On Record — Contact Your Utah Legislator",
  description:
    "Write your Utah state legislator in minutes. On Record finds your representative, surfaces their voting record, and helps you draft a personal, cited message.",
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
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
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
        <Footer />
      </body>
    </html>
  );
}
