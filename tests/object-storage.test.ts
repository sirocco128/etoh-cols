import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archivePdfDocument, isPdfBuffer } from "../lib/document-archive";
import {
  getObject,
  isMinioConfigured,
  objectKey,
  objectStorageBackend,
  putObject,
} from "../lib/object-storage";

describe("object storage (local fallback)", () => {
  let dataDir = "";
  let previousSqlite = "";
  let previousEndpoint = "";

  before(() => {
    dataDir = mkdtempSync(join(tmpdir(), "giftset-objects-"));
    previousSqlite = process.env.SQLITE_PATH || "";
    previousEndpoint = process.env.MINIO_ENDPOINT || "";
    process.env.SQLITE_PATH = join(dataDir, "leads.sqlite");
    delete process.env.MINIO_ENDPOINT;
  });

  after(() => {
    if (previousSqlite) process.env.SQLITE_PATH = previousSqlite;
    else delete process.env.SQLITE_PATH;
    if (previousEndpoint) process.env.MINIO_ENDPOINT = previousEndpoint;
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  });

  it("sanitizes keys and rejects empty names", () => {
    assert.equal(objectKey("slips", "SLP-1.jpg"), "slips/SLP-1.jpg");
    assert.equal(objectKey("images", "../etc/passwd"), "images/etc/passwd");
    assert.equal(
      objectKey("mockups", "REQ-1/customer-master.png"),
      "mockups/REQ-1/customer-master.png",
    );
    assert.throws(() => objectKey("documents", ""), /invalid_object_key/);
    assert.throws(() => objectKey("documents", ".."), /invalid_object_key/);
  });

  it("writes and reads files beside sqlite when MinIO is unset", async () => {
    assert.equal(isMinioConfigured(), false);
    assert.equal(objectStorageBackend(), "local");
    const stored = await putObject({
      kind: "slips",
      fileName: "SLP-TEST.jpg",
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      contentType: "image/jpeg",
    });
    assert.equal(stored.backend, "local");
    assert.equal(stored.key, "slips/SLP-TEST.jpg");
    const roundTrip = await getObject(stored.key);
    assert.ok(roundTrip);
    assert.equal(roundTrip.equals(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), true);
    assert.equal(existsSync(join(dataDir, "objects", "slips", "SLP-TEST.jpg")), true);
  });

  it("archives PDF documents under documents/YYYY-MM-DD/", async () => {
    const pdf = Buffer.from("%PDF-1.4 minimal", "latin1");
    assert.equal(isPdfBuffer(pdf), true);
    assert.equal(isPdfBuffer(Buffer.from("not-pdf")), false);
    const stored = await archivePdfDocument({
      fileName: "ใบเสร็จ RV/1",
      bytes: pdf,
    });
    assert.equal(stored.backend, "local");
    assert.match(stored.key, /^documents\/\d{4}-\d{2}-\d{2}\/RV_1\.pdf$/);
    const got = await getObject(stored.key);
    assert.ok(got);
    assert.equal(got.subarray(0, 5).toString("latin1"), "%PDF-");
  });
});
