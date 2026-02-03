import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { AI_MODELS } from '../constants/Models';
import { storage, CustomModel } from '../utils/storage';

interface ModelSwitcherProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  customModels?: CustomModel[];
}

export function ModelSwitcher({ currentModel, onModelChange, customModels = [] }: ModelSwitcherProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showModal, setShowModal] = useState(false);

  // Combine default models with custom models
  const allModels = [
    ...AI_MODELS,
    ...customModels.map((cm) => ({
      id: cm.id,
      name: cm.name,
      provider: 'Custom',
      icon: 'key' as const,
      description: `Custom model • ${cm.endpoint}`,
      isCustom: true,
    })),
  ];

  const selectedModel = allModels.find((m) => m.id === currentModel) || allModels[0];

  return (
    <>
      <TouchableOpacity
        style={styles.modelSelector}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name={selectedModel.icon as any} size={16} color={theme.accent} />
        <Text style={styles.modelText} numberOfLines={1}>{selectedModel.name}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Model</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modelsList}>
              {allModels.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelOption,
                    currentModel === model.id && styles.modelOptionSelected,
                  ]}
                  onPress={() => {
                    onModelChange(model.id);
                    setShowModal(false);
                  }}
                >
                  <View style={styles.modelInfo}>
                    <Ionicons
                      name={model.icon as any}
                      size={20}
                      color={currentModel === model.id ? theme.accent : theme.textSecondary}
                    />
                    <View style={styles.modelDetails}>
                      <Text
                        style={[
                          styles.modelName,
                          currentModel === model.id && styles.modelNameSelected,
                        ]}
                      >
                        {model.name}
                      </Text>
                      <Text style={styles.modelDescription}>{model.description}</Text>
                      <View style={styles.modelMeta}>
                        <Text style={styles.modelProvider}>{model.provider}</Text>
                        {(model as any).isCustom && (
                          <View style={styles.customBadge}>
                            <Text style={styles.customBadgeText}>Custom</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {currentModel === model.id && (
                    <Ionicons name="checkmark" size={20} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    maxWidth: 200,
  },
  modelText: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    height: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  modelsList: {
    flex: 1,
    minHeight: 200,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modelOptionSelected: {
    backgroundColor: `${theme.accent}15`,
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  modelDetails: {
    flex: 1,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 4,
  },
  modelNameSelected: {
    color: theme.accent,
  },
  modelDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  modelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelProvider: {
    fontSize: 11,
    color: theme.textSecondary,
    fontStyle: 'italic',
  },
  customBadge: {
    backgroundColor: `${theme.accent}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customBadgeText: {
    fontSize: 10,
    color: theme.accent,
    fontWeight: '600',
  },
});
