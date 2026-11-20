import { NativeTabs } from 'expo-router/native-tabs';

import { useTema } from '@/tema';

export default function TabsLayout() {
  const { cores } = useTema();
  return (
    <NativeTabs
      backgroundColor={cores.fundo}
      indicatorColor={cores.primariaSuave}
      tintColor={cores.primaria}
      iconColor={cores.textoSecundario}
      labelStyle={{ color: cores.textoSecundario }}
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
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
