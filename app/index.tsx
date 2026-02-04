import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Theme } from '../context/ThemeContext';
import { storage, Chat, Message, CodeDiff, CustomModel, MessageAttachment, ImageAttachment, FileAttachment } from '../utils/storage';
import { aiService } from '../utils/aiService';
import { codeParser } from '../utils/codeParser';
import { fileManager, FileNode } from '../utils/fileManager';
import { autonomousAgent, AgentStep } from '../utils/autonomousAgent';
import { ModelSwitcher } from '../components/ModelSwitcher';
import { ChatHistory } from '../components/ChatHistory';
import { CodeDiffViewer } from '../components/CodeDiffViewer';
import { FileExplorer } from '../components/FileExplorer';
import { FileSearch } from '../components/FileSearch';
import { FileOperationApproval, FileOperation } from '../components/FileOperationApproval';
import { MCPManager } from '../components/MCPManager';
import { TaskTracker } from '../components/TaskTracker';
import { GitPanel } from '../components/GitPanel';
import { FileAttachmentPicker } from '../components/FileAttachmentPicker';
import { HTMLPreview } from '../components/HTMLPreview';
import { ReactPreview } from '../components/ReactPreview';
import { ComponentPreview } from '../components/ComponentPreview';
import { MessageContent } from '../components/MessageContent';
import { ToolsHelp } from '../components/ToolsHelp';
import { SkillsManager } from '../components/SkillsManager';
import { CodeArena } from '../components/CodeArena';
import { AI_MODELS } from '../constants/Models';
import {
  LOCAL_MODEL_ID,
  LOCAL_MODEL_NAME,
  ensureLocalModelReady,
  deleteLocalModel,
  getLocalModelInfo,
  LOCAL_MODEL_AVAILABLE,
} from '../utils/localLlama';
import { previewBus, PreviewRequest } from '../utils/previewBus';

