import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'リーダーシップ・スタイル診断',
  description: '全36問の質問から、あなたのリーダーシップスタイル（6軸）をプロファイル分析し、役職に応じたAI講評を提供します。',
  openGraph: {
    title: 'リーダーシップ・スタイル診断',
    description: '全36問の質問から、あなたのリーダーシップスタイル（6軸）をプロファイル分析し、役職に応じたAI講評を提供します。',
    url: 'https://あなたのドメイン', // デプロイ後に修正してください
    siteName: 'リーダーシップ・スタイル診断',
    locale: 'ja_JP',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}