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
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAppContext } from "@/contexts/AppContext";

const { width: W, height: H } = Dimensions.get("window");
const BASE_SIZE = Math.min(W, H) * 0.8;

type ImageFilter = "original" | "sketch" | "bw" | "highContrast";
type ControlPanel = "opacity" | "edge" | "contrast" | null;

// ─── Inline Slider ────────────────────────────────────────────────────────────
function Slider({ value, onChange, icon, color }: { value: number; onChange: (v: number) => void; icon: string; color: string }) {
  const trackW = W - 130;
  const pr = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => onChange(Math.max(0.05, Math.min(1, e.nativeEvent.locationX / trackW))),
    onPanResponderMove: (e) => onChange(Math.max(0.05, Math.min(1, e.nativeEvent.locationX / trackW))),
  });
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Feather name={icon as any} size={16} color={color} />
      <View style={{ flex: 1, height: 28, justifyContent: "center" }}>
        <View style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)" }} />
        <View style={{ position: "absolute", left: 0, height: 4, borderRadius: 2, backgroundColor: color, width: `${value * 100}%` as any }} />
        <View style={{ position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: color, top: -6, marginLeft: -8, left: `${value * 100}%` as any }} />
        <View style={{ position: "absolute", left: 0, height: 44, top: -18, width: trackW }} {...pr.panHandlers} />
      </View>
      <Text style={{ color, fontSize: 12, minWidth: 34, textAlign: "right", fontFamily: "Inter_600SemiBold" }}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: 80, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(239,68,68,0.85)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, zIndex: 100, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
      <Feather name="lock" size={13} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{message}</Text>
    </Animated.View>
  );
}

