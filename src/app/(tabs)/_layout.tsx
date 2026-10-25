import { Tabs } from 'expo-router';
import React from 'react';
import { BottomTabBar } from '@/components/navigation/bottom-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BottomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="stock" />
      <Tabs.Screen name="listings" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
