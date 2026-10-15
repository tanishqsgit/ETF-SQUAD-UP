export function rosterInsights(roster) {
  const counts = roster.reduce((a, p) => ((a[p.role] = (a[p.role] || 0) + 1), a), {});
  const issues = [];
  if (!counts.igl) issues.push('Missing an IGL: assign a shot-caller for rotations and comms.');
  if (!counts.sniper) issues.push('No sniper cover: recruit a long-range specialist.');
  if (counts.rusher > 1) issues.push('Duplicate rushers: define entry and trade responsibilities.');
  if (roster.length < 5)
    issues.push(
      `${5 - roster.length} open slot${roster.length === 4 ? '' : 's'}: complete your roster before scrims.`,
    );
  return issues.length
    ? issues
    : ['Balanced roster. Focus on coordinated utility and consistent practice.'];
}
