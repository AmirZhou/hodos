import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cancel expired trade listings every hour
crons.interval(
  "cancel expired trade listings",
  { hours: 1 },
  internal.game.trade.cancelExpiredListings,
);

export default crons;
