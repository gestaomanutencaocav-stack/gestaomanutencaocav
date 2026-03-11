import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Painel Manutenção CAV',
  description: 'Sistema de gestão de manutenção predial e industrial para o CAV.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} dark`}>
      <body suppressHydrationWarning className="font-sans">
        {children}
      </body>
    </html>
  );
}
