import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { drizzle } from 'drizzle-orm/neon-http';

export const db = drizzle(process.env.DATABASE_URL!);

