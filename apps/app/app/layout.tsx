import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { WalletProviderWrapper } from "@/components/providers/wallet-provider"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { WalletButton } from "@/components/wallet-button"
import { Toaster } from "@/components/ui/sonner"
import { Separator } from "@/components/ui/separator"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "BOBT Dashboard",
  description: "BOBT Stablecoin - Dashboard for minting and burning operations",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <WalletProviderWrapper>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between gap-2 border-b px-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
                  <h1 className="text-base sm:text-lg font-semibold hidden sm:block">Dashboard</h1>
                </div>
                <WalletButton />
              </header>
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
          </WalletProviderWrapper>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
