import React from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import ChangePasswordScreen from "@/components/ChangePasswordScreen";

export default function ChangePasswordPage() {
  return (
    <View style={styles.container}>
      <ChangePasswordScreen
        onPasswordChanged={() => {
          // after success, go to tabs
          router.replace("/(tabs)");
        }}
        onBackPress={() => {
          // Handle back navigation
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});