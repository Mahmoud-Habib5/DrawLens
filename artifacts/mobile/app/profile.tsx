import { ResizeMode, Video } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { MediaItem, Profile, useAppContext } from "@/contexts/AppContext";

const { width: W } = Dimensions.get("window");
const THUMB = (W - 52) / 3;

// ─── Playback Speed Types ─────────────────────────────────────────────────────
const PLAYBACK_SPEEDS = [1, 2, 4, 8, 16] as const;
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

// ─── Speed Selector Bar ───────────────────────────────────────────────────────
function SpeedBar({
  speed,
  onChange,
}: {
  speed: PlaybackSpeed;
  onChange: (s: PlaybackSpeed) => void;
}) {
  return (
    <View style={sp.container}>
      <View style={sp.labelRow}>
        <Ionicons name="speedometer-outline" size={13} color="rgba(255,255,255,0.5)" />
        <Text style={sp.label}>Playback speed</Text>
        <View style={sp.activeBadge}>
          <Text style={sp.activeBadgeText}>{speed}×</Text>
        </View>
      </View>
      <View style={sp.pillRow}>
        {PLAYBACK_SPEEDS.map((s) => {
          const active = s === speed;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => onChange(s)}
              activeOpacity={0.7}
              style={[sp.pill, active && sp.pillOn]}
            >
              <Text style={[sp.pillTxt, active && sp.pillTxtOn]}>
                {s === 1 ? "1×\nNormal" : `${s}×`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const sp = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    flex: 1,
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  activeBadge: {
    backgroundColor: "#F5A623",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  pillRow: {
    flexDirection: "row",
    gap: 7,
  },
  pill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillOn: {
    backgroundColor: "#F5A623",
    borderColor: "#F5A623",
  },
  pillTxt: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 16,
  },
  pillTxtOn: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
});

// ─── Video Player Modal ───────────────────────────────────────────────────────
function VideoPlayerModal({
  item,
  onClose,
  onDelete,
}: {
  item: MediaItem | null;
  onClose: () => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  // Ref so the status handler always reads the latest speed without re-creating
  const speedRef = useRef<PlaybackSpeed>(1);

  // Keep ref in sync
  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Reset to 1× each time a different video is opened
  useEffect(() => {
    if (item) {
      setPlaybackSpeed(1);
      speedRef.current = 1;
    }
  }, [item?.id]);

  // Apply speed via ref so it also works after seeks and replays
  const handleSpeedChange = useCallback(async (s: PlaybackSpeed) => {
    setPlaybackSpeed(s);
    speedRef.current = s;
    try {
      await videoRef.current?.setStatusAsync({ rate: s, shouldCorrectPitch: true });
    } catch (_) {
      // Video may not be loaded yet — the `rate` prop covers initial load
    }
  }, []);

  // Guard against the native player silently resetting rate to 1× after a seek
  const handlePlaybackStatus = useCallback((status: any) => {
    if (!status.isLoaded || !status.isPlaying) return;
    const target = speedRef.current;
    if (status.rate !== target) {
      videoRef.current
        ?.setStatusAsync({ rate: target, shouldCorrectPitch: true })
        .catch(() => {});
    }
  }, []);

  if (!item) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>

        {/* Video fills all space above the bottom panel */}
        <Video
          ref={videoRef}
          key={item.id}
          source={{ uri: item.uri }}
          style={{ flex: 1 }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay
          isLooping={false}
          rate={playbackSpeed}
          shouldCorrectPitch
          onPlaybackStatusUpdate={handlePlaybackStatus}
          onError={(e) => console.log("[VideoPlayer] error:", e)}
        />

        {/* Top bar */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity onPress={onClose} style={vst.circleBtn}>
            <Feather name="x" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={vst.titleBadge}>
            <Feather name="video" size={12} color="rgba(255,255,255,0.65)" />
            <Text style={vst.titleBadgeTxt}>Video</Text>
          </View>

          <TouchableOpacity
            onPress={onDelete}
            style={[vst.circleBtn, { backgroundColor: "rgba(239,68,68,0.7)" }]}
          >
            <Feather name="trash-2" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom panel: speed selector + action buttons */}
        <View
          style={{
            paddingBottom: insets.bottom + 16,
            paddingTop: 14,
            backgroundColor: "rgba(8,8,16,0.97)",
            gap: 12,
          }}
        >
          <SpeedBar speed={playbackSpeed} onChange={handleSpeedChange} />

          <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16 }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await MediaLibrary.saveToLibraryAsync(item.uri);
                  Alert.alert("Exported", "Saved to your device gallery.");
                } catch {
                  Alert.alert("Error", "Could not export this video.");
                }
              }}
              style={[vst.actionBtn, { flex: 1, backgroundColor: "rgba(255,255,255,0.09)" }]}
            >
              <Feather name="download" size={15} color="#fff" />
              <Text style={vst.actionTxt}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDelete}
              style={[
                vst.actionBtn,
                { flex: 1, backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)", borderWidth: 1 },
              ]}
            >
              <Feather name="trash-2" size={15} color="#ef4444" />
              <Text style={[vst.actionTxt, { color: "#ef4444" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const vst = StyleSheet.create({
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  titleBadgeTxt: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 13,
  },
  actionTxt: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

// ─── Image Viewer Modal ───────────────────────────────────────────────────────
function ImageViewerModal({
  item,
  onClose,
  onDelete,
  onExport,
}: {
  item: MediaItem | null;
  onClose: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!item) return null;
  return (
    <Modal visible={!!item} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Image source={{ uri: item.uri }} style={{ flex: 1 }} resizeMode="contain" />

        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            right: 16,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity onPress={onClose} style={vst.circleBtn}>
            <Feather name="x" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={[vst.circleBtn, { backgroundColor: "rgba(239,68,68,0.7)" }]}
          >
            <Feather name="trash-2" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 24,
            left: 16,
            right: 16,
          }}
        >
          <TouchableOpacity
            onPress={onExport}
            style={[vst.actionBtn, { backgroundColor: "rgba(0,122,255,0.85)" }]}
          >
            <Feather name="download" size={16} color="#fff" />
            <Text style={vst.actionTxt}>Export to Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({
  visible,
  onClose,
  profile,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  profile: Profile;
  onSave: (p: Partial<Profile>) => void;
}) {
  const isDark = useColorScheme() === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [gender, setGender] = useState<Profile["gender"]>(profile.gender);
  const genders: { value: Profile["gender"]; label: string }[] = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.background, padding: 24, paddingTop: 32 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: theme.text }}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[pfl.inputLabel, { color: theme.textSecondary }]}>Your Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor={theme.textSecondary}
          style={[pfl.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        />

        <Text style={[pfl.inputLabel, { color: theme.textSecondary, marginTop: 20 }]}>Age</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="Enter your age"
          placeholderTextColor={theme.textSecondary}
          style={[pfl.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        />

        <Text style={[pfl.inputLabel, { color: theme.textSecondary, marginTop: 20 }]}>Gender</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          {genders.map((g) => (
            <TouchableOpacity
              key={g.value}
              onPress={() => setGender(g.value)}
              style={[
                pfl.genderBtn,
                {
                  borderColor: gender === g.value ? theme.primary : theme.border,
                  backgroundColor: gender === g.value ? theme.primary + "20" : theme.card,
                },
              ]}
            >
              <Text
                style={{
                  color: gender === g.value ? theme.primary : theme.textSecondary,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => { onSave({ name, age, gender }); onClose(); }}
          style={[pfl.saveBtn, { backgroundColor: theme.primary, marginTop: 36 }]}
        >
          <Text style={{ color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" }}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 80, color }: { name: string; size?: number; color: string }) {
  const initials = name.trim()
    ? name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + "22",
        borderWidth: 2,
        borderColor: color,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.38, color, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

// ─── Media Thumbnail ──────────────────────────────────────────────────────────
function MediaThumb({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{ width: THUMB, height: THUMB, margin: 2, borderRadius: 10, overflow: "hidden" }}
    >
      {item.type === "image" ? (
        <Image source={{ uri: item.uri }} style={{ width: THUMB, height: THUMB }} resizeMode="cover" />
      ) : (
        <View
          style={{
            width: THUMB,
            height: THUMB,
            backgroundColor: "#0c0c1a",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(245,166,35,0.14)",
              borderWidth: 1.5,
              borderColor: "rgba(245,166,35,0.38)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="play" size={16} color="#F5A623" />
          </View>
        </View>
      )}

      {/* Type badge */}
      <View
        style={{
          position: "absolute",
          bottom: 5,
          right: 5,
          backgroundColor: "rgba(0,0,0,0.68)",
          borderRadius: 6,
          paddingHorizontal: 5,
          paddingVertical: 2,
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Ionicons
          name={item.type === "image" ? "image-outline" : "videocam"}
          size={9}
          color="rgba(255,255,255,0.75)"
        />
        <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_600SemiBold" }}>
          {item.type === "image" ? "PHOTO" : "VIDEO"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon,
  label,
  count,
  theme,
}: {
  icon: string;
  label: string;
  count: number;
  theme: typeof Colors.light;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: theme.primary + "18",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Feather name={icon as any} size={15} color={theme.primary} />
      </View>
      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: theme.text, flex: 1 }}>
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 8,
          backgroundColor: theme.primary + "18",
        }}
      >
        <Text style={{ color: theme.primary, fontSize: 12, fontFamily: "Inter_700Bold" }}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, theme }: { value: number; label: string; theme: typeof Colors.light }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.card,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 10,
        alignItems: "center",
        gap: 3,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: theme.primary }}>{value}</Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: theme.textSecondary }}>{label}</Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, text, theme }: { icon: string; text: string; theme: typeof Colors.light }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 32,
        alignItems: "center",
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        borderStyle: "dashed",
        gap: 10,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: theme.primary + "12",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Feather name={icon as any} size={22} color={theme.textSecondary} />
      </View>
      <Text
        style={{
          color: theme.textSecondary,
          fontFamily: "Inter_500Medium",
          fontSize: 13,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const isDark = useColorScheme() === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, savedMedia, removeMedia } = useAppContext();
  const [editVisible, setEditVisible] = useState(false);
  const [viewingItem, setViewingItem] = useState<MediaItem | null>(null);

  const images = savedMedia.filter((m) => m.type === "image");
  const videos = savedMedia.filter((m) => m.type === "video");

  const handleDelete = useCallback(async () => {
    if (!viewingItem) return;
    Alert.alert("Delete Media", "Remove this item from your profile?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const id = viewingItem.id;
          setViewingItem(null);
          removeMedia(id);
        },
      },
    ]);
  }, [viewingItem, removeMedia]);

  const handleExport = useCallback(async () => {
    if (!viewingItem) return;
    try {
      await MediaLibrary.saveToLibraryAsync(viewingItem.uri);
      Alert.alert("Exported", "Saved to your device gallery.");
    } catch {
      Alert.alert("Error", "Could not export this item.");
    }
  }, [viewingItem]);

  const displayName = profile.name || "Unnamed Artist";
  const hasProfile = !!profile.name;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.text, flex: 1 }}>
            My Profile
          </Text>
          <TouchableOpacity
            onPress={() => setEditVisible(true)}
            style={[pfl.editBtn, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "50" }]}
          >
            <Feather name="edit-3" size={14} color={theme.primary} />
            <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* ── Profile Card ─────────────────────────────────── */}
        <View
          style={[pfl.profileCard, { backgroundColor: theme.card, marginHorizontal: 16, borderColor: theme.border }]}
        >
          <Avatar name={displayName} size={68} color={theme.primary} />
          <View style={{ flex: 1, marginLeft: 14, gap: 3 }}>
            <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: theme.text }}>{displayName}</Text>
            {(profile.age || profile.gender) && (
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "Inter_400Regular" }}>
                {[
                  profile.age ? `Age ${profile.age}` : null,
                  profile.gender
                    ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
                    : null,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
            )}
            {!hasProfile && (
              <TouchableOpacity onPress={() => setEditVisible(true)}>
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 2 }}>
                  Set up your profile →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Stats ────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 14 }}>
          <StatCard value={savedMedia.length} label="Total" theme={theme} />
          <StatCard value={images.length} label="Photos" theme={theme} />
          <StatCard value={videos.length} label="Videos" theme={theme} />
        </View>

        {/* ── Photos ───────────────────────────────────────── */}
        <View style={{ marginTop: 30 }}>
          <SectionHeader icon="image" label="Saved Photos" count={images.length} theme={theme} />
          {images.length === 0 ? (
            <EmptyState
              icon="camera"
              text={"No photos yet.\nCapture your drawings using the camera overlay."}
              theme={theme}
            />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14 }}>
              {images.map((item) => (
                <MediaThumb key={item.id} item={item} onPress={() => setViewingItem(item)} />
              ))}
            </View>
          )}
        </View>

        {/* ── Videos ───────────────────────────────────────── */}
        <View style={{ marginTop: 30 }}>
          <SectionHeader icon="video" label="Saved Videos" count={videos.length} theme={theme} />
          {videos.length === 0 ? (
            <EmptyState
              icon="video"
              text={"No videos yet.\nRecord your drawing sessions in the overlay."}
              theme={theme}
            />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14 }}>
              {videos.map((item) => (
                <MediaThumb key={item.id} item={item} onPress={() => setViewingItem(item)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Modals ───────────────────────────────────────── */}
      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        profile={profile}
        onSave={updateProfile}
      />

      {viewingItem?.type === "image" && (
        <ImageViewerModal
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={handleDelete}
          onExport={handleExport}
        />
      )}

      {viewingItem?.type === "video" && (
        <VideoPlayerModal
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onDelete={handleDelete}
        />
      )}
    </View>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const pfl = StyleSheet.create({
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  saveBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
});