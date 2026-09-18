import { TopNav } from "@/components/layout/TopNav";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav variant="desk" />
      <main id="main" className="desk-wrap pb-24">{children}</main>
    </>
  );
}
