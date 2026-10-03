import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Linking } from "react-native";
import { useApp } from "../../context/AppContext";
import { useGoogleAuth } from "../../services/gmail/useGoogleAuth";
import { pollAndImport } from "../../services/gmail/ingestionService";
import { createCategory, deleteCategory } from "../../db/repositories/categoriesRepo";
import { saveGeminiKey, loadGeminiKey, clearGeminiKey } from "../../services/ai/geminiKeyStore";
import { COMMON_CURRENCIES } from "../../constants/currencies";

export default function SettingsScreen() {
  const { settings, updateSettings, categories, refreshCategories } = useApp();
  const googleAuth = useGoogleAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [newSender, setNewSender] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCurrency, setCustomCurrency] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [geminiKeyBusy, setGeminiKeyBusy] = useState(false);

  useEffect(() => {
    loadGeminiKey().then((key) => setHasGeminiKey(!!key));
  }, []);

  async function handleSaveGeminiKey() {
    const value = geminiKeyInput.trim();
    if (!value) return;
    setGeminiKeyBusy(true);
    await saveGeminiKey(value);
    setHasGeminiKey(true);
    setGeminiKeyInput("");
    setGeminiKeyBusy(false);
  }

  async function handleRemoveGeminiKey() {
    await clearGeminiKey();
    setHasGeminiKey(false);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await pollAndImport();
      setSyncMessage(
        `Imported ${result.imported} of ${result.fetched} messages` +
          (result.aiUsed ? `, AI fallback used for ${result.aiUsed}` : "") +
          (result.errors.length ? ` (${result.errors.length} errors)` : "")
      );
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err?.message ?? String(err)}`);
    } finally {
      setSyncing(false);
    }
  }

  function addSender() {
    const value = newSender.trim();
    if (!value) return;
    updateSettings({ bankSenderAllowlist: [...settings.bankSenderAllowlist, value] });
    setNewSender("");
  }

  function removeSender(sender: string) {
    updateSettings({ bankSenderAllowlist: settings.bankSenderAllowlist.filter((s) => s !== sender) });
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    await createCategory({
      name,
      color: "#9E9E9E",
      icon: "tag",
      sortOrder: categories.length,
    });
    setNewCategoryName("");
    await refreshCategories();
  }

  function confirmDeleteCategory(id: string, name: string) {
    Alert.alert(`Delete "${name}"?`, "Transactions in this category will become uncategorized.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCategory(id);
          await refreshCategories();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Base currency</Text>
      <Text style={styles.sectionSubtitle}>Used for budgets and dashboard rollups (FR3).</Text>
      <View style={styles.chipsRow}>
        {COMMON_CURRENCIES.map((c) => (
          <Pressable
            key={c}
            style={[styles.chip, settings.baseCurrency === c && styles.chipActive]}
            onPress={() => updateSettings({ baseCurrency: c })}
          >
            <Text style={[styles.chipText, settings.baseCurrency === c && styles.chipTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.inlineRow}>
        <TextInput
          style={styles.inlineInput}
          placeholder="Other (3-letter code)"
          autoCapitalize="characters"
          maxLength={3}
          value={customCurrency}
          onChangeText={setCustomCurrency}
        />
        <Pressable
          style={styles.smallButton}
          onPress={() => {
            if (customCurrency.trim().length === 3) {
              updateSettings({ baseCurrency: customCurrency.trim().toUpperCase() });
              setCustomCurrency("");
            }
          }}
        >
          <Text style={styles.smallButtonText}>Set</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Gmail inbox</Text>
      <Text style={styles.sectionSubtitle}>
        Connect the dedicated inbox that receives forwarded bank alerts (FR2).
      </Text>
      {googleAuth.isConnected ? (
        <View>
          <Text style={styles.connectedText}>✅ Connected</Text>
          <Pressable style={styles.secondaryButton} onPress={googleAuth.disconnect}>
            <Text style={styles.secondaryButtonText}>Disconnect</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.primaryButton}
          onPress={googleAuth.connect}
          disabled={googleAuth.isConnecting}
        >
          {googleAuth.isConnecting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Connect Gmail</Text>
          )}
        </Pressable>
      )}
      {googleAuth.error && <Text style={styles.errorText}>{googleAuth.error}</Text>}

      <Pressable style={[styles.secondaryButton, { marginTop: 12 }]} onPress={handleSync} disabled={syncing}>
        {syncing ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>Sync now</Text>}
      </Pressable>
      {syncMessage && <Text style={styles.syncMessage}>{syncMessage}</Text>}
      {settings.lastPolledAt && (
        <Text style={styles.sectionSubtitle}>
          Last synced: {new Date(settings.lastPolledAt).toLocaleString()}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Bank sender allowlist</Text>
      <Text style={styles.sectionSubtitle}>
        Only mail from these senders is treated as a transaction source (FR4).
      </Text>
      {settings.bankSenderAllowlist.map((sender) => (
        <View key={sender} style={styles.listRow}>
          <Text style={styles.listRowText}>{sender}</Text>
          <Pressable onPress={() => removeSender(sender)}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.inlineRow}>
        <TextInput
          style={styles.inlineInput}
          placeholder="e.g. alerts@mybank.com"
          autoCapitalize="none"
          value={newSender}
          onChangeText={setNewSender}
        />
        <Pressable style={styles.smallButton} onPress={addSender}>
          <Text style={styles.smallButtonText}>Add</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Categories</Text>
      <Text style={styles.sectionSubtitle}>Fully editable list (FR17).</Text>
      {categories.map((c) => (
        <View key={c.id} style={styles.listRow}>
          <View style={styles.categoryLabelRow}>
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <Text style={styles.listRowText}>{c.name}</Text>
          </View>
          {!c.isDefault && (
            <Pressable onPress={() => confirmDeleteCategory(c.id, c.name)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          )}
        </View>
      ))}
      <View style={styles.inlineRow}>
        <TextInput
          style={styles.inlineInput}
          placeholder="New category name"
          value={newCategoryName}
          onChangeText={setNewCategoryName}
        />
        <Pressable style={styles.smallButton} onPress={addCategory}>
          <Text style={styles.smallButtonText}>Add</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>AI-assisted categorization</Text>
      <Text style={styles.sectionSubtitle}>
        When a Gemini key is set, transactions the parsing rules and keyword list can't fully
        resolve are additionally sent (with card digits and credit-limit numbers stripped out
        first) to Google's Gemini API as a fallback. Nothing is sent, and nothing changes, if no
        key is configured.
      </Text>
      {hasGeminiKey ? (
        <View>
          <Text style={styles.connectedText}>✅ Gemini key saved</Text>
          <Pressable style={styles.secondaryButton} onPress={handleRemoveGeminiKey}>
            <Text style={styles.secondaryButtonText}>Remove key</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inlineRow}>
          <TextInput
            style={styles.inlineInput}
            placeholder="Gemini API key"
            autoCapitalize="none"
            secureTextEntry
            value={geminiKeyInput}
            onChangeText={setGeminiKeyInput}
          />
          <Pressable style={styles.smallButton} onPress={handleSaveGeminiKey} disabled={geminiKeyBusy}>
            <Text style={styles.smallButtonText}>Save</Text>
          </Pressable>
        </View>
      )}
      <Pressable onPress={() => Linking.openURL("https://aistudio.google.com/apikey")}>
        <Text style={styles.linkText}>Get a free key at aistudio.google.com/apikey</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 16, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 24, color: "#1A1A1A" },
  sectionSubtitle: { fontSize: 12, color: "#888", marginTop: 2, marginBottom: 10 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#EDEDED", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: "#1A73E8" },
  chipText: { fontSize: 13, color: "#444" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  inlineRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF",
  },
  smallButton: { justifyContent: "center", paddingHorizontal: 14, backgroundColor: "#1A73E8", borderRadius: 10 },
  smallButtonText: { color: "#FFF", fontWeight: "600" },
  primaryButton: { backgroundColor: "#1A73E8", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#FFF", fontWeight: "600" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  secondaryButtonText: { color: "#333", fontWeight: "600" },
  connectedText: { color: "#2E7D32", fontWeight: "600", marginBottom: 8 },
  linkText: { color: "#1A73E8", fontSize: 12, marginTop: 8 },
  errorText: { color: "#E53935", marginTop: 8, fontSize: 12 },
  syncMessage: { marginTop: 8, fontSize: 12, color: "#666" },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  listRowText: { fontSize: 14, color: "#333" },
  removeText: { color: "#E53935", fontSize: 13 },
  categoryLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
