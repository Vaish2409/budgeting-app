import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useApp } from "../../context/AppContext";
import { listTransactions, TransactionFilters } from "../../db/repositories/transactionsRepo";
import { Transaction } from "../../types/models";
import TransactionListItem from "../../components/TransactionListItem";
import { TransactionsStackParamList } from "../../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<TransactionsStackParamList, "TransactionsList">;

export default function TransactionsScreen() {
  const navigation = useNavigation<Nav>();
  const { settings, categories } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filters: TransactionFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      categoryId: categoryFilter ?? undefined,
    }),
    [search, categoryFilter]
  );

  const load = useCallback(async () => {
    setTransactions(await listTransactions(filters));
  }, [filters]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search merchant or note"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(c) => c.id}
        style={styles.filterRow}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = categoryFilter === item.id;
          return (
            <Pressable
              style={[styles.chip, active && { backgroundColor: item.color }]}
              onPress={() => setCategoryFilter(active ? null : item.id)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions match.</Text>}
        renderItem={({ item }) => (
          <TransactionListItem
            transaction={item}
            category={item.categoryId ? categoryById.get(item.categoryId) : undefined}
            baseCurrency={settings.baseCurrency}
            onPress={() => navigation.navigate("TransactionForm", { transactionId: item.id })}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("TransactionForm", undefined)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  search: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterRow: { paddingHorizontal: 16, marginBottom: 8, flexGrow: 0 },
  chip: {
    backgroundColor: "#EDEDED",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: { fontSize: 13, color: "#444" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyText: { color: "#888", textAlign: "center", marginTop: 40 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1A73E8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  fabText: { color: "#FFF", fontSize: 28, lineHeight: 30 },
});
