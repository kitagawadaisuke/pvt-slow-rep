import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { darkTheme } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: darkTheme.colors.surface,
        },
        headerTintColor: darkTheme.colors.onSurface,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: 'rgba(12,12,18,0.92)',
          borderTopWidth: 0.5,
          borderTopColor: '#2A2A36',
          position: 'absolute',
        },
        tabBarActiveTintColor: darkTheme.colors.primary,
        tabBarInactiveTintColor: darkTheme.colors.onSurfaceVariant,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'トレーニング',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dumbbell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: 'タイマー',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="timer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '履歴',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
