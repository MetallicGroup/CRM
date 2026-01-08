import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Check, X, FileIcon } from "lucide-react";

interface ObjectUploaderProps {
  clientId?: string;
  fileType: "oferta1" | "oferta2";
  onComplete?: (objectPath: string, filename: string) => void;
  onFileSelected?: (file: File, fileType: "oferta1" | "oferta2") => void;
  onError?: (error: Error) => void;
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
  accept?: string;
  maxFileSize?: number;
  pendingFile?: File | null;
}

export function ObjectUploader({
  clientId,
  fileType,
  onComplete,
  onFileSelected,
  onError,
  buttonClassName,
  children,
  disabled = false,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg",
  maxFileSize = 52428800,
  pendingFile,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxFileSize) {
      onError?.(new Error(`Fișierul este prea mare. Dimensiune maximă: ${Math.round(maxFileSize / 1024 / 1024)}MB`));
      setUploadStatus("error");
      setTimeout(() => setUploadStatus("idle"), 3000);
      return;
    }

    if (!clientId) {
      onFileSelected?.(file, fileType);
      setUploadStatus("success");
      setTimeout(() => setUploadStatus("idle"), 2000);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsUploading(true);
    setUploadStatus("idle");

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);
      formData.append('fileType', fileType);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Eroare server: ${response.statusText} (${response.status})`;
        throw new Error(errorMessage);
      }

      const result = await response.json();

      setUploadStatus("success");
      onComplete?.(result.objectPath, result.filename || file.name);

      setTimeout(() => setUploadStatus("idle"), 3000);
    } catch (error) {
      console.error("[ObjectUploader] Upload error:", error);
      setUploadStatus("error");
      const err = error instanceof Error ? error : new Error("Eroare la încărcare");
      onError?.(err);
      setTimeout(() => setUploadStatus("idle"), 5000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (pendingFile) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-amber-50 border-amber-200">
        <FileIcon className="h-4 w-4 text-amber-600" />
        <span className="text-sm truncate flex-1 text-amber-800">{pendingFile.name}</span>
        <span className="text-xs text-amber-600">(va fi încărcat la salvare)</span>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        onClick={handleClick}
        className={buttonClassName}
        disabled={disabled || isUploading}
        variant="outline"
        size="sm"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Se încarcă...
          </>
        ) : uploadStatus === "success" ? (
          <>
            <Check className="h-4 w-4 mr-2 text-green-600" />
            {clientId ? "Încărcat!" : "Selectat!"}
          </>
        ) : uploadStatus === "error" ? (
          <>
            <X className="h-4 w-4 mr-2 text-red-600" />
            Eroare
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {children}
          </>
        )}
      </Button>
    </div>
  );
}

export async function uploadFileForClient(file: File, clientId: string, fileType: "oferta1" | "oferta2"): Promise<{ objectPath: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clientId', clientId);
  formData.append('fileType', fileType);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Eroare server: ${response.statusText} (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}
