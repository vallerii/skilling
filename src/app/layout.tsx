import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

/** Onest — гротеск, нарисованный в первую очередь для кириллицы; табличные цифры есть. */
const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Skilling — техчеки к собеседованию",
  description:
    "Подготовка к техническим собеседованиям короткими техчеками: уровни по темам, разбор ошибок и открытые ответы.",
};

export const viewport: Viewport = {
  themeColor: "#b9d3e6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${onest.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
