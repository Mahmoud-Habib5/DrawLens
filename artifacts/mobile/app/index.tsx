import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const OVERLAY_BASE_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.8;

type AppMode = "home" | "overlay";
type ImageFilter = "original" | "sketch" | "bw" | "highContrast";
type ControlPanel = "opacity" | "edge" | "contrast" | null;

// ─── Slider ─────────────────────────────────────────────────────────────────
function Slider({
  value,
  onChange,
  icon,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  icon: string;
  color: string;
}) {
  const trackWidth = SCREEN_WIDTH - 130;
  const panHandler = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX;
      onChange(Math.max(0.05, Math.min(1, x / trackWidth)));
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX;
      onChange(Math.max(0.05, Math.min(1, x / trackWidth)));
    },
  });

  return (
    <View style={slStyles.row}>
      <Feather name={icon as any} size={16} color={color} />
      <View style={{ flex: 1, height: 28, justifyContent: "center" }}>
        <View style={[slStyles.trackBg, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
        <View style={[slStyles.trackFill, { backgroundColor: color, width: `${value * 100}%` as any }]} />
        <View style={[slStyles.thumb, { backgroundColor: color, left: `${value * 100}%` as any }]} />
        <View style={[slStyles.touchArea, { width: trackWidth }]} {...panHandler.panHandlers} />
      </View>
      <Text style={[slStyles.val, { color, fontFamily: "Inter_600SemiBold" }]}>
        {Math.round(value * 100)}%
      </Text>
    </View>
  );
}

const slStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  trackBg: {
    position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2,
  },
  trackFill: {
    position: "absolute", left: 0, height: 4, borderRadius: 2,
  },
  thumb: {
    position: "absolute", width: 16, height: 16, borderRadius: 8, top: -6, marginLeft: -8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  touchArea: {
    position: "absolute", left: 0, height: 44, top: -18,
  },
  val: { fontSize: 12, minWidth: 34, textAlign: "right" },
});

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        toastStyles.container,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <Feather name="lock" size={13} color="#fff" />
      <Text style={[toastStyles.text, { fontFamily: "Inter_600SemiBold" }]}>{message}</Text>
    </Animated.View>
  );
}
const toastStyles = StyleSheet.create({
  container: {
    position: "absolute", top: 80, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(239,68,68,0.85)",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    zIndex: 100,
  },
  text: { color: "#fff", fontSize: 13 },
});

