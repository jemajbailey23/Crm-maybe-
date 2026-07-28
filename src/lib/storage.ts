import "server-only";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "attachments";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "File storage isn't configured yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, key);
}

export { MAX_FILE_SIZE_BYTES };

export async function uploadFile(path: string, file: File) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is too large (20MB max).");
  }

  const supabase = getClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(path: string) {
  const supabase = getClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