// ─── Recording Badge ──────────────────────────────────────────────────────────
function RecordingBadge({ elapsed }: { elapsed: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.2, duration: 500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]));
    a.start(); return () => a.stop();
  }, []);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
      <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", opacity: pulse }} />
      <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{mm}:{ss}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OverlayScreen() {
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { addMedia } = useAppContext();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

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
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentPos = useRef({ x: 0, y: 0 });
  const overlayFadeAnim = useRef(new Animated.Value(1)).current;
  const uiAnim = useRef(new Animated.Value(1)).current;
  const isLockedRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { isLockedRef.current = isLocked; }, [isLocked]);

  // ── Recording timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordTimer.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } else {
      if (recordTimer.current) clearInterval(recordTimer.current);
    }
    return () => { if (recordTimer.current) clearInterval(recordTimer.current); };
  }, [isRecording]);

  const showToast = useCallback((msg: string) => {
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2200);
  }, []);

  // ── Ensure media permission ───────────────────────────────────────────────
  const ensureMediaPermission = useCallback(async () => {
    if (mediaPermission?.granted) return true;
    const r = await requestMediaPermission();
    if (!r.granted) {
      Alert.alert("Permission Required", "Allow media library access to save your work.");
      return false;
    }
    return true;
  }, [mediaPermission, requestMediaPermission]);

  // ── Lock toggle ───────────────────────────────────────────────────────────
  const toggleLock = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLocked((prev) => {
      const next = !prev;
      if (next) {
        showToast("Position Locked");
        setControlPanel(null);
        Animated.timing(uiAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
      } else {
        Animated.timing(uiAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      }
      return next;
    });
  }, [showToast]);

  // ── Flash ─────────────────────────────────────────────────────────────────
  const toggleFlash = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashOn((f) => !f);
  }, []);

  // ── Camera flip ───────────────────────────────────────────────────────────
  const flipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Camera needs to re-initialise after flip
    setIsCameraReady(false);
    setFacing((f) => (f === "back" ? "front" : "back"));
  }, []);

  // ── Video recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") return;

    // Camera ref guard
    if (!cameraRef.current) {
      Alert.alert("Camera not ready", "Please wait a moment and try again.");
      return;
    }

    // Camera ready guard
    if (!isCameraReady) {
      Alert.alert("Camera not ready", "The camera is still initialising. Please wait.");
      return;
    }

    // Camera permission
    if (!cameraPermission?.granted) {
      const r = await requestCameraPermission();
      if (!r.granted) {
        Alert.alert("Camera Permission", "Camera access is required to record video.");
        return;
      }
    }

    // Microphone permission (required for video audio on iOS)
    if (!micPermission?.granted) {
      const r = await requestMicPermission();
      if (!r.granted) {
        Alert.alert(
          "Microphone Required",
          "Microphone access is needed to record video with audio. Please enable it in Settings → Privacy → Microphone."
        );
        return;
      }
    }

    if (!(await ensureMediaPermission())) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsRecording(true);

    try {
      // Small delay — iOS camera hardware needs a moment after becoming "ready"
      await new Promise<void>((res) => setTimeout(res, 350));

      console.log("[Recording] Starting recordAsync…");
      const video = await cameraRef.current.recordAsync({ maxDuration: 300 });
      console.log("[Recording] Completed. URI:", video?.uri);

      if (video?.uri) {
        await MediaLibrary.saveToLibraryAsync(video.uri);
        await addMedia(video.uri, "video");
        Alert.alert("Video Saved", "Your recording has been saved to your gallery and profile.");
      } else {
        console.warn("[Recording] No URI returned.");
      }
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      console.error("[Recording] Error:", msg);
      // Suppress intentional stop signals
      if (!msg.includes("cancelled") && !msg.includes("stopped") && !msg.includes("aborted")) {
        Alert.alert("Recording Error", `Could not record video.\n\n${msg}`);
      }
    } finally {
      setIsRecording(false);
    }
  }, [isCameraReady, cameraPermission, micPermission, requestCameraPermission, requestMicPermission, ensureMediaPermission, addMedia]);

  const stopRecording = useCallback(() => {
    if (!cameraRef.current || Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    cameraRef.current.stopRecording();
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ── Screenshot ────────────────────────────────────────────────────────────
  const savePhoto = useCallback(async () => {
    if (!cameraRef.current || isSaving) return;
    if (!(await ensureMediaPermission())) return;
    try {
      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
        await addMedia(photo.uri, "image");
        Alert.alert("Photo Saved", "Saved to your gallery and profile.");
      }
    } catch {
      Alert.alert("Error", "Could not save the photo.");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, ensureMediaPermission, addMedia]);

  // ── Filter cycle ──────────────────────────────────────────────────────────
  const cycleFilter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(overlayFadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(overlayFadeAnim, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
    setFilter((f) => {
      const order: ImageFilter[] = ["original", "sketch", "bw", "highContrast"];
      return order[(order.indexOf(f) + 1) % order.length];
    });
  }, [overlayFadeAnim]);

  // ── Transform ────────────────────────────────────────────────────────────
  const rotateBy = (deg: number) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRotation((r) => r + deg); };
  const scaleBy = (factor: number) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setScale((s) => Math.max(0.15, Math.min(5, s * factor))); };
  const resetTransform = () => {
    setScale(1); setRotation(0);
    panAnim.setValue({ x: 0, y: 0 });
    currentPos.current = { x: 0, y: 0 };
  };

  // ── Drag ─────────────────────────────────────────────────────────────────
  const dragResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !isLockedRef.current,
    onMoveShouldSetPanResponder: () => !isLockedRef.current,
    onPanResponderGrant: () => { panAnim.setOffset(currentPos.current); panAnim.setValue({ x: 0, y: 0 }); },
    onPanResponderMove: Animated.event([null, { dx: panAnim.x, dy: panAnim.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gs) => {
      currentPos.current = { x: currentPos.current.x + gs.dx, y: currentPos.current.y + gs.dy };
      panAnim.flattenOffset();
    },
  })).current;

  // ── Grid ──────────────────────────────────────────────────────────────────
  const renderGrid = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[1, 2, 3].map((i) => (
        <View key={`v${i}`} style={{ position: "absolute", left: (W / 4) * i, width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.2)" }} />
      ))}
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={`h${i}`} style={{ position: "absolute", top: (H / 6) * i, height: 1, width: "100%", backgroundColor: "rgba(255,255,255,0.2)" }} />
      ))}
    </View>
  );

  // ── Overlay image with filters ─────────────────────────────────────────────
  const renderOverlay = () => {
    if (!imageUri) return null;
    const sz = BASE_SIZE * scale;
    const img = (s: object) => (
      <Image source={{ uri: imageUri }} style={[{ width: sz, height: sz }, s]} resizeMode="contain" />
    );
    if (filter === "sketch") return (
      <View style={{ width: sz, height: sz }}>
        {img({ opacity: opacity * 0.3 })}
        {img({ position: "absolute", opacity: opacity * edgeThreshold, tintColor: "#FFFFFF", blurRadius: 1 } as any)}
        {img({ position: "absolute", opacity: opacity * (1 - edgeThreshold * 0.4), tintColor: "#111", blurRadius: 2 } as any)}
      </View>
    );
    if (filter === "bw") return (
      <View style={{ width: sz, height: sz }}>
        {img({ opacity })}
        <View style={{ position: "absolute", width: sz, height: sz, backgroundColor: `rgba(120,120,120,${opacity * contrast * 0.5})` }} />
      </View>
    );
    if (filter === "highContrast") return (
      <View style={{ width: sz, height: sz }}>
        {img({ opacity: opacity * (0.5 + contrast * 0.5) })}
        {img({ position: "absolute", opacity: opacity * contrast * 0.45, tintColor: "#000" } as any)}
        <View style={{ position: "absolute", width: sz, height: sz, backgroundColor: `rgba(0,0,0,${contrast * 0.18})` }} />
      </View>
    );
    return img({ opacity });
  };

  const filterLabel: Record<ImageFilter, string> = { original: "Original", sketch: "Sketch", bw: "B&W", highContrast: "Hi-Con" };
  const filterIcon: Record<ImageFilter, string> = { original: "image", sketch: "edit-2", bw: "circle", highContrast: "zap" };

  const imageSize = BASE_SIZE * scale;

  // ── Permission checks ─────────────────────────────────────────────────────
  if (!cameraPermission) {
    return <View style={[st.center, { backgroundColor: theme.background }]}><Text style={{ color: theme.textSecondary, fontFamily: "Inter_400Regular" }}>Loading…</Text></View>;
  }
  if (!cameraPermission.granted) {
    return (
      <View style={[st.center, { backgroundColor: theme.background, paddingTop: insets.top + 16 }]}>
        <Feather name="camera-off" size={48} color={theme.textSecondary} />
        <Text style={[st.permTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Camera Access Needed</Text>
        <Text style={[st.permText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Grant camera access to use the overlay.</Text>
        <TouchableOpacity style={[st.permBtn, { backgroundColor: theme.primary, marginTop: 24 }]} onPress={requestCameraPermission}>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: theme.textSecondary, fontFamily: "Inter_500Medium", fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />

      {/* Camera — mode="video" is required on iOS for recordAsync() to work */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={flashOn}
        mode="video"
        onCameraReady={() => {
          console.log("[Camera] Ready");
          setIsCameraReady(true);
        }}
      />

      {showGrid && renderGrid()}

      {/* Overlay */}
      {imageUri ? (
        <Animated.View
          style={{
            position: "absolute",
            top: H / 2 - imageSize / 2,
            left: W / 2 - imageSize / 2,
            width: imageSize,
            height: imageSize,
            opacity: overlayFadeAnim,
            transform: [
              { translateX: panAnim.x },
              { translateY: panAnim.y },
              { rotate: `${rotation}deg` },
            ],
          }}
          {...(isLocked ? {} : dragResponder.panHandlers)}
        >
          {renderOverlay()}
          {!isLocked && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(245,166,35,0.65)", borderRadius: 4 }} pointerEvents="none" />
          )}
        </Animated.View>
      ) : (
        <View style={st.noImageHint} pointerEvents="none">
          <Feather name="image" size={32} color="rgba(255,255,255,0.4)" />
          <Text style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Inter_500Medium", marginTop: 8 }}>No image selected</Text>
        </View>
      )}

      <Toast message="Position Locked" visible={toastVisible} />

      {/* Camera-initialising indicator */}
      {Platform.OS !== "web" && !isCameraReady && (
        <View style={{ position: "absolute", top: insets.top + 16, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }} pointerEvents="none">
          <Feather name="loader" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_500Medium" }}>Camera initialising…</Text>
        </View>
      )}

      {/* Recording badge */}
      {isRecording && (
        <View style={{ position: "absolute", top: insets.top + 16, alignSelf: "center" }}>
          <RecordingBadge elapsed={recordingSeconds} />
        </View>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <Animated.View style={[st.topBar, { paddingTop: insets.top + 8, opacity: uiAnim }]} pointerEvents={isLocked ? "none" : "box-none"}>
        <TouchableOpacity style={st.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.filterToggle, filter !== "original" && { backgroundColor: theme.primary }]}
          onPress={cycleFilter}
        >
          <Feather name={filterIcon[filter] as any} size={15} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{filterLabel[filter]}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {Platform.OS !== "web" && (
            <TouchableOpacity style={[st.iconBtn, flashOn && { backgroundColor: "#FBBF24" }]} onPress={toggleFlash}>
              <Ionicons name={flashOn ? "flash" : "flash-off"} size={18} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={st.iconBtn} onPress={flipCamera}>
            <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Transform sidebar (left) ─────────────────────────────────── */}
      <Animated.View style={[st.sidebar, { top: H / 2 - 120, opacity: uiAnim }]} pointerEvents={isLocked ? "none" : "box-none"}>
        <TouchableOpacity style={st.sideBtn} onPress={() => scaleBy(1.12)}>
          <Feather name="zoom-in" size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.sideBtn} onPress={() => scaleBy(0.88)}>
          <Feather name="zoom-out" size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.sideBtn} onPress={() => rotateBy(-15)}>
          <MaterialCommunityIcons name="rotate-left" size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.sideBtn} onPress={() => rotateBy(15)}>
          <MaterialCommunityIcons name="rotate-right" size={17} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.sideBtn} onPress={resetTransform}>
          <Feather name="refresh-cw" size={15} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Bottom controls ──────────────────────────────────────────── */}
      <Animated.View style={[st.bottomBar, { paddingBottom: insets.bottom + 12, opacity: uiAnim }]} pointerEvents={isLocked ? "none" : "box-none"}>
        {controlPanel === "opacity" && (
          <View style={[st.sliderPanel, { backgroundColor: isDark ? "rgba(18,18,30,0.96)" : "rgba(255,255,255,0.96)" }]}>
            <Slider value={opacity} onChange={setOpacity} icon="eye" color={theme.primary} />
          </View>
        )}
        {controlPanel === "edge" && filter === "sketch" && (
          <View style={[st.sliderPanel, { backgroundColor: isDark ? "rgba(18,18,30,0.96)" : "rgba(255,255,255,0.96)" }]}>
            <Slider value={edgeThreshold} onChange={setEdgeThreshold} icon="edit-2" color={theme.primary} />
          </View>
        )}
        {controlPanel === "contrast" && (filter === "bw" || filter === "highContrast") && (
          <View style={[st.sliderPanel, { backgroundColor: isDark ? "rgba(18,18,30,0.96)" : "rgba(255,255,255,0.96)" }]}>
            <Slider value={contrast} onChange={setContrast} icon="sliders" color={theme.primary} />
          </View>
        )}

        <View style={st.controlRow}>
          <TouchableOpacity style={[st.ctrlBtn, controlPanel === "opacity" && { backgroundColor: theme.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setControlPanel(c => c === "opacity" ? null : "opacity"); }}>
            <Feather name="eye" size={19} color="#fff" />
          </TouchableOpacity>

          {filter === "sketch" && (
            <TouchableOpacity style={[st.ctrlBtn, controlPanel === "edge" && { backgroundColor: theme.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setControlPanel(c => c === "edge" ? null : "edge"); }}>
              <Feather name="edit-2" size={19} color="#fff" />
            </TouchableOpacity>
          )}
          {(filter === "bw" || filter === "highContrast") && (
            <TouchableOpacity style={[st.ctrlBtn, controlPanel === "contrast" && { backgroundColor: theme.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setControlPanel(c => c === "contrast" ? null : "contrast"); }}>
              <Feather name="sliders" size={19} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[st.ctrlBtn, showGrid && { backgroundColor: theme.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowGrid(v => !v); }}>
            <Feather name="grid" size={19} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={[st.ctrlBtn, isLocked && { backgroundColor: theme.danger }]} onPress={toggleLock}>
            <Feather name={isLocked ? "lock" : "unlock"} size={19} color="#fff" />
          </TouchableOpacity>

          {Platform.OS !== "web" && (
            <TouchableOpacity
              style={[
                st.ctrlBtn,
                isRecording && { backgroundColor: "#EF4444" },
                !isCameraReady && !isRecording && { opacity: 0.4 },
              ]}
              onPress={toggleRecording}
              disabled={!isCameraReady && !isRecording}
            >
              <Feather name={isRecording ? "square" : "video"} size={19} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[st.ctrlBtn, (isSaving || isRecording) && { opacity: 0.5 }]} onPress={savePhoto} disabled={isSaving || isRecording}>
            <Feather name="download" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Lock overlay — tap anywhere to unlock */}
      {isLocked && (
        <TouchableOpacity style={[StyleSheet.absoluteFill, { justifyContent: "flex-end", alignItems: "center", paddingBottom: insets.bottom + 48 }]} onPress={toggleLock} activeOpacity={1}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
            <Feather name="unlock" size={13} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" }}>Tap to unlock</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const IBTN_BG = "rgba(0,0,0,0.58)";
const CBTN_BG = "rgba(0,0,0,0.62)";

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 16 },
  permTitle: { fontSize: 22, textAlign: "center", marginTop: 16 },
  permText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  permBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  noImageHint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 14, paddingBottom: 10, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: IBTN_BG, justifyContent: "center", alignItems: "center" },
  filterToggle: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: IBTN_BG, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sidebar: { position: "absolute", left: 10, gap: 8 },
  sideBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: IBTN_BG, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 14, gap: 10 },
  sliderPanel: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  controlRow: { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  ctrlBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: CBTN_BG, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
});
