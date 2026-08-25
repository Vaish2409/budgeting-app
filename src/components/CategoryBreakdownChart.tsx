import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { Category } from "../types/models";
import { formatCurrency } from "../utils/currency";

export interface CategorySpend {
  category: Category;
  totalMinor: number;
}

interface Props {
  data: CategorySpend[];
  baseCurrency: string;
}

/**
 * Spend-by-category chart (FR24). A plain horizontal bar chart drawn with
 * react-native-svg — deliberately avoids pulling in a heavier charting stack
 * (Skia/reanimated) for what's fundamentally a handful of bars.
 */
export default function CategoryBreakdownChart({ data, baseCurrency }: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spend recorded this month yet.</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => d.totalMinor), 1);
  const barWidth = 240;

  return (
    <View style={styles.container}>
      {data.map(({ category, totalMinor }) => {
        const width = Math.max((totalMinor / max) * barWidth, 4);
        return (
          <View key={category.id} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {category.name}
            </Text>
            <Svg width={barWidth} height={16}>
              <Rect x={0} y={2} width={barWidth} height={12} rx={6} fill="#EDEDED" />
              <Rect x={0} y={2} width={width} height={12} rx={6} fill={category.color} />
            </Svg>
            <Text style={styles.amount}>{formatCurrency(totalMinor, baseCurrency)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { width: 90, fontSize: 13, color: "#333" },
  amount: { fontSize: 12, color: "#666", minWidth: 70, textAlign: "right" },
  empty: { paddingVertical: 24, alignItems: "center" },
  emptyText: { color: "#888" },
});
