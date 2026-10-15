const tiers = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'heroic',
  'master',
  'grandmaster',
];
const complements = {
  rusher: ['igl', 'sniper', 'nader'],
  sniper: ['rusher', 'assaulter', 'igl'],
  assaulter: ['igl', 'sniper', 'nader'],
  igl: ['rusher', 'sniper', 'assaulter', 'nader'],
  nader: ['rusher', 'assaulter', 'igl'],
  allrounder: ['rusher', 'sniper', 'assaulter', 'igl', 'nader', '5th'],
  '5th': ['rusher', 'sniper', 'assaulter', 'igl', 'nader', 'allrounder'],
};
export function compatibility(searcher, candidate, missingRole) {
  const role = missingRole
    ? candidate.role === missingRole
      ? 100
      : candidate.role === 'allrounder'
        ? 70
        : 20
    : complements[searcher.role]?.includes(candidate.role)
      ? 100
      : searcher.role === candidate.role
        ? 35
        : 70;
  const a = new Set(searcher.playingTime || []),
    b = new Set(candidate.playingTime || []),
    union = new Set([...a, ...b]);
  const time = union.size ? ([...a].filter((slot) => b.has(slot)).length / union.size) * 100 : 0;
  const x = tiers.indexOf(String(searcher.rank).toLowerCase()),
    y = tiers.indexOf(String(candidate.rank).toLowerCase());
  const gap = Math.abs(x - y),
    rank = x < 0 || y < 0 ? 20 : gap === 0 ? 100 : gap === 1 ? 70 : 20;
  const age = Math.max(0, 100 - Math.max(0, Math.abs(searcher.age - candidate.age) - 4) * 10);
  return {
    score: Math.round(role * 0.4 + time * 0.3 + rank * 0.2 + age * 0.1),
    breakdown: { role, time: Math.round(time), rank, age },
  };
}
