// src/app/layout.js
import './globals.css';
import { Orbitron } from 'next/font/google';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'CyberStars',
  description: 'Platform where you can earn playing your favourite game',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-background text-primary">
      <body className={`${orbitron.className} font-orbitron relative`}>
        {children}
      </body>
    </html>
  );
}
