import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "../components/app/ThemeProvider";
import { GlobalLoadingOverlayProvider } from "../components/app/GlobalLoadingOverlay";

export const metadata: Metadata = {
  title: {
    default: "BuildFlow Africa  Construction operations, finance and AI in one platform.",
    template: "%s · BuildFlow Africa"
  },
  description:
    "AI-assisted construction operations platform for contractors across Africa: estimating, projects, documents, field work, finance and analytics.",
  applicationName: "BuildFlow Africa"
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#101412" }
  ]
};

const themeScript = `(function(){try{var t=localStorage.getItem('epa.theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Self-hosting via next/font is avoided deliberately: the Docker build must not depend on
            reaching fonts.googleapis.com at build time. The stylesheet loads at runtime and the
            system stack in globals.css is a complete fallback. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <GlobalLoadingOverlayProvider>{children}</GlobalLoadingOverlayProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
