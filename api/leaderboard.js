const E = require("./_engine");
const { redis, parse } = require("./_redis");

module.exports = async (req, res) => {
  if (!redis) return res.status(500).json({ error: "The leaderboard database isn't connected yet.", rows: [] });
  const q = req.query || {};
  const mode = q.mode === "all" ? "all" : "today";
  const pid = String(q.pid || "");
  res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=30");

  if (mode === "today") {
    const today = E.serverNo();
    let no = Number(q.no);
    if (!Number.isInteger(no) || no < today - 1 || no > today + 1) no = today;
    const members = await redis.zrange(`hs:day:${no}`, 0, 49, { rev: true });
    if (!members.length) return res.status(200).json({ rows: [] });
    const entries = (await redis.hmget(`hs:entry:${no}`, ...members)) || {};
    const rows = members.map(m => {
      const e = parse(entries[m]) || {};
      return { nick: e.nick || "Player", score: e.score || 0, ret: e.ret || 0, me: m === pid };
    });
    return res.status(200).json({ rows });
  }

  const members = await redis.zrange("hs:total", 0, 49, { rev: true });
  if (!members.length) return res.status(200).json({ rows: [] });
  const players = await redis.mget(...members.map(m => `hs:player:${m}`));
  const rows = members.map((m, i) => {
    const p = parse(players[i]) || {};
    return { nick: p.nick || "Player", total: p.total || 0, played: p.played || 0, best: p.best || 0, me: m === pid };
  });
  return res.status(200).json({ rows });
};
