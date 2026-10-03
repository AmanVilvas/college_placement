import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex h-screen overflow-hidden bg-slate-50">
    <AdminSidebar />
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  </div>;
}
