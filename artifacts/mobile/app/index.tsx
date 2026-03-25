import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  Pressable,
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
import { router } from "expo-router";
import Colors from "@/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type AppMode = "home" | "overlay";
type OverlayMode = "original" | "edge";

export default function DrawingAssistant() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const [appMode, setAppMode] = useState<AppMode>("home");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("original");
  const [opacity, setOpacity] = useState(0.6);
  const [edgeThreshold, setEdgeThreshold] = useState(0.5);
  const [isLocked, setIsLocked] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [controlPanel, setControlPanel] = useState<"opacity" | "edge" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const panRef = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scaleRef = useRef(new Animated.Value(1)).current;
  const rotationRef = useRef(new Animated.Value(0)).current;
  const opacityRef = useRef(new Animated.Value(opacity)).current;

  const initialPinchDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const initialRotation = useRef(0);
  const currentPosition = useRef({ x: 0, y: 0 });
  const lastPinchAngle = useRef<number | null>(null);

  const overlayFadeAnim = useRef(new Animated.Value(1)).current;
  const homeEnterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(homeEnterAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 100,
    }).start();
  }, []);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedImage(result.assets[0].uri);
      setPosition({ x: 0, y: 0 });
      panRef.setValue({ x: 0, y: 0 });
      currentPosition.current = { x: 0, y: 0 };
      setZoom(1);
      scaleRef.setValue(1);
      initialScale.current = 1;
      setRotation(0);
      rotationRef.setValue(0);
      initialRotation.current = 0;
      setOverlayMode("original");
      setIsLocked(false);
      setAppMode("overlay");
    }
  }, [panRef, scaleRef, rotationRef]);

  const captureImage = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedImage(result.assets[0].uri);
      setPosition({ x: 0, y: 0 });
      panRef.setValue({ x: 0, y: 0 });
      currentPosition.current = { x: 0, y: 0 };
      setZoom(1);
      scaleRef.setValue(1);
      initialScale.current = 1;
      setRotation(0);
      rotationRef.setValue(0);
      initialRotation.current = 0;
      setOverlayMode("original");
      setIsLocked(false);
      setAppMode("overlay");
    }
  }, [cameraPermission, requestCameraPermission, panRef, scaleRef, rotationRef]);

  const goHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAppMode("home");
    setSelectedImage(null);
    setControlPanel(null);
    setIsLocked(false);
    setShowGrid(false);
  }, []);

  const toggleLock = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLocked((v) => !v);
  }, []);

  const toggleGrid = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGrid((v) => !v);
  }, []);

  const toggleOverlayMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(overlayFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(overlayFadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setOverlayMode((m) => (m === "original" ? "edge" : "original"));
  }, [overlayFadeAnim]);

  const flipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((f) => (f === "back" ? "front" : "back"));
  }, []);

  const saveScreenshot = useCallback(async () => {
    if (!mediaPermission?.granted) {
      const result = await requestMediaPermission();
      if (!result.granted) {
        Alert.alert("Permission needed", "Allow media library access to save screenshots.");
        return;
      }
    }
    if (!cameraRef.current) return;
    try {
      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
        Alert.alert("Saved!", "Screenshot saved to your photo library.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not save screenshot.");
    } finally {
      setIsSaving(false);
    }
  }, [mediaPermission, requestMediaPermission]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isLocked,
    onMoveShouldSetPanResponder: () => !isLocked,
    onPanResponderGrant: () => {
      panRef.setOffset(currentPosition.current);
      panRef.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (evt, gestureState) => {
      const touches = evt.nativeEvent.touches;
      if (touches.length === 2 && !isLocked) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        const dx = touch2.pageX - touch1.pageX;
        const dy = touch2.pageY - touch1.pageY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        if (initialPinchDistance.current === null) {
          initialPinchDistance.current = distance;
          lastPinchAngle.current = angle;
        } else {
          const newScale = Math.max(0.3, Math.min(4, (distance / initialPinchDistance.current) * initialScale.current));
          scaleRef.setValue(newScale);
          if (lastPinchAngle.current !== null) {
            const deltaAngle = angle - lastPinchAngle.current;
            const newRotation = initialRotation.current + deltaAngle;
            rotationRef.setValue(newRotation);
          }
        }
      } else {
        initialPinchDistance.current = null;
        lastPinchAngle.current = null;
        panRef.setValue({ x: gestureState.dx, y: gestureState.dy });
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const newX = currentPosition.current.x + gestureState.dx;
      const newY = currentPosition.current.y + gestureState.dy;
      currentPosition.current = {
        x: initialPinchDistance.current !== null ? currentPosition.current.x : newX,
        y: initialPinchDistance.current !== null ? currentPosition.current.y : newY,
      };
      panRef.flattenOffset();
      scaleRef.addListener(({ value }) => { initialScale.current = value; });
      rotationRef.addListener(({ value }) => { initialRotation.current = value; });
      initialPinchDistance.current = null;
      lastPinchAngle.current = null;
    },
  });

  const renderOpacitySlider = () => (
    <View style={[styles.sliderContainer, { backgroundColor: isDark ? "rgba(30,30,50,0.95)" : "rgba(255,255,255,0.95)" }]}>
      <Feather name="eye" size={16} color={theme.primary} />
      <View style={styles.sliderTrack} pointerEvents="none">
        <View style={[styles.sliderFillBg, { backgroundColor: theme.sliderTrack }]} />
        <View style={[styles.sliderFill, { backgroundColor: theme.primary, width: `${opacity * 100}%` }]} />
        <View style={[styles.sliderThumb, { backgroundColor: theme.primary, left: `${opacity * 100}%` }]} />
      </View>
      <View style={styles.sliderTouchArea}
        {...PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (e) => {
            const x = e.nativeEvent.locationX;
            const trackW = SCREEN_WIDTH - 120;
            const newOpacity = Math.max(0.05, Math.min(1, x / trackW));
            setOpacity(newOpacity);
          },
          onPanResponderMove: (e) => {
            const x = e.nativeEvent.locationX;
            const trackW = SCREEN_WIDTH - 120;
            const newOpacity = Math.max(0.05, Math.min(1, x / trackW));
            setOpacity(newOpacity);
          },
        }).panHandlers}
      />
      <Text style={[styles.sliderValue, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>{Math.round(opacity * 100)}%</Text>
    </View>
  );

  const renderEdgeSlider = () => (
    <View style={[styles.sliderContainer, { backgroundColor: isDark ? "rgba(30,30,50,0.95)" : "rgba(255,255,255,0.95)" }]}>
      <Feather name="zap" size={16} color={theme.primary} />
      <View style={styles.sliderTrack} pointerEvents="none">
        <View style={[styles.sliderFillBg, { backgroundColor: theme.sliderTrack }]} />
        <View style={[styles.sliderFill, { backgroundColor: theme.primary, width: `${edgeThreshold * 100}%` }]} />
        <View style={[styles.sliderThumb, { backgroundColor: theme.primary, left: `${edgeThreshold * 100}%` }]} />
      </View>
      <View style={styles.sliderTouchArea}
        {...PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (e) => {
            const x = e.nativeEvent.locationX;
            const trackW = SCREEN_WIDTH - 120;
            const val = Math.max(0.05, Math.min(1, x / trackW));
            setEdgeThreshold(val);
          },
          onPanResponderMove: (e) => {
            const x = e.nativeEvent.locationX;
            const trackW = SCREEN_WIDTH - 120;
            const val = Math.max(0.05, Math.min(1, x / trackW));
            setEdgeThreshold(val);
          },
        }).panHandlers}
      />
      <Text style={[styles.sliderValue, { color: theme.primary, fontFamily: "Inter_600SemiBold" }]}>{Math.round(edgeThreshold * 100)}%</Text>
    </View>
  );

  const renderGridOverlay = () => {
    const cols = 4;
    const rows = 6;
    const colW = SCREEN_WIDTH / cols;
    const rowH = SCREEN_HEIGHT / rows;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: cols - 1 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridLine, { left: colW * (i + 1), width: 1, height: "100%", position: "absolute", top: 0 }]} />
        ))}
        {Array.from({ length: rows - 1 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLine, { top: rowH * (i + 1), height: 1, width: "100%", position: "absolute", left: 0 }]} />
        ))}
      </View>
    );
  };

  if (appMode === "home") {
    return (
      <View style={[styles.homeContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        <Animated.View
          style={[
            styles.homeContent,
            {
              opacity: homeEnterAnim,
              transform: [{ translateY: homeEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
            },
          ]}
        >
          <View style={styles.homeHeader}>
            <View style={[styles.logoMark, { backgroundColor: theme.primary }]}>
              <Feather name="edit-3" size={28} color="#FFFFFF" />
            </View>
            <Text style={[styles.appTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              Drawing Assistant
            </Text>
            <Text style={[styles.appSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Trace anything with camera overlay
            </Text>
          </View>

          <View style={styles.featureList}>
            {[
              { icon: "camera", label: "Live camera overlay" },
              { icon: "sliders", label: "Opacity & edge controls" },
              { icon: "move", label: "Drag, zoom & rotate" },
              { icon: "cpu", label: "Edge detection sketch" },
            ].map((f, i) => (
              <View key={i} style={[styles.featureItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.featureIcon, { backgroundColor: `${theme.primary}20` }]}>
                  <Feather name={f.icon as any} size={18} color={theme.primary} />
                </View>
                <Text style={[styles.featureText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{f.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.homeActions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              <Feather name="image" size={22} color="#FFFFFF" />
              <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Upload from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={captureImage}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={22} color={theme.text} />
              <Text style={[styles.secondaryBtnText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>Take a Photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.tip, { color: theme.textTertiary, fontFamily: "Inter_400Regular" }]}>
            Place your phone above paper and trace the overlay
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (appMode === "overlay") {
    if (!cameraPermission) {
      return (
        <View style={[styles.permContainer, { backgroundColor: theme.background, paddingTop: insets.top + 16 }]}>
          <Text style={[styles.permText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Checking camera permission...</Text>
        </View>
      );
    }
    if (!cameraPermission.granted) {
      return (
        <View style={[styles.permContainer, { backgroundColor: theme.background, paddingTop: insets.top + 16 }]}>
          <Feather name="camera-off" size={48} color={theme.textSecondary} />
          <Text style={[styles.permTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Camera Access Needed</Text>
          <Text style={[styles.permText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Grant camera access to use the live overlay feature.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 24 }]}
            onPress={requestCameraPermission}
          >
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={goHome}>
            <Text style={[styles.backLink, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.overlayContainer}>
        <StatusBar hidden />

        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
        />

        {showGrid && renderGridOverlay()}

        {selectedImage && (
          <Animated.View
            style={[
              styles.overlayImageWrapper,
              {
                opacity: overlayFadeAnim,
                transform: [
                  { translateX: panRef.x },
                  { translateY: panRef.y },
                  { scale: scaleRef },
                  {
                    rotate: rotationRef.interpolate({
                      inputRange: [-360, 360],
                      outputRange: ["-360deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
            {...(isLocked ? {} : panResponder.panHandlers)}
          >
            <Image
              source={{ uri: selectedImage }}
              style={[
                styles.overlayImage,
                {
                  opacity,
                  tintColor: overlayMode === "edge" ? "#FFFFFF" : undefined,
                },
              ]}
              resizeMode="contain"
            />
            {overlayMode === "edge" && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.edgeLayer,
                  { opacity: 1 - edgeThreshold * 0.3 },
                ]}
              >
                <Image
                  source={{ uri: selectedImage }}
                  style={[styles.overlayImage, { opacity: edgeThreshold * 0.85 }]}
                  resizeMode="contain"
                  blurRadius={0}
                />
              </View>
            )}
          </Animated.View>
        )}

        {isLocked && (
          <View style={styles.lockedBanner} pointerEvents="none">
            <Feather name="lock" size={14} color="#FFFFFF" />
            <Text style={[styles.lockedText, { fontFamily: "Inter_600SemiBold" }]}>Position Locked</Text>
          </View>
        )}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: "rgba(0,0,0,0.55)" }]}
            onPress={goHome}
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <TouchableOpacity
              style={[
                styles.modeToggle,
                { backgroundColor: overlayMode === "edge" ? theme.primary : "rgba(0,0,0,0.55)" },
              ]}
              onPress={toggleOverlayMode}
            >
              <MaterialCommunityIcons
                name={overlayMode === "edge" ? "pencil-outline" : "image-outline"}
                size={16}
                color="#FFFFFF"
              />
              <Text style={[styles.modeToggleText, { fontFamily: "Inter_600SemiBold" }]}>
                {overlayMode === "edge" ? "Sketch" : "Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: facing === "front" ? theme.primary : "rgba(0,0,0,0.55)" }]}
              onPress={flipCamera}
            >
              <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          {controlPanel === "opacity" && renderOpacitySlider()}
          {controlPanel === "edge" && overlayMode === "edge" && renderEdgeSlider()}

          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.controlBtn, controlPanel === "opacity" && { backgroundColor: theme.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setControlPanel(controlPanel === "opacity" ? null : "opacity");
              }}
            >
              <Feather name="eye" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {overlayMode === "edge" && (
              <TouchableOpacity
                style={[styles.controlBtn, controlPanel === "edge" && { backgroundColor: theme.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setControlPanel(controlPanel === "edge" ? null : "edge");
                }}
              >
                <Feather name="zap" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.controlBtn, showGrid && { backgroundColor: theme.primary }]}
              onPress={toggleGrid}
            >
              <Feather name="grid" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isLocked && { backgroundColor: theme.danger }]}
              onPress={toggleLock}
            >
              <Feather name={isLocked ? "lock" : "unlock"} size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isSaving && { opacity: 0.6 }]}
              onPress={saveScreenshot}
              disabled={isSaving}
            >
              <Feather name="download" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={pickImage}
            >
              <Feather name="image" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
  },
  homeContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  homeHeader: {
    alignItems: "center",
    paddingTop: 32,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#F5A623",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  appTitle: {
    fontSize: 30,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 15,
  },
  homeActions: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#F5A623",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 17,
  },
  tip: {
    textAlign: "center",
    fontSize: 13,
    paddingBottom: 8,
    lineHeight: 18,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlayImageWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  edgeLayer: {
    justifyContent: "center",
    alignItems: "center",
  },
  lockedBanner: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.75)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lockedText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  topBarCenter: {
    flex: 1,
    alignItems: "center",
  },
  topBarRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeToggleText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 12,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    position: "relative",
  },
  sliderTouchArea: {
    position: "absolute",
    left: 40,
    right: 52,
    top: 0,
    bottom: 0,
    height: 44,
    marginTop: -20,
  },
  sliderFillBg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -6,
    marginLeft: -8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderValue: {
    fontSize: 13,
    minWidth: 36,
    textAlign: "right",
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  gridLine: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  permContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  permTitle: {
    fontSize: 22,
    textAlign: "center",
  },
  permText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  backLink: {
    fontSize: 15,
  },
});
