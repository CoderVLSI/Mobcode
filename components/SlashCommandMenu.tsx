import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface SlashCommand {
  command: string;       // e.g. "/pet"
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
  onSelect: () => void;
}

interface SlashCommandMenuProps {
  query: string;         // everything the user typed after "/"
  commands: SlashCommand[];
  onDismiss: () => void;
}

export function SlashCommandMenu({ query, commands, onDismiss }: SlashCommandMenuProps) {
  const { theme } = useTheme();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return commands.filter(
      c => c.command.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [query, commands]);

  if (filtered.length === 0) return null;

  // Group by category
  const grouped = filtered.reduce<Record<string, SlashCommand[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ScrollView
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 320 }}
      >
        {Object.entries(grouped).map(([category, cmds]) => (
          <View key={category}>
            <Text style={[styles.category, { color: theme.textSecondary }]}>{category}</Text>
            {cmds.map(cmd => (
              <TouchableOpacity
                key={cmd.command}
                style={[styles.row, { borderBottomColor: theme.border }]}
                onPress={() => { cmd.onSelect(); onDismiss(); }}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.surfaceHover }]}>
                  <Ionicons name={cmd.icon} size={16} color={theme.accent} />
                </View>
                <View style={styles.textWrap}>
                  <Text style={[styles.command, { color: theme.text }]}>{cmd.command}</Text>
                  <Text style={[styles.desc, { color: theme.textSecondary }]} numberOfLines={1}>
                    {cmd.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  command: { fontSize: 14, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 1 },
});
