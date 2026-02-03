import { aiService, AIMessage } from './aiService';
import { toolRegistry, ToolResult } from './toolRegistry';

export interface AgentStep {
  id: string;
  description: string;
  tool: string;
  parameters: any;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
  result?: ToolResult;
  error?: string;
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  steps: AgentStep[];
  estimatedSteps: number;
  requiresApproval: string[];
  conversationalResponse?: string; // For simple chat responses without tools
}

class AutonomousAgent {
  async executeTask(
    userRequest: string,
    availableTools: string[],
    onProgress: (step: AgentStep, allSteps: AgentStep[]) => void,
    onApprovalNeeded: (step: AgentStep) => Promise<boolean>,
    model: string = 'claude-3.5-sonnet',
    customModels: any[] = [],
    apiKey?: string,
    hfApiKey?: string,
    geminiApiKey?: string,
    onStream?: (token: string) => void,
    history: AIMessage[] = []
  ) {
    const plan = await this.createPlan(
      userRequest,
      availableTools,
      model,
      customModels,
      apiKey,
      hfApiKey,
      geminiApiKey,
      onStream,
      history
    );
    onProgress({
      id: 'plan',
      description: `Plan: ${plan.steps.length} steps`,
      tool: 'plan',
      parameters: {},
      status: 'completed',
    }, plan.steps);

    if (plan.steps.length === 0 && plan.conversationalResponse) {
      return {
        success: true,
        plan,
        finalOutput: plan.conversationalResponse,
        stepsCompleted: 0,
        stepsFailed: 0,
      };
    }

    let completed = 0, failed = 0;

    for (const step of plan.steps) {
      if (plan.requiresApproval.includes(step.id)) {
        const approved = await onApprovalNeeded(step);
        if (!approved) {
          step.status = 'failed';
          failed++;
          onProgress(step, plan.steps);
          continue;
        }
      }

      step.status = 'executing';
      onProgress(step, plan.steps);

      try {
        const result = await toolRegistry.execute(step.tool, step.parameters);
        step.result = result;
        step.status = result.success ? 'completed' : 'failed';
        result.success ? completed++ : failed++;
      } catch (e) {
        step.status = 'failed';
        step.error = String(e);
        failed++;
      }

      onProgress(step, plan.steps);
    }

    // Get conversational summary of results
    let conversationalSummary = `Completed ${completed} steps, ${failed} failed`;

    if (completed > 0 || failed > 0) {
      try {
        const toolResults = plan.steps
          .filter(s => s.status === 'completed' || s.status === 'failed')
          .map(s => ({
            tool: s.tool,
            description: s.description,
            status: s.status,
            // Only include success/error status, not raw output
            success: s.status === 'completed',
            error: s.error,
          }));

        // Create a simple summary of what was done
        const completedSteps = toolResults.filter(t => t.success);
        const failedSteps = toolResults.filter(t => !t.success);

        let summaryPrompt = `User asked: "${userRequest}"\n\n`;
        summaryPrompt += `Completed ${completedSteps.length} tasks:\n`;
        completedSteps.forEach((s, i) => {
          summaryPrompt += `${i + 1}. ${s.description}\n`;
        });

        if (failedSteps.length > 0) {
          summaryPrompt += `\nFailed ${failedSteps.length} tasks:\n`;
          failedSteps.forEach((s, i) => {
            summaryPrompt += `${i + 1}. ${s.description}: ${s.error}\n`;
          });
        }

        summaryPrompt += `\n\nPlease provide a friendly summary to the user. Focus on what was accomplished. Keep it concise and conversational. Do NOT show any JSON or technical details - just explain what you did in plain language.`;

        // Use streaming for the summary too
        let summaryText = '';
        await aiService.streamChat([
          {
            role: 'system',
            content: 'You are a helpful coding assistant. Explain what was accomplished in simple, conversational language. Never show JSON, tool names, or technical details.',
          },
          {
            role: 'user',
            content: summaryPrompt,
          },
        ], model, customModels, apiKey, (token) => {
          summaryText += token;
          if (onStream) onStream(token);
        }, hfApiKey, geminiApiKey);

        if (summaryText) {
          conversationalSummary = summaryText;
        }
      } catch (e) {
        console.error('Failed to generate conversational summary:', e);
        // Fall back to default summary
      }
    }

    return {
      success: failed === 0,
      plan,
      finalOutput: conversationalSummary,
      stepsCompleted: completed,
      stepsFailed: failed,
    };
  }

