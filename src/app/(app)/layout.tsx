import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AutoRevalidate } from "@/components/auto-revalidate";
import { brandColorStyle } from "@/lib/brand-colors";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <style>{`:root { ${brandColorStyle(user.brandColor)} }`}</style>
      <AutoRevalidate />
      <AppShell userName={user.name}>{children}</AppShell>
    </>
  );
}
