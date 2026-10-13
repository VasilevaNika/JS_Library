import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/tokens';

export default function Index() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Библиотека кампуса</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.groundMid },
  title: { ...typography.title, color: colors.ink },
});
