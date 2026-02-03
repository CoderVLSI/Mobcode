import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { CodeDiff } from '../utils/storage';

interface CodeDiffViewerProps {
  diff: CodeDiff;
  onClose?: () => void;
  onApply?: (diff: CodeDiff) => void;
}

export function CodeDiffViewer({ diff, onClose, onApply }: CodeDiffViewerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const oldLines = diff.oldCode.split('\n');
  const newLines = diff.newCode.split('\n');
  const diffRows = useMemo(() => buildDiffRows(oldLines, newLines), [diff.oldCode, diff.newCode]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="code-slash" size={18} color={theme.accent} />
          <Text style={styles.filename} numberOfLines={1}>
            {diff.filename}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {onApply && (
            <TouchableOpacity
              onPress={() => onApply(diff)}
              style={styles.applyButton}
            >
              <Ionicons name="checkmark" size={18} color={theme.success} />
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal style={styles.scrollContainer}>
        <ScrollView style={styles.codeContainer}>
          {diffRows.map((row, index) => {
            if (row.type === 'hunk') {
              return (
                <View key={index} style={[styles.line, styles.hunkRow]}>
                  <Text style={styles.hunkText}>{row.text}</Text>
                </View>
              );
            }

            const backgroundColor =
              row.type === 'add'
                ? `${theme.success}15`
                : row.type === 'remove'
                ? `${theme.error}15`
                : 'transparent';
            const prefix =
              row.type === 'add' ? '+' : row.type === 'remove' ? '-' : ' ';
            const prefixColor =
              row.type === 'add' ? theme.success : row.type === 'remove' ? theme.error : theme.textSecondary;

            return (
              <View key={index} style={[styles.line, { backgroundColor }]}>
                <Text style={styles.lineNumber}>{row.oldNumber ?? ''}</Text>
                <Text style={styles.lineNumber}>{row.newNumber ?? ''}</Text>
                <Text style={[styles.linePrefix, { color: prefixColor }]}>{prefix}</Text>
                <Text style={styles.lineContent}>{row.text || ' '}</Text>
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

type DiffRow = {
  type: 'context' | 'add' | 'remove' | 'hunk';
  oldNumber?: number;
  newNumber?: number;
  text: string;
};

function buildDiffRows(oldLines: string[], newLines: string[]): DiffRow[] {
  const n = oldLines.length;
  const m = newLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const rows: DiffRow[] = [];
  rows.push({
    type: 'hunk',
    text: `@@ -1,${n} +1,${m} @@`,
  });
  let i = 0;
  let j = 0;
  let oldNum = 1;
  let newNum = 1;

  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      rows.push({ type: 'context', oldNumber: oldNum, newNumber: newNum, text: oldLines[i] });
      i += 1;
      j += 1;
      oldNum += 1;
      newNum += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: 'remove', oldNumber: oldNum, text: oldLines[i] });
      i += 1;
      oldNum += 1;
    } else {
      rows.push({ type: 'add', newNumber: newNum, text: newLines[j] });
      j += 1;
      newNum += 1;
    }
  }

  while (i < n) {
    rows.push({ type: 'remove', oldNumber: oldNum, text: oldLines[i] });
    i += 1;
    oldNum += 1;
  }

  while (j < m) {
    rows.push({ type: 'add', newNumber: newNum, text: newLines[j] });
    j += 1;
    newNum += 1;
  }

  return rows;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: `${theme.accent}10`,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filename: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${theme.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.success,
  },
  applyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.success,
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  codeContainer: {
    padding: 12,
    minWidth: '100%',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hunkRow: {
    backgroundColor: `${theme.accent}12`,
  },
  hunkText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  lineNumber: {
    fontSize: 11,
    color: theme.textSecondary,
    width: 28,
    textAlign: 'right',
    marginRight: 8,
    userSelect: 'none',
  },
  linePrefix: {
    fontSize: 12,
    width: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  lineContent: {
    fontSize: 12,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
});
