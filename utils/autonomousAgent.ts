import { aiService, AIMessage } from './aiService';
import { toolRegistry, ToolResult } from './toolRegistry';
import { skillManager } from './skillManager';

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

        summaryPrompt += `\n\nPlease provide a friendly summary to the user. Focus on what was accomplished. Keep it concise and conversational.

CRITICAL RULES:
- NEVER show JSON, tool names, or technical details
- NEVER mention "tool", "API", "function", or technical terms
- Use plain, simple language like you're talking to a friend
- Just say what you did, not HOW you did it
- Example: "Created the chat app files" instead of "Used write_file tool to create ChatApp.tsx"`;

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

    // Load relevant skills for this task AND a list of all available skills
    console.log('Loading skills...');
    const relevantSkills = await skillManager.getRelevantSkillsForAI(userRequest, 3);
    const allSkillsList = await skillManager.getSkillListForAI();
    console.log('Relevant skills loaded:', relevantSkills ? 'Yes' : 'No');
    console.log('Total skills available:', allSkillsList ? allSkillsList.split('\n').length : 0);

    let fullContent = '';
    let isJson = false;
    let checkedJson = false;
    let hasStreamed = false;

    // Detect if using GLM model for specific prompt handling
    const isGLMModel = model.includes('glm') || model.includes('GLM');
    console.log('Is GLM model:', isGLMModel);

    const sanitizedHistory = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .filter((m) => m.content && m.content.trim().length > 0);

    console.log('Sanitized history length:', sanitizedHistory.length);

    const response = await aiService.streamChat([
      {
        role: 'system',
        content: isGLMModel ? `You are a helpful coding assistant with access to development tools.

## CRITICAL JSON FORMAT INSTRUCTIONS

When the user asks you to DO something (create files, modify code, setup projects), you MUST respond with valid JSON in this EXACT format:

\`\`\`json
{
  "goal": "brief description of what you're doing",
  "steps": [
    {
      "id": "unique_step_id",
      "description": "what this step does",
      "tool": "exact_tool_name",
      "parameters": {
        "parameter_name": "value"
      },
      "requiresApproval": false
    }
  ]
}
\`\`\`

IMPORTANT JSON RULES:
- The JSON MUST be complete and valid
- Use "goal" (not empty string)
- Use "steps" (not empty string)
- Each step MUST have: id, description, tool, parameters, requiresApproval
- Use "parameters" (not empty string)
- All property names must be in quotes with colons
- NO conversational text before or after the JSON

## Available Tools:
${toolsDesc}

## When to Use JSON:
- "Create a file" or "Make a file"
- "Add a feature"
- "Setup a project"
- "Install packages"
- "List/search files"

## When to Just Chat (no JSON):
- Greetings
- Questions
- Explanations
- Casual conversation

Always create new projects in separate folders with descriptive names!` : `You are a helpful coding assistant with access to development tools. You can help with:

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

${allSkillsList ? `
## My Agent Skills (I can use these for guidance):
${allSkillsList}
` : ''}

${relevantSkills ? `
## Skill Details (relevant to this request):
${relevantSkills}
` : ''}

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

For **chat** - Just respond naturally in text (NO JSON)

For **tasks** - Respond ONLY with valid JSON (NO other text before or after):
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

IMPORTANT: When creating a plan, respond with PURE JSON only. Do NOT add any conversational text before or after the JSON.

Be friendly and helpful! If someone just wants to chat, have a normal conversation. Only use tools when they ask you to DO something with files/code. Always create projects in dedicated folders!`,
      },
      ...sanitizedHistory,
      {
        role: 'user',
        content: userRequest,
      },
    ], model, customModels, apiKey, (token) => {
      fullContent += token;

      // NEVER stream during plan creation - we need to see the full response first
      // to determine if it's JSON or conversational
      // Streaming happens AFTER we parse the response
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

    // Helper function to fix common GLM JSON issues
    const fixGLMJSON = (json: string): string => {
      let fixed = json;

      // Fix 1: Empty string keys → proper keys
      fixed = fixed.replace(/""\s*:\s*\[/g, '"steps": [');
      fixed = fixed.replace(/""\s*:\s*\{/g, '"parameters": {');

      // Fix 2: Unquoted property names ONLY (not already quoted)
      // Pattern: `path:` or `path :` → `"path":` but NOT `"path":`
      fixed = fixed.replace(/([^\w"])(\w+)\s*:/g, '$1"$2":');

      // Fix 3: Missing quotes around string values after colons (when unquoted)
      // Pattern: `"path": value` → `"path": "value"` (only if value isn't quoted/bracket)
      fixed = fixed.replace(/:\s*([a-zA-Z0-9_\/\-.][^",}\]]*)([,\}])/g, ': "$1"$2');

      // Fix 4: Extra spaces (but keep newlines for readability)
      fixed = fixed.replace(/  +/g, ' ');

      // Fix 5: Trailing commas
      fixed = fixed.replace(/,\s*}/g, '}');
      fixed = fixed.replace(/,\s*]/g, ']');

      return fixed;
    };

    try {
      // Try to find JSON in the response
      let jsonMatch = fullContent.match(/\{[\s\S]*\}/);

      // For GLM, try to fix common JSON issues before parsing
      if (jsonMatch && isGLMModel) {
        console.log('GLM detected, attempting to fix JSON...');
        const fixedJson = fixGLMJSON(jsonMatch[0]);
        try {
          // Try parsing the fixed JSON
          const testParsed = JSON.parse(fixedJson);
          if (testParsed) {
            jsonMatch[0] = fixedJson;
            console.log('GLM JSON fix successful');
          }
        } catch (e) {
          console.log('GLM JSON fix did not help, using original');
        }
      }

      if (jsonMatch) {
        console.log('JSON pattern found, attempting to parse...');
        const jsonStr = jsonMatch[0];

        // Try to parse the JSON first
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && Array.isArray(parsed.steps)) {
            planData = parsed;
            console.log('Plan parsed successfully');
            console.log('Steps in plan:', parsed.steps.length);
            parsed.steps.forEach((s: any, i: number) => {
              console.log(`  Step ${i + 1}:`, s.description, '| Tool:', s.tool);
            });
          } else {
            console.log('JSON parsed but not a valid plan structure');
            console.log('Parsed object keys:', Object.keys(parsed));

            // Try to extract meaningful content from the parsed JSON
            // The AI might have responded with a different structure
            let extractedResponse = '';

            // Check common response patterns
            if (parsed.response) extractedResponse = parsed.response;
            else if (parsed.message) extractedResponse = parsed.message;
            else if (parsed.content) extractedResponse = parsed.content;
            else if (parsed.text) extractedResponse = parsed.text;
            else if (parsed.answer) extractedResponse = parsed.answer;
            else if (typeof parsed === 'string') extractedResponse = parsed;

            // If we found something in the JSON, use it
            if (extractedResponse) {
              conversationalResponse = extractedResponse;
            } else {
              // Check for text before the JSON
              const jsonIndex = fullContent.indexOf(jsonMatch[0]);
              const textBefore = jsonIndex > 0 ? fullContent.substring(0, jsonIndex).trim() : '';
              const textAfter = fullContent.substring(jsonIndex + jsonMatch[0].length).trim();

              // Use text before/after JSON, or stringify the JSON for debugging
              if (textBefore) {
                conversationalResponse = textBefore;
              } else if (textAfter) {
                conversationalResponse = textAfter;
              } else {
                // Last resort - the full content without trying to parse as plan
                conversationalResponse = fullContent;
              }
            }

            console.log('Extracted conversational response length:', conversationalResponse.length);
            return {
              id: Date.now().toString(),
              goal: userRequest,
              steps: [],
              estimatedSteps: 0,
              requiresApproval: [],
              conversationalResponse,
            };
          }
        } catch (innerError) {
          // JSON parsing failed - malformed JSON or incomplete JSON at end
          console.warn('JSON parsing failed:', (innerError as Error).message);
          // Extract text before/after the JSON as the response
          const jsonIndex = fullContent.indexOf(jsonMatch[0]);
          const textBefore = jsonIndex > 0 ? fullContent.substring(0, jsonIndex).trim() : '';
          const textAfter = fullContent.substring(jsonIndex + jsonMatch[0].length).trim();

          // Use text before JSON, text after JSON, or fall back to full content
          if (textBefore) {
            conversationalResponse = textBefore;
          } else if (textAfter) {
            conversationalResponse = textAfter;
          } else {
            // No text found around JSON - use the full content instead of generic error
            conversationalResponse = fullContent || "I received an empty response. Please try again.";
          }

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
      console.error('Unexpected error in createPlan:', e);
      return {
        id: Date.now().toString(),
        goal: userRequest,
        steps: [],
        estimatedSteps: 0,
        requiresApproval: [],
        conversationalResponse: 'Sorry, I encountered an error processing the response.',
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
