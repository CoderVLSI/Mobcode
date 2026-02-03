import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { storage, Chat } from '../utils/storage';

interface ChatHistoryProps {
  visible: boolean;
  onClose: () => void;
  onSelectChat: (chat: Chat) => void;
  onNewChat: () => void;
  currentChatId: string | null;
}

export function ChatHistory({
  visible,
  onClose,
  onSelectChat,
  onNewChat,
  currentChatId,
}: ChatHistoryProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (visible) {
      loadChats();
    }
  }, [visible]);

  const loadChats = async () => {
    const loadedChats = await storage.getChats();
    setChats(loadedChats);
  };

  const handleDeleteChat = (chatId: string, chatTitle: string) => {
    Alert.alert('Delete Chat', `Are you sure you want to delete "${chatTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await storage.deleteChat(chatId);
          await loadChats();
          if (currentChatId === chatId) {
            onNewChat();
          }
        },
      },
    ]);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat History</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.newChatButton} onPress={onNewChat}>
          <Ionicons name="add-circle" size={20} color={theme.accent} />
          <Text style={styles.newChatText}>New Chat</Text>
        </TouchableOpacity>

        <ScrollView style={styles.chatsList}>
          {chats.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyText}>No chat history yet</Text>
              <Text style={styles.emptySubtext}>Start a new conversation to see it here</Text>
            </View>
          ) : (
            chats.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={[
                  styles.chatItem,
                  currentChatId === chat.id && styles.chatItemActive,
                ]}
                onPress={() => {
                  onSelectChat(chat);
                  onClose();
                }}
              >
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Ionicons
                      name={currentChatId === chat.id ? 'chatbubbles' : 'chatbubbles-outline'}
                      size={18}
                      color={currentChatId === chat.id ? theme.accent : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.chatTitle,
                        currentChatId === chat.id && styles.chatTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {chat.title}
                    </Text>
                  </View>
                  <View style={styles.chatMeta}>
                    <Text style={styles.chatModel}>{chat.model}</Text>
                    <Text style={styles.chatDate}>{formatDate(chat.updatedAt)}</Text>
                  </View>
                  <Text style={styles.chatPreview} numberOfLines={2}>
                    {chat.messages[chat.messages.length - 1]?.content || 'No messages'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteChat(chat.id, chat.title)}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${theme.accent}15`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.accent,
  },
  chatsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chatItemActive: {
    borderColor: theme.accent,
    backgroundColor: `${theme.accent}10`,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
    flex: 1,
  },
  chatTitleActive: {
    color: theme.accent,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  chatModel: {
    fontSize: 11,
    color: theme.accent,
    backgroundColor: `${theme.accent}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chatDate: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  chatPreview: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});
