import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator);
    let value = trimmed.slice(separator + 1);

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Copy .env.example to .env.local with production values, or export them in your shell.");
  console.error("The URL must match Vercel → Settings → Environment Variables.");
  process.exit(1);
}

console.log(`Checking Supabase project: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { data, error } = await supabase
  .from("participation_entries")
  .select(
    "id, infantry_exalted_t12, lancer_exalted_t12, marksmen_exalted_t12, infantry_exalted_skill_level, lancer_exalted_skill_level, marksmen_exalted_skill_level"
  )
  .limit(1);

if (error) {
  console.error("\nExalted T12 columns are NOT available to the API yet.\n");
  console.error(`Error: ${error.message}\n`);

  if (error.message.includes("schema cache") || error.message.includes("exalted")) {
    console.error("Next steps:");
    console.error("1. Confirm this URL matches your Vercel NEXT_PUBLIC_SUPABASE_URL");
    console.error("2. In that Supabase project SQL Editor, run:");
    console.error("   supabase/migrations/add_exalted_t12_columns.sql");
    console.error("   supabase/migrations/add_exalted_skill_level_columns.sql");
    console.error("3. Verify the SELECT in each script returns 3 rows");
    console.error("4. Wait 10-30s, then run this script again");
  }

  process.exit(1);
}

console.log("\nExalted T12 columns are available to the API.");
console.log(`Sample row count checked: ${data?.length ?? 0}`);
console.log("\nIf production form still fails, hard-refresh the browser or restart the Supabase project.");
