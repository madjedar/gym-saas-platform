"use client";

import { useState, useTransition } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadGymLogo } from "./upload-actions";

export function GymLogoForm({ currentLogoUrl }: { currentLogoUrl?: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const handleUpload = (file: File | null) => {
    if (!file) return;
    
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const result = await uploadGymLogo(formData);
        if (result?.success) {
          setSuccess(true);
        }
      } catch (err: any) {
        setError(err.message || "Erreur lors du téléchargement");
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center">
        <h2 className="text-lg font-semibold text-gray-800">Logo du Club</h2>
      </div>
      <div className="p-6">
        <FileUpload 
          label="Mettre à jour le logo de la salle (Max 2MB)"
          onFileSelect={handleUpload}
          currentImageUrl={currentLogoUrl}
          isUploading={isPending}
        />
        {error && <p className="text-sm text-red-500 mt-2 font-medium">{error}</p>}
        {success && <p className="text-sm text-green-500 mt-2 font-medium">Logo mis à jour avec succès !</p>}
      </div>
    </div>
  );
}
