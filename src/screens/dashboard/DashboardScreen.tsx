import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useApp } from "../../context/AppContext";
import { totalSpendForMonth, spendByCategoryForMonth, listTransactions } from "../../db/repositories/transactionsRepo";
import { currentMonth, shiftMonth, formatMonthLabel } from "../../utils/month";
import { formatCurrency } from "../../utils/currency";
import CategoryBreakdownChart, { CategorySpend } from "../../components/CategoryBreakdownChart";
import TransactionListItem from "../../components/TransactionListItem";
import { Transaction } from "../../types/models";

export default function DashboardScreen() {
  const { settings, categories } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [totalLastMonth, setTotalLastMonth] = useState(0);
  const [categorySpend, setCategorySpend] = useState<CategorySpend[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);

  const load = useCallback(async () => {
    const month = currentMonth();
    const prevMonth = shiftMonth(month, -1);

    const [total, prevTotal, byCategory, transactions] = await Promise.all([
      totalSpendForMonth(month),
      totalSpendForMonth(prevMonth),
      spendByCategoryForMonth(month),
      listTransactions(),
    ]);

    setTotalThisMonth(total);
    setTotalLastMonth(prevTotal);
    setRecent(transactions.slice(0, 5));

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const spend: CategorySpend[] = byCategory
      .filter((row) => row.categoryId && categoryById.has(row.categoryId))
      .map((row) => ({ category: categoryById.get(row.categoryId!)!, totalMinor: row.totalMinor }))
      .sort((a, b) => b.totalMinor - a.totalMinor);
    setCategorySpend(spend);
  }, [categories]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const momDelta = totalLastMonth === 0 ? null : ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.monthLabel}>{formatMonthLabel(currentMonth())}</Text>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total spend this month</Text>
        <Text style={styles.totalAmount}>{formatCurrency(totalThisMonth, settings.baseCurrency)}</Text>
        {momDelta !== null && (
          <Text style={[styles.momText, momDelta > 0 ? styles.momUp : styles.momDown]}>
            {momDelta > 0 ? "▲" : "▼"} {Math.abs(momDelta).toFixed(1)}% vs. last month
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Spend by category</Text>
      <CategoryBreakdownChart data={categorySpend} baseCurrency={settings.baseCurrency} />

      <Text style={styles.sectionTitle}>Recent transactions</Text>
      {recent.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet.</Text>
      ) : (
        recent.map((t) => (
          <TransactionListItem
            key={t.id}
            transaction={t}
            category={t.categoryId ? categoryById.get(t.categoryId) : undefined}
            baseCurrency={settings.baseCurrency}
            onPress={() => {}}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA", paddingHorizontal: 16 },
  monthLabel: { fontSize: 14, color: "#888", marginTop: 12 },
  totalCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  totalLabel: { fontSize: 13, color: "#888" },
  totalAmount: { fontSize: 32, fontWeight: "700", color: "#1A1A1A", marginTop: 4 },
  momText: { fontSize: 13, marginTop: 6 },
  momUp: { color: "#E53935" },
  momDown: { color: "#2E7D32" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10, color: "#1A1A1A" },
  emptyText: { color: "#888", marginBottom: 20 },
});
