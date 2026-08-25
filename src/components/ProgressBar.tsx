import React from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  progress: number; // 0..1+ (can exceed 1 when over budget)
  color: string;
}

/** Visualizes spend/limit progress (FR21) — turns amber near the limit, red over it. */
export default function ProgressBar({ progress, color }: Props) {
  const clamped = Math.min(progress, 1);
  const barColor = progress >= 1 ? "#E53935" : progress >= 0.85 ? "#FB8C00" : color;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: barColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});
