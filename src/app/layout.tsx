import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Merchant Route — Wasteland Caravan & Tactical RPG",
  description:
    "Post-collapse top-down tactical RPG and merchant caravan simulator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-screen max-h-screen overflow-hidden bg-[#232a20] text-[#ebdcb2] caravan-chassis antialiased selection:bg-[#4d5946] selection:text-[#fde047]">
        {children}
      </body>
    </html>
  );
}
