/**
 * hasAccess(user, category, subcategory?)
 * Returns true if user has access to the given category/subcategory.
 * Currently hardcoded: admin has access to everything.
 */
export function hasAccess(user, category, subcategory = null) {
  if (!user) return false;
  if (user.role === "admin") return true;

  // Future: per-role permission matrix
  return false;
}
