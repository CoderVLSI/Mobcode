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
  dependencies?: string[]; // IDs of steps this step depends on
  canParallel?: boolean; // Can this step run in parallel with others?
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
    console.log('=== AGENT EXECUTE TASK START ===');
    console.log('User Request:', userRequest);
    console.log('Model:', model);
    console.log('Available Tools:', availableTools.length);

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

    console.log('Plan created with', plan.steps.length, 'steps');
    console.log('Estimated steps:', plan.estimatedSteps);
    console.log('Requires approval:', plan.requiresApproval.length);
    onProgress({
      id: 'plan',
      description: `Plan: ${plan.steps.length} steps`,
      tool: 'plan',
      parameters: {},
      status: 'completed',
    }, plan.steps);

    if (plan.steps.length === 0 && plan.conversationalResponse) {
      console.log('=== CONVERSATIONAL RESPONSE (NO TOOLS) ===');
      console.log('Response:', plan.conversationalResponse.substring(0, 200));
      return {
        success: true,
        plan,
        finalOutput: plan.conversationalResponse,
        stepsCompleted: 0,
        stepsFailed: 0,
      };
    }

    let completed = 0, failed = 0;

    console.log('=== EXECUTING STEPS (PARALLEL MODE) ===');

    // Group steps by dependencies for parallel execution
    const executeStep = async (step: AgentStep): Promise<void> => {
      console.log('--- Executing Step:', step.description);
      console.log('Tool:', step.tool);
      console.log('Needs approval:', plan.requiresApproval.includes(step.id));

      if (plan.requiresApproval.includes(step.id)) {
        console.log('Waiting for user approval...');
        const approved = await onApprovalNeeded(step);
        console.log('Approved:', approved);
        if (!approved) {
          step.status = 'failed';
          failed++;
          onProgress(step, plan.steps);
          console.log('Step denied by user');
          return;
        }
      }

      step.status = 'executing';
      onProgress(step, plan.steps);
      console.log('Executing step...');

      try {
        const result = await toolRegistry.execute(step.tool, step.parameters);
        console.log('Step result success:', result.success);
        if (!result.success) {
          console.log('Step error:', result.error);
        }
        step.result = result;
        step.status = result.success ? 'completed' : 'failed';
        result.success ? completed++ : failed++;
      } catch (e) {
        console.log('Step exception:', String(e));
        step.status = 'failed';
        step.error = String(e);
        failed++;
      }

      console.log('Step status:', step.status);
      onProgress(step, plan.steps);
    };

    // Execute steps in parallel batches
    const BATCH_SIZE = 5; // Execute up to 5 steps at once
    for (let i = 0; i < plan.steps.length; i += BATCH_SIZE) {
      const batch = plan.steps.slice(i, i + BATCH_SIZE);
      console.log(`\n=== BATCH ${Math.floor(i / BATCH_SIZE) + 1} ===`);
      console.log(`Executing ${batch.length} steps in parallel...`);

      // Execute batch in parallel
      await Promise.all(batch.map(step => executeStep(step)));
    }

    console.log('=== ALL STEPS COMPLETE ===');
    console.log('Completed:', completed);
    console.log('Failed:', failed);

    // Get conversational summary of results
    let conversationalSummary = `Completed ${completed} steps, ${failed} failed`;

    if (completed > 0 || failed > 0) {
      console.log('=== GENERATING CONVERSATIONAL SUMMARY ===');
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

        console.log('Completed steps:', completedSteps.length);
        console.log('Failed steps:', failedSteps.length);

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

        console.log('Summary prompt:', summaryPrompt);

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

        console.log('Summary generated, length:', summaryText.length);
        console.log('Summary preview:', summaryText.substring(0, 200));

        if (summaryText) {
          conversationalSummary = summaryText;
        }
      } catch (e) {
        console.error('Failed to generate conversational summary:', e);
        // Fall back to default summary
      }
    }

    console.log('=== AGENT TASK COMPLETE ===');
    console.log('Final output length:', conversationalSummary.length);

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
    console.log('=== CREATING PLAN ===');
    console.log('User request:', userRequest);
    console.log('Available tools:', availableTools.length);
    console.log('History messages:', history.length);

    const toolsDesc = toolRegistry.formatForAI();

    let fullContent = '';
    let isJson = false;
    let checkedJson = false;
    let hasStreamed = false;

    const sanitizedHistory = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => m.content && m.content.trim().length > 0);

    console.log('Sanitized history length:', sanitizedHistory.length);

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

## IMPORTANT: Project Structure Rules

**ALWAYS create new projects in separate folders:**
- Use a descriptive folder name for the project
- Create all project files inside this folder
- Example: For "make a chat app", create folder "chat-app/" and put all files inside

**Multi-file creation for speed:**
- Create multiple files in parallel when possible
- Group related files together in your plan
- No file depends on another if they can be created simultaneously

## Rules for Creating Plans (only when tools are needed):

1. **Break tasks into 3-10 clear steps** (more steps are OK for multi-file projects)
2. **Always use new folders** - never pollute the root directory
3. **Multi-file operations** - create multiple files at once when independent
4. **Be specific with parameters** - use real file paths with the project folder
5. **Mark approval correctly**: write_file, create_file, delete_file, run_command, append_file, update_package_json, init_project, git_init, git_commit, git_set_remote, git_clone, git_pull, git_push need approval; read_file, list_directory, search_files don't
6. **Consider file operations order** - read before writing, check before creating

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

Be friendly and helpful! If someone just wants to chat, have a normal conversation. Only use tools when they ask you to DO something with files/code. Always create projects in dedicated folders!`,
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

    console.log('AI Response received');
    console.log('Response length:', fullContent.length);
    console.log('Is JSON:', isJson);
    console.log('Response preview:', fullContent.substring(0, 500));

    if (!fullContent && response?.content) {
      fullContent = response.content;
    }

    console.log('AI Response received');
    console.log('Full content length:', fullContent.length);

    // Try to parse JSON from response
    let planData: any = { goal: userRequest, steps: [] };
    let conversationalResponse: string | undefined;

    try {
      // Try to find JSON in the response
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('JSON pattern found, attempting to parse...');
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && Array.isArray(parsed.steps)) {
          planData = parsed;
          console.log('Plan parsed successfully');
          console.log('Steps in plan:', parsed.steps.length);
          parsed.steps.forEach((s: any, i: number) => {
            console.log(`  Step ${i + 1}:`, s.description, '| Tool:', s.tool);
          });
        } else {
          console.log('JSON parsed but not a valid plan structure');
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
        console.log('No JSON pattern found, treating as conversational');
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
      console.error('Response content:', fullContent.substring(0, 500));
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

    console.log('=== PLAN CREATED ===');
    console.log('Goal:', planData.goal || userRequest);
    console.log('Total steps:', steps.length);
    console.log('Needs approval:', steps.filter((s: any) => s.requiresApproval).map((s: any) => s.id));

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
