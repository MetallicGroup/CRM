import { Client as ReplitClient } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// --- R2 (S3-compatible) client ---
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const hasR2Config = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);

const r2Client = hasR2Config
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

// --- Replit object storage (fallback, mostly local) ---
let objectStorageClient: ReplitClient | null = null;
try {
  objectStorageClient = new ReplitClient();
} catch (e) {
  console.warn("[ObjectStorage] Failed to initialize Replit Object Storage client. Will use R2 or disk.");
}

// Disk fallback (for local dev) when neither R2, nor Replit is available
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() { }

  generateObjectPath(originalFilename?: string, folder?: string): string {
    const objectId = randomUUID();
    const extension = originalFilename ? originalFilename.split('.').pop() : '';
    const baseFolder = folder || 'uploads';
    const objectName = extension ? `${baseFolder}/${objectId}.${extension}` : `${baseFolder}/${objectId}`;
    return objectName;
  }

  async uploadFromBuffer(buffer: Buffer, objectName: string): Promise<string> {
    // 1) Prefer Cloudflare R2 (S3) dacă este configurat
    if (r2Client && hasR2Config) {
      try {
        await r2Client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: objectName,
            Body: buffer,
          })
        );
        return `/objects/${objectName}`;
      } catch (e) {
        console.error("[ObjectStorage] R2 upload failed, falling back:", e);
      }
    }

    // 2) Replit Object Storage (dacă există)
    if (objectStorageClient) {
      try {
        const result = await objectStorageClient.uploadFromBytes(objectName, buffer);
        if (result.ok) {
          return `/objects/${objectName}`;
        }
      } catch (e) {
        console.warn("[ObjectStorage] Replit upload failed, falling back to disk:", e);
      }
    }

    // 3) Disk fallback (local dev)
    const filePath = path.join(process.cwd(), objectName);
    const dir = path.dirname(filePath);
    console.log(`[ObjectStorage] Uploading to disk path: ${filePath}`);
    if (!fs.existsSync(dir)) {
      console.log(`[ObjectStorage] Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    console.log(`[ObjectStorage] Saved to disk: ${filePath}`);
    return `/objects/${objectName}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<{ objectName: string; exists: boolean }> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const objectName = parts.slice(1).join("/");

    // 1) Check R2
    if (r2Client && hasR2Config) {
      try {
        await r2Client.send(
          new HeadObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: objectName,
          })
        );
        return { objectName, exists: true };
      } catch (e) {
        // fall through to other backends
        console.warn("[ObjectStorage] R2 exists check failed, checking other backends:", e);
      }
    }

    // 2) Check Replit
    if (objectStorageClient) {
      try {
        const existsResult = await objectStorageClient.exists(objectName);
        if (existsResult.ok && existsResult.value) {
          return { objectName, exists: true };
        }
      } catch (e) {
        console.warn("[ObjectStorage] Replit exists check failed, checking disk:", e);
      }
    }

    // 3) Check disk
    const filePath = path.join(process.cwd(), objectName);
    console.log(`[ObjectStorage] Checking disk existence: ${filePath}`);
    if (fs.existsSync(filePath)) {
      return { objectName, exists: true };
    }

    throw new ObjectNotFoundError();
  }

  async downloadObject(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    const objectName = parts.slice(1).join("/");

    let data: Buffer | null = null;

    // 1) Try R2
    if (r2Client && hasR2Config) {
      try {
        const r2Result = await r2Client.send(
          new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: objectName,
          })
        );

        if (r2Result.Body) {
          const chunks: Buffer[] = [];
          for await (const chunk of r2Result.Body as any) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          data = Buffer.concat(chunks);
        }
      } catch (e) {
        console.warn("[ObjectStorage] R2 download failed, trying other backends:", e);
      }
    }

    // 2) Try Replit
    if (!data && objectStorageClient) {
      try {
        const downloadResult = await objectStorageClient.downloadAsBytes(objectName);
        if (downloadResult.ok) {
          data = Buffer.from(downloadResult.value as any);
        }
      } catch (e) {
        console.warn("[ObjectStorage] Replit download failed, checking disk:", e);
      }
    }

    // 3) Try disk if not found or no client
    if (!data) {
      const filePath = path.join(process.cwd(), objectName);
      console.log(`[ObjectStorage] Trying to read from disk: ${filePath}`);
      if (fs.existsSync(filePath)) {
        console.log(`[ObjectStorage] File found on disk.`);
        data = fs.readFileSync(filePath);
      } else {
        console.log(`[ObjectStorage] File NOT found on disk: ${filePath}`);
      }
    }

    if (!data) {
      throw new ObjectNotFoundError();
    }

    const contentType = getContentType(objectName);

    res.set({
      "Content-Type": contentType,
      "Content-Length": data.length,
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    });

    res.send(data);
  }

  async deleteObject(objectPath: string): Promise<boolean> {
    try {
      if (!objectPath.startsWith("/objects/")) {
        return false;
      }

      const parts = objectPath.slice(1).split("/");
      const objectName = parts.slice(1).join("/");

      let deleted = false;

      // 1) Try R2
      if (r2Client && hasR2Config) {
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME,
              Key: objectName,
            })
          );
          deleted = true;
        } catch (e) {
          console.warn("[ObjectStorage] R2 delete failed, trying other backends:", e);
        }
      }

      // 2) Try Replit
      if (objectStorageClient) {
        try {
          const result = await objectStorageClient.delete(objectName);
          deleted = result.ok;
        } catch (e) {
          console.warn("[ObjectStorage] Replit delete failed, checking disk:", e);
        }
      }

      // 3) Try disk
      const filePath = path.join(process.cwd(), objectName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted = true;
      }

      return deleted;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'csv': 'text/csv',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
