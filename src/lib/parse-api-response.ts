/** Parse a fetch response as JSON; surface HTML/plain error bodies clearly. */
export async function parseApiResponse<T extends Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();

  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.replace(/\s+/g, " ").slice(0, 160);
    if (!res.ok) {
      throw new Error(
        preview.startsWith("Internal Server")
          ? `Server error (${res.status}). Restart the dev server (Ctrl+C, then npm run dev).`
          : `Server error (${res.status}): ${preview}`,
      );
    }
    throw new Error("Invalid JSON response from server");
  }
}
