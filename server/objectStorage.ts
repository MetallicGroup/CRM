import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Initialize client tentatively. It might fail if not in Replit.
let objectStorageClient: Client | null = null;
try {
  objectStorageClient = new Client();
} catch (e) {
  console.warn("[ObjectStorage] Failed to initialize Replit Object Storage client. Using disk fallback.");
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
console.log(`[ObjectStorage] Uploads directory: ${UPLOADS_DIR}`);
if (!fs.existsSync(UPLOADS_DIR)) {
  console.log(`[ObjectStorage] Creating uploads directory...`);
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
    // Try Replit Object Storage first
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

    // Disk Fallback
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

    // Check Replit first
    if (objectStorageClient) {
      const existsResult = await objectStorageClient.exists(objectName);
      if (existsResult.ok && existsResult.value) {
        return { objectName, exists: true };
      }
    }

    // Check disk
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

    // Try Replit first
    if (objectStorageClient) {
      try {
        const downloadResult = await objectStorageClient.downloadAsBytes(objectName);
        if (downloadResult.ok) {
          data = Buffer.from(downloadResult.value as any);
        }
      } catch (e) {
        console.warn("[ObjectStorage] Replit download failed, checking disk:", e);
      }
    }

    // Try disk if not found or no client
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

      // Try Replit first
      if (objectStorageClient) {
        const result = await objectStorageClient.delete(objectName);
        deleted = result.ok;
      }

      // Try disk
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
