import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Camera, X, Check, Loader2, User, AlertCircle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function ProfilePhotoUpload() {
  const { user, updateUserProfile } = useAuth();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Basic validation
      if (!file.type.startsWith('image/')) {
        setUploadError("Please select a valid image file.");
        toast.error("Invalid file type.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit for input
        setUploadError("Image is too large. Please select a file under 10MB.");
        toast.error("File too large.");
        return;
      }
      
      try {
        setIsCompressing(true);
        const options = {
          maxSizeMB: 0.5, // Aim for 500KB
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        
        const compressedFile = await imageCompression(file, options);
        
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          setImageSrc(reader.result as string);
          setIsCompressing(false);
        });
        reader.addEventListener('error', () => {
          setUploadError("Failed to read the image file.");
          setIsCompressing(false);
        });
        reader.readAsDataURL(compressedFile);
      } catch (error: any) {
        console.error("Error compressing image:", error);
        setUploadError(`Compression failed: ${error.message || 'Unknown error'}`);
        toast.error("Failed to process image.");
        setIsCompressing(false);
      }
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = 150;
    canvas.height = 150;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      150,
      150
    );

    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const handleUpload = async () => {
    if (!user || !imageSrc || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      
      const photoURL = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!photoURL) throw new Error('Failed to generate cropped image');

      const sizeInBytes = (photoURL.length * 3) / 4;
      if (sizeInBytes > 800 * 1024) {
        throw new Error('Cropped image is still too large for the database. Try zooming in more or using a simpler image.');
      }

      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, { photoURL }, { merge: true });
      } catch (err: any) {
        console.error("Failed to update Firestore doc:", err);
        if (err.message?.includes('Missing or insufficient permissions')) {
          setUploadError("Permission denied. Your account may not have permission to update this profile.");
          toast.error("Permission denied.");
        } else if (err.message?.includes('offline') || err.message?.includes('network')) {
          setUploadError("Network error. Please check your connection and try again.");
          toast.error("Network error.");
        } else {
          setUploadError(`Database error: ${err.message || 'Failed to save photo'}`);
          toast.error("Failed to save photo.");
        }
        return;
      }
      
      try {
        await updateUserProfile({ photoURL });
      } catch (err: any) {
        console.warn("Failed to update local profile, but photo was saved to database:", err);
      }
      
      setImageSrc(null);
      toast.success('Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setUploadError(error.message || "An error occurred while processing the image.");
      toast.error(error.message || "Processing error.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div 
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Outer Glow Effect - Using radial gradient for better stability and to prevent clipping */}
        <motion.div 
          animate={{ 
            scale: isHovered ? 1.2 : 1,
            opacity: isHovered ? 0.8 : 0.3
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] pointer-events-none transition-all duration-700 z-0"
          style={{
            background: 'radial-gradient(circle, rgba(255, 75, 107, 0.4) 0%, rgba(255, 75, 107, 0.1) 40%, transparent 70%)'
          }}
        />

        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-mystic-800 group-hover:border-accent-primary/50 transition-all duration-500 shadow-[0_0_40px_rgba(0,0,0,0.6)] z-10 bg-mystic-900"
        >
          <AnimatePresence mode="wait">
            {user?.photoURL ? (
              <motion.img 
                key="photo"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                src={user.photoURL} 
                alt={user.displayName || 'Profile'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex items-center justify-center"
              >
                <User className="w-16 h-16 text-slate-700" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shimmer Effect on Hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          </div>
          
          <label className="absolute inset-0 bg-mystic-950/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-500 backdrop-blur-md">
            {isCompressing ? (
              <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
            ) : (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={isHovered ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 15 }}
                className="flex flex-col items-center px-4 text-center"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/20 flex items-center justify-center mb-2 md:mb-3 border border-accent-primary/30 shadow-inner">
                  <Upload className="w-5 h-5 md:w-6 md:h-6 text-accent-primary" />
                </div>
                <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md leading-tight">Update Photo</span>
              </motion.div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={isCompressing}
              className="hidden" 
            />
          </label>
        </motion.div>
        
        {/* Premium Camera Badge Indicator */}
        <motion.div 
          initial={false}
          animate={{ 
            scale: isHovered ? 1.15 : 1,
            rotate: isHovered ? -10 : 0,
            y: isHovered ? -5 : 0,
            backgroundColor: isHovered ? 'var(--color-accent-primary)' : 'var(--color-mystic-800)',
            boxShadow: isHovered ? '0 10px 25px -5px rgba(255, 75, 107, 0.5)' : '0 4px 15px rgba(0,0,0,0.5)'
          }}
          className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-11 h-11 bg-mystic-800 text-white rounded-2xl shadow-lg border-2 border-mystic-950 flex items-center justify-center z-20 transition-colors duration-300"
        >
          <Camera className={cn("w-5 h-5 transition-colors", isHovered ? "text-white" : "text-slate-400")} />
        </motion.div>
      </div>
      
      <AnimatePresence>
        {uploadError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 w-max max-w-[280px] bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl flex items-start gap-3 z-30 backdrop-blur-md"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-tight">{uploadError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {imageSrc && createPortal(
        <div className="fixed inset-0 z-[100] bg-mystic-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-mystic-900 border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-accent-primary" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Crop Profile Photo</h3>
              </div>
              <button 
                onClick={() => setImageSrc(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative h-80 w-full bg-black touch-none">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Zoom Level</span>
                  <span className="text-xs font-mono text-accent-primary">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.01}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent-primary"
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setImageSrc(null)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 py-4 rounded-2xl accent-gradient text-white text-sm font-bold shadow-xl shadow-accent-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" /> Save Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
