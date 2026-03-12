import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "react-hot-toast";
import { DocumentAttributes } from "./document-attributes";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <>
      <DocumentAttributes locale={locale} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--fg)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
      </NextIntlClientProvider>
    </>
  );
}
