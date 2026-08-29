"use client";

import { HomeHeader } from "../components/home-header";
import { HomeStats } from "../components/home-stats";
import { HomeUpcomingMeetings } from "../components/home-upcoming-meetings";
import { HomeRecentMeetings } from "../components/home-recent-meetings";
import { HomeAgentsList } from "../components/home-agents-list";

export const HomeView = () => {
    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
            <HomeHeader />
            <HomeStats />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HomeUpcomingMeetings />
                <HomeRecentMeetings />
            </div>

            <HomeAgentsList />
        </div>
    );
};
