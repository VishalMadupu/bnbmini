export function formatDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export function daysLeft(iso) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}
