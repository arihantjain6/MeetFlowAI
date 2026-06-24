import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/modules/dashboard/ui/components/dashboard-sidebar";
import { DashboardNavbar } from "@/modules/dashboard/ui/components/dashboard-navbar";

interface Props {
    children: ReactNode
}

const Layout = ({ children }: Props) => {
    return (
        <SidebarProvider>
            <DashboardSidebar />
            <main className="flex flex-col w-screen bg-muted">
                <DashboardNavbar />
                {children}
            </main>
        </SidebarProvider>
    )
}

export default Layout;