import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { aiService, AIMessage } from '../utils/aiService';
import { AI_MODELS } from '../constants/Models';
import { CustomModel, storage } from '../utils/storage';

interface CodeArenaProps {
    visible: boolean;
    onClose: () => void;
    customModels: CustomModel[];
    openAIKey?: string;
    anthropicKey?: string;
    geminiKey?: string;
    glmKey?: string;
    openRouterKey?: string;
}

interface ModelResponse {
    content: string;
    isLoading: boolean;
    error?: string;
    startTime?: number;
    endTime?: number;
}

export function CodeArena({
    visible,
    onClose,
    customModels,
    openAIKey,
    anthropicKey,
    geminiKey,
    glmKey,
    openRouterKey,
}: CodeArenaProps) {
    const { theme, isDarkMode } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [modelA, setModelA] = useState('gemini-2.5-flash');
    const [modelB, setModelB] = useState('glm-4.7-coder');
    const [inputText, setInputText] = useState('');
    const [showModelPickerA, setShowModelPickerA] = useState(false);
    const [showModelPickerB, setShowModelPickerB] = useState(false);
    const [remoteModels, setRemoteModels] = useState<any[]>([]);
    const [isRefreshingModels, setIsRefreshingModels] = useState(false);

    // Load cached models
    React.useEffect(() => {
        loadRemoteModels();
    }, []);

    const loadRemoteModels = async () => {
        const cached = await storage.getOpenRouterModels();
        if (cached && cached.length > 0) {
            setRemoteModels(cached);
        } else if (openRouterKey) {
            // Auto-fetch if no cache but key exists
            refreshRemoteModels();
        }
    };

    const refreshRemoteModels = async () => {
        if (!openRouterKey || isRefreshingModels) return;
        setIsRefreshingModels(true);
        try {
            const models = await aiService.fetchOpenRouterModels(openRouterKey);
            if (models.length > 0) {
                // Map to our format if needed, OpenRouter returns { id, name, ... }
                // We just keep them raw and map in allModels
                const mapped = models.map((m: any) => ({
                    id: `openrouter/${m.id}`, // Prefix to avoid collisions
                    name: m.name || m.id,
                    description: m.description || 'OpenRouter Model',
                    icon: 'cloud-outline',
                    provider: 'OpenRouter'
                }));
                await storage.setOpenRouterModels(mapped);
                setRemoteModels(mapped);
            }
        } catch (e) {
            console.error('Failed to refresh models', e);
        } finally {
            setIsRefreshingModels(false);
        }
    };

    const [responseA, setResponseA] = useState<ModelResponse>({ content: '', isLoading: false });
    const [responseB, setResponseB] = useState<ModelResponse>({ content: '', isLoading: false });

    const scrollRefA = useRef<ScrollView | null>(null);
    const scrollRefB = useRef<ScrollView | null>(null);

    const allModels = [
        ...AI_MODELS.filter(m => m.id !== 'local-llama'),
        ...customModels.map(m => ({ id: m.id, name: m.name, description: 'Custom model', icon: 'key' })),
        ...remoteModels,
    ];

    const getApiKey = (model: string) => {
        if (model.startsWith('gpt')) return openAIKey;
        if (model.startsWith('claude') || model.startsWith('anthropic')) return anthropicKey;
        if (model.startsWith('gemini')) return geminiKey;
        if (model.startsWith('glm')) return glmKey;
        if (model.startsWith('openrouter')) return openRouterKey;
        return undefined;
    };

    const sendToModel = async (
        model: string,
        prompt: string,
        setResponse: React.Dispatch<React.SetStateAction<ModelResponse>>,
        scrollRef: React.RefObject<ScrollView | null>
    ) => {
        const startTime = Date.now();
        setResponse({ content: '', isLoading: true, startTime });

        const messages: AIMessage[] = [
            { role: 'system', content: 'You are a helpful coding assistant. Be concise and provide clean code.' },
            { role: 'user', content: prompt },
        ];

        const apiKey = getApiKey(model);
        let geminiApiKey: string | undefined;
        if (model.startsWith('gemini')) {
            geminiApiKey = geminiKey;
        }

        try {
            await aiService.streamChat(
                messages,
                model,
                customModels,
                apiKey,
                (token) => {
                    setResponse(prev => ({
                        ...prev,
                        content: prev.content + token,
                    }));
                    scrollRef.current?.scrollToEnd({ animated: false });
                },
                undefined,
                geminiApiKey
            );

            setResponse(prev => ({
                ...prev,
                isLoading: false,
                endTime: Date.now(),
            }));
        } catch (error) {
            setResponse(prev => ({
                ...prev,
                isLoading: false,
                error: (error as Error).message,
                endTime: Date.now(),
            }));
        }
    };

    const handleSend = () => {
        if (!inputText.trim()) return;

        // Send to both models in parallel
        sendToModel(modelA, inputText, setResponseA, scrollRefA);
        sendToModel(modelB, inputText, setResponseB, scrollRefB);
    };

    const formatTime = (response: ModelResponse) => {
        if (!response.startTime) return '';
        const endTime = response.endTime || Date.now();
        const seconds = ((endTime - response.startTime) / 1000).toFixed(1);
        return `${seconds}s`;
    };

    const getModelName = (modelId: string) => {
        const model = allModels.find(m => m.id === modelId);
        return model?.name || modelId;
    };

    const renderModelPicker = (
        currentModel: string,
        onSelect: (model: string) => void,
        showPicker: boolean,
        setShowPicker: (show: boolean) => void,
        label: string
    ) => (
        <View style={styles.modelSelector}>
            <Text style={styles.modelLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.modelButton}
                onPress={() => setShowPicker(true)}
            >
                <Text style={styles.modelButtonText} numberOfLines={1}>
                    {getModelName(currentModel)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <Modal visible={showPicker} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPicker(false)}
                >
                    <View style={styles.pickerContent}>
                        <View style={styles.pickerContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={styles.pickerTitle}>Select {label}</Text>
                                {openRouterKey && (
                                    <TouchableOpacity onPress={refreshRemoteModels} disabled={isRefreshingModels}>
                                        {isRefreshingModels ?
                                            <ActivityIndicator size="small" color={theme.accent} /> :
                                            <Ionicons name="refresh" size={20} color={theme.textSecondary} />
                                        }
                                    </TouchableOpacity>
                                )}
                            </View>
                            <ScrollView style={styles.pickerList}>
                                {allModels.map(model => (
                                    <TouchableOpacity
                                        key={model.id}
                                        style={[
                                            styles.pickerOption,
                                            currentModel === model.id && styles.pickerOptionSelected,
                                        ]}
                                        onPress={() => {
                                            onSelect(model.id);
                                            setShowPicker(false);
                                        }}
                                    >
                                        <Ionicons
                                            name={model.icon as any}
                                            size={18}
                                            color={currentModel === model.id ? theme.accent : theme.text}
                                        />
                                        <Text
                                            style={[
                                                styles.pickerOptionText,
                                                currentModel === model.id && { color: theme.accent },
                                            ]}
                                        >
                                            {model.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );

    const renderResponsePanel = (
        response: ModelResponse,
        modelId: string,
        scrollRef: React.RefObject<ScrollView | null>,
        isLeft: boolean
    ) => (
        <View style={[styles.responsePanel, isLeft ? styles.leftPanel : styles.rightPanel]}>
            <View style={styles.panelHeader}>
                <Text style={styles.panelTitle} numberOfLines={1}>
                    {getModelName(modelId)}
                </Text>
                {response.isLoading ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                ) : response.startTime ? (
                    <Text style={styles.timeText}>{formatTime(response)}</Text>
                ) : null}
            </View>
            <ScrollView
                ref={scrollRef}
                style={styles.responseScroll}
                contentContainerStyle={styles.responseContent}
            >
                {response.error ? (
                    <Text style={styles.errorText}>{response.error}</Text>
                ) : response.content ? (
                    <Text style={styles.responseText}>{response.content}</Text>
                ) : !response.isLoading ? (
                    <Text style={styles.placeholder}>Response will appear here</Text>
                ) : null}
            </ScrollView>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="git-compare" size={24} color={theme.accent} />
                        <Text style={styles.headerTitle}>CodeArena</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Model Selectors */}
                <View style={styles.modelRow}>
                    {renderModelPicker(modelA, setModelA, showModelPickerA, setShowModelPickerA, 'Model A')}
                    <Text style={styles.vsText}>vs</Text>
                    {renderModelPicker(modelB, setModelB, showModelPickerB, setShowModelPickerB, 'Model B')}
                </View>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Enter your prompt..."
                        placeholderTextColor={theme.placeholder}
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || responseA.isLoading || responseB.isLoading}
                    >
                        <Ionicons
                            name="play"
                            size={20}
                            color={inputText.trim() ? '#fff' : theme.textSecondary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Response Panels */}
                <View style={styles.responsesContainer}>
                    {renderResponsePanel(responseA, modelA, scrollRefA, true)}
                    <View style={styles.divider} />
                    {renderResponsePanel(responseB, modelB, scrollRefB, false)}
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            paddingTop: 50,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        headerLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: theme.text,
        },
        closeButton: {
            padding: 8,
        },
        modelRow: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            gap: 8,
        },
        modelSelector: {
            flex: 1,
        },
        modelLabel: {
            fontSize: 12,
            color: theme.textSecondary,
            marginBottom: 4,
        },
        modelButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.surface,
            padding: 10,
            paddingHorizontal: 12,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: theme.border,
        },
        modelButtonText: {
            fontSize: 14,
            color: theme.text,
            flex: 1,
        },
        vsText: {
            fontSize: 10,
            fontWeight: '900',
            color: theme.textSecondary,
            marginTop: 18,
            textTransform: 'uppercase',
            opacity: 0.5,
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            padding: 12,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        input: {
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 12,
            padding: 12,
            fontSize: 14,
            color: theme.text,
            maxHeight: 100,
            borderWidth: 1,
            borderColor: theme.border,
        },
        sendButton: {
            backgroundColor: theme.accent,
            width: 40,
            height: 40,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        sendButtonDisabled: {
            backgroundColor: theme.surface,
        },
        responsesContainer: {
            flex: 1,
            flexDirection: 'row',
        },
        responsePanel: {
            flex: 1,
        },
        leftPanel: {
            borderRightWidth: 0.5,
            borderRightColor: theme.border,
        },
        rightPanel: {
            borderLeftWidth: 0.5,
            borderLeftColor: theme.border,
        },
        panelHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: theme.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
        },
        panelTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.text,
            flex: 1,
        },
        timeText: {
            fontSize: 12,
            color: theme.accent,
            fontWeight: '600',
        },
        responseScroll: {
            flex: 1,
        },
        responseContent: {
            padding: 12,
        },
        placeholder: {
            fontSize: 14,
            color: theme.textSecondary,
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 40,
        },
        errorText: {
            fontSize: 14,
            color: theme.error,
        },
        responseText: {
            fontSize: 14,
            color: theme.text,
            lineHeight: 20,
        },
        divider: {
            width: 1,
            backgroundColor: theme.border,
        },
        pickerOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        pickerContent: {
            backgroundColor: theme.surface,
            borderRadius: 12,
            padding: 16,
            width: '80%',
            maxHeight: '60%',
        },
        pickerTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.text,
            marginBottom: 12,
        },
        pickerList: {
            maxHeight: 300,
        },
        pickerOption: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            borderRadius: 8,
            gap: 10,
        },
        pickerOptionSelected: {
            backgroundColor: theme.accent + '20',
        },
        pickerOptionText: {
            fontSize: 14,
            color: theme.text,
        },
    });
