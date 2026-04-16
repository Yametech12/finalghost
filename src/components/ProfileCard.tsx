import React, { useState } from 'react';
import { Camera, Loader2, User as UserIcon, Edit3, Crown, Calendar, Zap, X, Check } from 'lucide-react';
import EasyCrop from 'react-easy-crop';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

interface ProfileCardProps {
  onEditProfile?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ onEditProfile }) => {
  const { user, userData, updateUserData, updateUserProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file is too large. Please choose a file under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const getCroppedImg = (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Ensure minimum dimensions
          const width = Math.max(pixelCrop.width, 100);
          const height = Math.max(pixelCrop.height, 100);

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            width,
            height
          );

          // Try toBlob first
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // Fallback: use data URL to create blob
    let croppedBlob: Blob;
    try {
      croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
    } catch (cropError) {
      console.error('Cropping failed:', cropError);
      toast.error('Failed to crop image. Please try again.');
      setUploading(false);
      return;
    }
    const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });

    try {
      // Try Firebase Storage first
      const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
      const snapshot = await uploadBytes(storageRef, croppedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: downloadURL });
      await updateUserProfile({ photoURL: downloadURL });
      if (updateUserData) {
        await updateUserData({ photoURL: downloadURL });
      }

      toast.success("Profile photo updated!");
    } catch (storageError: any) {
      console.warn("Storage upload failed, trying fallback:", storageError);

      // Fallback: Convert to base64 and save directly to Firestore
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64String = event.target?.result as string;
          if (base64String) {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { photoURL: base64String });
            await updateUserProfile({ photoURL: base64String });
            if (updateUserData) {
              await updateUserData({ photoURL: base64String });
            }
            toast.success("Profile photo updated! (Using local storage)");
          }
        };
        reader.readAsDataURL(croppedBlob);
      } catch (fallbackError: any) {
        console.error("Fallback upload also failed:", fallbackError);

        // Check for specific error types
        if (storageError.code === 'storage/unauthorized') {
          toast.error("Upload permission denied. Check Firebase Storage rules and CORS configuration.");
        } else if (storageError.code === 'storage/canceled') {
          toast.error("Upload was cancelled.");
        } else if (storageError.code === 'storage/quota-exceeded') {
          toast.error("Storage quota exceeded.");
        } else if (storageError.code === 'storage/invalid-format') {
          toast.error("Invalid file format.");
        } else if (storageError.code === 'storage/invalid-argument') {
          toast.error("Invalid upload request. Please try again.");
        } else if (storageError.message?.includes('CORS') || storageError.message?.includes('preflight')) {
          toast.error("CORS error. Run 'setup-cors.bat' and apply CORS configuration to Firebase Storage.");
        } else if (storageError.message?.includes('network') || storageError.message?.includes('offline')) {
          toast.error("Network error. Check your connection and try again.");
        } else {
          handleFirestoreError(storageError, OperationType.UPDATE, `users/${user.uid}`);
          toast.error("Failed to upload image. Using local storage instead.");
        }
      }
    } finally {
      setUploading(false);
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  };

  const displayImage = userData?.photoURL;
  const memberSince = userData?.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) || 'New Member';

  const profileCard = (
    <div className="max-w-md mx-auto bg-mystic-900/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-accent-primary/5 overflow-hidden">

      {/* Animated Banner */}
      <div className="h-36 bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-[length:200%_200%] animate-gradient-x relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-mystic-900/60" />
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-mystic-900/80 to-transparent" />
      </div>

      {/* Profile Content */}
      <div className="px-8 pb-8 relative -mt-20">

        {/* Avatar Container */}
        <div className="relative flex justify-center mb-6">
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary blur-lg opacity-40 animate-pulse" />

            {/* Avatar */}
            <div className="relative w-28 h-28 rounded-full p-1 bg-mystic-900 shadow-2xl">
              <div className="w-full h-full rounded-full overflow-hidden bg-mystic-800 border-3 border-gradient-to-r from-accent-primary to-accent-secondary">
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-mystic-800 to-mystic-900">
                    <UserIcon size={48} className="text-mystic-600" />
                  </div>
                )}

                {/* Loading Overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
                  </div>
                )}

                {/* Hover Overlay */}
                {!uploading && (
                  <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center backdrop-blur-[2px] z-10 rounded-full">
                    <Camera className="w-7 h-7 text-white mb-1" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                      Update
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Online/Status Indicator */}
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-mystic-900 shadow-lg shadow-green-500/50" />
          </div>
        </div>

        {/* User Details */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-bold text-white">
              {userData?.displayName || user?.email?.split('@')[0] || 'Anonymous'}
            </h2>
            {userData?.role === 'admin' && (
              <Crown className="w-5 h-5 text-yellow-500" />
            )}
          </div>

          <p className="text-mystic-400 text-sm">
            {user?.email}
          </p>

          {/* Member Badge */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-accent-primary" />
              <span className="text-xs text-mystic-400">{memberSince}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20">
              <Zap className="w-3.5 h-3.5 text-accent-primary" />
              <span className="text-xs text-accent-primary font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <button
            onClick={onEditProfile}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

      </div>
    </div>
  );

  const cropModal = cropModalOpen && imageSrc && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-xs sm:max-w-sm bg-slate-900 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-accent-primary" />
            <span className="hidden sm:inline">Crop Photo</span>
            <span className="sm:hidden">Crop</span>
          </h2>
          <button
            onClick={() => {
              setCropModalOpen(false);
              setImageSrc(null);
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="p-1.5 sm:p-2 hover:bg-white/5 rounded-lg transition-colors touch-manipulation"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="relative flex-1 min-h-0 bg-slate-800 overflow-hidden">
          <EasyCrop
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropAreaChange={onCropComplete}
            onZoomChange={setZoom}
            classes={{
              containerClassName: 'rounded-none h-full',
              mediaClassName: 'rounded-none',
            }}
            restrictPosition={false}
            zoomWithScroll={true}
          />
        </div>

        <div className="p-3 sm:p-4 border-t border-white/5 space-y-3 sm:space-y-4 flex-shrink-0">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Zoom: {zoom.toFixed(1)}x
              <span className="text-slate-500 ml-2">(pinch or scroll)</span>
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer touch-manipulation"
            />
          </div>

          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => {
                setCropModalOpen(false);
                setImageSrc(null);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all text-xs sm:text-sm touch-manipulation"
            >
              Cancel
            </button>
            <button
              onClick={handleCropSave}
              disabled={uploading}
              className="flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl accent-gradient text-white font-bold shadow-lg shadow-accent-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm touch-manipulation"
            >
              {uploading ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Check className="w-3 h-3 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">{uploading ? 'Saving...' : 'Save'}</span>
              <span className="sm:hidden">{uploading ? 'Save...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {profileCard}
      {cropModal}
    </>
  );
};

export default ProfileCard;