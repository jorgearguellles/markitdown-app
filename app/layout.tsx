import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { PreviewBanner } from "@/components/PreviewBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarkItDown — Any file to Markdown",
  description: "Convert documents, images, audio, and more to clean Markdown in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-mono">
        <PreviewBanner />
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
