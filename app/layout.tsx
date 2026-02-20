import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PredictRun — Real-Time Prediction Market Game",
  description: "Endless runner game powered by live Polymarket, Kalshi & Opinion Labs data. Analytics/education tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
