import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db"; // your drizzle instance
import * as schema from "@/db/schema";

export const auth = betterAuth({
    trustedOrigins: [
        ...(process.env.NODE_ENV !== "production" ? [
            "http://localhost:3000",
            "http://localhost:3001"
        ] : []),
        "https://senorita-iron-tarmac.ngrok-free.dev",
        "https://senorita-iron-tarmac.ngrok-free.app",
    ],
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
        google: { 
            clientId: process.env.GOOGLE_CLIENT_ID as string, 
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, 
        }, 
    },
    emailAndPassword: {
        enabled: true,
    },
    database: drizzleAdapter(db, {
        provider: "pg",
        schema
    }),
});