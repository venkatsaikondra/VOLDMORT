import type { Metadata } from "next";
import { JetBrains_Mono} from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/provider";

const jetBrains_Mono=JetBrains_Mono({
  variable:"--font-jetbrains-mono",
  subsets:["latin"],
})


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` ${jetBrains_Mono} antialiased`}
      >
        <Providers>
          {children}
          </Providers>
      </body>
    </html>
  );
}
