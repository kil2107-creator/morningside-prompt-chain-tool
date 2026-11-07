import type {
  Metadata,
} from "next";

import "./globals.css";

import ThemeSelector from "@/app/theme-selector";


export const metadata: Metadata = {
  title:
      "Morningside Caption Club — Prompt Chain Tool",

  description:
      "Create, edit, run, and inspect AI prompt chains.",
};


export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children:
      React.ReactNode;
}>) {
  return (
      <html
          lang="en"
          suppressHydrationWarning
      >
      <body>
      <ThemeSelector />

      {children}
      </body>
      </html>
  );
}
