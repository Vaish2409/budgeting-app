import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useApp } from "../../context/AppContext";
import { useGoogleAuth } from "../../services/gmail/useGoogleAuth";
import { COMMON_CURRENCIES } from "../../constants/currencies";

const ANDROID_CHECKLIST = [
  "Install an automation app: Tasker, MacroDroid, or a dedicated SMS-to-email app.",
  "Create a rule/macro triggered on \"SMS received\" filtered to your bank's sender ID.",
  "Set the action to \"Send email\" (or \"Compose email\") to your dedicated Gmail address.",
  "Grant SMS read permission and disable battery optimization for the automation app, so it keeps running in the background.",
  "Send yourself a test SMS (or wait for a real bank alert) and confirm it arrives in the dedicated inbox.",
];

const IOS_CHECKLIST = [
  "Open Shortcuts → Automation → \"+\" → \"Create Personal Automation\".",
  "Choose the \"Message\" trigger, and filter it to your bank's sender.",
  "Add the \"Send Email\" action, addressed to your dedicated Gmail address, with the message text included.",
  "Turn OFF \"Ask Before Running\" and confirm \"Always Allow\" — so it fires silently, including when the phone is locked.",
  "Wait for a real bank alert (or send a test message) and confirm it arrives in the dedicated inbox.",
];

const STEPS = ["forwarding", "gmail", "currency", "senders", "done"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const { settings, updateSettings } = useApp();
  const googleAuth = useGoogleAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [senderInput, setSenderInput] = useState("");
  const [senders, setSenders] = useState<string[]>(settings.bankSenderAllowlist);
  const [baseCurrency, setBaseCurrency] = useState(settings.baseCurrency);

  const step: Step = STEPS[stepIndex];
  const checklist = Platform.OS === "ios" ? IOS_CHECKLIST : ANDROID_CHECKLIST;

  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function addSender() {
    const value = senderInput.trim();
    if (!value) return;
    setSenders((prev) => [...prev, value]);
    setSenderInput("");
  }

  async function finish() {
    await updateSettings({
      baseCurrency,
      bankSenderAllowlist: senders,
      onboardingComplete: true,
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {step === "forwarding" && (
          <>
            <Text style={styles.title}>Set up SMS forwarding</Text>
            <Text style={styles.subtitle}>
              This app reads a dedicated Gmail inbox — it never reads SMS directly. Set up phone-level
              forwarding first, on {Platform.OS === "ios" ? "iOS (Shortcuts)" : "Android"}:
            </Text>
            {checklist.map((item, i) => (
              <View key={i} style={styles.checklistRow}>
                <Text style={styles.checklistNumber}>{i + 1}</Text>
                <Text style={styles.checklistText}>{item}</Text>
              </View>
            ))}
            <Text style={styles.note}>
              Use a Gmail inbox created solely for this purpose — keep it separate from your primary email.
            </Text>
          </>
        )}

        {step === "gmail" && (
          <>
            <Text style={styles.title}>Connect your Gmail inbox</Text>
            <Text style={styles.subtitle}>
              Sign in with the dedicated Gmail account you just set up as the forwarding destination.
            </Text>
            {googleAuth.isConnected ? (
              <Text style={styles.connectedText}>✅ Connected</Text>
            ) : (
              <Pressable
                style={styles.primaryButton}
                onPress={googleAuth.connect}
                disabled={googleAuth.isConnecting}
              >
                {googleAuth.isConnecting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign in with Google</Text>
                )}
              </Pressable>
            )}
            {googleAuth.error && <Text style={styles.errorText}>{googleAuth.error}</Text>}
            <Text style={styles.note}>You can also do this later from Settings.</Text>
          </>
        )}

        {step === "currency" && (
          <>
            <Text style={styles.title}>Base currency</Text>
            <Text style={styles.subtitle}>
              All budgets and dashboard totals roll up into this currency. You can change it later.
            </Text>
            <View style={styles.chipsRow}>
              {COMMON_CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.chip, baseCurrency === c && styles.chipActive]}
                  onPress={() => setBaseCurrency(c)}
                >
                  <Text style={[styles.chipText, baseCurrency === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === "senders" && (
          <>
            <Text style={styles.title}>Confirm bank senders</Text>
            <Text style={styles.subtitle}>
              Only mail from these addresses will be treated as a transaction source — everything else
              (OTPs, promos, unrelated mail) is ignored even if it lands in the inbox.
            </Text>
            {senders.map((s) => (
              <View key={s} style={styles.listRow}>
                <Text style={styles.listRowText}>{s}</Text>
                <Pressable onPress={() => setSenders((prev) => prev.filter((x) => x !== s))}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.inlineRow}>
              <TextInput
                style={styles.inlineInput}
                placeholder="e.g. alerts@mybank.com"
                autoCapitalize="none"
                value={senderInput}
                onChangeText={setSenderInput}
              />
              <Pressable style={styles.smallButton} onPress={addSender}>
                <Text style={styles.smallButtonText}>Add</Text>
              </Pressable>
            </View>
            <Text style={styles.note}>You can add more later from Settings.</Text>
          </>
        )}

        {step === "done" && (
          <>
            <Text style={styles.title}>You're all set</Text>
            <Text style={styles.subtitle}>
              Base currency: {baseCurrency}. {senders.length} bank sender{senders.length === 1 ? "" : "s"}{" "}
              configured. {googleAuth.isConnected ? "Gmail connected." : "Gmail not connected yet — do this from Settings."}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {stepIndex > 0 && (
          <Pressable style={styles.footerSecondaryButton} onPress={back}>
            <Text style={styles.footerSecondaryText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.footerPrimaryButton}
          onPress={step === "done" ? finish : next}
        >
          <Text style={styles.footerPrimaryText}>{step === "done" ? "Start using the app" : "Continue"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: "700", color: "#1A1A1A", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20, lineHeight: 20 },
  checklistRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  checklistNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1A73E8",
    color: "#FFF",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  checklistText: { flex: 1, fontSize: 14, color: "#333", lineHeight: 20 },
  note: { fontSize: 12, color: "#999", marginTop: 12, fontStyle: "italic" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#EDEDED", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: "#1A73E8" },
  chipText: { fontSize: 14, color: "#444" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  primaryButton: { backgroundColor: "#1A73E8", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#FFF", fontWeight: "600" },
  connectedText: { color: "#2E7D32", fontWeight: "600" },
  errorText: { color: "#E53935", marginTop: 8, fontSize: 12 },
  inlineRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButton: { justifyContent: "center", paddingHorizontal: 14, backgroundColor: "#1A73E8", borderRadius: 10 },
  smallButtonText: { color: "#FFF", fontWeight: "600" },
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  footerSecondaryButton: { paddingVertical: 12, paddingHorizontal: 16 },
  footerSecondaryText: { color: "#666", fontWeight: "600" },
  footerPrimaryButton: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  footerPrimaryText: { color: "#FFF", fontWeight: "600" },
});
