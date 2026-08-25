import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useApp } from "../../context/AppContext";
import { listBudgetsForMonth, setBudget, rolloverBudgetsIfNeeded } from "../../db/repositories/budgetsRepo";
import { spendByCategoryForMonth } from "../../db/repositories/transactionsRepo";
import { currentMonth, shiftMonth, formatMonthLabel } from "../../utils/month";
import { formatCurrency, toMinorUnits, fromMinorUnits } from "../../utils/currency";
import ProgressBar from "../../components/ProgressBar";
import { Category } from "../../types/models";

export default function BudgetsScreen() {
  const { settings, categories } = useApp();
  const [month, setMonth] = useState(currentMonth());
  const [limits, setLimits] = useState<Record<string, number>>({}); // categoryId -> limitAmountMinor
  const [spend, setSpend] = useState<Record<string, number>>({}); // categoryId -> totalMinor
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = useCallback(async () => {
    const prevMonth = shiftMonth(month, -1);
    await rolloverBudgetsIfNeeded(month, prevMonth);

    const [budgets, spendRows] = await Promise.all([
      listBudgetsForMonth(month),
      spendByCategoryForMonth(month),
    ]);

    const limitsMap: Record<string, number> = {};
    for (const b of budgets) limitsMap[b.categoryId] = b.limitAmountMinor;
    setLimits(limitsMap);

    const spendMap: Record<string, number> = {};
    for (const row of spendRows) {
      if (row.categoryId) spendMap[row.categoryId] = row.totalMinor;
    }
    setSpend(spendMap);
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openEditor(category: Category) {
    const existing = limits[category.id];
    setEditValue(existing ? String(fromMinorUnits(existing, settings.baseCurrency)) : "");
    setEditingCategory(category);
  }

  async function saveLimit() {
    if (!editingCategory) return;
    const amount = parseFloat(editValue);
    if (!Number.isNaN(amount) && amount >= 0) {
      await setBudget(editingCategory.id, month, toMinorUnits(amount, settings.baseCurrency));
      await load();
    }
    setEditingCategory(null);
  }

  const isCurrentOrPast = month <= currentMonth();

  return (
    <View style={styles.container}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))}>
          <Text style={styles.monthNavArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{formatMonthLabel(month)}</Text>
        <TouchableOpacity
          onPress={() => isCurrentOrPast && setMonth(shiftMonth(month, 1))}
          disabled={!isCurrentOrPast}
        >
          <Text style={[styles.monthNavArrow, !isCurrentOrPast && styles.monthNavArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const limit = limits[item.id] ?? 0;
          const spent = spend[item.id] ?? 0;
          const progress = limit > 0 ? spent / limit : 0;

          return (
            <TouchableOpacity style={styles.card} onPress={() => openEditor(item)}>
              <View style={styles.cardHeader}>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <Text style={styles.categoryName}>{item.name}</Text>
              </View>
              {limit > 0 ? (
                <>
                  <ProgressBar progress={progress} color={item.color} />
                  <View style={styles.amountsRow}>
                    <Text style={styles.spentText}>
                      {formatCurrency(spent, settings.baseCurrency)} of{" "}
                      {formatCurrency(limit, settings.baseCurrency)}
                    </Text>
                    <Text
                      style={[
                        styles.pctText,
                        progress >= 1 ? styles.over : progress >= 0.85 ? styles.near : undefined,
                      ]}
                    >
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.noLimitText}>Tap to set a monthly limit</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={!!editingCategory} transparent animationType="fade" onRequestClose={() => setEditingCategory(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingCategory?.name} — monthly limit</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`0 ${settings.baseCurrency}`}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButton} onPress={() => setEditingCategory(null)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveLimit}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 16,
  },
  monthNavArrow: { fontSize: 24, color: "#1A73E8", paddingHorizontal: 12 },
  monthNavArrowDisabled: { color: "#CCC" },
  monthLabel: { fontSize: 16, fontWeight: "600", minWidth: 160, textAlign: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  amountsRow: { flexDirection: "row", justifyContent: "space-between" },
  spentText: { fontSize: 12, color: "#666" },
  pctText: { fontSize: 12, fontWeight: "600", color: "#666" },
  near: { color: "#FB8C00" },
  over: { color: "#E53935" },
  noLimitText: { fontSize: 12, color: "#AAA" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modalCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 20, width: "85%" },
  modalTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  modalButton: { paddingVertical: 8, paddingHorizontal: 14 },
  modalButtonPrimary: { backgroundColor: "#1A73E8", borderRadius: 8 },
  modalButtonText: { color: "#666", fontWeight: "600" },
  modalButtonTextPrimary: { color: "#FFF" },
});