  private async createPlan(
    userRequest: string,
    availableTools: string[],
    model: string = 'claude-3.5-sonnet',
    customModels: any[] = [],
    apiKey?: string,
    hfApiKey?: string,
    geminiApiKey?: string,
    onStream?: (token: string) => void,
    history: AIMessage[] = []
  ): Promise<ExecutionPlan> {
    const toolsDesc = toolRegistry.formatForAI();

    let fullContent = '';
    let isJson = false;
    let checkedJson = false;
    let hasStreamed = false;

    const sanitizedHistory = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => m.content && m.content.trim().length > 0);

    const response = await aiService.streamChat([
      {
        role: 'system',
        content: `You are a helpful coding assistant with access to development tools. You can help with:

1. **Conversational help** - Answer questions, explain concepts, chat naturally
2. **Code tasks** - Create files, modify code, setup projects, run commands

## When to Use Tools vs Just Chat:

**Just chat (no tools needed):**
- Greetings, introductions, casual conversation
- Explaining code concepts, answering "how do I" questions
- General knowledge questions
- Asking about the project or your capabilities

**Use tools (create a plan with JSON):**
- "Create a component" or "Make a file"
- "Add a feature to X"
- "Setup a new project"
- "Install packages"
- "List/search files"
- Any request that requires file operations

## Available Tools:
${toolsDesc}

## Rules for Creating Plans (only when tools are needed):

1. **Break tasks into 3-7 clear steps**
2. **Be specific with parameters** - use real file paths
3. **Mark approval correctly**: write_file, create_file, delete_file, run_command, append_file, update_package_json, init_project, git_init, git_commit, git_set_remote, git_clone, git_pull, git_push need approval; read_file, list_directory, search_files don't
4. **Consider file operations order** - read before writing, check before creating

## Response Format:

For **chat** - Just respond naturally in text

For **tasks** - Respond ONLY with valid JSON:
{
  "goal": "brief goal",
  "steps": [
    {
      "id": "step_id",
      "description": "What to do",
      "tool": "tool_name",
      "parameters": {},
      "requiresApproval": false
    }
  ]
}

Be friendly and helpful! If someone just wants to chat, have a normal conversation. Only use tools when they ask you to DO something with files/code.`,
      },
      ...sanitizedHistory,
      {
        role: 'user',
        content: userRequest,
      },
    ], model, customModels, apiKey, (token) => {
      fullContent += token;

      // Determine if it's JSON or Chat
      if (!checkedJson && fullContent.trim().length > 0) {
        if (fullContent.trim().startsWith('{')) {
          isJson = true;
        }
        checkedJson = true;
      }

      // If it's NOT JSON, stream the tokens to the user
      // But only after we've confirmed it's not JSON
      if (checkedJson && !isJson && onStream) {
        if (!hasStreamed) {
          onStream(fullContent);
          hasStreamed = true;
        } else {
          onStream(token);
        }
      }
    }, hfApiKey, geminiApiKey);

    if (!fullContent && response?.content) {
      fullContent = response.content;
    }

    console.log('AI Response:', fullContent);
    console.log('Response length:', fullContent.length);

    // Try to parse JSON from response
    let planData: any = { goal: userRequest, steps: [] };
    let conversationalResponse: string | undefined;

    try {
      // Try to find JSON in the response
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && Array.isArray(parsed.steps)) {
          planData = parsed;
          console.log('Parsed plan:', planData);
        } else {
          conversationalResponse = fullContent;
          console.log('Conversational response detected');
          return {
            id: Date.now().toString(),
            goal: userRequest,
            steps: [],
            estimatedSteps: 0,
            requiresApproval: [],
            conversationalResponse,
          };
        }
      } else {
        // No JSON found - this is a conversational response
        conversationalResponse = fullContent;
        console.log('Conversational response detected');
        return {
          id: Date.now().toString(),
          goal: userRequest,
          steps: [],
          estimatedSteps: 0,
          requiresApproval: [],
          conversationalResponse,
        };
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // If parsing fails, treat as conversational response
      conversationalResponse = fullContent;
      return {
        id: Date.now().toString(),
        goal: userRequest,
        steps: [],
        estimatedSteps: 0,
        requiresApproval: [],
        conversationalResponse,
      };
    }

    const steps = (planData.steps || []).map((s: any) => ({ ...s, status: 'pending' as const }));

    return {
      id: Date.now().toString(),
      goal: planData.goal || userRequest,
      steps,
      estimatedSteps: steps.length,
      requiresApproval: steps.filter((s: any) => s.requiresApproval).map((s: any) => s.id),
    };
  }
}

export const autonomousAgent = new AutonomousAgent();
