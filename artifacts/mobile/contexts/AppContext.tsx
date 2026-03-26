import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Profile {
  name: string;
  age: string;
  gender: "male" | "female" | "other" | "";
}

export interface MediaItem {
  id: string;
  uri: string;
  type: "image" | "video";
  date: number;
  playbackRate?: number; // 1 = normal, 2/3/5 = timelapse
  title?: string;
}

interface AppContextValue {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  savedMedia: MediaItem[];
  addMedia: (uri: string, type: "image" | "video", opts?: { playbackRate?: number; title?: string }) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
}

const PROFILE_KEY = "@drawing_assistant_profile";
const MEDIA_KEY   = "@drawing_assistant_media";

const defaultProfile: Profile = { name: "", age: "", gender: "" };

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile]     = useState<Profile>(defaultProfile);
  const [savedMedia, setSavedMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [profileJson, mediaJson] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(MEDIA_KEY),
        ]);
        if (profileJson) setProfile(JSON.parse(profileJson));
        if (mediaJson)   setSavedMedia(JSON.parse(mediaJson));
      } catch {}
    })();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addMedia = useCallback(async (
    uri: string,
    type: "image" | "video",
    opts?: { playbackRate?: number; title?: string }
  ) => {
    const item: MediaItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uri,
      type,
      date: Date.now(),
      ...(opts?.playbackRate ? { playbackRate: opts.playbackRate } : {}),
      ...(opts?.title        ? { title: opts.title }               : {}),
    };
    setSavedMedia((prev) => {
      const next = [item, ...prev];
      AsyncStorage.setItem(MEDIA_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeMedia = useCallback(async (id: string) => {
    setSavedMedia((prev) => {
      const next = prev.filter((m) => m.id !== id);
      AsyncStorage.setItem(MEDIA_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{ profile, updateProfile, savedMedia, addMedia, removeMedia }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
