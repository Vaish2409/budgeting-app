import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useApp } from "../../context/AppContext";
import { TransactionsStackParamList } from "../../navigation/RootNavigator";
import {
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../../db/repositories/transactionsRepo";
import { toMinorUnits, fromMinorUnits } from "../../utils/currency";
import { getRateToBase } from "../../services/fx/fxService";
import { convertMinorUnits } from "../../utils/currency";
import { COMMON_CURRENCIES } from "../../constants/currencies";
import { setMerchantRule } from "../../db/repositories/merchantRulesRepo";

type Nav = NativeStackNavigationProp<TransactionsStackParamList, "TransactionForm">;
type Rt = RouteProp<TransactionsStackParamList, "TransactionForm">;

export default function TransactionFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { settings, categories } = useApp();
  const transactionId = route.params?.transactionId;
  const isEditing = !!transactionId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [currency, setCurrency] = useState(settings.baseCurrency);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isDebit, setIsDebit] = useState(true);

  useEffect(() => {
    if (!transactionId) return;
    (async () => {
      const t = await getTransaction(transactionId);
      if (t) {
        setAmountText(String(Math.abs(fromMinorUnits(t.originalAmountMinor, t.originalCurrency))));
        setCurrency(t.originalCurrency);
        setCategoryId(t.categoryId);
        setMerchant(t.merchant ?? "");
        setNote(t.note ?? "");
        setDate(t.date.slice(0, 10));
        setIsDebit(t.originalAmountMinor >= 0);
      }
      setLoading(false);
    })();
  }, [transactionId]);

  async function handleSave() {
    const amount = parseFloat(amountText);
    if (Number.isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }

    setSaving(true);
    try {
      const originalAmountMinor = toMinorUnits(amount, currency);
      const fx = await getRateToBase(currency, settings.baseCurrency);
      const baseAmountMinor = fx
        ? convertMinorUnits(originalAmountMinor, currency, settings.baseCurrency, fx.rate)
        : originalAmountMinor;

      const signedOriginal = isDebit ? originalAmountMinor : -originalAmountMinor;
      const signedBase = isDebit ? baseAmountMinor : -baseAmountMinor;

      if (merchant.trim() && categoryId) {
        // Future auto-matches for this merchant use this category (FR19).
        await setMerchantRule(merchant.trim(), categoryId);
      }

      if (isEditing && transactionId) {
        await updateTransaction(transactionId, {
          date: new Date(date).toISOString(),
          originalAmountMinor: signedOriginal,
          originalCurrency: currency,
          baseAmountMinor: signedBase,
          fxRateUsed: fx?.rate ?? null,
          merchant: merchant.trim() || null,
          categoryId,
          note: note.trim() || null,
        });
      } else {
        await createTransaction({
          date: new Date(date).toISOString(),
          originalAmountMinor: signedOriginal,
          originalCurrency: currency,
          baseAmountMinor: signedBase,
          fxRateUsed: fx?.rate ?? null,
          merchant: merchant.trim() || null,
          bankSource: null,
          categoryId,
          note: note.trim() || null,
          sourceType: "manual",
          sourceMessageId: null,
          spender: null,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Couldn't save", err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!transactionId) return;
    Alert.alert("Delete transaction?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTransaction(transactionId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggle, isDebit && styles.toggleActive]}
          onPress={() => setIsDebit(true)}
        >
          <Text style={[styles.toggleText, isDebit && styles.toggleTextActive]}>Spend</Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, !isDebit && styles.toggleActive]}
          onPress={() => setIsDebit(false)}
        >
          <Text style={[styles.toggleText, !isDebit && styles.toggleTextActive]}>Refund / credit</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Amount</Text>
      <View style={styles.amountRow}>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amountText}
          onChangeText={setAmountText}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyPicker}>
          {COMMON_CURRENCIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.currencyChip, currency === c && styles.currencyChipActive]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.currencyChipText, currency === c && styles.currencyChipTextActive]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, categoryId === c.id && { backgroundColor: c.color }]}
            onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
          >
            <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Merchant / payee</Text>
      <TextInput style={styles.input} value={merchant} onChangeText={setMerchant} placeholder="e.g. Carrefour" />

      <Text style={styles.label}>Date</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>Note</Text>
      <TextInput
        style={[styles.input, styles.noteInput]}
        value={note}
        onChangeText={setNote}
        placeholder="Optional"
        multiline
      />

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? "Saving…" : isEditing ? "Save changes" : "Add transaction"}</Text>
      </Pressable>

      {isEditing && (
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete transaction</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, color: "#888", marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  noteInput: { minHeight: 70, textAlignVertical: "top" },
  amountRow: { gap: 8 },
  amountInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 24,
    fontWeight: "600",
  },
  currencyPicker: { flexGrow: 0 },
  currencyChip: {
    backgroundColor: "#EDEDED",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  currencyChipActive: { backgroundColor: "#1A73E8" },
  currencyChipText: { fontSize: 13, color: "#444" },
  currencyChipTextActive: { color: "#FFF", fontWeight: "600" },
  categoryRow: { flexGrow: 0 },
  chip: {
    backgroundColor: "#EDEDED",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { fontSize: 13, color: "#444" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#EDEDED",
    alignItems: "center",
  },
  toggleActive: { backgroundColor: "#1A1A1A" },
  toggleText: { color: "#444", fontWeight: "600" },
  toggleTextActive: { color: "#FFF" },
  saveButton: {
    marginTop: 28,
    backgroundColor: "#1A73E8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  deleteButton: { marginTop: 12, paddingVertical: 14, alignItems: "center" },
  deleteButtonText: { color: "#E53935", fontSize: 15, fontWeight: "600" },
});
