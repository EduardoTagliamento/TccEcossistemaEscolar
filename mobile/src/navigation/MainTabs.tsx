/**
 * Abas principais — usa `material-top-tabs` (react-native-pager-view) por
 * baixo dos panos só pelo arrasto horizontal entre telas que ele já traz de
 * graça, mas com uma tabBar CUSTOMIZADA renderizada embaixo (não a barra de
 * indicador no topo, que é o padrão dessa lib) — replica o comportamento do
 * mockup "Etapa Escola Mobile" (`_touchStart`/`_touchEnd`/`_swipeTab`):
 * arrastar pro lado troca de tela E a navbar de baixo acompanha/realça a
 * aba ativa.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator, type MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/icons';
import { useAppTheme } from '../context/ThemeContext';
import { fontFamily } from '../theme/tokens';
import { InicioScreen } from '../screens/inicio/InicioScreen';
import { MateriasScreen } from '../screens/materias/MateriasScreen';
import { TarefasScreen } from '../screens/tarefas/TarefasScreen';
import { ConversasScreen } from '../screens/conversas/ConversasScreen';
import { CalendarioScreen } from '../screens/calendario/CalendarioScreen';
import type { MainTabParamList } from './types';

const Tab = createMaterialTopTabNavigator<MainTabParamList>();

const ICON_BY_ROUTE: Record<keyof MainTabParamList, React.ComponentProps<typeof Icon>['name']> = {
  Inicio: 'home',
  Materias: 'book',
  Tarefas: 'list',
  Conversas: 'chat',
  Calendario: 'calendar',
};

/** Navbar de baixo — reage tanto ao toque na aba quanto ao arrasto (swipe)
 * entre telas, já que ambos passam pelo mesmo `state.index` do navigator. */
function BottomTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView edges={['bottom']} style={[styles.bar, { backgroundColor: theme.card, borderTopColor: theme.border, borderTopWidth: theme.borderWidth }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const ativo = state.index === index;
        const cor = ativo ? theme.spDark : theme.muted;

        function aoTocar() {
          const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!ativo && !evento.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable key={route.key} onPress={aoTocar} style={styles.item}>
            <View style={[styles.iconWrap, ativo && { backgroundColor: theme.spLight }]}>
              <Icon name={ICON_BY_ROUTE[route.name as keyof MainTabParamList]} size={19} color={cor} />
            </View>
            <Text style={[styles.label, { color: cor }]}>{label}</Text>
          </Pressable>
        );
      })}
    </SafeAreaView>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ swipeEnabled: true, animationEnabled: true, lazy: true }}
    >
      <Tab.Screen name="Inicio" component={InicioScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Materias" component={MateriasScreen} options={{ title: 'Matérias' }} />
      <Tab.Screen name="Tarefas" component={TarefasScreen} options={{ title: 'Tarefas' }} />
      <Tab.Screen name="Conversas" component={ConversasScreen} options={{ title: 'Conversas' }} />
      <Tab.Screen name="Calendario" component={CalendarioScreen} options={{ title: 'Calendário' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 6, paddingBottom: 8 },
  iconWrap: { width: 34, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fontFamily.bodyBold, fontSize: 9.5 },
});
