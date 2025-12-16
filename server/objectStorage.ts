import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Client();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  async getObjectEntityUploadURL(originalFilename?: string): Promise<{ uploadURL: string; objectPath: string }> {
    const objectId = randomUUID();
    const extension = originalFilename ? originalFilename.split('.').pop() : '';
    const objectName = extension ? `uploads/${objectId}.${extension}` : `uploads/${objectId}`;

    const uploadURL = await signObjectURL({
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return { uploadURL, objectPath: `/objects/${objectName}` };
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
    const existsResult = await objectStorageClient.exists(objectName);
    
    if (!existsResult.ok || !existsResult.value) {
      throw new ObjectNotFoundError();
    }
    
    return { objectName, exists: true };
  }

  async downloadObject(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      if (!objectPath.startsWith("/objects/")) {
        throw new ObjectNotFoundError();
      }

      const parts = objectPath.slice(1).split("/");
      const objectName = parts.slice(1).join("/");

      const downloadResult = await objectStorageClient.downloadAsBytes(objectName);
      
      if (!downloadResult.ok) {
        throw new ObjectNotFoundError();
      }

      const contentType = getContentType(objectName);
      
      res.set({
        "Content-Type": contentType,
        "Content-Length": downloadResult.value.length,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      res.send(downloadResult.value);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        if (error instanceof ObjectNotFoundError) {
          res.status(404).json({ error: "File not found" });
        } else {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    const parts = rawObjectPath.split("/").filter(p => p.length > 0);
    if (parts.length >= 2) {
      const objectName = parts.slice(1).join("/");
      return `/objects/${objectName}`;
    }

    return rawObjectPath;
  }

  async uploadFromBuffer(buffer: Buffer, objectName: string): Promise<string> {
    const result = await objectStorageClient.uploadFromBytes(objectName, buffer);
    if (!result.ok) {
      throw new Error("Failed to upload file");
    }
    return `/objects/${objectName}`;
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

async function signObjectURL({
  objectName,
  method,
  ttlSec,
}: {
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
