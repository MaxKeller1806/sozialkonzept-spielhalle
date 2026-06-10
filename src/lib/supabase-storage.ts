import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "certiano-assets";

let storageClient: SupabaseClient | null = null;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Storage nicht konfiguriert.");
    this.name = "StorageNotConfiguredError";
  }
}

function resolveSupabaseUrl(): string | null {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    null
  );
}

function resolveServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function getStorageBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(resolveSupabaseUrl() && resolveServiceRoleKey());
}

export function getStorageConfigStatus(): {
  configured: boolean;
  hasSupabaseUrl: boolean;
  hasServiceRoleKey: boolean;
  bucket: string;
} {
  return {
    configured: isSupabaseStorageConfigured(),
    hasSupabaseUrl: Boolean(resolveSupabaseUrl()),
    hasServiceRoleKey: Boolean(resolveServiceRoleKey()),
    bucket: getStorageBucketName(),
  };
}

/** Server-only Supabase client for Storage (service role, no browser use). */
export function getSupabaseStorageClient(): SupabaseClient {
  if (storageClient) return storageClient;

  const url = resolveSupabaseUrl();
  const serviceRoleKey = resolveServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new StorageNotConfiguredError();
  }

  storageClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return storageClient;
}
