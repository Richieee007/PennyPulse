import type { Metadata } from "next";
import { Inter, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const ibmPlexSerif = IBM_Plex_Serif({

  subsets:['latin'],
  weight:['400', '700'],
  variable: '--font-ibm-plex-sherif'
})

export const metadata: Metadata = {
  title: "The Peoples Bank",
  description: "The Peoples Bank is created by the people, for the people!",
  icons:{
    icon:'/icons/logo1.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${ibmPlexSerif.variable}`}>{children}</body>
    </html>
  );
}
