"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle, X, AlertCircle, Loader2 } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  currentImageUrl?: string | null;
  label?: string;
  isUploading?: boolean;
}

export function FileUpload({
  onFileSelect,
  maxSizeMB = 2,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  currentImageUrl,
  label = "Upload Image",
  isUploading = false,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);

    // Validate type
    if (!acceptedTypes.includes(file.type)) {
      setError(`Format invalide. Autorisés: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`);
      onFileSelect(null);
      return;
    }

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Le fichier dépasse la taille maximale de ${maxSizeMB}MB`);
      onFileSelect(null);
      return;
    }

    // Success
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    onFileSelect(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewUrl(currentImageUrl || null);
    setError(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      
      <div
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors
          ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}
          ${error ? "border-red-400 bg-red-50" : ""}
          ${isUploading ? "opacity-70 pointer-events-none" : "cursor-pointer"}
        `}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes.join(",")}
          onChange={handleChange}
          disabled={isUploading}
          name="file" // Critical for FormData
        />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
            <p className="text-sm text-gray-600 font-medium">Téléchargement en cours...</p>
          </div>
        ) : previewUrl ? (
          <div className="relative group w-full flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-h-40 max-w-full rounded-md object-contain border border-gray-200"
            />
            <button
              onClick={clearFile}
              className="absolute -top-3 -right-3 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-opacity"
              title="Supprimer l'image"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mt-3 flex items-center text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Prêt à être envoyé
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <UploadCloud className={`w-10 h-10 mb-3 ${error ? "text-red-400" : "text-gray-400"}`} />
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold text-blue-600">Cliquez</span> ou glissez-déposez
            </p>
            <p className="text-xs text-gray-500">
              {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} jusqu'à {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center text-sm text-red-500 bg-red-50 p-2 rounded-md">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
