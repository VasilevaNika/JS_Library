// Временная заглушка экрана (шаг 5). Заменяется вёрсткой на шагах 10–25.
import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space, typography } from '@/theme/tokens';

type StubLink = { label: string; href: Href };

export function StubScreen({ title, links = [] }: { title: string; links?: StubLink[] }) {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {links.map((l) => (
          <Link key={l.label} href={l.href} style={styles.link}>
            {l.label}
          </Link>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.groundMid },
  content: { padding: space[4], gap: space[3] },
  title: { ...typography.display, color: colors.ink },
  link: {
    ...typography.label,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space[3],
  },
});
