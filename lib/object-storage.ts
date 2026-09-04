/**
 * S3-compatible object store (MinIO in Docker, or local .data/objects fallback).
 * Prefixes: images/ documents/ slips/ mockups/
 */

import { createHash, createHmac } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export const OBJECT_KINDS = ["images", "documents", "slips", "mockups"] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];

export type StoredObject = {
  key: string;
  bucket: string;
  backend: "minio" | "local";
  contentType: string;
  byteSize: number;
};

type MinioConfig = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
  bucketPrivate: string;
  bucketPublic: string;
};

function dataRoot(): string {
  const sqlite = (process.env.SQLITE_PATH || ".data/leads.sqlite").trim();
  const abs = path.isAbsolute(sqlite)
    ? sqlite
    : path.join(process.cwd(), sqlite);
  return path.dirname(abs);
}

export function localObjectsDir(): string {
  return path.join(dataRoot(), "objects");
}

export function objectKey(kind: ObjectKind, fileName: string): string {
  const safe = String(fileName || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[^A-Za-z0-9._-]/g, "_"))
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  if (!safe) throw new Error("invalid_object_key");
  return `${kind}/${safe}`;
}

export function minioConfig(): MinioConfig | null {
  const endpoint = (process.env.MINIO_ENDPOINT || "").trim().replace(/\/+$/, "");
  const accessKey = (process.env.MINIO_ACCESS_KEY || "").trim();
  const secretKey = (process.env.MINIO_SECRET_KEY || "").trim();
  if (!endpoint || !accessKey || !secretKey) return null;
  return {
    endpoint,
    accessKey,
    secretKey,
    region: (process.env.MINIO_REGION || "us-east-1").trim() || "us-east-1",
    bucketPrivate:
      (process.env.MINIO_BUCKET_PRIVATE || "terabis-private").trim() ||
      "terabis-private",
    bucketPublic:
      (process.env.MINIO_BUCKET_PUBLIC || "terabis-public").trim() ||
      "terabis-public",
  };
}

export function isMinioConfigured(): boolean {
  return Boolean(minioConfig());
}

function localPathFor(key: string): string {
  const root = path.resolve(localObjectsDir());
  const resolved = path.resolve(root, key);
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("invalid_object_key");
  }
  return resolved;
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function amzDate(now: Date): { amz: string; stamp: string } {
  const iso = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return { amz: iso, stamp: iso.slice(0, 8) };
}

async function s3Fetch(input: {
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  bucket: string;
  key: string;
  body?: Buffer;
  contentType?: string;
}): Promise<{ status: number; body: Buffer }> {
  const cfg = minioConfig();
  if (!cfg) throw new Error("minio_not_configured");
  const url = new URL(cfg.endpoint);
  const objectPath = `/${input.bucket}/${input.key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const { amz, stamp } = amzDate(new Date());
  const payload = input.body || Buffer.alloc(0);
  const payloadHash = sha256Hex(payload);
  const host = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amz,
  };
  if (input.contentType && input.method === "PUT") {
    headers["content-type"] = input.contentType;
  }
  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${headers[name]}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    input.method,
    objectPath,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${stamp}/${cfg.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${cfg.secretKey}`, stamp);
  const regionKey = hmac(dateKey, cfg.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`${cfg.endpoint}${objectPath}`, {
    method: input.method,
    headers,
    body: input.method === "PUT" ? new Uint8Array(payload) : undefined,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { status: response.status, body: bytes };
}

function writeLocal(key: string, bytes: Buffer): void {
  const abs = localPathFor(key);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, bytes);
}

export function readLocalObject(key: string): Buffer | null {
  const abs = localPathFor(key);
  if (!existsSync(abs)) return null;
  return readFileSync(abs);
}

export function objectStorageBackend(): "minio" | "local" {
  return minioConfig() ? "minio" : "local";
}

export async function putObject(input: {
  kind: ObjectKind;
  fileName: string;
  bytes: Buffer;
  contentType: string;
  publicBucket?: boolean;
}): Promise<StoredObject> {
  const key = objectKey(input.kind, input.fileName);
  writeLocal(key, input.bytes);
  const cfg = minioConfig();
  if (cfg) {
    const bucket = input.publicBucket ? cfg.bucketPublic : cfg.bucketPrivate;
    const result = await s3Fetch({
      method: "PUT",
      bucket,
      key,
      body: input.bytes,
      contentType: input.contentType,
    });
    if (result.status >= 300) {
      throw new Error(`minio_put_failed_${result.status}`);
    }
    return {
      key,
      bucket,
      backend: "minio",
      contentType: input.contentType,
      byteSize: input.bytes.length,
    };
  }
  return {
    key,
    bucket: "local",
    backend: "local",
    contentType: input.contentType,
    byteSize: input.bytes.length,
  };
}

export async function getObject(key: string): Promise<Buffer | null> {
  const local = readLocalObject(key);
  if (local) return local;
  const cfg = minioConfig();
  if (!cfg) return null;
  const privateGet = await s3Fetch({
    method: "GET",
    bucket: cfg.bucketPrivate,
    key,
  });
  if (privateGet.status === 200) return privateGet.body;
  const publicGet = await s3Fetch({
    method: "GET",
    bucket: cfg.bucketPublic,
    key,
  });
  if (publicGet.status === 200) return publicGet.body;
  return null;
}

export async function deleteObject(key: string): Promise<void> {
  try {
    const abs = localPathFor(key);
    if (existsSync(abs)) unlinkSync(abs);
  } catch {
    // ignore
  }
  const cfg = minioConfig();
  if (!cfg) return;
  await s3Fetch({ method: "DELETE", bucket: cfg.bucketPrivate, key });
  await s3Fetch({ method: "DELETE", bucket: cfg.bucketPublic, key });
}

export async function pingMinio(): Promise<boolean> {
  const cfg = minioConfig();
  if (!cfg) return false;
  try {
    const result = await s3Fetch({
      method: "GET",
      bucket: cfg.bucketPrivate,
      key: ".keep",
    });
    return result.status === 200 || result.status === 404;
  } catch {
    return false;
  }
}
