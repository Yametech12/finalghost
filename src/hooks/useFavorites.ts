import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Favorite } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { toast } from 'sonner';

const getCategory = (type: string): 'Personality' | 'Content' | 'Assessment' => {
  switch (type) {
    case 'type': return 'Personality';
    case 'guide': return 'Content';
    case 'calibration': return 'Assessment';
    default: return 'Content';
  }
};

export function useFavorites() {
  const auth = useAuth();
  if (!auth) {
    return { favorites: [], loading: true, toggleFavorite: async () => {}, isFavorite: () => false };
  }
  const { user } = auth;
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs: Favorite[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        favs.push({ 
          id: doc.id, 
          ...data,
          category: data.category || getCategory(data.contentType)
        } as Favorite);
      });
      setFavorites(favs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching favorites:", error);
      handleFirestoreError(error, OperationType.LIST, 'favorites');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleFavorite = async (contentId: string, contentType: 'type' | 'guide' | 'calibration', title: string) => {
    if (!user) {
      toast.error("You must be logged in to favorite items");
      return;
    }

    const favoriteId = `${user.uid}_${contentType}_${contentId}`;
    const existing = favorites.find(f => f.contentId === contentId && f.contentType === contentType);

    try {
      if (existing) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
        toast.success("Removed from favorites");
      } else {
        const newFavorite: any = {
          userId: user.uid,
          contentId,
          contentType,
          category: getCategory(contentType),
          title,
          timestamp: serverTimestamp()
        };
        await setDoc(doc(db, 'favorites', favoriteId), newFavorite);
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      handleFirestoreError(error, existing ? OperationType.DELETE : OperationType.CREATE, `favorites/${favoriteId}`);
      toast.error("Failed to update favorites");
    }
  };

  const isFavorite = (contentId: string, contentType: string) => {
    return favorites.some(f => f.contentId === contentId && f.contentType === contentType);
  };

  return { favorites, loading, toggleFavorite, isFavorite };
}
