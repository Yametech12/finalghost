import { auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code;

  // Handle quota errors gracefully - don't throw
  if (errorCode === 'resource-exhausted' || errorMessage.includes('quota')) {
    console.info('Firestore quota exceeded, operation will use local fallback');
    return; // Don't throw for quota errors
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Hook for handling async errors in components
export function useErrorHandler() {
  return (error: Error | string, _context?: string) => {
    const message = typeof error === 'string' ? error : error.message;

    console.error('Error handled by useErrorHandler:', error);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      console.error('Production error:', message);
      // errorReportingService.captureMessage(message, 'error');
    }
  };
}

// Utility function for handling promise rejections
export function handleAsyncError(promise: Promise<any>, context?: string) {
  return promise.catch((error) => {
    console.error(`Async error${context ? ` in ${context}` : ''}:`, error);

    if (error.name !== 'ChunkLoadError') {
      // toast.error(`Something went wrong${context ? ` ${context.toLowerCase()}` : ''}`);
    }

    throw error;
  });
}
