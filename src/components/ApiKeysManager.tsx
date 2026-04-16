import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../utils/errorHandling";
import { toast } from "sonner";

export function ApiKeysManager() {
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"valid" | "invalid" | null>(null);

  useEffect(() => {
    fetchApiKey().catch(err => {
      console.error("Unhandled error in ApiKeysManager fetchApiKey:", err);
    });
  }, []);

  const fetchApiKey = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "private_config", "api_keys");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.openrouterApiKey) setOpenrouterApiKey(data.openrouterApiKey);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "private_config/api_keys");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "private_config", "api_keys"),
        { openrouterApiKey },
        { merge: true },
      );
      toast.success("API keys saved successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "private_config/api_keys");
      toast.error("Failed to save API keys.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!openrouterApiKey) {
      toast.error("Please enter an OpenRouter API key first.");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/ai/test-key");

      if (response.ok) {
        const data = await response.json();
        if (data.configured) {
          setTestResult("valid");
          toast.success(`OpenRouter API key is valid`);
        } else {
          setTestResult("invalid");
          toast.error(data.error || "OpenRouter API key is invalid");
        }
      } else {
        setTestResult("invalid");
        toast.error("Connection failed");
      }
    } catch {
      setTestResult("invalid");
      toast.error("Connection failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-accent-primary" />
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          AI API Keys
        </h3>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6" />
      </div>

      <p className="text-sm text-slate-400">
        Configure your OpenRouter AI API key for access to hundreds of AI models.
      </p>

      <div className="max-w-md">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">OpenRouter API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={openrouterApiKey}
              onChange={(e) => setOpenrouterApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-mystic-900 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white focus:outline-none focus:border-accent-primary/50 transition-colors"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showApiKey ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="text-xs text-slate-400 mt-2 space-y-1">
            <div>Get your free API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">OpenRouter.ai</a></div>
            <div className="text-accent-primary/70">OpenAI-compatible, 100+ models</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testing || !openrouterApiKey}
          className="flex-1 px-6 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test OpenRouter"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-accent-primary text-white border border-accent-primary/50 rounded-xl font-bold shadow-lg hover:bg-accent-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold ${testResult === "valid" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {testResult === "valid" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {testResult === "valid" ? "OpenRouter API key is valid" : "OpenRouter API key is invalid"}
        </div>
      )}

      <div className="mt-4 p-4 bg-mystic-900/50 rounded-xl border border-white/5">
        <p className="text-xs text-slate-500">
          <strong className="text-slate-400">Note:</strong> For production deployments, set the{' '}
          <code className="bg-mystic-800 px-1 rounded">OPENROUTER_API_KEY</code> environment variable
          in your hosting provider's settings instead of storing it here.
        </p>
      </div>
    </div>
  );
}

