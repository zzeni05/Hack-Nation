import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operon: From hypothesis to lab-ready experiments",
  description:
    "Operon compiles a scientific hypothesis into a personalized, source-grounded experiment plan that a real lab can pick up and execute.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,30..100;1,9..144,300..900,30..100&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          fontFamily: "Fraunces, Georgia, serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
