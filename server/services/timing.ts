import { getPlatformSchedules } from "../db";

export interface TimingResult {
  optimal_time: string;
  timezone: string;
}

const PLATFORM_PEAK_HOURS: Record<string, number[]> = {
  linkedin: [8, 9, 12, 17, 18],
  x: [8, 9, 12, 15, 17],
  webflow: [9, 10, 14, 15],
  reddit: [10, 11, 13, 14, 19],
  email: [8, 9, 10, 14],
};

const MIN_LEAD_MS = 2 * 60 * 60 * 1000; // must be at least 2 hours in the future

/**
 * Compute the next optimal posting time for a platform in a given timezone.
 * The returned ISO string is always in the future (at least 2 hours ahead).
 */
export function getOptimalPostingTime(params: {
  platform: string;
  timezone: string;
}): TimingResult {
  const { platform, timezone } = params;
  const peakHours = PLATFORM_PEAK_HOURS[platform] ?? [9, 12, 17];

  const now = new Date();

  // Try each peak hour today; if none qualifies, try tomorrow's first peak hour.
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);

  for (const hour of peakHours) {
    candidate.setHours(hour, 0, 0, 0);
    if (candidate.getTime() - now.getTime() >= MIN_LEAD_MS) {
      return { optimal_time: candidate.toISOString(), timezone };
    }
  }

  // No qualifying slot today — use the first peak hour tomorrow.
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(peakHours[0], 0, 0, 0);
  return { optimal_time: tomorrow.toISOString(), timezone };
}

/**
 * Resolve optimal posting time using stored brand platform schedules.
 */
export async function getOptimalPostingTimeForBrand(params: {
  brandId: number;
  platform: string;
}): Promise<TimingResult> {
  const schedules = await getPlatformSchedules(params.brandId);
  const schedule = schedules.find(s => s.platform === params.platform);
  const timezone = schedule?.timezone ?? "UTC";
  return getOptimalPostingTime({ platform: params.platform, timezone });
}
