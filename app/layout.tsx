import type { Metadata } from 'next';
import './globals.css';
import './workspace.css';
import './attachments.css';
import './intelligent-ui.css';
import 'katex/dist/katex.min.css';
export const metadata: Metadata = {
  title: 'Glimpse — Your workspace',
  icons: { icon: '/brand/glimpse-logo.png', apple: '/brand/glimpse-logo.png' },
  description: 'A personal chat workspace for writing, thinking, and coding.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
