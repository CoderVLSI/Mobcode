import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { AgentStep } from '../utils/autonomousAgent';

interface TaskTrackerProps {
  visible: boolean;
  onClose: () => void;
  steps: AgentStep[];
  goal: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function TaskTracker({ visible, onClose, steps, goal }: TaskTrackerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const getStepIcon = (status: AgentStep['status'], theme: Theme) => {
    switch (status) {
      case 'pending':
        return <Ionicons name="ellipse" size={16} color={theme.textSecondary} />;
      case 'approved':
        return <Ionicons name="checkmark-circle" size={16} color={theme.success} />;
      case 'executing':
        return <Ionicons name="time" size={16} color={theme.accent} />;
      case 'completed':
        return <Ionicons name="checkmark-done-circle" size={20} color={theme.success} />;
      case 'failed':
        return <Ionicons name="close-circle" size={20} color={theme.error} />;
      default:
        return <Ionicons name="ellipse" size={16} color={theme.textSecondary} />;
    }
  };

  const getStatusColor = (status: AgentStep['status'], theme: Theme) => {
    switch (status) {
      case 'pending': return theme.textSecondary;
      case 'approved': return theme.success;
      case 'executing': return theme.accent;
      case 'completed': return theme.success;
      case 'failed': return theme.error;
      default: return theme.textSecondary;
    }
  };

  const getStatusText = (status: AgentStep['status']) => {
    switch (status) {
      case 'pending': return 'WAITING';
      case 'approved': return 'APPROVED';
      case 'executing': return 'RUNNING...';
      case 'completed': return 'DONE';
      case 'failed': return 'FAILED';
      default: return 'WAITING';
    }
  };

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;
  const totalCount = steps.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Agent Tasks</Text>
              <Text style={styles.headerSubtitle}>
                {completedCount} of {totalCount} completed
              </Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        </View>

        {/* Goal Card */}
        <View style={styles.goalCard}>
          <Ionicons name="flag" size={20} color={theme.accent} />
          <View style={styles.goalContent}>
            <Text style={styles.goalLabel}>Current Goal</Text>
            <Text style={styles.goalText}>{goal}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: `${theme.success}15` }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
            <Text style={[styles.statValue, { color: theme.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: `${theme.error}15` }]}>
            <Ionicons name="close-circle" size={24} color={theme.error} />
            <Text style={[styles.statValue, { color: theme.error }]}>{failedCount}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: `${theme.accent}15` }]}>
            <Ionicons name="time" size={24} color={theme.accent} />
            <Text style={[styles.statValue, { color: theme.accent }]}>
              {totalCount - completedCount - failedCount}
            </Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        {/* Task List */}
        <ScrollView
          style={styles.taskList}
          contentContainerStyle={styles.taskListContent}
          showsVerticalScrollIndicator={false}
        >
          {steps.map((step, index) => (
            <View
              key={step.id}
              style={[
                styles.taskCard,
                step.status === 'executing' && styles.taskCardActive,
                step.status === 'completed' && styles.taskCardCompleted,
                step.status === 'failed' && styles.taskCardFailed,
              ]}
            >
              {/* Task Header */}
              <View style={styles.taskHeader}>
                <View style={styles.taskLeft}>
                  <Text style={styles.taskNumber}>{index + 1}</Text>
                  {getStepIcon(step.status, theme)}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(step.status, theme)}15` }
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(step.status, theme) }]}>
                    {getStatusText(step.status)}
                  </Text>
                </View>
              </View>

              {/* Task Description */}
              <Text style={styles.taskDescription}>{step.description}</Text>

              {/* Tool Info */}
              <View style={styles.toolInfo}>
                <Ionicons name="flash" size={14} color={theme.textSecondary} />
                <Text style={styles.toolName}>{step.tool}</Text>
              </View>

              {/* Task Result/Error */}
              {step.result?.output && (
                <View style={styles.resultContainer}>
                  <Text style={styles.resultLabel}>Output:</Text>
                  <Text style={styles.resultText} numberOfLines={4}>
                    {step.result.output}
                  </Text>
                </View>
              )}

              {step.error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorLabel}>Error:</Text>
                  <Text style={styles.errorText}>{step.error}</Text>
                </View>
              )}

              {/* Parameters Preview */}
              {Object.keys(step.parameters).length > 0 && step.status === 'pending' && (
                <View style={styles.paramsPreview}>
                  <Text style={styles.paramsLabel}>
                    {Object.keys(step.parameters).length} parameter
                    {Object.keys(step.parameters).length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Footer Action */}
        {completedCount === totalCount && failedCount === 0 && (
          <View style={styles.footer}>
            <View style={styles.successBanner}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
              <Text style={styles.successText}>All tasks completed successfully!</Text>
            </View>
          </View>
        )}

        {failedCount > 0 && (
          <View style={styles.footer}>
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={24} color={theme.error} />
              <Text style={styles.errorBannerText}>
                {failedCount} task{failedCount > 1 ? 's' : ''} failed
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: theme.inputBackground,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.accent,
    minWidth: 40,
    textAlign: 'right',
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  goalContent: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'uppercase',
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  taskCardActive: {
    borderWidth: 2,
    borderColor: theme.accent,
    backgroundColor: `${theme.accent}08`,
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskCardFailed: {
    borderWidth: 2,
    borderColor: theme.error,
    backgroundColor: `${theme.error}08`,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    minWidth: 24,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  taskDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
    lineHeight: 22,
  },
  toolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  toolName: {
    fontSize: 13,
    color: theme.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  resultContainer: {
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 12,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  errorContainer: {
    backgroundColor: `${theme.error}15`,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: `${theme.error}30`,
  },
  errorLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.error,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: theme.error,
  },
  paramsPreview: {
    alignSelf: 'flex-start',
    backgroundColor: theme.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  paramsLabel: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  footer: {
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    padding: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: `${theme.success}15`,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${theme.success}30`,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.success,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: `${theme.error}15`,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${theme.error}30`,
  },
  errorBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.error,
  },
});
