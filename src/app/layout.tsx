import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { Navbar } from "@/components/navbar";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a1a",
};

export const metadata: Metadata = {
  title: "Gordemy — AI підготовка до НМТ",
  description:
    "AI-платформа що перетворює підготовку до НМТ на гру. Персональний план, щоденні завдання і мотивація кожного дня.",
  openGraph: {
    title: "Gordemy — AI підготовка до НМТ",
    description:
      "Здобудь максимальний бал на НМТ з AI-платформою нового покоління",
    siteName: "Gordemy",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-70px)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}