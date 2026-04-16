import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { getDb } from '../services/firebase';

interface VerifyCodeRequest {
  email: string;
  code: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body as VerifyCodeRequest;
  if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

  try {
    const firestore = getDb();
    const docRef = doc(firestore, "verification_codes", email);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(400).json({ error: "No verification code found for this email" });
    }

    const data = docSnap.data();
    if (data.code !== code) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    if (Date.now() > data.expiresAt) {
      return res.status(400).json({ error: "Verification code has expired" });
    }

    // Code is valid, delete it from Firestore
    await deleteDoc(docRef);

    res.json({ success: true, message: "Code verified successfully" });
  } catch (error: unknown) {
    console.error("Error verifying code:", error);
    res.status(500).json({
      error: "Failed to verify code",
      details: (error as Error).message
    });
  }
}