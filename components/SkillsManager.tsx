import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { skillManager, Skill } from '../utils/skillManager';
import { storage } from '../utils/storage';

interface SkillsManagerProps {
  visible: boolean;
  onClose: () => void;
}

export function SkillsManager({ visible, onClose }: SkillsManagerProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [stats, setStats] = useState({ cached: false, age: 0, count: 0 });

  useEffect(() => {
    if (visible) {
      loadSkills();
    }
  }, [visible]);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const loadedSkills = await skillManager.getAllSkills();
      setSkills(loadedSkills);
      setStats(skillManager.getCacheStats());
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    skillManager.clearCache();
    loadSkills();
  };

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.tags.some(tag => tag.includes(searchQuery.toLowerCase()))
  );

  const formatAge = (ms: number) => {
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="library" size={24} color={theme.accent} />
              <Text style={styles.modalTitle}>Skills Library</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleRefresh} style={styles.iconButton}>
                <Ionicons name="refresh" size={22} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>Skills</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.cached ? formatAge(stats.age) : 'N/A'}</Text>
              <Text style={styles.statLabel}>Cache Age</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search skills..."
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={styles.loadingText}>Loading skills...</Text>
            </View>
          ) : filteredSkills.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="document-outline" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No skills found' : 'No skills available'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.skillsList}>
              {filteredSkills.map((skill) => (
                <TouchableOpacity
                  key={skill.id}
                  style={styles.skillCard}
                  onPress={() => setSelectedSkill(skill)}
                >
                  <View style={styles.skillHeader}>
                    <Text style={styles.skillName}>{skill.name}</Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </View>
                  <Text style={styles.skillOverview} numberOfLines={2}>
                    {skill.overview}
                  </Text>
                  <View style={styles.skillMeta}>
                    <Text style={styles.skillWhenToUse}>When to use: {skill.whenToUse}</Text>
                  </View>
                  {skill.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {skill.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Skill Detail Modal */}
      <Modal visible={!!selectedSkill} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSkill?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedSkill(null)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailScroll}>
              <Text style={styles.detailOverview}>{selectedSkill?.overview}</Text>
              <Text style={styles.detailSectionTitle}>When to use:</Text>
              <Text style={styles.detailText}>{selectedSkill?.whenToUse}</Text>
              <Text style={styles.detailSectionTitle}>Content:</Text>
              <Text style={styles.detailContent}>{selectedSkill?.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    iconButton: {
      padding: 8,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.accent,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.inputBackground,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      paddingVertical: 4,
    },
    clearButton: {
      padding: 4,
    },
    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 12,
    },
    emptyText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    skillsList: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    skillCard: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    skillHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    skillName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    skillOverview: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    skillMeta: {
      marginBottom: 8,
    },
    skillWhenToUse: {
      fontSize: 11,
      color: theme.textSecondary,
      fontStyle: 'italic',
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tag: {
      backgroundColor: `${theme.accent}15`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    tagText: {
      fontSize: 10,
      color: theme.accent,
    },
    detailScroll: {
      flex: 1,
      padding: 20,
    },
    detailOverview: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
      marginBottom: 16,
      fontStyle: 'italic',
    },
    detailSectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginTop: 12,
      marginBottom: 6,
    },
    detailText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    detailContent: {
      fontSize: 13,
      color: theme.text,
      lineHeight: 20,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
  });
