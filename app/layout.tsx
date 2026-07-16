import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChronoBank - Financial Management",
  description:
    "Temporal financial automation for Ghanaian SMEs — patterns, forecasts, and rules",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon",
  },
  appleWebApp: {
    capable: true,
    title: "ChronoBank",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            {process.env.NODE_ENV === "production" && <Analytics />}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
