import React from 'react';
import { Stack } from 'expo-router';

export default function PatientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="appointments/index" />
      <Stack.Screen name="appointments/[id]" />
      <Stack.Screen name="appointments/book" />
      <Stack.Screen name="appointments/join" />
      <Stack.Screen name="conversations/index" />
      <Stack.Screen name="conversations/[id]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="profile-detail" />
      <Stack.Screen name="profile-edit" />
      <Stack.Screen name="concierge" />
      <Stack.Screen name="pcp" />
      <Stack.Screen name="locations/[id]" />
      <Stack.Screen name="follow-up/[id]" />
      <Stack.Screen name="intake-form/index" />
      <Stack.Screen name="intake-form/[id]" />
    </Stack>
  );
}
