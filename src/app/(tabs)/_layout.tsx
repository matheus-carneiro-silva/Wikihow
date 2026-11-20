import { NativeTabs } from 'expo-router/native-tabs';

import { cores } from '@/tema';

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={cores.fundo}
      indicatorColor={cores.primariaSuave}
      tintColor={cores.primaria}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explorar">
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
