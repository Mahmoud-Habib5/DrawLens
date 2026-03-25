import React, { useCallback, useRef } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Feather, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAppContext } from "@/contexts/AppContext";
import {
  DIFFICULTY_COLORS,
  TEMPLATE_CATEGORIES,
  TemplateCategory,
  TemplateImage,
} from "@/constants/templates";

const { width: W } = Dimensions.get("window");
const CARD_W = 110;
const CARD_H = 130;

// ─── Template Thumbnail ───────────────────────────────────────────────────────
function TemplateCard({ item, theme }: { item: TemplateImage; theme: typeof Colors.light }) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start(() => {
      router.push({ pathname: "/overlay", params: { imageUri: item.imageUrl } });
    });
  }, [item.imageUrl, scale]);

  const diffColor = DIFFICULTY_COLORS[item.difficulty];

  return (
    <Animated.View style={{ transform: [{ scale }], marginRight: 10 }}>
      <TouchableOpacity onPress={press} activeOpacity={0.85}>
        <View style={[st.templateCard, { backgroundColor: theme.card }]}>
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: CARD_W, height: CARD_H - 42, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            resizeMode="cover"
          />
          <View style={{ padding: 6, gap: 3 }}>
            <Text numberOfLines={1} style={{ color: theme.text, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{item.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: diffColor }} />
              <Text style={{ color: diffColor, fontSize: 9, fontFamily: "Inter_600SemiBold" }}>{item.difficulty.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────
function CategoryRow({ category, theme }: { category: TemplateCategory; theme: typeof Colors.light }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: category.color + "25", justifyContent: "center", alignItems: "center" }}>
          <Feather name={category.icon as any} size={14} color={category.color} />
        </View>
        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: theme.text, flex: 1 }}>{category.name}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" }}>{category.templates.length} images</Text>
      </View>
      <FlatList
        data={category.templates}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => <TemplateCard item={item} theme={theme} />}
      />
    </View>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionButton({ icon, label, onPress, primary, theme }: {
  icon: string; label: string;
  onPress: () => void;
  primary?: boolean;
  theme: typeof Colors.light;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity
        onPress={press}
        activeOpacity={0.85}
        style={[
          st.actionBtn,
          primary
            ? { backgroundColor: theme.primary }
            : { backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border },
        ]}
      >
        <Feather name={icon as any} size={20} color={primary ? "#fff" : theme.primary} />
        <Text style={{ color: primary ? "#fff" : theme.text, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { profile, savedMedia } = useAppContext();

  const pickFromGallery = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      router.push({ pathname: "/overlay", params: { imageUri: result.assets[0].uri } });
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      router.push({ pathname: "/overlay", params: { imageUri: result.assets[0].uri } });
    }
  }, []);

  const displayName = profile.name ? `Hi, ${profile.name.split(" ")[0]}!` : "Drawing Assistant";
  const avatarInitials = profile.name
    ? profile.name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 2 }}>
              {profile.name ? "Welcome back" : "Welcome to"}
            </Text>
            <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: theme.text }}>
              {displayName}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={[st.profileBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            {avatarInitials ? (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary + "30", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: theme.primary, fontFamily: "Inter_700Bold", fontSize: 14 }}>{avatarInitials}</Text>
              </View>
            ) : (
              <Feather name="user" size={20} color={theme.text} />
            )}
            {savedMedia.length > 0 && (
              <View style={[st.notifBadge, { backgroundColor: theme.primary }]}>
                <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" }}>{savedMedia.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Upload / Capture buttons ─────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 28 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.textSecondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Add Your Reference
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ActionButton icon="image" label="From Gallery" onPress={pickFromGallery} primary theme={theme} />
            <ActionButton icon="camera" label="Take Photo" onPress={capturePhoto} theme={theme} />
          </View>
        </View>

        {/* ── Template Library ─────────────────────────────────────────── */}
        <View style={{ marginBottom: 10, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Ionicons name="library-outline" size={18} color={theme.primary} />
            <Text style={{ fontSize: 19, fontFamily: "Inter_700Bold", color: theme.text }}>
              Template Library
            </Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13 }}>
            Tap any template to open it in the overlay
          </Text>
        </View>

        <View style={{ marginTop: 16 }}>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <CategoryRow key={cat.id} category={cat} theme={theme} />
          ))}
        </View>

        {/* Bottom hint */}
        <Text style={{ textAlign: "center", color: theme.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 8, paddingHorizontal: 32 }}>
          Place your phone above paper and trace the overlay
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  profileBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1,
  },
  notifBadge: {
    position: "absolute", top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  templateCard: {
    width: CARD_W, height: CARD_H,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
});
