import "./globals.css";
import { Playfair_Display, Outfit } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});
const outfit = Outfit({ subsets: ["latin"], variable: "--font-body" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${outfit.variable}`}
    >
      <body className="min-h-full flex flex-col font-body antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
