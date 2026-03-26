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
  PanResponder,
  Platform,
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
const THUMB = (W - 48) / 3;
const SPEEDS = [2, 3, 5] as const;
type Speed = typeof SPEEDS[number];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 80, color }: { name: string; size?: number; color: string }) {
  const initials = name.trim()
    ? name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + "30", borderWidth: 2, borderColor: color, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: size * 0.38, color, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

// ─── Video Player Modal ───────────────────────────────────────────────────────
function VideoPlayerModal({ item, onClose, onDelete, onSaveTimelapse }: {
  item: MediaItem | null;
  onClose: () => void;
  onDelete: () => void;
  onSaveTimelapse: (speed: Speed) => void;
}) {
  const insets = useSafeAreaInsets();
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(2);

  // Reset picker state whenever a new item is opened
  useEffect(() => {
    if (item) {
      setSelectedSpeed(item.playbackRate ?? 2);
      setShowSpeedPicker(false);
    }
  }, [item?.id]);

  if (!item) return null;
  const isTimelapse = (item.playbackRate ?? 1) > 1;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>

        {/*
          key={item.id} forces a full remount when the selected video changes,
          so expo-av always loads the correct URI without any replaceCurrentItem call.
        */}
        <Video
          key={item.id}
          source={{ uri: item.uri }}
          style={{ flex: 1 }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay
          isLooping={false}
          rate={item.playbackRate ?? 1}
          onError={(e) => console.log("[VideoPlayer] error:", e)}
        />

        {/* Top bar */}
        <View style={{ position: "absolute", top: insets.top + 12, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={onClose} style={st.iconBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          {isTimelapse && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F5A623", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
              <Ionicons name="flash" size={13} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" }}>{item.playbackRate}× Timelapse</Text>
            </View>
          )}
        </View>

        {/* Bottom action buttons */}
        <View style={{ position: "absolute", bottom: insets.bottom + 28, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 14 }}>
          <TouchableOpacity onPress={onDelete} style={[st.actionBtn, { backgroundColor: "rgba(239,68,68,0.85)" }]}>
            <Feather name="trash-2" size={16} color="#fff" />
            <Text style={st.actionLabel}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSpeedPicker(true)} style={[st.actionBtn, { backgroundColor: "rgba(245,166,35,0.85)" }]}>
            <Ionicons name="flash-outline" size={16} color="#fff" />
            <Text style={st.actionLabel}>Timelapse</Text>
          </TouchableOpacity>
        </View>

        {/* Speed picker sheet */}
        {showSpeedPicker && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(18,18,28,0.98)", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 6 }}>Save as Timelapse</Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 }}>
              Creates a new profile entry playing at the chosen speed. Original video is unchanged.
            </Text>
            {SPEEDS.map((speed) => (
              <TouchableOpacity
                key={speed}
                onPress={() => setSelectedSpeed(speed)}
                style={[st.speedRow, { borderColor: selectedSpeed === speed ? "#F5A623" : "rgba(255,255,255,0.15)", backgroundColor: selectedSpeed === speed ? "rgba(245,166,35,0.15)" : "transparent" }]}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: selectedSpeed === speed ? "#F5A623" : "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" }}>{speed}×</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{speed}× Timelapse</Text>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular" }}>
                    {speed === 2 ? "Smooth acceleration" : speed === 3 ? "Fast-paced drawing" : "Ultra-fast summary"}
                  </Text>
                </View>
                {selectedSpeed === speed && <Feather name="check-circle" size={20} color="#F5A623" />}
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowSpeedPicker(false)} style={[st.sheetBtn, { backgroundColor: "rgba(255,255,255,0.1)", flex: 1 }]}>
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowSpeedPicker(false); onSaveTimelapse(selectedSpeed as Speed); }}
                style={[st.sheetBtn, { backgroundColor: "#F5A623", flex: 2 }]}
              >
                <Ionicons name="flash" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 }}>Save {selectedSpeed}× Timelapse</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Image Viewer Modal ───────────────────────────────────────────────────────
function ImageViewerModal({ item, onClose, onDelete, onExport }: {
  item: MediaItem | null; onClose: () => void; onDelete: () => void; onExport: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!item) return null;
  return (
    <Modal visible={!!item} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Image source={{ uri: item.uri }} style={{ flex: 1 }} resizeMode="contain" />
        <TouchableOpacity onPress={onClose} style={[st.iconBtn, { position: "absolute", top: insets.top + 12, left: 16 }]}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ position: "absolute", bottom: insets.bottom + 24, flexDirection: "row", alignSelf: "center", gap: 14 }}>
          <TouchableOpacity onPress={onExport} style={[st.actionBtn, { backgroundColor: "#007AFF" }]}>
            <Feather name="download" size={16} color="#fff" />
            <Text style={st.actionLabel}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[st.actionBtn, { backgroundColor: "rgba(239,68,68,0.85)" }]}>
            <Feather name="trash-2" size={16} color="#fff" />
            <Text style={st.actionLabel}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ visible, onClose, profile, onSave }: {
  visible: boolean; onClose: () => void; profile: Profile; onSave: (p: Partial<Profile>) => void;
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
          <TouchableOpacity onPress={onClose}><Feather name="x" size={24} color={theme.textSecondary} /></TouchableOpacity>
        </View>
        <Text style={[st.label, { color: theme.textSecondary }]}>Your Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor={theme.textSecondary} style={[st.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} />
        <Text style={[st.label, { color: theme.textSecondary, marginTop: 20 }]}>Age</Text>
        <TextInput value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Enter your age" placeholderTextColor={theme.textSecondary} style={[st.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} />
        <Text style={[st.label, { color: theme.textSecondary, marginTop: 20 }]}>Gender</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          {genders.map((g) => (
            <TouchableOpacity key={g.value} onPress={() => setGender(g.value)} style={[st.genderBtn, { borderColor: gender === g.value ? theme.primary : theme.border, backgroundColor: gender === g.value ? theme.primary + "20" : theme.card }]}>
              <Text style={{ color: gender === g.value ? theme.primary : theme.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => { onSave({ name, age, gender }); onClose(); }} style={[st.saveBtn, { backgroundColor: theme.primary, marginTop: 36 }]}>
          <Text style={{ color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" }}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Media Thumbnail ──────────────────────────────────────────────────────────
function MediaThumb({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  const isTimelapse = item.type === "video" && (item.playbackRate ?? 1) > 1;
  return (
    <TouchableOpacity onPress={onPress} style={{ width: THUMB, height: THUMB, margin: 2 }}>
      {item.type === "image" ? (
        <Image source={{ uri: item.uri }} style={{ width: THUMB, height: THUMB, borderRadius: 8 }} resizeMode="cover" />
      ) : (
        <View style={{ width: THUMB, height: THUMB, borderRadius: 8, backgroundColor: "#1a1a2e", justifyContent: "center", alignItems: "center" }}>
          <Feather name="video" size={24} color="rgba(255,255,255,0.6)" />
        </View>
      )}
      {item.type === "video" && (
        <View style={{ position: "absolute", bottom: 5, right: 5, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.72)", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 }}>
          {isTimelapse && <Ionicons name="flash" size={10} color="#F5A623" />}
          <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_600SemiBold" }}>
            {isTimelapse ? `${item.playbackRate}×` : "▶"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const isDark = useColorScheme() === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, savedMedia, addMedia, removeMedia } = useAppContext();
  const [editVisible, setEditVisible] = useState(false);
  const [viewingItem, setViewingItem] = useState<MediaItem | null>(null);

  const images = savedMedia.filter((m) => m.type === "image");
  const videos = savedMedia.filter((m) => m.type === "video");

  const handleDelete = useCallback(async () => {
    if (!viewingItem) return;
    Alert.alert("Delete Media", "Remove this item from your profile?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => { const id = viewingItem.id; setViewingItem(null); removeMedia(id); },
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

  const handleSaveTimelapse = useCallback(async (speed: Speed) => {
    if (!viewingItem || viewingItem.type !== "video") return;
    await addMedia(viewingItem.uri, "video", {
      playbackRate: speed,
      title: `${speed}× Timelapse`,
    });
    Alert.alert("Timelapse Saved", `A ${speed}× timelapse has been added to your profile.`);
  }, [viewingItem, addMedia]);

  const displayName = profile.name || "Unnamed Artist";
  const hasProfile = !!profile.name;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.text, flex: 1 }}>My Profile</Text>
          <TouchableOpacity onPress={() => setEditVisible(true)} style={[st.editBtn, { backgroundColor: theme.primary + "20", borderColor: theme.primary }]}>
            <Feather name="edit-3" size={15} color={theme.primary} />
            <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <View style={[st.profileCard, { backgroundColor: theme.card, marginHorizontal: 16 }]}>
          <Avatar name={displayName} size={76} color={theme.primary} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.text }}>{displayName}</Text>
            {(profile.age || profile.gender) && (
              <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: "Inter_400Regular", marginTop: 4 }}>
                {[profile.age ? `Age ${profile.age}` : null, profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null].filter(Boolean).join("  ·  ")}
              </Text>
            )}
            {!hasProfile && (
              <TouchableOpacity onPress={() => setEditVisible(true)} style={{ marginTop: 8 }}>
                <Text style={{ color: theme.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Set up your profile →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={[st.statsRow, { marginHorizontal: 16, marginTop: 16, backgroundColor: theme.card }]}>
          {[
            { label: "Total", value: savedMedia.length },
            { label: "Photos", value: images.length },
            { label: "Videos", value: videos.length },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <View style={st.statItem}>
                <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: theme.primary }}>{s.value}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" }}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={[st.statDivider, { backgroundColor: theme.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Photos */}
        <View style={{ marginTop: 28, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Feather name="image" size={18} color={theme.primary} />
            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: theme.text }}>Saved Photos</Text>
            <View style={[st.badge, { backgroundColor: theme.primary }]}>
              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{images.length}</Text>
            </View>
          </View>
          {images.length === 0 ? (
            <View style={[st.emptyBox, { backgroundColor: theme.card }]}>
              <Feather name="camera" size={28} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontFamily: "Inter_500Medium", marginTop: 8, textAlign: "center" }}>No saved photos yet.{"\n"}Use the camera overlay to capture your drawings.</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -2 }}>
              {images.map((item) => <MediaThumb key={item.id} item={item} onPress={() => setViewingItem(item)} />)}
            </View>
          )}
        </View>

        {/* Videos */}
        <View style={{ marginTop: 32, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Feather name="video" size={18} color={theme.primary} />
            <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: theme.text }}>Saved Videos</Text>
            <View style={[st.badge, { backgroundColor: theme.primary }]}>
              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" }}>{videos.length}</Text>
            </View>
          </View>
          {videos.length === 0 ? (
            <View style={[st.emptyBox, { backgroundColor: theme.card }]}>
              <Feather name="video" size={28} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontFamily: "Inter_500Medium", marginTop: 8, textAlign: "center" }}>No recorded videos yet.{"\n"}Record your drawing sessions in the overlay.</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", margin: -2 }}>
              {videos.map((item) => <MediaThumb key={item.id} item={item} onPress={() => setViewingItem(item)} />)}
            </View>
          )}
        </View>
      </ScrollView>

      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} profile={profile} onSave={updateProfile} />

      {/* Image viewer */}
      {viewingItem?.type === "image" && (
        <ImageViewerModal item={viewingItem} onClose={() => setViewingItem(null)} onDelete={handleDelete} onExport={handleExport} />
      )}

      {/* Video player */}
      {viewingItem?.type === "video" && (
        <VideoPlayerModal item={viewingItem} onClose={() => setViewingItem(null)} onDelete={handleDelete} onSaveTimelapse={handleSaveTimelapse} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  label:     { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 4 },
  input:     { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, fontFamily: "Inter_400Regular" },
  genderBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  saveBtn:   { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  iconBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center" },
  playBtn:   { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 22 },
  actionLabel: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  profileCard:  { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 16 },
  editBtn:      { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  statsRow:     { flexDirection: "row", borderRadius: 14, padding: 16 },
  statItem:     { flex: 1, alignItems: "center", gap: 2 },
  statDivider:  { width: 1, marginVertical: 4 },
  badge:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, minWidth: 22, alignItems: "center" },
  emptyBox:     { borderRadius: 14, padding: 28, alignItems: "center", gap: 2 },
  speedRow:     { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  sheetBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
});
