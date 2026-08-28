import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Transaction, Category } from "../types/models";
import { formatCurrency } from "../utils/currency";

interface Props {
  transaction: Transaction;
  category: Category | undefined;
  baseCurrency: string;
  onPress: () => void;
}

export default function TransactionListItem({ transaction, category, baseCurrency, onPress }: Props) {
  const isSameCurrency = transaction.originalCurrency === baseCurrency;
  const isCredit = transaction.baseAmountMinor < 0;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: category?.color ?? "#9E9E9E" }]} />
      <View style={styles.middle}>
        <Text style={styles.merchant} numberOfLines={1}>
          {transaction.merchant ?? category?.name ?? "Uncategorized"}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {category?.name ?? "Uncategorized"} · {new Date(transaction.date).toLocaleDateString()}
          {transaction.sourceType === "manual" ? " · manual" : ""}
          {transaction.spender ? ` · ${transaction.spender}` : ""}
        </Text>
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.baseAmount, isCredit && styles.credit]}>
          {isCredit ? "+" : "-"}
          {formatCurrency(Math.abs(transaction.baseAmountMinor), baseCurrency)}
        </Text>
        {!isSameCurrency && (
          <Text style={styles.originalAmount}>
            {formatCurrency(Math.abs(transaction.originalAmountMinor), transaction.originalCurrency)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  middle: { flex: 1 },
  merchant: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
  amounts: { alignItems: "flex-end" },
  baseAmount: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  credit: { color: "#2E7D32" },
  originalAmount: { fontSize: 11, color: "#999", marginTop: 2 },
});
