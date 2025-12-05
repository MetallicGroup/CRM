import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Check, X } from "lucide-react";

interface ObjectUploaderProps {
  onGetUploadParameters: (file: { name: string }) => Promise<{
    method: "PUT";
    url: string;
    objectPath: string;
  }>;
  onComplete?: (objectPath: string, filename: string) => void;
  onError?: (error: Error) => void;
  buttonClassName?: string;
  children: ReactNode;
  disabled?: boolean;
  accept?: string;
  maxFileSize?: number;
}

export function ObjectUploader({
  onGetUploadParameters,
  onComplete,
  onError,
  buttonClassName,
  children,
  disabled = false,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg",
  maxFileSize = 52428800,
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

    setIsUploading(true);
    setUploadStatus("idle");

    try {
      const { url, objectPath } = await onGetUploadParameters({ name: file.name });
      
      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setUploadStatus("success");
      onComplete?.(objectPath, file.name);
      
      setTimeout(() => setUploadStatus("idle"), 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      onError?.(error instanceof Error ? error : new Error("Upload failed"));
      setTimeout(() => setUploadStatus("idle"), 3000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
            Încărcat!
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
