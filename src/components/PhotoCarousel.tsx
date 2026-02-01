import React, { useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Dimensions,
  Text,
  ViewStyle,
  StyleProp,
} from "react-native";
import { colors, layout, radius, typography } from "../theme";

type Props = {
  photos: string[];
  height?: number;
  fullBleed?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const { width } = Dimensions.get("window");

const PhotoCarousel: React.FC<Props> = ({ photos, height = 360, fullBleed, containerStyle }) => {
  const [index, setIndex] = useState(0);
  const containerWidth = fullBleed ? width : width - layout.gutter * 2;

  if (!photos || photos.length === 0) {
    return (
      <View style={[styles.placeholder, { height, width: containerWidth }, containerStyle]}>
        <Text style={styles.placeholderText}>Add a photo to complete your profile</Text>
      </View>
    );
  }

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
    if (nextIndex !== index) setIndex(nextIndex);
  };

  const actualHeight = height || 360;

  return (
    <View style={containerStyle}>
      <FlatList
        data={photos}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={[styles.photo, { height: actualHeight, width: containerWidth }]} />
        )}
      />
      <View style={[styles.indicatorRow, { width: containerWidth, bottom: layout.section }]}> 
        <Text style={styles.counterText}>
          {index + 1}/{photos.length}
        </Text>
        <View style={styles.dotsRow}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  photo: {
    resizeMode: "cover",
  },
  placeholder: {
    borderRadius: radius.card,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.textMuted,
    ...typography.body2,
  },
  indicatorRow: {
    position: "absolute",
    bottom: layout.section,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: layout.section,
  },
  counterText: {
    color: colors.textPrimary,
    ...typography.micro,
  },
  dotsRow: {
    flexDirection: "row",
    gap: layout.compact,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSubtle,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
});

export default PhotoCarousel;
