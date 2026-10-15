export function templateBio(profile) {
  const role = String(profile.role || 'allrounder').replace(/_/g, ' ');
  const rank = String(profile.rank || 'Competitive');
  const kd = Number.isFinite(Number(profile.kdRatio))
    ? `${Number(profile.kdRatio).toFixed(2)} K/D`
    : 'Team-focused';
  return `${role.toUpperCase()} • ${rank} • ${kd}. Clear comms, smart rotations and competitive ambition. Looking for a disciplined squad to grind, grow and win together.`.slice(
    0,
    199,
  );
}
