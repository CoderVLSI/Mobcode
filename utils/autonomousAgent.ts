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
    onStream?: (token: string) => void
  ) {
    const plan = await this.createPlan(userRequest, availableTools, model, customModels, apiKey, onStream);
    onProgress({
      id: 'plan',
      description: `Plan: ${plan.steps.length} steps`,
      tool: 'plan',
      parameters: {},
      status: 'completed',
    }, plan.steps);

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
            result: s.result,
            error: s.error,
          }));
        
        // Use streaming for the summary too
        let summaryText = '';
        await aiService.streamChat([
          {
            role: 'system',
            content: 'You are a helpful assistant. The user asked a question and the AI assistant used tools to gather information. Your job is to explain the results in a conversational, friendly way. Focus on what the user actually asked, not just dumping raw data. Be helpful and concise.',
          },
          {
            role: 'user',
            content: `User asked: "${userRequest}"\n\nTool results:\n${JSON.stringify(toolResults, null, 2)}\n\nPlease explain these results to the user in a conversational way. Answer what they actually asked.`,
          },
        ], model, customModels, apiKey, (token) => {
          summaryText += token;
          if (onStream) onStream(token);
        });

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
    onStream?: (token: string) => void
  ): Promise<ExecutionPlan> {
    const toolsDesc = toolRegistry.formatForAI();

    let fullContent = '';
    let isJson = false;
    let checkedJson = false;

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
3. **Mark approval correctly**: write_file, create_file, delete_file, run_command, append_file, update_package_json, init_project need approval; read_file, list_directory, search_files don't
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
        // If this is the first token after check, send the buffered content
        if (fullContent.length === token.length + (fullContent.length - token.length)) {
           // This logic is tricky. Simpler:
           // If we just decided it's NOT JSON, we might have buffered a few chars (e.g. "H", "e").
           // Ideally we send them now. 
           // For simplicity, just send 'token' if checkedJson is true. 
           // Note: The very first token(s) might be missed if we buffer too aggressively, 
           // but checking startsWith('{') usually happens on the first token unless it's whitespace.
           onStream(token);
        }
      }
    });

    console.log('AI Response:', fullContent);
    console.log('Response length:', fullContent.length);

    // Try to parse JSON from response
    let planData: any = { goal: userRequest, steps: [] };
    let conversationalResponse: string | undefined;

    try {
      // Try to find JSON in the response
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
        console.log('Parsed plan:', planData);
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
