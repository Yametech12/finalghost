import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, orderBy, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: any;
}

export function useAdvisor() {
  const safeAuth = useAuth();
  const user = safeAuth?.user;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVoiceMessage, setCurrentVoiceMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Load sessions
  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'advisor_sessions'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const sessionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      setSessions(sessionsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'advisor_sessions');
    }
  }, [user]);




  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const q = query(
        collection(db, 'advisor_messages'),
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'advisor_messages');
    }
  }, []);

  const createNewSession = useCallback(async (title: string = 'New Session') => {
    if (!user) return null;
    try {
      const docRef = await addDoc(collection(db, 'advisor_sessions'), {
        userId: user.uid,
        title,
        timestamp: serverTimestamp()
      });
      setCurrentSessionId(docRef.id);
      setMessages([]);
      toast.success('New session created');
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'advisor_sessions');
      return null;
    }
  }, [user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !currentSessionId) return;
    setIsLoading(true);
    try {
      // Add user message
      await addDoc(collection(db, 'advisor_messages'), {
        sessionId: currentSessionId,
        role: 'user',
        content,
        timestamp: serverTimestamp()
      });
      setInput('');
      // TODO: Stream AI response
      toast('AI response coming soon...');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'advisor_messages');
    } finally {
      setIsLoading(false);
    }
  }, [user, currentSessionId, setIsLoading]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    try {
      // Delete messages
      const q = query(collection(db, 'advisor_messages'), where('sessionId', '==', sessionId));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
      batch.delete(doc(db, 'advisor_sessions', sessionId));
      await batch.commit();

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      setConfirmDelete(null);
      toast.success('Session deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'advisor_sessions');
    }
  }, [user, currentSessionId]);

  useEffect(() => {
    if (user) {
      loadSessions().then(() => {
        if (sessions.length > 0 && !currentSessionId) {
          setCurrentSessionId(sessions[0].id);
        }
        setIsLoaded(true);
      }).catch(() => {
        setIsLoaded(true);
      });
    }
  }, [user, loadSessions, sessions, currentSessionId]);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId, loadMessages]);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, []);

  return {
    user,
    messages,
    setMessages,
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    confirmDelete,
    setConfirmDelete,
    isSidebarOpen,
    setIsSidebarOpen,
    isLoading,
    setIsLoading,
    input,
    setInput,
    isRecording,
    setIsRecording,
    isPlaying,
    setIsPlaying,
    currentVoiceMessage,
    setCurrentVoiceMessage,
    isListening,
    setIsListening,
    isSpeaking,
    setIsSpeaking,
    showScrollButton,
    setShowScrollButton,
    loadMessages,
    createNewSession,
    sendMessage,
    deleteSession,
    isLoaded,
    setIsLoaded
  };
}