import React from "react";
import { Text, View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useApp } from "../context/AppContext";

import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import TransactionsScreen from "../screens/transactions/TransactionsScreen";
import TransactionFormScreen from "../screens/transactions/TransactionFormScreen";
import BudgetsScreen from "../screens/budgets/BudgetsScreen";
import SettingsScreen from "../screens/settings/SettingsScreen";

export type TransactionsStackParamList = {
  TransactionsList: undefined;
  TransactionForm: { transactionId?: string } | undefined;
};

const Tab = createBottomTabNavigator();
const TransactionsStack = createNativeStackNavigator<TransactionsStackParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: "📊",
  Transactions: "💳",
  Budgets: "🎯",
  Settings: "⚙️",
};

function TransactionsStackNavigator() {
  return (
    <TransactionsStack.Navigator>
      <TransactionsStack.Screen
        name="TransactionsList"
        component={TransactionsScreen}
        options={{ title: "Transactions" }}
      />
      <TransactionsStack.Screen
        name="TransactionForm"
        component={TransactionFormScreen}
        options={{ title: "Transaction", presentation: "modal" }}
      />
    </TransactionsStack.Navigator>
  );
}

export default function RootNavigator() {
  const { isReady, settings } = useApp();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!settings.onboardingComplete ? (
        <OnboardingScreen />
      ) : (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>,
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen
            name="Transactions"
            component={TransactionsStackNavigator}
            options={{ headerShown: false }}
          />
          <Tab.Screen name="Budgets" component={BudgetsScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
});
