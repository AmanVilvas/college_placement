import { StudentSidebar } from "@/components/student/StudentSidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PageNavigation } from "@/components/shared/PageNavigation";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard kind="student">
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <StudentSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PageNavigation kind="student" />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  </AuthGuard>;
}
