import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Кофейный сомелье — AI-ассистент обжарщика кофе',
  description: 'AI-ассистент обжарщика кофе для подбора сортов, помола, оборудования и кофейной подписки',
  openGraph: {
    title: 'Кофейный сомелье — AI-ассистент обжарщика кофе',
    description: 'AI-ассистент обжарщика кофе для подбора сортов, помола, оборудования и кофейной подписки',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Кофейный сомелье — AI-ассистент обжарщика кофе',
    description: 'AI-ассистент обжарщика кофе для подбора сортов, помола, оборудования и кофейной подписки',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
