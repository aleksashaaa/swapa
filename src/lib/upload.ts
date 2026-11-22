"use client";

import { createClient } from "@/lib/supabase/client";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export type UploadBucket = "item-images" | "avatars" | "chat-images";

export async function uploadImage({
  bucket,
  path,
  file,
  maxMb,
}: {
  bucket: UploadBucket;
  path: string;
  file: File;
  maxMb: number;
}): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Please use a JPG, PNG or WebP image.");
  }
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`Images must be smaller than ${maxMb} MB.`);
  }

  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  if (bucket === "chat-images") return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}
