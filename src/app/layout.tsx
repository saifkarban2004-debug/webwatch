import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WebWatch — Stream Movies & TV Shows',
  description: 'Premium dark-themed streaming site for movies and TV shows.',
  keywords: ['movies', 'tv shows', 'streaming', 'vod', 'webwatch'],
  openGraph: {
    title: 'WebWatch — Stream Movies & TV Shows',
    description: 'Premium dark-themed streaming site for movies and TV shows.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Script 
          src="https://quge5.com/88/tag.min.js" 
          data-zone="263344" 
          data-cfasync="false" 
          strategy="afterInteractive" 
        />
        <Navbar />
        <main className="main-content">
          {children}
        </main>
        <footer className="site-footer">
          <div className="container footer-content">
            <div className="footer-brand">
              <span className="logo-text text-gradient">▶ WebWatch</span>
              <p className="footer-desc text-secondary">Premium streaming without the premium price.</p>
            </div>
            <div className="footer-links">
              <a href="/">Home</a>
              <a href="/movies">Movies</a>
              <a href="/tv">TV Shows</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="text-tertiary">
              © {new Date().getFullYear()} WebWatch. All rights reserved. 
              This site does not store any files on our server, we only link to the media which is hosted on 3rd party services.
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
