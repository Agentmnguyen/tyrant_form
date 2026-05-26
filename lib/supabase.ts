import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  assertServerSupabaseKey(serviceRoleKey);

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function assertServerSupabaseKey(key: string) {
  if (key.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is a publishable key. Use a Supabase secret key or legacy service_role key on the server.");
  }

  if (key.startsWith("sb_secret_")) {
    return;
  }

  const jwtRole = getJwtRole(key);

  if (jwtRole === "service_role") {
    return;
  }

  if (jwtRole) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not a service_role key. Use a Supabase secret key or legacy service_role key on the server.");
  }

  throw new Error("SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret key or legacy service_role key.");
}

function getJwtRole(key: string) {
  const parts = key.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function assertAdminPin(pin: unknown) {
  const configuredPin = process.env.ADMIN_PIN;

  if (!configuredPin) {
    throw new Error("ADMIN_PIN is not configured.");
  }

  if (String(pin || "") !== configuredPin) {
    const error = new Error("Incorrect admin PIN.");
    error.name = "UnauthorizedError";
    throw error;
  }
}
