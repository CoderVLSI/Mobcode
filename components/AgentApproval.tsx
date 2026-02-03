import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { AgentStep } from '../utils/autonomousAgent';

interface AgentApprovalProps {
  visible: boolean;
  step: AgentStep | null;
  onApprove: () => void;
  onDeny: () => void;
}

export function AgentApproval({ visible, step, onApprove, onDeny }: AgentApprovalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!step) return null;

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('file')) return 'document-text';
    if (toolName.includes('command') || toolName.includes('run')) return 'terminal';
    if (toolName.includes('search')) return 'search';
    if (toolName.includes('create') || toolName.includes('write')) return 'add-circle';
    if (toolName.includes('delete') || toolName.includes('remove')) return 'trash';
    if (toolName.includes('list') || toolName.includes('directory')) return 'folder';
    if (toolName.includes('npm') || toolName.includes('package')) return 'cube';
    return 'flash';
  };

  const getRiskLevel = (toolName: string) => {
    const highRisk = ['write_file', 'delete_file', 'run_command', 'create_file'];
    const mediumRisk = ['update_package_json', 'init_project'];

    if (highRisk.includes(toolName)) return { level: 'high', color: theme.error, icon: 'warning' };
    if (mediumRisk.includes(toolName)) return { level: 'medium', color: '#FF9500', icon: 'alert-circle' };
    return { level: 'low', color: theme.success, icon: 'checkmark-circle' };
  };

  const risk = getRiskLevel(step.tool);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Ionicons name={getToolIcon(step.tool)} size={24} color={theme.accent} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Agent Action Required</Text>
              <Text style={styles.headerSubtitle}>The agent needs your permission</Text>
            </View>
          </View>

          {/* Risk Badge */}
          <View style={[styles.riskBadge, { backgroundColor: `${risk.color}15` }]}>
            <Ionicons name={risk.icon} size={14} color={risk.color} />
            <Text style={[styles.riskText, { color: risk.color }]}>
              {risk.level.toUpperCase()} RISK
            </Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Step Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What will happen:</Text>
              <Text style={styles.description}>{step.description}</Text>
            </View>

            {/* Tool Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tool:</Text>
              <View style={styles.toolCard}>
                <Ionicons name={getToolIcon(step.tool)} size={20} color={theme.accent} />
                <Text style={styles.toolName}>{step.tool}</Text>
              </View>
            </View>

            {/* Parameters */}
            {Object.keys(step.parameters).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Parameters:</Text>
                <View style={styles.paramsContainer}>
                  {Object.entries(step.parameters).map(([key, value]) => (
                    <View key={key} style={styles.paramRow}>
                      <Text style={styles.paramKey}>{key}:</Text>
                      <Text style={styles.paramValue} numberOfLines={3}>
                        {JSON.stringify(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.denyButton} onPress={onDeny}>
              <Ionicons name="close-circle" size={20} color={theme.error} />
              <Text style={styles.denyButtonText}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
              <Text style={styles.approveButtonText}>Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    margin: 16,
    marginLeft: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.text,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  toolName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  paramsContainer: {
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  paramKey: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accent,
    minWidth: 80,
  },
  paramValue: {
    flex: 1,
    fontSize: 13,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  denyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: `${theme.error}15`,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${theme.error}30`,
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.error,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.success,
    paddingVertical: 14,
    borderRadius: 12,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
