"use client"

import { DataTable } from "@/components/data-table";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { columns } from "../components/columns";
import { EmptyState } from "@/components/empty-state";
import { useMeetingsFilters } from "../../hooks/use-meetings-filters";
import { DataPagination } from "@/components/data-pagination";
import { useRouter } from "next/navigation";

export const MeetingsView = () => {
    const trpc = useTRPC(); 
    const router = useRouter();
    const [filters, setFilters]=useMeetingsFilters();
    const { data } = useSuspenseQuery(trpc.meetings.getMany.queryOptions({...filters,}));
    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4"> 
            <DataTable data={data.items} columns={columns} onRowClick={(row) => router.push(`/meetings/${row.id}`)}/>
            <DataPagination page={filters.page} totalPages={data.totalPages} onPageChange={(page) => setFilters({ page })} />
            {data.items.length === 0 && (
                <EmptyState
                    title="No Meetings Yet"
                    description="It looks like you haven't hosted any meetings with your AI agent yet. Start your first meeting to see your agent in action."
                />
            )}
        </div>
    )
}

export const MeetingViewLoading = () => {
    return (
        <LoadingState
            title="Loading Meetings"
            description="Please wait while we fetch your meetings..."
        />
    )
}

export const MeetingViewError = () => {
    return (
        <ErrorState
            title="Failed to load meetings"
            description="Please try again later..."
        />
    )
}