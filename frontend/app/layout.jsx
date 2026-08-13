import "../src/index.css";
import Providers from "./providers";
import { Toaster } from "../src/components/ui/sonner";

export const metadata = {
  title: "BNB Mini",
  description: "BNB Mini platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
