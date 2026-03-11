import type {Metadata} from 'next';
import { DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Painel Manutenção CAV',
  description: 'Sistema de gestão de manutenção predial e industrial para o CAV.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${ibmPlexMono.variable} dark`}>
      <body suppressHydrationWarning className="font-sans bg-[#0F172A] text-slate-200">
        {children}
      </body>
    </html>
  );
}
