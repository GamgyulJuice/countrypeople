import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: '귀농·귀촌 정착관리', description: '맞춤형 정책과 정착 로드맵' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