export default function ChatScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

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
  const [geminiKey, setGeminiKey] = useState('');
  const [glmKey, setGlmKey] = useState('');
  const [showOpenAIInput, setShowOpenAIInput] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [pendingFileOperations, setPendingFileOperations] = useState<FileOperation[]>([]);
  const [showFileApproval, setShowFileApproval] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [showMCPManager, setShowMCPManager] = useState(false);
  const [showTaskTracker, setShowTaskTracker] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showToolsHelp, setShowToolsHelp] = useState(false);
  const [currentGoal, setCurrentGoal] = useState('');
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileNode[]>([]);
  const [localModelStatus, setLocalModelStatus] = useState<'unknown' | 'missing' | 'downloading' | 'ready' | 'error'>('unknown');
  const [localModelProgress, setLocalModelProgress] = useState(0);
  const [localModelSize, setLocalModelSize] = useState<number | null>(null);
  const [localModelError, setLocalModelError] = useState<string | null>(null);
  const [showLocalModelModal, setShowLocalModelModal] = useState(false);
  const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
  const [htmlPreview, setHtmlPreview] = useState<{ path: string; name: string } | null>(null);
  const [reactPreview, setReactPreview] = useState<{ path: string; name: string } | null>(null);
  const [previewComponentId, setPreviewComponentId] = useState<string | null>(null);
  const [showSkillsManager, setShowSkillsManager] = useState(false);
  const [showCodeArena, setShowCodeArena] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const approvalResolverRef = useRef<((value: boolean) => void) | null>(null);
  const messageCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const unsubscribe = previewBus.subscribe((request: PreviewRequest) => {
      if (request.type === 'html') {
        const name = request.name || request.path.split('/').pop() || 'preview.html';
        setHtmlPreview({ path: request.path, name });
      } else if (request.type === 'react') {
        const name = request.name || request.path.split('/').pop() || 'App.jsx';
        setReactPreview({ path: request.path, name });
      } else if (request.type === 'component') {
        setPreviewComponentId(request.componentId);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentChat) {
      saveCurrentChat();
    }
  }, [currentChat]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const refreshLocalModelInfo = async () => {
    try {
      const info = await getLocalModelInfo();
      setLocalModelSize(info.exists ? info.size : null);
      setLocalModelStatus(info.exists ? 'ready' : 'missing');
      setLocalModelError(null);
    } catch (error) {
      setLocalModelStatus('error');
      setLocalModelError((error as Error).message);
    }
  };

  const startLocalModelDownload = async () => {
    setLocalModelProgress(0);
    setLocalModelStatus('downloading');
    setLocalModelError(null);
    setShowLocalModelModal(true);

    try {
      await ensureLocalModelReady((progress) => setLocalModelProgress(progress));
      await refreshLocalModelInfo();
    } catch (error) {
      setLocalModelStatus('error');
      setLocalModelError((error as Error).message);
      throw error;
    } finally {
      setShowLocalModelModal(false);
    }
  };

  const handleDeleteLocalModel = async () => {
    Alert.alert(
      'Delete Local Model',
      'This will remove the offline model from your device. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLocalModel();
            await refreshLocalModelInfo();
          },
        },
      ]
    );
  };

  const ensureLocalModelReadyWithUI = async () => {
    const info = await getLocalModelInfo();
    if (info.exists) {
      setLocalModelStatus('ready');
      setLocalModelSize(info.size);
      return;
    }
    await startLocalModelDownload();
  };

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
    const geminiKey = await storage.getGeminiKey();
    setGeminiKey(geminiKey);
    const glmKey = await storage.getGlmKey();
    setGlmKey(glmKey);

    await refreshLocalModelInfo();
    await ensureSampleWebsite();
  };

  const ensureSampleWebsite = async () => {
    try {
      const root = fileManager.getProjectRoot();
      const sampleDir = `${root}/sample`;
      const htmlPath = `${sampleDir}/index.html`;
      const cssPath = `${sampleDir}/styles.css`;
      const jsPath = `${sampleDir}/app.js`;

      const exists = await fileManager.fileExists(htmlPath);
      if (exists) return;

      await fileManager.createFolder(sampleDir);
      await fileManager.writeFile(cssPath, SAMPLE_CSS);
      await fileManager.writeFile(jsPath, SAMPLE_JS);
      await fileManager.writeFile(htmlPath, SAMPLE_HTML);
    } catch (error) {
      // Ignore sample creation failures
    }
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
    if (model === LOCAL_MODEL_ID) {
      const info = await getLocalModelInfo();
      if (!info.exists) {
        await startLocalModelDownload();
      }
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

  const handleAddAttachments = (files: FileNode[]) => {
    if (!files.length) return;
    setAttachedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      const next = [...prev];
      for (const file of files) {
        if (!existing.has(file.path)) {
          next.push(file);
        }
      }
      return next;
    });
  };

  const handleAddImages = (images: ImageAttachment[]) => {
    if (!images.length) return;
    setAttachedImages((prev) => {
      const existing = new Set(prev.map((img) => img.uri));
      const next = [...prev];
      for (const image of images) {
        if (!existing.has(image.uri)) {
          next.push(image);
        }
      }
      return next;
    });
  };

  const removeAttachment = (path: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.path !== path));
  };

  const removeImageAttachment = (uri: string) => {
    setAttachedImages((prev) => prev.filter((image) => image.uri !== uri));
  };

  const buildAttachmentContext = async () => {
    if (attachedFiles.length === 0 && attachedImages.length === 0) return '';
    const maxFileChars = 2000;
    const maxTotalChars = 8000;
    let totalChars = 0;
    const blocks: string[] = [];

    for (const file of attachedFiles) {
      try {
        let content = await fileManager.readFile(file.path);
        let truncated = false;

        if (content.length > maxFileChars) {
          content = content.slice(0, maxFileChars);
          truncated = true;
        }

        if (totalChars + content.length > maxTotalChars) {
          const remaining = maxTotalChars - totalChars;
          if (remaining <= 0) {
            blocks.push(`### ${file.name}\n[omitted: context limit reached]`);
            continue;
          }
          content = content.slice(0, remaining);
          truncated = true;
        }

        totalChars += content.length;
        blocks.push(`### ${file.name}\n${content}${truncated ? '\n... (truncated)' : ''}`);
      } catch (error) {
        blocks.push(`### ${file.name}\n[failed to read file]`);
      }
    }

    if (attachedImages.length > 0) {
      const imageLines = attachedImages.map((img) => {
        const name = img.name || img.uri.split('/').pop() || 'image';
        const size = img.size ? `, ${Math.round(img.size / 1024)} KB` : '';
        const dims = img.width && img.height ? `, ${img.width}x${img.height}` : '';
        return `- ${name}${dims}${size}`;
      });
      blocks.push(`Attached images:\n${imageLines.join('\n')}`);
    }

    return `Attached context:\n${blocks.join('\n\n')}\n\n`;
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo access to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const images: ImageAttachment[] = result.assets.map((asset) => ({
      type: 'image',
      uri: asset.uri,
      name: asset.fileName || asset.uri.split('/').pop() || 'image',
      size: asset.fileSize,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType,
    }));

    handleAddImages(images);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
    setAgentSteps([]);
  };

  const sendMessage = async () => {
    const userInput = inputText.trim();
    if (userInput === '' || !currentChat || isTyping) return;

    console.log('=== USER SEND MESSAGE ===');
    console.log('User Input:', userInput);
    console.log('Selected Model:', selectedModel);
    console.log('Attached Files:', attachedFiles.length);
    console.log('Attached Images:', attachedImages.length);
    console.log('Chat Messages:', currentChat.messages.length);

    const fileAttachments: FileAttachment[] = attachedFiles.map((file) => ({
      type: 'file',
      name: file.name,
      path: file.path,
      size: file.size,
    }));
    const imageAttachments: ImageAttachment[] = attachedImages.map((image) => ({
      ...image,
      type: 'image',
    }));
    const attachments: MessageAttachment[] = [...fileAttachments, ...imageAttachments];

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
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

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    const attachmentContext = await buildAttachmentContext();
    const agentInput = attachmentContext ? `${attachmentContext}User request:\n${userInput}` : userInput;
    setAttachedFiles([]);
    setAttachedImages([]);

    // Always use autonomous agent - AI decides when to use tools
    setAgentSteps([]);

    // Determine which API key to use based on the selected model
    let apiKey: string | undefined;
    let hfApiKey: string | undefined;
    let geminiApiKey: string | undefined;
    if (selectedModel.startsWith('gpt')) {
      apiKey = openAIKey || undefined;
    } else if (selectedModel.startsWith('claude') || selectedModel.startsWith('anthropic')) {
      apiKey = anthropicKey || undefined;
    } else if (selectedModel.startsWith('gemini')) {
      geminiApiKey = geminiKey || undefined;
    } else if (selectedModel.startsWith('glm')) {
      apiKey = glmKey || undefined;
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

    if (selectedModel === LOCAL_MODEL_ID) {
      try {
        await ensureLocalModelReadyWithUI();
      } catch (error) {
        setIsTyping(false);
        Alert.alert('Local Model Error', (error as Error).message || 'Failed to prepare local model.');
        return;
      }
    }

    const historyMessages = updatedMessages
      .slice(0, -1)
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.approval)
      .filter((m) => m.content && !m.id.startsWith('progress-'))
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const result = await autonomousAgent.executeTask(
      agentInput,
      [
        'read_file', 'write_file', 'create_file', 'delete_file', 'list_directory', 'search_files', 'run_command',
        'find_files', 'append_file', 'file_info', 'count_lines', 'list_imports',
        'create_component', 'npm_info', 'npm_install', 'update_package_json', 'init_project',
        'git_init', 'git_status', 'git_add', 'git_commit', 'git_log', 'git_set_remote', 'git_clone', 'git_pull', 'git_push',
        'open_html_preview', 'open_react_preview', 'open_component_preview', 'list_preview_components'
      ],
      async (step, allSteps) => {
        // Progress callback - update task tracker
        // Filter out the 'plan' metadata step - only show actual tool steps
        const toolSteps = allSteps.filter(s => s.tool !== 'plan');
        setAgentSteps(toolSteps);
        setCurrentGoal(toolSteps.length > 0 ? 'Processing tasks...' : inputText.trim());

        // Don't add progress messages to chat - keep it clean
        // Progress is shown in the task tracker badge instead
      },
      async (step) => {
        // Approval callback - show inline approval card in chat
        return new Promise((resolve) => {
          approvalResolverRef.current = resolve;
          const approvalMessageId = `approval-${Date.now()}`;
          const approvalMessage: Message = {
            id: approvalMessageId,
            role: 'assistant',
            content: `Approval required: ${step.tool}`,
            timestamp: new Date(),
            approval: {
              id: step.id,
              description: step.description,
              tool: step.tool,
              parameters: step.parameters,
              status: 'pending',
            },
          };
          setCurrentChat((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              messages: [...prev.messages, approvalMessage],
              updatedAt: new Date(),
            };
          });
        });
      },
      selectedModel,
      customModels,
      apiKey,
      hfApiKey,
      geminiApiKey,
      handleStream, // Pass the streaming callback
      historyMessages
    );

    console.log('=== AGENT EXECUTION COMPLETE ===');
    console.log('Success:', result.success);
    console.log('Steps completed:', result.stepsCompleted);
    console.log('Steps failed:', result.stepsFailed);
    console.log('Final output length:', result.finalOutput?.length || 0);
    console.log('Final output preview:', result.finalOutput?.substring(0, 300) || 'No output');
    console.log('Has conversational response:', !!result.plan?.conversationalResponse);
    console.log('Has tool steps:', result.plan?.steps?.length || 0);

    // Clear agent steps after completion
    setAgentSteps([]);

    // Store the goal for task tracker
    if (result.plan?.goal) {
      setCurrentGoal(result.plan.goal);
    }

    // Ensure we have at least one response if nothing was streamed (fallback)
    if (!streamingMessageIdRef.current && !result.plan?.steps.length) {
      const finalContent = result.plan?.conversationalResponse || result.finalOutput || 'Done!';
      console.log('Creating fallback message, content length:', finalContent.length);
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

    console.log('=== SEND MESSAGE COMPLETE ===');
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

  const handleInlineApproval = (messageId: string, approved: boolean) => {
    setCurrentChat((prev) => {
      if (!prev) return null;
      const messages = prev.messages.map((message) => {
        if (message.id !== messageId || !message.approval) return message;
        return {
          ...message,
          approval: { ...message.approval, status: approved ? 'approved' : 'denied' },
        };
      });
      return { ...prev, messages, updatedAt: new Date() };
    });

    if (approvalResolverRef.current) {
      approvalResolverRef.current(approved);
      approvalResolverRef.current = null;
    }
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header - fixed at top */}
      <SafeAreaView style={styles.headerContainer} edges={['top']}>
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
            <TouchableOpacity onPress={() => setShowSkillsManager(true)} style={styles.headerButton}>
              <Ionicons name="library-outline" size={24} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCodeArena(true)} style={styles.headerButton}>
              <Ionicons name="git-compare" size={24} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTaskTracker(true)} style={styles.headerButton}>
              <Ionicons name="list-outline" size={24} color={agentSteps.length > 0 ? theme.accent : theme.text} />
              {agentSteps.length > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{agentSteps.filter(s => s.status !== 'completed').length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowGitPanel(true)} style={styles.headerButton}>
              <Ionicons name="logo-github" size={24} color={theme.text} />
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
      </SafeAreaView>

      {/* Main content area - flex:1 allows it to shrink when keyboard appears */}
      <View style={styles.contentArea}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {currentChat?.messages.map((message) => (
            <View key={message.id}>
              <MessageBubble
                message={message}
                styles={styles}
                theme={theme}
                onApprovalAction={handleInlineApproval}
              />
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

        <View style={styles.bottomBar}>
          {(attachedFiles.length > 0 || attachedImages.length > 0) && (
            <ScrollView horizontal style={styles.attachmentsScroll} contentContainerStyle={styles.attachmentsScrollContent}>
              {attachedFiles.map((file) => (
                <View key={file.path} style={styles.attachmentPill}>
                  <Ionicons name="document-text-outline" size={11} color={theme.textSecondary} />
                  <Text style={styles.attachmentText} numberOfLines={1}>{file.name}</Text>
                  <TouchableOpacity onPress={() => removeAttachment(file.path)} style={styles.attachmentRemove}>
                    <Ionicons name="close" size={11} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
              {attachedImages.map((image) => (
                <View key={image.uri} style={styles.attachmentImageWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.attachmentImage} />
                  <TouchableOpacity onPress={() => removeImageAttachment(image.uri)} style={styles.attachmentImageRemove}>
                    <Ionicons name="close" size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setShowModelPicker(true)} style={styles.modelIconButton}>
              <Ionicons name="sparkles" size={16} color={theme.accent} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowAttachmentPicker(true)} style={styles.iconButtonSmall}>
              <Ionicons name="attach" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImages} style={styles.iconButtonSmall}>
              <Ionicons name="image-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.compactInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask anything..."
              placeholderTextColor={theme.placeholder}
              multiline
              maxLength={4000}
              textAlignVertical="top"
              autoCapitalize="sentences"
              autoCorrect
              enablesReturnKeyAutomatically
              keyboardAppearance={isDarkMode ? 'dark' : 'light'}
              editable={!isTyping}
            />

            <View style={styles.inputActions}>
              {isTyping ? (
                <TouchableOpacity
                  onPress={stopGeneration}
                  style={[styles.sendButtonCompact, styles.stopButton]}
                >
                  <Ionicons name="stop" size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={sendMessage}
                  style={[styles.sendButtonCompact, inputText.trim() === '' && styles.sendButtonDisabled]}
                  disabled={inputText.trim() === ''}
                >
                  <Ionicons name="arrow-up" size={18} color={inputText.trim() ? '#fff' : theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Compact model picker modal */}
      <Modal visible={showModelPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowModelPicker(false)} />
          <View style={styles.compactPickerContent}>
            <Text style={styles.pickerTitle}>Select Model</Text>
            <ScrollView style={styles.pickerList}>
              {AI_MODELS.filter(m => LOCAL_MODEL_AVAILABLE || m.id !== LOCAL_MODEL_ID).map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[styles.pickerOption, selectedModel === model.id && styles.pickerOptionSelected]}
                  onPress={() => { handleModelChange(model.id); setShowModelPicker(false); }}
                >
                  <Ionicons name={model.icon as any} size={18} color={selectedModel === model.id ? theme.accent : theme.text} />
                  <View style={styles.pickerOptionText}>
                    <Text style={[styles.pickerName, selectedModel === model.id && { color: theme.accent }]}>{model.name}</Text>
                    <Text style={styles.pickerDesc}>{model.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {customModels.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[styles.pickerOption, selectedModel === model.id && styles.pickerOptionSelected]}
                  onPress={() => { handleModelChange(model.id); setShowModelPicker(false); }}
                >
                  <Ionicons name="key" size={18} color={selectedModel === model.id ? theme.accent : theme.text} />
                  <View style={styles.pickerOptionText}>
                    <Text style={[styles.pickerName, selectedModel === model.id && { color: theme.accent }]}>{model.name}</Text>
                    <Text style={styles.pickerDesc}>Custom model</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showLocalModelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModalContent}>
            <Text style={styles.modalTitle}>Downloading Local Model</Text>
            <Text style={styles.settingValue}>This is a one-time download and may take a few minutes.</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(localModelProgress * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>{Math.round(localModelProgress * 100)}%</Text>
          </View>
        </View>
      </Modal>

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

      {htmlPreview && (
        <HTMLPreview
          visible={!!htmlPreview}
          filePath={htmlPreview.path}
          fileName={htmlPreview.name}
          onClose={() => setHtmlPreview(null)}
        />
      )}

      {reactPreview && (
        <ReactPreview
          visible={!!reactPreview}
          filePath={reactPreview.path}
          fileName={reactPreview.name}
          onClose={() => setReactPreview(null)}
        />
      )}

      {previewComponentId && (
        <ComponentPreview
          visible={!!previewComponentId}
          onClose={() => setPreviewComponentId(null)}
          componentId={previewComponentId}
        />
      )}

      <FileSearch
        visible={showFileSearch}
        onClose={() => setShowFileSearch(false)}
        onResultSelect={(file, line) => {
          setShowFileSearch(false);
          Alert.alert('File Selected', `Selected ${file.name}${line ? ` at line ${line}` : ''}`);
        }}
      />

      <FileAttachmentPicker
        visible={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        onConfirm={(files) => {
          handleAddAttachments(files);
          setShowAttachmentPicker(false);
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

      <TaskTracker
        visible={showTaskTracker}
        onClose={() => setShowTaskTracker(false)}
        steps={agentSteps}
        goal={currentGoal || 'No active task'}
      />

      <GitPanel
        visible={showGitPanel}
        onClose={() => setShowGitPanel(false)}
      />

      <ToolsHelp
        visible={showToolsHelp}
        onClose={() => setShowToolsHelp(false)}
      />

      <SkillsManager
        visible={showSkillsManager}
        onClose={() => setShowSkillsManager(false)}
      />

      <CodeArena
        visible={showCodeArena}
        onClose={() => setShowCodeArena(false)}
        customModels={customModels}
        openAIKey={openAIKey}
        anthropicKey={anthropicKey}
        geminiKey={geminiKey}
        glmKey={glmKey}
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
                <Text style={styles.sectionTitle}>Google Gemini API</Text>
                <View style={styles.settingItem}>
                  <Ionicons name="key" size={20} color={theme.accent} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Gemini API Key</Text>
                    <Text style={styles.settingValue}>
                      {geminiKey ? '••••' + geminiKey.slice(-4) : 'Not set'}
                    </Text>
                  </View>
                </View>
                <View style={styles.apiInputContainer}>
                  <TextInput
                    style={styles.apiInput}
                    value={geminiKey}
                    onChangeText={setGeminiKey}
                    placeholder="AIza..."
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={async () => {
                      await storage.setGeminiKey(geminiKey);
                      Alert.alert('Success', 'Gemini API key saved');
                    }}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.sectionTitle}>Zhipu GLM API</Text>
                <View style={styles.settingItem}>
                  <Ionicons name="code-slash" size={20} color={theme.accent} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>GLM API Key</Text>
                    <Text style={styles.settingValue}>
                      {glmKey ? '••••' + glmKey.slice(-4) : 'Not set'}
                    </Text>
                  </View>
                </View>
                <View style={styles.apiInputContainer}>
                  <TextInput
                    style={styles.apiInput}
                    value={glmKey}
                    onChangeText={setGlmKey}
                    placeholder="Your Zhipu AI API key"
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={async () => {
                      await storage.setGlmKey(glmKey);
                      Alert.alert('Success', 'GLM API key saved');
                    }}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Local Model</Text>
                </View>
                <View style={styles.settingItem}>
                  <Ionicons name="phone-portrait" size={20} color={theme.accent} />
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{LOCAL_MODEL_NAME}</Text>
                    <Text style={styles.settingValue}>
                      {localModelStatus === 'ready'
                        ? `Downloaded${localModelSize ? ` • ${formatBytes(localModelSize)}` : ''}`
                        : localModelStatus === 'downloading'
                          ? `Downloading... ${Math.round(localModelProgress * 100)}%`
                          : localModelStatus === 'error'
                            ? `Error: ${localModelError || 'Unknown error'}`
                            : 'Not downloaded'}
                    </Text>
                  </View>
                  {localModelStatus === 'ready' && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                  )}
                </View>

                {localModelStatus === 'downloading' && (
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(localModelProgress * 100)}%` },
                      ]}
                    />
                  </View>
                )}

                <View style={[styles.formButtons, { marginTop: 10 }]}>
                  {localModelStatus === 'ready' ? (
                    <TouchableOpacity
                      style={[styles.saveButton, styles.cancelButton]}
                      onPress={handleDeleteLocalModel}
                    >
                      <Text style={styles.saveButtonText}>Delete Model</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={startLocalModelDownload}
                      disabled={localModelStatus === 'downloading'}
                    >
                      <Text style={styles.saveButtonText}>
                        {localModelStatus === 'downloading' ? 'Downloading…' : 'Download Model'}
                      </Text>
                    </TouchableOpacity>
                  )}
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
    </KeyboardAvoidingView>
  );
}

function MessageBubble({
  message,
  styles,
  theme,
  onApprovalAction,
}: {
  message: Message;
  styles: any;
  theme: Theme;
  onApprovalAction: (messageId: string, approved: boolean) => void;
}) {
  const isUser = message.role === 'user';
  const isApproval = !!message.approval;

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
        <Text style={styles.senderName}>{isUser ? 'You' : 'Mobcode'}</Text>
        {isApproval ? (
          <ApprovalInlineCard
            approval={message.approval!}
            theme={theme}
            styles={styles}
            onApprove={() => onApprovalAction(message.id, true)}
            onDeny={() => onApprovalAction(message.id, false)}
          />
        ) : (
          <>
            {isUser ? (
              <Text style={styles.messageContent}>{message.content}</Text>
            ) : (
              <MessageContent content={message.content} theme={theme} styles={styles} />
            )}
            {message.attachments && message.attachments.length > 0 && (
              <View style={styles.messageAttachments}>
                {message.attachments
                  .filter((att) => att.type === 'file')
                  .map((att) => (
                    <View key={(att as FileAttachment).path} style={styles.messageAttachmentPill}>
                      <Ionicons name="document-text-outline" size={11} color={theme.textSecondary} />
                      <Text style={styles.messageAttachmentText} numberOfLines={1}>
                        {(att as FileAttachment).name}
                      </Text>
                    </View>
                  ))}
                {message.attachments
                  .filter((att) => att.type === 'image')
                  .map((att) => (
                    <Image
                      key={(att as ImageAttachment).uri}
                      source={{ uri: (att as ImageAttachment).uri }}
                      style={styles.messageAttachmentImage}
                    />
                  ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function ApprovalInlineCard({
  approval,
  theme,
  styles,
  onApprove,
  onDeny,
}: {
  approval: NonNullable<Message['approval']>;
  theme: Theme;
  styles: any;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const getToolIcon = (toolName: string) => {
    if (toolName.includes('file')) return 'document-text';
    if (toolName.includes('command') || toolName.includes('run')) return 'terminal';
    if (toolName.includes('search')) return 'search';
    if (toolName.includes('create') || toolName.includes('write')) return 'add-circle';
    if (toolName.includes('delete') || toolName.includes('remove')) return 'trash';
    if (toolName.includes('list') || toolName.includes('directory')) return 'folder';
    if (toolName.includes('npm') || toolName.includes('package')) return 'cube';
    if (toolName.startsWith('git_')) return 'logo-github';
    return 'flash';
  };

  const getToolDisplayName = (toolName: string) => {
    const nameMap: Record<string, string> = {
      'read_file': '📂 Reading file',
      'write_file': '✍️ Writing file',
      'create_file': '📝 Creating file',
      'delete_file': '🗑️ Deleting file',
      'list_directory': '📋 Listing folder',
      'search_files': '🔍 Searching files',
      'run_command': '⚡ Running command',
      'find_files': '🔎 Finding files',
      'append_file': '📎 Appending to file',
      'file_info': 'ℹ️ Getting file info',
      'count_lines': '📊 Counting lines',
      'list_imports': '📦 Listing imports',
      'create_component': '🧩 Creating component',
      'npm_info': '📦 Getting package info',
      'npm_install': '⬇️ Installing packages',
      'update_package_json': '📦 Updating package.json',
      'init_project': '🚀 Initializing project',
      'git_init': '🔧 Initializing git',
      'git_status': '📊 Git status',
      'git_add': '➕ Adding to git',
      'git_commit': '💾 Committing',
      'git_log': '📜 Git log',
      'git_set_remote': '🌐 Setting remote',
      'git_clone': '📥 Cloning repo',
      'git_pull': '⬇️ Pulling changes',
      'git_push': '⬆️ Pushing changes',
    };
    return nameMap[toolName] || `🔧 ${toolName}`;
  };

  const getRiskLevel = (toolName: string) => {
    const highRisk = ['write_file', 'delete_file', 'run_command', 'create_file', 'git_init', 'git_commit', 'git_set_remote', 'git_clone', 'git_pull', 'git_push'];
    const mediumRisk = ['update_package_json', 'init_project', 'npm_install'];

    if (highRisk.includes(toolName)) return { level: 'high', color: theme.error, icon: 'warning' };
    if (mediumRisk.includes(toolName)) return { level: 'medium', color: theme.warning, icon: 'alert-circle' };
    return { level: 'low', color: theme.success, icon: 'checkmark-circle' };
  };

  const risk = getRiskLevel(approval.tool);
  const isPending = approval.status === 'pending';

  return (
    <View style={styles.approvalCard}>
      <View style={styles.approvalHeader}>
        <View style={styles.approvalHeaderLeft}>
          <Ionicons name={getToolIcon(approval.tool)} size={16} color={theme.accent} />
          <Text style={styles.approvalTitle}>Approval Required</Text>
        </View>
        <View style={[styles.approvalBadge, { backgroundColor: `${risk.color}15` }]}>
          <Ionicons name={risk.icon} size={12} color={risk.color} />
          <Text style={[styles.approvalBadgeText, { color: risk.color }]}>
            {risk.level.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.approvalDescription}>{approval.description}</Text>

      <View style={styles.approvalToolRow}>
        <Ionicons name={getToolIcon(approval.tool)} size={12} color={theme.accent} />
        <Text style={styles.approvalToolText}>{getToolDisplayName(approval.tool)}</Text>
      </View>

      {isPending ? (
        <View style={styles.approvalActions}>
          <TouchableOpacity style={styles.approvalDenyButton} onPress={onDeny}>
            <Ionicons name="close-circle" size={16} color={theme.error} />
            <Text style={styles.approvalDenyText}>Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approvalApproveButton} onPress={onApprove}>
            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
            <Text style={styles.approvalApproveText}>Allow</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.approvalResult}>
          <Ionicons
            name={approval.status === 'approved' ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={approval.status === 'approved' ? theme.success : theme.error}
          />
          <Text
            style={[
              styles.approvalResultText,
              { color: approval.status === 'approved' ? theme.success : theme.error },
            ]}
          >
            {approval.status === 'approved' ? 'Approved' : 'Denied'}
          </Text>
        </View>
      )}
    </View>
  );
}

function TypingIndicator({ styles, theme }: { styles: any; theme: Theme }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Animated values for each dot
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulsate = (animatedValue: Animated.Value, delay: number) => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => pulsate(animatedValue, delay));
    };

    pulsate(dot1Anim, 0);
    pulsate(dot2Anim, 150);
    pulsate(dot3Anim, 300);
  }, []);

  const dotScale = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
  });

  return (
    <View style={styles.messageRow}>
      <View style={styles.avatarContainer}>
        <Ionicons name="sparkles" size={20} color={theme.accent} />
      </View>
      <View style={styles.messageContentWrapper}>
        <View style={styles.typingHeader}>
          <Text style={styles.senderName}>Cursor</Text>
          <Text style={styles.typingTimer}>Thinking... {formatTime(elapsed)}</Text>
        </View>
        <View style={styles.typingIndicator}>
          <Animated.View style={[styles.typingDot, styles.typingDot1, dotScale(dot1Anim)]} />
          <Animated.View style={[styles.typingDot, styles.typingDot2, dotScale(dot2Anim)]} />
          <Animated.View style={[styles.typingDot, styles.typingDot3, dotScale(dot3Anim)]} />
        </View>
      </View>
    </View>
  );
}

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mobcode Starter</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="page">
      <header class="hero">
        <div class="badge">Sample Site</div>
        <h1>Mobcode Starter</h1>
        <p class="sub">
          Edit <strong>index.html</strong>, <strong>styles.css</strong>, and
          <strong>app.js</strong> to see changes instantly.
        </p>
        <div class="actions">
          <button id="cta">Add a star</button>
          <button id="themeToggle" class="ghost">Toggle accent</button>
        </div>
      </header>

      <section class="grid">
        <article class="card">
          <h3>Clean HTML</h3>
          <p>Structured sections with readable markup.</p>
        </article>
        <article class="card">
          <h3>Modern CSS</h3>
          <p>Gradient background, cards, and shadows.</p>
        </article>
        <article class="card">
          <h3>Small JS</h3>
          <p>One file powering tiny interactions.</p>
        </article>
      </section>

      <section class="stats">
        <div class="stat">
          <span id="stars">0</span>
          <label>Stars</label>
        </div>
        <div class="stat">
          <span id="files">3</span>
          <label>Files</label>
        </div>
        <div class="stat">
          <span id="size">Small</span>
          <label>Footprint</label>
        </div>
      </section>

      <footer>
        Generated on <span id="date">today</span>.
      </footer>
    </div>
    <script src="app.js"></script>
  </body>
</html>
`;

const SAMPLE_CSS = `:root {
  --bg: #0f1218;
  --surface: #141a23;
  --card: #1a2230;
  --text: #f4f6fb;
  --muted: #9fb0c7;
  --accent: #ff6b3d;
  --accent-soft: rgba(255, 107, 61, 0.18);
  --ring: rgba(255, 255, 255, 0.06);
  --shadow: 0 12px 30px rgba(8, 12, 20, 0.45);
  --radius: 18px;
}

body.accent-alt {
  --accent: #1f8cff;
  --accent-soft: rgba(31, 140, 255, 0.2);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at top, rgba(255, 107, 61, 0.2), transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(31, 140, 255, 0.16), transparent 45%),
    var(--bg);
  min-height: 100vh;
}

.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 56px 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hero {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 32px;
  box-shadow: var(--shadow);
  border: 1px solid var(--ring);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

h1 {
  margin: 16px 0 8px;
  font-size: clamp(28px, 4vw, 44px);
}

.sub {
  margin: 0;
  color: var(--muted);
  max-width: 560px;
  line-height: 1.6;
}

.actions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

button {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  font-weight: 600;
  cursor: pointer;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.3);
}

button.ghost {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--ring);
  box-shadow: none;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 20px;
  border: 1px solid var(--ring);
}

.card h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.card p {
  margin: 0;
  color: var(--muted);
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.stat {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 18px;
  border: 1px solid var(--ring);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat span {
  font-size: 22px;
  font-weight: 700;
}

.stat label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

footer {
  color: var(--muted);
  font-size: 12px;
}
`;

const SAMPLE_JS = `const starsEl = document.getElementById('stars');
const dateEl = document.getElementById('date');
const button = document.getElementById('cta');
const toggle = document.getElementById('themeToggle');

let stars = Number(localStorage.getItem('stars') || 0);

const updateStars = () => {
  starsEl.textContent = String(stars);
  localStorage.setItem('stars', String(stars));
};

updateStars();
dateEl.textContent = new Date().toLocaleDateString();

button.addEventListener('click', () => {
  stars += 1;
  updateStars();
});

toggle.addEventListener('click', () => {
  document.body.classList.toggle('accent-alt');
});
`;

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  headerContainer: {
    backgroundColor: theme.surface,
  },
  contentArea: {
    flex: 1,
    flexDirection: 'column',
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
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  bottomBar: {
    padding: 8,
    paddingBottom: 12,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  messagesScroll: {
    flex: 1,
  },
  attachmentsScroll: {
    maxHeight: 32,
    marginBottom: 6,
  },
  attachmentsScrollContent: {
    paddingHorizontal: 4,
    gap: 6,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  modelRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  gitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  gitButtonText: {
    fontSize: 12,
    color: theme.text,
    fontWeight: '500',
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  attachButtonText: {
    fontSize: 12,
    color: theme.text,
    fontWeight: '500',
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 6,
  },
  // New compact input styles
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.inputBackground,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  modelIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${theme.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSmall: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    maxHeight: 100,
    minHeight: 32,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sendButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  taskBadgeSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.accent,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Model picker modal styles
  compactPickerContent: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 320,
    maxHeight: 400,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  pickerList: {
    maxHeight: 350,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 12,
    minHeight: 50,
  },
  pickerOptionSelected: {
    backgroundColor: `${theme.accent}10`,
  },
  pickerOptionText: {
    flex: 1,
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 2,
  },
  pickerDesc: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  attachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    backgroundColor: theme.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  attachmentText: {
    fontSize: 12,
    color: theme.text,
    maxWidth: 140,
  },
  attachmentRemove: {
    padding: 2,
  },
  attachmentImageWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    position: 'relative',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  attachmentImageRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAttachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  messageAttachmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.inputBackground,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  messageAttachmentText: {
    fontSize: 11,
    color: theme.textSecondary,
    maxWidth: 180,
  },
  messageAttachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
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
  approvalCard: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 10,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  approvalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  approvalDescription: {
    fontSize: 13,
    color: theme.text,
    lineHeight: 18,
  },
  approvalToolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approvalToolText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  approvalParams: {
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  approvalParamRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  approvalParamKey: {
    fontSize: 12,
    color: theme.accent,
    minWidth: 80,
  },
  approvalParamValue: {
    flex: 1,
    fontSize: 12,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approvalDenyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${theme.error}40`,
    backgroundColor: `${theme.error}15`,
  },
  approvalDenyText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.error,
  },
  approvalApproveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: `${theme.success}20`,
    borderWidth: 1,
    borderColor: `${theme.success}50`,
  },
  approvalApproveText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.success,
  },
  approvalResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvalResultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  typingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typingTimer: {
    fontSize: 11,
    color: theme.textSecondary,
    fontStyle: 'italic',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.textSecondary,
  },
  typingDot1: {},
  typingDot2: {},
  typingDot3: {},

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
  downloadModalContent: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
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
  progressBar: {
    height: 6,
    backgroundColor: theme.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: 6,
    backgroundColor: theme.accent,
  },
  progressLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'right',
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