// ─── Recording Timer ─────────────────────────────────────────────────────────
function RecordingBadge({ elapsed }: { elapsed: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <View style={recStyles.badge}>
      <Animated.View style={[recStyles.dot, { opacity: pulse }]} />
      <Text style={[recStyles.time, { fontFamily: "Inter_600SemiBold" }]}>{mm}:{ss}</Text>
    </View>
  );
}
const recStyles = StyleSheet.create({
  badge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  time: { color: "#fff", fontSize: 13 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DrawingAssistant() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  // app state
  const [appMode, setAppMode] = useState<AppMode>("home");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImageFilter>("original");
  const [opacity, setOpacity] = useState(0.65);
  const [edgeThreshold, setEdgeThreshold] = useState(0.5);
  const [contrast, setContrast] = useState(0.7);
  const [isLocked, setIsLocked] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [controlPanel, setControlPanel] = useState<ControlPanel>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // overlay transform (plain JS refs — precise button-based controls)
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // drag position
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentPos = useRef({ x: 0, y: 0 });

  // animation refs
  const homeEnterAnim = useRef(new Animated.Value(0)).current;
  const overlayFadeAnim = useRef(new Animated.Value(1)).current;
  const uiControlsAnim = useRef(new Animated.Value(1)).current;

  // toast
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // recording timer
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    Animated.spring(homeEnterAnim, {
      toValue: 1, useNativeDriver: true, damping: 15, stiffness: 100,
    }).start();
  }, []);

  // ── Recording timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimer.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    }
    return () => { if (recordingTimer.current) clearInterval(recordingTimer.current); };
  }, [isRecording]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
  }, []);

  // ── Lock toggle ───────────────────────────────────────────────────────────
  const toggleLock = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLocked((prev) => {
      const next = !prev;
      if (next) {
        showToast("Position Locked");
        setControlPanel(null);
        Animated.timing(uiControlsAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      } else {
        Animated.timing(uiControlsAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
      return next;
    });
  }, [showToast]);

  // ── Image picker ─────────────────────────────────────────────────────────
  const resetOverlay = useCallback(() => {
    panAnim.setValue({ x: 0, y: 0 });
    currentPos.current = { x: 0, y: 0 };
    setScale(1);
    setRotation(0);
    setFilter("original");
    setIsLocked(false);
    setControlPanel(null);
    uiControlsAnim.setValue(1);
  }, [panAnim]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedImage(result.assets[0].uri);
      resetOverlay();
      setAppMode("overlay");
    }
  }, [resetOverlay]);

  const captureImage = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const r = await requestCameraPermission();
      if (!r.granted) return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedImage(result.assets[0].uri);
      resetOverlay();
      setAppMode("overlay");
    }
  }, [cameraPermission, requestCameraPermission, resetOverlay]);

  const goHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRecording) stopRecording();
    setAppMode("home");
    setSelectedImage(null);
    setFlashOn(false);
  }, [isRecording]);

  // ── Video recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!cameraRef.current || Platform.OS === "web") return;
    if (!mediaPermission?.granted) {
      const r = await requestMediaPermission();
      if (!r.granted) {
        Alert.alert("Permission needed", "Allow media library to save videos.");
        return;
      }
    }
    try {
      setIsRecording(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const video = await cameraRef.current.recordAsync();
      if (video?.uri) {
        await MediaLibrary.saveToLibraryAsync(video.uri);
        Alert.alert("Video Saved", "Recording saved to your photo library.");
      }
    } catch (e) {
      // recording stopped or permission denied
    } finally {
      setIsRecording(false);
    }
  }, [mediaPermission, requestMediaPermission]);

  const stopRecording = useCallback(() => {
    if (!cameraRef.current || Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    cameraRef.current.stopRecording();
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // ── Flash ─────────────────────────────────────────────────────────────────
  const toggleFlash = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashOn((f) => !f);
  }, []);

  // ── Camera flip ───────────────────────────────────────────────────────────
  const flipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((f) => (f === "back" ? "front" : "back"));
  }, []);

  // ── Screenshot ────────────────────────────────────────────────────────────
  const saveScreenshot = useCallback(async () => {
    if (!cameraRef.current) return;
    if (!mediaPermission?.granted) {
      const r = await requestMediaPermission();
      if (!r.granted) {
        Alert.alert("Permission needed", "Allow media library to save photos.");
        return;
      }
    }
    try {
      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
        Alert.alert("Saved!", "Photo saved to your library.");
      }
    } catch {
      Alert.alert("Error", "Could not save photo.");
    } finally {
      setIsSaving(false);
    }
  }, [mediaPermission, requestMediaPermission]);

  // ── Filter toggle ─────────────────────────────────────────────────────────
  const cycleFilter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(overlayFadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(overlayFadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setFilter((f) => {
      const order: ImageFilter[] = ["original", "sketch", "bw", "highContrast"];
      const idx = order.indexOf(f);
      return order[(idx + 1) % order.length];
    });
  }, [overlayFadeAnim]);

  const filterLabel: Record<ImageFilter, string> = {
    original: "Original",
    sketch: "Sketch",
    bw: "B&W",
    highContrast: "Hi-Con",
  };

  const filterIcon: Record<ImageFilter, string> = {
    original: "image",
    sketch: "edit-2",
    bw: "circle",
    highContrast: "zap",
  };

  // ── Drag (single-finger move) ────────────────────────────────────────────
  // Use a ref for isLocked so the PanResponder always reads the latest value
  const isLockedRef = useRef(false);
  useEffect(() => { isLockedRef.current = isLocked; }, [isLocked]);

  const dragResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isLockedRef.current,
      onMoveShouldSetPanResponder: () => !isLockedRef.current,
      onPanResponderGrant: () => {
        panAnim.setOffset(currentPos.current);
        panAnim.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: panAnim.x, dy: panAnim.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        currentPos.current = {
          x: currentPos.current.x + gs.dx,
          y: currentPos.current.y + gs.dy,
        };
        panAnim.flattenOffset();
      },
    })
  ).current;

  // ── Rotation buttons ─────────────────────────────────────────────────────
  const rotateBy = useCallback((deg: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRotation((r) => r + deg);
  }, []);

  const scaleBy = useCallback((factor: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScale((s) => Math.max(0.2, Math.min(5, s * factor)));
  }, []);

  // ── Grid ─────────────────────────────────────────────────────────────────
  const renderGrid = () => {
    const cols = 4, rows = 6;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: cols - 1 }).map((_, i) => (
          <View key={`v${i}`} style={[st.gridLine, { left: (SCREEN_WIDTH / cols) * (i + 1), width: 1, height: "100%", position: "absolute", top: 0 }]} />
        ))}
        {Array.from({ length: rows - 1 }).map((_, i) => (
          <View key={`h${i}`} style={[st.gridLine, { top: (SCREEN_HEIGHT / rows) * (i + 1), height: 1, width: "100%", position: "absolute", left: 0 }]} />
        ))}
      </View>
    );
  };

  // ── Overlay image with filters ────────────────────────────────────────────
  const renderOverlayImage = () => {
    if (!selectedImage) return null;
    const imageSize = OVERLAY_BASE_SIZE * scale;

    const baseImage = (
      <Image
        source={{ uri: selectedImage }}
        style={{ width: imageSize, height: imageSize, opacity }}
        resizeMode="contain"
      />
    );

    if (filter === "original") {
      return baseImage;
    }

    if (filter === "sketch") {
      return (
        <View style={{ width: imageSize, height: imageSize }}>
          {/* Base washed-out layer */}
          <Image source={{ uri: selectedImage }} style={{ position: "absolute", width: imageSize, height: imageSize, opacity: opacity * 0.4 }} resizeMode="contain" />
          {/* Edge/outline layer — blurred light overlay */}
          <Image source={{ uri: selectedImage }} style={{ position: "absolute", width: imageSize, height: imageSize, opacity: opacity * edgeThreshold, tintColor: "#FFFFFF" }} resizeMode="contain" blurRadius={1} />
          {/* Dark edge layer */}
          <Image source={{ uri: selectedImage }} style={{ position: "absolute", width: imageSize, height: imageSize, opacity: opacity * (1 - edgeThreshold * 0.4), tintColor: "#000000" }} resizeMode="contain" blurRadius={2} />
        </View>
      );
    }

    if (filter === "bw") {
      return (
        <View style={{ width: imageSize, height: imageSize }}>
          <Image source={{ uri: selectedImage }} style={{ position: "absolute", width: imageSize, height: imageSize, opacity }} resizeMode="contain" />
          {/* B&W desaturation overlay — gray multiply layer */}
          <View style={{ position: "absolute", width: imageSize, height: imageSize, backgroundColor: `rgba(128,128,128,${opacity * contrast * 0.55})` }} />
        </View>
      );
    }

    if (filter === "highContrast") {
      return (
        <View style={{ width: imageSize, height: imageSize }}>
          {/* Strong contrast: layer image twice at high opacity with slight invert suggestion */}
          <Image source={{ uri: selectedImage }} style={{ position: "absolute", width: imageSize, height: imageSize, opacity: opacity * (0.5 + contrast * 0.5) }} resizeMode="contain" />
          <Image source={{ uri: selectedImage }} style={{ position: "absolute", width: imageSize, height: imageSize, opacity: opacity * contrast * 0.5, tintColor: "#000" }} resizeMode="contain" blurRadius={0} />
          <View style={{ position: "absolute", width: imageSize, height: imageSize, backgroundColor: `rgba(0,0,0,${contrast * 0.2})` }} />
        </View>
      );
    }

    return baseImage;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (appMode === "home") {
    return (
      <View style={[st.homeContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Animated.View
          style={[
            st.homeContent,
            {
              opacity: homeEnterAnim,
              transform: [{ translateY: homeEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16),
            },
          ]}
        >
          <View style={st.homeHeader}>
            <View style={[st.logoMark, { backgroundColor: theme.primary }]}>
              <Feather name="edit-3" size={28} color="#fff" />
            </View>
            <Text style={[st.appTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Drawing Assistant</Text>
            <Text style={[st.appSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Trace anything with camera overlay
            </Text>
          </View>

          <View style={st.featureGrid}>
            {([
              { icon: "camera", label: "Live overlay" },
              { icon: "sliders", label: "Opacity control" },
              { icon: "move", label: "Precise transform" },
              { icon: "edit-2", label: "Sketch & B&W filters" },
              { icon: "video", label: "Video recording" },
              { icon: "grid", label: "Grid guide" },
            ] as { icon: string; label: string }[]).map((f, i) => (
              <View key={i} style={[st.featureChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[st.featureChipIcon, { backgroundColor: `${theme.primary}18` }]}>
                  <Feather name={f.icon as any} size={15} color={theme.primary} />
                </View>
                <Text style={[st.featureChipText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{f.label}</Text>
              </View>
            ))}
          </View>

          <View style={st.homeActions}>
            <TouchableOpacity style={[st.primaryBtn, { backgroundColor: theme.primary }]} onPress={pickImage} activeOpacity={0.85}>
              <Feather name="image" size={20} color="#fff" />
              <Text style={[st.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Upload from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.secondaryBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={captureImage} activeOpacity={0.85}>
              <Feather name="camera" size={20} color={theme.text} />
              <Text style={[st.secondaryBtnText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Take a Photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={[st.tip, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            Place your phone above paper and trace the overlay
          </Text>
        </Animated.View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERLAY SCREEN — permissions check
  // ═══════════════════════════════════════════════════════════════════════════
  if (!cameraPermission) {
    return (
      <View style={[st.permContainer, { backgroundColor: theme.background, paddingTop: insets.top + 16 }]}>
        <Text style={[st.permText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Checking camera permission…</Text>
      </View>
    );
  }
  if (!cameraPermission.granted) {
    return (
      <View style={[st.permContainer, { backgroundColor: theme.background, paddingTop: insets.top + 16 }]}>
        <Feather name="camera-off" size={48} color={theme.textSecondary} />
        <Text style={[st.permTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Camera Access Needed</Text>
        <Text style={[st.permText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Grant camera access to use the live overlay feature.
        </Text>
        <TouchableOpacity style={[st.primaryBtn, { backgroundColor: theme.primary, marginTop: 24 }]} onPress={requestCameraPermission}>
          <Text style={[st.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={goHome}>
          <Text style={[st.backLink, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERLAY SCREEN — main
  // ═══════════════════════════════════════════════════════════════════════════
  const imageSize = OVERLAY_BASE_SIZE * scale;

  return (
    <View style={st.overlayContainer}>
      <StatusBar hidden />

      {/* Camera feed */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={flashOn}
      />

      {/* Grid */}
      {showGrid && renderGrid()}

      {/* Overlay image (draggable) */}
      {selectedImage && (
        <Animated.View
          style={[
            st.overlayImageWrap,
            {
              opacity: overlayFadeAnim,
              transform: [
                { translateX: panAnim.x },
                { translateY: panAnim.y },
                { rotate: `${rotation}deg` },
              ],
              width: imageSize,
              height: imageSize,
            },
          ]}
          {...(isLocked ? {} : dragResponder.panHandlers)}
        >
          {renderOverlayImage()}

          {/* Bounding box when not locked */}
          {!isLocked && (
            <View style={[st.boundingBox, { borderColor: "rgba(245,166,35,0.7)" }]} pointerEvents="none" />
          )}
        </Animated.View>
      )}

      {/* Toast */}
      <Toast message="Position Locked — all controls hidden" visible={toastVisible} />

      {/* Recording badge */}
      {isRecording && (
        <View style={[st.recordingBadgeWrap, { top: insets.top + 16 }]}>
          <RecordingBadge elapsed={recordingSeconds} />
        </View>
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <Animated.View style={[st.topBar, { paddingTop: insets.top + 8, opacity: uiControlsAnim }]} pointerEvents={isLocked ? "none" : "box-none"}>
        <TouchableOpacity style={st.iconBtn} onPress={goHome}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Filter toggle */}
        <TouchableOpacity
          style={[st.modeToggle, filter !== "original" && { backgroundColor: theme.primary }]}
          onPress={cycleFilter}
        >
          <Feather name={filterIcon[filter] as any} size={15} color="#fff" />
          <Text style={[st.modeToggleText, { fontFamily: "Inter_600SemiBold" }]}>{filterLabel[filter]}</Text>
        </TouchableOpacity>

        <View style={st.topRight}>
          {/* Flash */}
          {Platform.OS !== "web" && (
            <TouchableOpacity style={[st.iconBtn, flashOn && { backgroundColor: "#FBBF24" }]} onPress={toggleFlash}>
              <Ionicons name={flashOn ? "flash" : "flash-off"} size={18} color="#fff" />
            </TouchableOpacity>
          )}
          {/* Flip camera */}
          <TouchableOpacity style={st.iconBtn} onPress={flipCamera}>
            <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Transform controls (left sidebar) ────────────────────────────── */}
      <Animated.View style={[st.transformSidebar, { top: SCREEN_HEIGHT / 2 - 110, opacity: uiControlsAnim }]} pointerEvents={isLocked ? "none" : "box-none"}>
        {/* Scale up */}
        <TouchableOpacity style={st.sideBtn} onPress={() => scaleBy(1.1)}>
          <Feather name="zoom-in" size={18} color="#fff" />
        </TouchableOpacity>
        {/* Scale down */}
        <TouchableOpacity style={st.sideBtn} onPress={() => scaleBy(0.9)}>
          <Feather name="zoom-out" size={18} color="#fff" />
        </TouchableOpacity>
        {/* Rotate CCW */}
        <TouchableOpacity style={st.sideBtn} onPress={() => rotateBy(-15)}>
          <MaterialCommunityIcons name="rotate-left" size={18} color="#fff" />
        </TouchableOpacity>
        {/* Rotate CW */}
        <TouchableOpacity style={st.sideBtn} onPress={() => rotateBy(15)}>
          <MaterialCommunityIcons name="rotate-right" size={18} color="#fff" />
        </TouchableOpacity>
        {/* Reset */}
        <TouchableOpacity style={st.sideBtn} onPress={() => { setScale(1); setRotation(0); panAnim.setValue({ x: 0, y: 0 }); currentPos.current = { x: 0, y: 0 }; }}>
          <Feather name="refresh-cw" size={16} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Bottom panel ─────────────────────────────────────────────────── */}
      <Animated.View style={[st.bottomBar, { paddingBottom: insets.bottom + 12, opacity: uiControlsAnim }]} pointerEvents={isLocked ? "none" : "box-none"}>

        {/* Sliders */}
        {controlPanel === "opacity" && (
          <View style={[st.sliderPanel, { backgroundColor: isDark ? "rgba(20,20,36,0.95)" : "rgba(255,255,255,0.96)" }]}>
            <Slider value={opacity} onChange={setOpacity} icon="eye" color={theme.primary} />
          </View>
        )}
        {controlPanel === "edge" && (filter === "sketch") && (
          <View style={[st.sliderPanel, { backgroundColor: isDark ? "rgba(20,20,36,0.95)" : "rgba(255,255,255,0.96)" }]}>
            <Slider value={edgeThreshold} onChange={setEdgeThreshold} icon="edit-2" color={theme.primary} />
          </View>
        )}
        {controlPanel === "contrast" && (filter === "bw" || filter === "highContrast") && (
          <View style={[st.sliderPanel, { backgroundColor: isDark ? "rgba(20,20,36,0.95)" : "rgba(255,255,255,0.96)" }]}>
            <Slider value={contrast} onChange={setContrast} icon="sliders" color={theme.primary} />
          </View>
        )}

        {/* Main control row */}
        <View style={st.controlRow}>
          {/* Opacity */}
          <TouchableOpacity
            style={[st.controlBtn, controlPanel === "opacity" && { backgroundColor: theme.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setControlPanel(controlPanel === "opacity" ? null : "opacity"); }}
          >
            <Feather name="eye" size={19} color="#fff" />
          </TouchableOpacity>

          {/* Edge/contrast slider depending on filter */}
          {(filter === "sketch") && (
            <TouchableOpacity
              style={[st.controlBtn, controlPanel === "edge" && { backgroundColor: theme.primary }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setControlPanel(controlPanel === "edge" ? null : "edge"); }}
            >
              <Feather name="edit-2" size={19} color="#fff" />
            </TouchableOpacity>
          )}
          {(filter === "bw" || filter === "highContrast") && (
            <TouchableOpacity
              style={[st.controlBtn, controlPanel === "contrast" && { backgroundColor: theme.primary }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setControlPanel(controlPanel === "contrast" ? null : "contrast"); }}
            >
              <Feather name="sliders" size={19} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Grid */}
          <TouchableOpacity
            style={[st.controlBtn, showGrid && { backgroundColor: theme.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowGrid((v) => !v); }}
          >
            <Feather name="grid" size={19} color="#fff" />
          </TouchableOpacity>

          {/* Lock */}
          <TouchableOpacity
            style={[st.controlBtn, isLocked && { backgroundColor: theme.danger }]}
            onPress={toggleLock}
          >
            <Feather name={isLocked ? "lock" : "unlock"} size={19} color="#fff" />
          </TouchableOpacity>

          {/* Record */}
          {Platform.OS !== "web" && (
            <TouchableOpacity
              style={[st.controlBtn, isRecording && { backgroundColor: "#EF4444" }]}
              onPress={toggleRecording}
            >
              <Feather name={isRecording ? "square" : "video"} size={19} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Save photo */}
          <TouchableOpacity
            style={[st.controlBtn, isSaving && { opacity: 0.5 }]}
            onPress={saveScreenshot}
            disabled={isSaving || isRecording}
          >
            <Feather name="download" size={19} color="#fff" />
          </TouchableOpacity>

          {/* New image */}
          <TouchableOpacity style={st.controlBtn} onPress={pickImage}>
            <Feather name="image" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Lock tap-to-unlock hint */}
      {isLocked && (
        <TouchableOpacity style={st.unlockOverlay} onPress={toggleLock} activeOpacity={1}>
          <View style={st.unlockHint}>
            <Feather name="unlock" size={14} color="#fff" />
            <Text style={[st.unlockText, { fontFamily: "Inter_500Medium" }]}>Tap to unlock</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ICON_BTN_BG = "rgba(0,0,0,0.58)";
const CONTROL_BTN_BG = "rgba(0,0,0,0.62)";

const st = StyleSheet.create({
  // ── Home ──
  homeContainer: { flex: 1 },
  homeContent: { flex: 1, paddingHorizontal: 22, justifyContent: "space-between" },
  homeHeader: { alignItems: "center", paddingTop: 16 },
  logoMark: {
    width: 72, height: 72, borderRadius: 22,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
    shadowColor: "#F5A623", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  appTitle: { fontSize: 28, letterSpacing: -0.5, marginBottom: 6 },
  appSubtitle: { fontSize: 14, textAlign: "center" },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    width: (SCREEN_WIDTH - 52) / 2,
  },
  featureChipIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  featureChipText: { fontSize: 13, flex: 1 },
  homeActions: { gap: 10 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 15, borderRadius: 16,
    shadowColor: "#F5A623", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16 },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 15, borderRadius: 16, borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 16 },
  tip: { textAlign: "center", fontSize: 12, paddingBottom: 4 },
  // ── Overlay ──
  overlayContainer: { flex: 1, backgroundColor: "#000" },
  overlayImageWrap: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - OVERLAY_BASE_SIZE / 2,
    left: SCREEN_WIDTH / 2 - OVERLAY_BASE_SIZE / 2,
    justifyContent: "center", alignItems: "center",
  },
  boundingBox: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderStyle: "dashed", borderRadius: 4,
  },
  // ── Top bar ──
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 14, paddingBottom: 10, gap: 10,
  },
  topRight: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ICON_BTN_BG,
    justifyContent: "center", alignItems: "center",
  },
  modeToggle: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: ICON_BTN_BG, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  modeToggleText: { color: "#fff", fontSize: 13 },
  // ── Transform sidebar ──
  transformSidebar: {
    position: "absolute", left: 10,
    gap: 8,
  },
  sideBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ICON_BTN_BG,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
  },
  // ── Bottom bar ──
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, gap: 10,
  },
  sliderPanel: {
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  controlRow: {
    flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap",
  },
  controlBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: CONTROL_BTN_BG,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
  },
  // ── Grid ──
  gridLine: { backgroundColor: "rgba(255,255,255,0.22)" },
  // ── Recording badge ──
  recordingBadgeWrap: { position: "absolute", alignSelf: "center" },
  // ── Lock ──
  unlockOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "flex-end", alignItems: "center", paddingBottom: 40,
  },
  unlockHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  unlockText: { color: "#fff", fontSize: 13 },
  // ── Permissions ──
  permContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 16 },
  permTitle: { fontSize: 22, textAlign: "center" },
  permText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  backLink: { fontSize: 15 },
});
