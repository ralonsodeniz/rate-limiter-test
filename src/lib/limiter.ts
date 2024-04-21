import { Ratelimit } from "@upstash/ratelimit";
import { Context, Env } from "hono";
import { BlankInput } from "hono/types";
import { env } from "hono/adapter";
import { Redis } from "@upstash/redis/cloudflare";

const cache = new Map();

const getRedisRateLimiterSingleton = (
  context: Context<Env, "/todos/:id", BlankInput>,
) => {
  if (globalThis.redisRateLimiterGlobal) {
    return globalThis.redisRateLimiterGlobal;
  }
  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = env<{
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
  }>(context);
  const redisClient = new Redis({
    token: UPSTASH_REDIS_REST_TOKEN,
    url: UPSTASH_REDIS_REST_URL,
  });
  const rateLimit = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    ephemeralCache: cache,
  });

  globalThis.redisRateLimiterGlobal = rateLimit;
  return rateLimit;
};

declare global {
  var redisRateLimiterGlobal: undefined | Ratelimit;
}

export default getRedisRateLimiterSingleton;
