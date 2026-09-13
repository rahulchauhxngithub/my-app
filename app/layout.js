import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header"; // ✅ Correct import
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "saarthAI",
  description: "Find your dream ride!",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className}`}>
          <Header /> {/* ✅ Correct usage */}
          <main className="min-h-screen">{children}</main>
          <Toaster richColors />
          <footer className="bg-blue-50 py-12">
            <div className="container mx-auto px-4 text-center text-grey-600">
              <p>made with love by rahulchauhxn :)</p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
