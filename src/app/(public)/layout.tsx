import { TopNav } from "@/components/layout/TopNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav variant="public" />
      <main id="main" className="site-wrap pb-24">{children}</main>
    </>
  );
}
