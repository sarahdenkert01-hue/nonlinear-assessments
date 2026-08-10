/**
 * Shared navigation helper for flushing dirty manual notes before in-app leave.
 * Returns true when navigation may proceed.
 */
export async function flushBeforeNavigate(options: {
  isDirty: boolean;
  flush: () => Promise<void>;
  onBlocked: (message: string) => void;
}): Promise<boolean> {
  if (!options.isDirty) return true;
  try {
    await options.flush();
    return true;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Evidence note could not be saved";
    options.onBlocked(
      `Unsaved evidence note: ${message}. Stay on this page and try again.`,
    );
    return false;
  }
}
