import React, { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { MediaItem, Profile, useAppContext } from "@/contexts/AppContext";
import Colors from "@/constants/colors";

const { width: W } = Dimensions.get("window");
const THUMB = (W - 48) / 3;

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 80, color }: { name: string; size?: number; color: string }) {
  const initials = name.trim() ? name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + "30", borderWidth: 2, borderColor: color, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: size * 0.38, color, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditProfileModal({ visible, onClose, profile, onSave }: {
  visible: boolean; onClose: () => void;
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

        <Text style={[st.label, { color: theme.textSecondary }]}>Your Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor={theme.textSecondary}
          style={[st.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        />

        <Text style={[st.label, { color: theme.textSecondary, marginTop: 20 }]}>Age</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="Enter your age"
          placeholderTextColor={theme.textSecondary}
          style={[st.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        />

        <Text style={[st.label, { color: theme.textSecondary, marginTop: 20 }]}>Gender</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
          {genders.map((g) => (
            <TouchableOpacity
              key={g.value}
              onPress={() => setGender(g.value)}
              style={[st.genderBtn, { borderColor: gender === g.value ? theme.primary : theme.border, backgroundColor: gender === g.value ? theme.primary + "20" : theme.card }]}
            >
              <Text style={{ color: gender === g.value ? theme.primary : theme.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => { onSave({ name, age, gender }); onClose(); }}
          style={[st.saveBtn, { backgroundColor: theme.primary, marginTop: 36 }]}
        >
          <Text style={{ color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" }}>Save Profile</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Media Viewer ─────────────────────────────────────────────────────────────
function MediaViewer({ item, onClose, onDelete, onExport }: {
  item: MediaItem | null; onClose: () => void;
  onDelete: () => void; onExport: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  if (!item) return null;
  return (
    <Modal visible={!!item} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Image source={{ uri: item.uri }} style={{ flex: 1 }} resizeMode="contain" />
        <View style={{ position: "absolute", top: 52, right: 16 }}>
          <TouchableOpacity onPress={onClose} style={st.viewerBtn}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ position: "absolute", bottom: 40, flexDirection: "row", alignSelf: "center", gap: 16 }}>
          <TouchableOpacity onPress={onExport} style={[st.viewerActionBtn, { backgroundColor: "#007AFF" }]}>
            <Feather name="download" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[st.viewerActionBtn, { backgroundColor: "#EF4444" }]}>
            <Feather name="trash-2" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Media Thumbnail ──────────────────────────────────────────────────────────
function MediaThumb({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: THUMB, height: THUMB, margin: 2 }}>
      <Image source={{ uri: item.uri }} style={{ width: THUMB, height: THUMB, borderRadius: 8 }} resizeMode="cover" />
      {item.type === "video" && (
        <View style={{ position: "absolute", bottom: 6, right: 6, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 10, padding: 3 }}>
          <Feather name="video" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
        text: "Delete", style: "destructive",
        onPress: async () => {
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

  const hasProfile = !!profile.name;
  const displayName = profile.name || "Unnamed Artist";

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
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: theme.text }}>
              {displayName}
            </Text>
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

        {/* Stats row */}
        <View style={[st.statsRow, { marginHorizontal: 16, marginTop: 16, backgroundColor: theme.card }]}>
          <View style={st.statItem}>
            <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: theme.primary }}>{savedMedia.length}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" }}>Total Saved</Text>
          </View>
          <View style={[st.statDivider, { backgroundColor: theme.border }]} />
          <View style={st.statItem}>
            <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: theme.primary }}>{images.length}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" }}>Photos</Text>
          </View>
          <View style={[st.statDivider, { backgroundColor: theme.border }]} />
          <View style={st.statItem}>
            <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: theme.primary }}>{videos.length}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" }}>Videos</Text>
          </View>
        </View>

        {/* Saved Images */}
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
              {images.map((item) => (
                <MediaThumb key={item.id} item={item} onPress={() => setViewingItem(item)} />
              ))}
            </View>
          )}
        </View>

        {/* Saved Videos */}
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
              {videos.map((item) => (
                <MediaThumb key={item.id} item={item} onPress={() => setViewingItem(item)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} profile={profile} onSave={updateProfile} />
      <MediaViewer item={viewingItem} onClose={() => setViewingItem(null)} onDelete={handleDelete} onExport={handleExport} />
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, fontFamily: "Inter_400Regular" },
  genderBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  saveBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  viewerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  viewerActionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24 },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 16 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  statsRow: { flexDirection: "row", borderRadius: 14, padding: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, minWidth: 22, alignItems: "center" },
  emptyBox: { borderRadius: 14, padding: 28, alignItems: "center", gap: 2 },
});
