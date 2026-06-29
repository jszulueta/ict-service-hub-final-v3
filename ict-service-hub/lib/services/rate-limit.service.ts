import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  analytics: false,
});

const defaultRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, "1 m"),
  analytics: false,
});

export const RateLimitService = {
  getRateLimitKey(req: NextRequest): string {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'
    return `rl:${ip}`
  },

  async checkRateLimit(req: NextRequest, isAuthRoute: boolean) {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      // Fallback if redis is not configured
      return { success: true, reset: 0 };
    }

    const key = this.getRateLimitKey(req);
    const limiter = isAuthRoute ? authRateLimiter : defaultRateLimiter;
    
    return await limiter.limit(key);
  }
}
