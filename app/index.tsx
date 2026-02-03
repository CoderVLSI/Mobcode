import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { storage, Chat, Message, CodeDiff, CustomModel } from '../utils/storage';
import { aiService } from '../utils/aiService';
import { codeParser } from '../utils/codeParser';
import { fileManager } from '../utils/fileManager';
import { autonomousAgent, AgentStep } from '../utils/autonomousAgent';
import { ModelSwitcher } from '../components/ModelSwitcher';
import { ChatHistory } from '../components/ChatHistory';
import { CodeDiffViewer } from '../components/CodeDiffViewer';
import { FileExplorer } from '../components/FileExplorer';
import { FileSearch } from '../components/FileSearch';
import { FileOperationApproval, FileOperation } from '../components/FileOperationApproval';
import { MCPManager } from '../components/MCPManager';
import { AgentApproval } from '../components/AgentApproval';
import { TaskTracker } from '../components/TaskTracker';

export default function ChatScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-3.5-sonnet');
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [showDiffs, setShowDiffs] = useState<Record<string, boolean>>({});
  // isDarkMode removed
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelEndpoint, setNewModelEndpoint] = useState('');
  const [newModelApiKey, setNewModelApiKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showOpenAIInput, setShowOpenAIInput] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [pendingFileOperations, setPendingFileOperations] = useState<FileOperation[]>([]);
  const [showFileApproval, setShowFileApproval] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [showMCPManager, setShowMCPManager] = useState(false);
  const [showAgentApproval, setShowAgentApproval] = useState(false);
  const [pendingApprovalStep, setPendingApprovalStep] = useState<AgentStep | null>(null);
  const [showTaskTracker, setShowTaskTracker] = useState(false);
  const [currentGoal, setCurrentGoal] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const approvalResolverRef = useRef<((value: boolean) => void) | null>(null);
  const messageCounterRef = useRef(0);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentChat) {
      saveCurrentChat();
    }
  }, [currentChat]);

  const loadInitialData = async () => {
    const savedModel = await storage.getModel();
    setSelectedModel(savedModel);

    const savedChat = await storage.getCurrentChat();
    if (savedChat) {
      // Filter out any old progress messages to avoid duplicate key errors
      const cleanedChat = {
        ...savedChat,
        messages: savedChat.messages.filter(m => !m.id.startsWith('progress-')),
      };
      setCurrentChat(cleanedChat);
    } else {
      createNewChat();
    }

    const allChats = await storage.getChats();
    // Also clean all chats in history
    const cleanedChats = allChats.map(chat => ({
      ...chat,
      messages: chat.messages.filter(m => !m.id.startsWith('progress-')),
    }));
    setChats(cleanedChats);

    const models = await storage.getCustomModels();
    setCustomModels(models);

    // Load API keys
    const openaiKey = await storage.getOpenAIKey();
    setOpenAIKey(openaiKey);
    const anthropicKey = await storage.getAnthropicKey();
    setAnthropicKey(anthropicKey);
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: "Hello! I'm your AI assistant. How can I help you today?",
          timestamp: new Date(),
        },
      ],
      model: selectedModel,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCurrentChat(newChat);
    setShowHistory(false);
  };

  const saveCurrentChat = async () => {
    if (currentChat) {
      // Filter out progress messages before saving
      const cleanedChat = {
        ...currentChat,
        messages: currentChat.messages.filter(m => !m.id.startsWith('progress-')),
      };
      await storage.saveChat(cleanedChat);
      await storage.setCurrentChat(cleanedChat);
      const allChats = await storage.getChats();
      setChats(allChats);
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setCurrentChat(chat);
    setSelectedModel(chat.model);
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    await storage.setModel(model);
    if (currentChat) {
      setCurrentChat({ ...currentChat, model });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, isTyping]);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const generateChatTitle = (firstMessage: string): string => {
    const words = firstMessage.split(' ').slice(0, 5);
    return words.join(' ') + (firstMessage.split(' ').length > 5 ? '...' : '');
  };

  const generateCodeDiff = (): CodeDiff | undefined => {
    const shouldShowDiff = Math.random() > 0.7;
    if (!shouldShowDiff) return undefined;

    return {
      filename: 'src/App.tsx',
      oldCode: `function App() {\n  return (\n    <div className="App">\n      <h1>Hello World</h1>\n    </div>\n  );\n}`,
      newCode: `function App() {\n  const [count, setCount] = useState(0);\n  \n  return (\n    <div className="App">\n      <h1>Hello World</h1>\n      <button onClick={() => setCount(c => c + 1)}>\n        Count: {count}\n      </button>\n    </div>\n  );\n}`,
      language: 'typescript',
    };
  };

  const streamingMessageIdRef = useRef<string | null>(null);

  const sendMessage = async () => {
    if (inputText.trim() === '' || !currentChat || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...currentChat.messages, userMessage];
    const updatedChat = {
      ...currentChat,
      messages: updatedMessages,
      title: updatedMessages.length === 1 ? generateChatTitle(userMessage.content) : currentChat.title,
      updatedAt: new Date(),
    };

    setCurrentChat(updatedChat);
    setInputText('');
    setIsTyping(true);
    streamingMessageIdRef.current = null;

    // Always use autonomous agent - AI decides when to use tools
    setAgentSteps([]);

    // Determine which API key to use based on the selected model
    let apiKey: string | undefined;
    if (selectedModel.startsWith('gpt')) {
      apiKey = openAIKey || undefined;
    } else if (selectedModel.startsWith('claude') || selectedModel.startsWith('anthropic')) {
      apiKey = anthropicKey || undefined;
    }

    const handleStream = (token: string) => {
      setCurrentChat((prev) => {
        if (!prev) return null;

        let newMessages = [...prev.messages];
        
        if (!streamingMessageIdRef.current) {
          // Create new message for the stream
          streamingMessageIdRef.current = `assistant-${Date.now()}`;
          newMessages.push({
            id: streamingMessageIdRef.current,
            role: 'assistant',
            content: token,
            timestamp: new Date(),
          });
        } else {
          // Update existing message
          const msgIndex = newMessages.findIndex(m => m.id === streamingMessageIdRef.current);
          if (msgIndex >= 0) {
            newMessages[msgIndex] = {
              ...newMessages[msgIndex],
              content: newMessages[msgIndex].content + token,
            };
          } else {
             // Fallback if message lost (unlikely)
             newMessages.push({
               id: streamingMessageIdRef.current,
               role: 'assistant',
               content: token,
               timestamp: new Date(),
             });
          }
        }
        
        return {
          ...prev,
          messages: newMessages,
        };
      });
    };

    const result = await autonomousAgent.executeTask(
      inputText.trim(),
      [
        'read_file', 'write_file', 'create_file', 'delete_file', 'list_directory', 'search_files', 'run_command',
        'find_files', 'append_file', 'file_info', 'count_lines', 'list_imports',
        'create_component', 'npm_info', 'update_package_json', 'init_project'
      ],
      async (step, allSteps) => {
        // Progress callback - update task tracker
        setAgentSteps([...allSteps]);
        setCurrentGoal(allSteps.length > 0 ? 'Processing tasks...' : inputText.trim());

        // Don't add progress messages to chat - keep it clean
        // Progress is shown in the task tracker badge instead
      },
      async (step) => {
        // Approval callback - show custom modal
        return new Promise((resolve) => {
          approvalResolverRef.current = resolve;
          setPendingApprovalStep(step);
          setShowAgentApproval(true);
        });
      },
      selectedModel,
      customModels,
      apiKey,
      handleStream // Pass the streaming callback
    );

    console.log('Agent result:', result);
    console.log('Agent plan:', result.plan);
    console.log('Has conversational response:', !!result.plan?.conversationalResponse);

    // Store the goal for task tracker
    if (result.plan?.goal) {
      setCurrentGoal(result.plan.goal);
    }

    // Ensure we have at least one response if nothing was streamed (fallback)
    if (!streamingMessageIdRef.current && !result.plan?.steps.length) {
       const finalContent = result.finalOutput || result.plan?.conversationalResponse || 'Done!';
       const summaryMsg: Message = {
        id: `summary-${Date.now()}`,
        role: 'assistant',
        content: finalContent,
        timestamp: new Date(),
      };
      setCurrentChat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, summaryMsg],
          updatedAt: new Date(),
        };
      });
    }

    setIsTyping(false);
  };

  const toggleDiff = (messageId: string) => {
    setShowDiffs((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const clearChat = () => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: createNewChat,
      },
    ]);
  };

  const handleAgentApproval = (approved: boolean) => {
    setShowAgentApproval(false);
    if (approvalResolverRef.current) {
      approvalResolverRef.current(approved);
      approvalResolverRef.current = null;
    }
    setPendingApprovalStep(null);
  };

  const handleAddCustomModel = async () => {
    if (!newModelName.trim() || !newModelEndpoint.trim() || !newModelApiKey.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newModel: CustomModel = {
      id: Date.now().toString(),
      name: newModelName.trim(),
      endpoint: newModelEndpoint.trim(),
      apiKey: newModelApiKey.trim(),
      createdAt: new Date(),
    };

    await storage.saveCustomModel(newModel);
    setCustomModels([newModel, ...customModels]);
    setNewModelName('');
    setNewModelEndpoint('');
    setNewModelApiKey('');
    setShowAddModel(false);
    Alert.alert('Success', 'Custom model added successfully');
  };

  const handleDeleteCustomModel = (modelId: string) => {
    Alert.alert('Delete Model', 'Are you sure you want to delete this custom model?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await storage.deleteCustomModel(modelId);
          setCustomModels(customModels.filter((m) => m.id !== modelId));
          if (selectedModel === modelId) {
            setSelectedModel('claude-3.5-sonnet');
          }
        },
      },
    ]);
  };

  const handleFileSelect = (file: any) => {
    setShowFileExplorer(false);
    // In a real implementation, this would open the file in an editor
    Alert.alert('File Selected', `You selected: ${file.name}\n\nIn a real implementation, this would open the file in a code editor.`);
  };

  const handleApplyCodeDiff = async (diff: CodeDiff) => {
    try {
      // For now, we'll simulate applying the diff
      // In a real implementation, this would write to the actual file
      const filePath = codeParser.parseFilePath(diff.filename, fileManager.getProjectRoot());

      // Confirm before applying
      Alert.alert(
        'Apply Changes',
        `Apply code changes to ${diff.filename}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            style: 'default',
            onPress: async () => {
              try {
                await fileManager.writeFile(filePath, diff.newCode);
                Alert.alert('Success', `Changes applied to ${diff.filename}`);
                // Close the diff viewer
                const messageId = currentChat?.messages.find(m => m.codeDiff?.filename === diff.filename)?.id;
                if (messageId) {
                  setShowDiffs(prev => ({ ...prev, [messageId]: false }));
                }
              } catch (error) {
                Alert.alert('Error', `Failed to apply changes: ${error}`);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to apply changes: ${error}`);
    }
  };

  const handleFileOperationApproval = async (approvedOps: FileOperation[]) => {
    setShowFileApproval(false);
    const createdFiles: string[] = [];

    for (const op of approvedOps) {
      try {
        const filePath = codeParser.parseFilePath(op.file.filename, fileManager.getProjectRoot());
        await fileManager.writeFile(filePath, op.file.content);
        createdFiles.push(op.file.filename);
      } catch (error) {
        console.error(`Failed to create file ${op.file.filename}:`, error);
        Alert.alert('Error', `Failed to create ${op.file.filename}`);
      }
    }

    // Show notification
    if (createdFiles.length > 0) {
      const fileSummary = createdFiles.length <= 3
        ? createdFiles.join('\n')
        : `${createdFiles.slice(0, 3).join('\n')}\n...and ${createdFiles.length - 3} more`;

      Alert.alert(
        'Files Created',
        `Successfully created ${createdFiles.length} file(s):\n\n${fileSummary}`,
        [
          { text: 'OK' },
          {
            text: 'View Files',
            onPress: () => setShowFileExplorer(true),
          },
        ]
      );
    }

    setPendingFileOperations([]);
  };

  const handleFileOperationReject = () => {
    setShowFileApproval(false);
    setPendingFileOperations([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowFileExplorer(true)} style={styles.headerButton}>
          <Ionicons name="list" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentChat?.title || 'AI Chat'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowFileSearch(true)} style={styles.headerButton}>
            <Ionicons name="search" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.headerButton}>
            <Ionicons name="time-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={createNewChat} style={styles.headerButton}>
            <Ionicons name="add" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {currentChat?.messages.map((message) => (
          <View key={message.id}>
            <MessageBubble message={message} styles={styles} theme={theme} />
            {message.codeDiff && showDiffs[message.id] && (
              <CodeDiffViewer
                diff={message.codeDiff}
                onClose={() => toggleDiff(message.id)}
                onApply={handleApplyCodeDiff}
              />
            )}
            {message.codeDiff && !showDiffs[message.id] && (
              <TouchableOpacity
                style={styles.diffButton}
                onPress={() => toggleDiff(message.id)}
              >
                <Ionicons name="code-slash" size={14} color={theme.accent} />
                <Text style={styles.diffButtonText}>View Code Diff</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {isTyping && <TypingIndicator styles={styles} theme={theme} />}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.bottomBar, { paddingBottom: 24 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask anything (⌘K)"
              placeholderTextColor={theme.placeholder}
              multiline
              maxLength={4000}
            />
            
            <View style={[styles.modelRow, { marginBottom: 0, marginTop: 8 }]}>
              <ModelSwitcher currentModel={selectedModel} onModelChange={handleModelChange} customModels={customModels} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TouchableOpacity onPress={() => setShowTaskTracker(true)} style={styles.taskTrackerButton}>
                  <Ionicons name="list-outline" size={18} color={theme.textSecondary} />
                  {agentSteps.length > 0 && (
                    <View style={styles.taskBadge}>
                      <Text style={styles.taskBadgeText}>{agentSteps.filter(s => s.status !== 'completed').length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
                  <Ionicons name="refresh-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={sendMessage}
                  style={[styles.sendButton, inputText.trim() === '' && styles.sendButtonDisabled]}
                  disabled={inputText.trim() === ''}
                >
                  <Ionicons
                    name="arrow-up"
                    size={16}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ChatHistory
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectChat={handleSelectChat}
        onNewChat={createNewChat}
        currentChatId={currentChat?.id || null}
      />

      <FileExplorer
        visible={showFileExplorer}
        onClose={() => setShowFileExplorer(false)}
        onFileSelect={handleFileSelect}
      />

      <FileSearch
        visible={showFileSearch}
        onClose={() => setShowFileSearch(false)}
        onResultSelect={(file, line) => {
          setShowFileSearch(false);
          Alert.alert('File Selected', `Selected ${file.name}${line ? ` at line ${line}` : ''}`);
        }}
      />

      <FileOperationApproval
        visible={showFileApproval}
        operations={pendingFileOperations}
        onApprove={handleFileOperationApproval}
        onReject={handleFileOperationReject}
      />

      <MCPManager
        visible={showMCPManager}
        onClose={() => setShowMCPManager(false)}
      />

      <AgentApproval
        visible={showAgentApproval}
        step={pendingApprovalStep}
        onApprove={() => handleAgentApproval(true)}
        onDeny={() => handleAgentApproval(false)}
      />

      <TaskTracker
        visible={showTaskTracker}
        onClose={() => setShowTaskTracker(false)}
        steps={agentSteps}
        goal={currentGoal || 'No active task'}
      />

      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsContent}>
              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>Appearance</Text>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={toggleTheme}
                >
                  <Ionicons
                    name={isDarkMode ? 'moon' : 'sunny'}
                    size={20}
                    color={theme.accent}
                  />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Theme</Text>
                    <Text style={styles.settingValue}>
                      {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                    </Text>
                  </View>
                  <View style={styles.switchContainer}>
                    <View style={[styles.switch, isDarkMode && styles.switchActive]}>
                      <View style={[styles.switchKnob, isDarkMode && styles.switchKnobActive]} />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>OpenAI API</Text>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => setShowOpenAIInput(!showOpenAIInput)}
                >
                  <Ionicons name="key" size={20} color={theme.accent} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>OpenAI API Key</Text>
                    <Text style={styles.settingValue}>
                      {openAIKey ? '••••' + openAIKey.slice(-4) : 'Not set'}
                    </Text>
                  </View>
                  <Ionicons name={showOpenAIInput ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {showOpenAIInput && (
                  <View style={styles.apiInputContainer}>
                    <TextInput
                      style={styles.apiInput}
                      value={openAIKey}
                      onChangeText={setOpenAIKey}
                      placeholder="sk-..."
                      placeholderTextColor={theme.placeholder}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={async () => {
                        await storage.setOpenAIKey(openAIKey);
                        setShowOpenAIInput(false);
                        Alert.alert('Success', 'OpenAI API key saved');
                      }}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>Anthropic API</Text>
                <View style={styles.settingItem}>
                  <Ionicons name="key" size={20} color={theme.accent} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Anthropic API Key</Text>
                    <Text style={styles.settingValue}>
                      {anthropicKey ? '••••' + anthropicKey.slice(-4) : 'Not set'}
                    </Text>
                  </View>
                </View>
                <View style={styles.apiInputContainer}>
                  <TextInput
                    style={styles.apiInput}
                    value={anthropicKey}
                    onChangeText={setAnthropicKey}
                    placeholder="sk-ant-..."
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={async () => {
                      await storage.setAnthropicKey(anthropicKey);
                      Alert.alert('Success', 'Anthropic API key saved');
                    }}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Custom Models</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModel(true)}
                  >
                    <Ionicons name="add-circle" size={20} color={theme.accent} />
                  </TouchableOpacity>
                </View>

                {customModels.length === 0 ? (
                  <Text style={styles.emptyText}>No custom models added</Text>
                ) : (
                  customModels.map((model) => (
                    <View key={model.id} style={styles.customModelItem}>
                      <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => setSelectedModel(model.id)}
                      >
                        <Ionicons name="key" size={20} color={theme.accent} />
                        <View style={styles.settingInfo}>
                          <Text style={styles.settingLabel}>{model.name}</Text>
                          <Text style={styles.settingValue} numberOfLines={1}>
                            {model.endpoint}
                          </Text>
                        </View>
                        {selectedModel === model.id && (
                          <Ionicons name="checkmark" size={20} color={theme.accent} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteModelButton}
                        onPress={() => handleDeleteCustomModel(model.id)}
                      >
                        <Ionicons name="trash" size={18} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {showAddModel && (
                  <View style={styles.addModelForm}>
                    <TextInput
                      style={styles.apiInput}
                      value={newModelName}
                      onChangeText={setNewModelName}
                      placeholder="Model name (e.g., GPT-4 Turbo)"
                      placeholderTextColor={theme.placeholder}
                    />
                    <TextInput
                      style={styles.apiInput}
                      value={newModelEndpoint}
                      onChangeText={setNewModelEndpoint}
                      placeholder="API endpoint (e.g., https://api.openai.com)"
                      placeholderTextColor={theme.placeholder}
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={styles.apiInput}
                      value={newModelApiKey}
                      onChangeText={setNewModelApiKey}
                      placeholder="API Key"
                      placeholderTextColor={theme.placeholder}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    <View style={styles.formButtons}>
                      <TouchableOpacity
                        style={[styles.saveButton, styles.cancelButton]}
                        onPress={() => {
                          setShowAddModel(false);
                          setNewModelName('');
                          setNewModelEndpoint('');
                          setNewModelApiKey('');
                        }}
                      >
                        <Text style={styles.saveButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleAddCustomModel}
                      >
                        <Text style={styles.saveButtonText}>Add Model</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.settingSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>MCP Servers</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowMCPManager(true)}
                  >
                    <Ionicons name="settings" size={20} color={theme.accent} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => setShowMCPManager(true)}
                >
                  <Ionicons name="cloud" size={20} color={theme.accent} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>External Tools</Text>
                    <Text style={styles.settingValue}>Connect to MCP servers</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.settingItem}>
                  <Ionicons name="information-circle" size={20} color={theme.accent} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>App Version</Text>
                    <Text style={styles.settingValue}>1.0.0</Text>
                  </View>
                </View>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>Model</Text>
                <View style={styles.settingItem}>
                  <Ionicons name="sparkles" size={20} color={theme.accent} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Current Model</Text>
                    <Text style={styles.settingValue}>{selectedModel}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>Storage</Text>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => {
                    Alert.alert(
                      'Clear All Data',
                      'This will delete all chat history. Continue?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear All',
                          style: 'destructive',
                          onPress: async () => {
                            await storage.saveChat(currentChat!);
                            setChats([]);
                            createNewChat();
                            setShowSettings(false);
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash" size={20} color={theme.error} />
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.error }]}>Clear All Data</Text>
                    <Text style={styles.settingValue}>Delete all chats</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function MessageBubble({ message, styles, theme }: { message: Message; styles: any; theme: Theme }) {
  const isUser = message.role === 'user';

  return (
    <View style={styles.messageRow}>
      <View style={styles.avatarContainer}>
        {isUser ? (
          <Ionicons name="person-circle-outline" size={24} color={theme.textSecondary} />
        ) : (
          <Ionicons name="sparkles" size={20} color={theme.accent} />
        )}
      </View>
      <View style={styles.messageContentWrapper}>
        <Text style={styles.senderName}>{isUser ? 'You' : 'Cursor'}</Text>
        <Text style={styles.messageContent}>{message.content}</Text>
        {/* Code rendering would go here - for now keeping text */}
      </View>
    </View>
  );
}

function TypingIndicator({ styles, theme }: { styles: any; theme: Theme }) {
  return (
    <View style={styles.messageRow}>
      <View style={styles.avatarContainer}>
        <Ionicons name="sparkles" size={20} color={theme.accent} />
      </View>
      <View style={styles.messageContentWrapper}>
        <Text style={styles.senderName}>Cursor</Text>
        <View style={styles.typingIndicator}>
          <View style={[styles.typingDot, styles.typingDot1]} />
          <View style={[styles.typingDot, styles.typingDot2]} />
          <View style={[styles.typingDot, styles.typingDot3]} />
        </View>
      </View>
    </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  headerButton: {
    padding: 6,
    borderRadius: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  clearButton: {
    padding: 4,
  },
  taskTrackerButton: {
    padding: 4,
    position: 'relative',
  },
  taskBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  // New Message Styles (Cursor-like)
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarContainer: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  messageContentWrapper: {
    flex: 1,
    gap: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.text,
    opacity: 0.9,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.text,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.textSecondary,
  },
  typingDot1: { opacity: 1 },
  typingDot2: { opacity: 0.6 },
  typingDot3: { opacity: 0.3 },
  
  // Composer Styles
  inputContainer: {
    backgroundColor: theme.inputBackground,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  input: {
    fontSize: 14,
    color: theme.text,
    maxHeight: 150,
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sendButton: {
    alignSelf: 'flex-end',
    padding: 8,
    backgroundColor: theme.accent,
    borderRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: theme.surface,
    opacity: 0.5,
  },

  // Legacy/Other Styles
  diffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${theme.accent}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
    marginLeft: 52, // Indent to align with content
    borderWidth: 1,
    borderColor: theme.accent,
  },
  diffButtonText: {
    fontSize: 12,
    color: theme.accent,
    fontWeight: '500',
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
    borderWidth: 1,
    borderColor: theme.border,
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  settingsContent: {
    flex: 1,
  },
  settingSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  switchContainer: {
    marginLeft: 8,
  },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.border,
    padding: 2,
  },
  switchActive: {
    backgroundColor: theme.accent,
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  switchKnobActive: {
    transform: [{ translateX: 18 }],
  },
  apiInputContainer: {
    marginTop: 12,
    gap: 8,
  },
  apiInput: {
    backgroundColor: theme.inputBackground,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  saveButton: {
    backgroundColor: theme.accent,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  customModelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: 8,
  },
  deleteModelButton: {
    padding: 8,
    marginLeft: 8,
  },
  addModelForm: {
    marginTop: 12,
    gap: 10,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
    flex: 1,
  },
});
