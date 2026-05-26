import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonNotFound(resource = "Resource") {
  return jsonError(`${resource} not found`, 404);
}
