const { Redis } = require("@upstash/redis");

// Works with the Upstash integration from the Vercel Marketplace (KV_* names) or a direct Upstash database (UPSTASH_*).
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

function parse(v) {
  if (v == null) return null;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } }
  return v;
}

module.exports = { redis, parse };
