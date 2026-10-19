import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dear Tomorrow — Some words are worth waiting for",
  description:
    "A private world for letters, memory books, journeys, and the moments that connect them. Explore the Dear Tomorrow interactive preview.",
  applicationName: "Dear Tomorrow",
  openGraph: {
    title: "Dear Tomorrow — Some words are worth waiting for",
    description: "A private world for two, made of letters and little moments.",
    type: "website",
    siteName: "Dear Tomorrow",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F8F4ED",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
