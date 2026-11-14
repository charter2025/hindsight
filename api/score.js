const E = require("./_engine");
const { redis, parse } = require("./_redis");

const DAY_TTL = 60 * 60 * 24 * 45; // keep daily boards ~6 weeks

function validChips(c, n) {
  return Array.isArray(c) && c.length === n &&
    c.every(x => Number.isInteger(x) && x >= 0 && x <= 4) &&
    c.reduce((a, b) => a + b, 0) === 10;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!redis) return res.status(500).json({ error: "The leaderboard database isn't connected yet." });

  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }

  const pid = String(b.pid || "");
  const nick = String(b.nick || "").replace(/[^\p{L}\p{N} _.'-]/gu, "").trim().slice(0, 20);
  const no = Number(b.no);
  if (!/^[\w-]{8,64}$/.test(pid)) return res.status(400).json({ error: "Missing player id." });
  if (!nick) return res.status(400).json({ error: "Add a name first." });

  const today = E.serverNo();
  if (!Number.isInteger(no) || no < today - 1 || no > today + 1)
    return res.status(400).json({ error: "That daily puzzle is closed." });

  // Rebuild the exact puzzle and replay the player's moves; the browser's own score is never trusted.
  const P = E.buildPuzzle(E.hashStr("hindsight-daily-" + no));
  const n = P.opts.length;
  const plan = b.plan, picks = b.picks;
  if (!Array.isArray(plan) || plan.length !== 3 || !validChips(plan[0], n) ||
      ![plan[1], plan[2]].every(p => p === null || validChips(p, n)))
    return res.status(400).json({ error: "That play doesn't match today's puzzle." });
  if (!Array.isArray(picks) || picks.length !== 3 || !picks.every(p => Number.isInteger(p) && p >= 0 && p < n))
    return res.status(400).json({ error: "That play doesn't match today's puzzle." });

  const value = E.runPlan(P, plan).value;
  const pct = E.pctBeat(E.analyze(P).vals, value);
  const calls = E.SEGS(P.S).filter((seg, k) => {
    const g = P.opts.map(a => E.growth(a, seg));
    return g[picks[k]] === Math.max(...g);
  }).length;
  const score = Math.round(700 * pct) + 100 * calls;
  const ret = Math.round((value / 10000 - 1) * 1000) / 10;

  // One post per player per puzzle
  const first = await redis.set(`hs:posted:${no}:${pid}`, 1, { nx: true, ex: DAY_TTL });
  if (!first) return res.status(409).json({ error: "Today's score is already on the board." });

  const dayKey = `hs:day:${no}`, entryKey = `hs:entry:${no}`;
  await redis.zadd(dayKey, { score: score * 1e7 + Math.min(9999999, Math.round(value)), member: pid });
  await redis.hset(entryKey, { [pid]: JSON.stringify({ nick, score, value: Math.round(value), ret }) });
  await redis.expire(dayKey, DAY_TTL);
  await redis.expire(entryKey, DAY_TTL);

  const prev = parse(await redis.get(`hs:player:${pid}`)) || {};
  const player = { nick, played: (prev.played || 0) + 1, best: Math.max(prev.best || 0, score), total: (prev.total || 0) + score };
  await redis.set(`hs:player:${pid}`, JSON.stringify(player));
  await redis.zadd("hs:total", { score: player.total, member: pid });

  const rank = (await redis.zrevrank(dayKey, pid)) + 1;
  return res.status(200).json({ ok: true, score, rank });
};
