import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";

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

  generateObjectPath(originalFilename?: string, folder?: string): string {
    const objectId = randomUUID();
    const extension = originalFilename ? originalFilename.split('.').pop() : '';
    const baseFolder = folder || 'uploads';
    const objectName = extension ? `${baseFolder}/${objectId}.${extension}` : `${baseFolder}/${objectId}`;
    return objectName;
  }

  async uploadFromBuffer(buffer: Buffer, objectName: string): Promise<string> {
    const result = await objectStorageClient.uploadFromBytes(objectName, buffer);
    if (!result.ok) {
      throw new Error("Failed to upload file to storage");
    }
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

  async deleteObject(objectPath: string): Promise<boolean> {
    try {
      if (!objectPath.startsWith("/objects/")) {
        return false;
      }

      const parts = objectPath.slice(1).split("/");
      const objectName = parts.slice(1).join("/");

      const result = await objectStorageClient.delete(objectName);
      return result.ok;
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
