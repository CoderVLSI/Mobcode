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
  const lines = diff.newCode.split('\n');
  const oldLines = diff.oldCode.split('\n');

  const getLineType = (lineNum: number) => {
    const newLine = lines[lineNum]?.trim();
    const oldLine = oldLines[lineNum]?.trim();

    if (newLine === oldLine) return 'unchanged';
    if (!oldLine) return 'added';
    if (!newLine) return 'removed';
    if (newLine !== oldLine) return 'modified';
    return 'unchanged';
  };

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
          {lines.map((line, index) => {
            const lineType = getLineType(index);
            const backgroundColor =
              lineType === 'added'
                ? `${theme.success}15`
                : lineType === 'removed'
                ? `${theme.error}15`
                : lineType === 'modified'
                ? `${theme.accent}15`
                : 'transparent';

            return (
              <View key={index} style={[styles.line, { backgroundColor }]}>
                <Text style={styles.lineNumber}>{index + 1}</Text>
                <Text style={styles.lineContent}>{line || ' '}</Text>
                {lineType === 'added' && (
                  <Ionicons name="add" size={14} color={theme.success} style={styles.lineIcon} />
                )}
                {lineType === 'removed' && (
                  <Ionicons name="remove" size={14} color={theme.error} style={styles.lineIcon} />
                )}
                {lineType === 'modified' && (
                  <Ionicons name="swap-horizontal" size={14} color={theme.accent} style={styles.lineIcon} />
                )}
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    </View>
  );
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
  lineNumber: {
    fontSize: 11,
    color: theme.textSecondary,
    width: 30,
    textAlign: 'right',
    marginRight: 12,
    userSelect: 'none',
  },
  lineContent: {
    fontSize: 12,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  lineIcon: {
    marginLeft: 8,
  },
});
