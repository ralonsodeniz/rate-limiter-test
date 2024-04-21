import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Ratelimit } from "@upstash/ratelimit";

import todos from "./data/data.json";
import getRedisRateLimiterSingleton from "./lib/limiter";

declare module "hono" {
  interface ContextVariableMap {
    rateLimit: Ratelimit;
  }
}

const app = new Hono();

app.use(async (context, next) => {
  const rateLimit = getRedisRateLimiterSingleton(context);
  context.set("rateLimit", rateLimit);
  await next();
});

app.get("/todos/:id", async (context) => {
  const rateLimit = context.get("rateLimit");
  const IP = context.req.raw.headers.get("CF-Connecting-IP");
  const { success } = await rateLimit.limit(IP ?? "anonymous");
  if (!success) {
    throw new HTTPException(429, { message: "Rate limit exceeded" });
  }
  const todoId = context.req.param("id");
  const parsedId = Number(todoId);
  const todo = todos.find((todo) => todo.id === parsedId);
  if (!todo) {
    throw new HTTPException(404, { message: "Todo not found" });
  }
  return context.json(todo);
});

export default app;
