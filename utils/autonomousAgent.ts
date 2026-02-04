import { aiService, AIMessage } from './aiService';
import { toolRegistry, ToolResult } from './toolRegistry';
import { skillManager } from './skillManager';
import { backgroundTaskManager } from './backgroundTask';
import { gitService } from './gitService';

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

    // Start background task
    const taskId = `task-${Date.now()}`;
    backgroundTaskManager.startTask({
      id: taskId,
      type: 'agent_execution',
      status: 'running',
      totalSteps: 0, // Will be updated after plan creation
      currentStep: 'Creating execution plan...',
    });

    try {
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

        // Update background task with current steps and progress
        backgroundTaskManager.updateTask({
          agentSteps: [...plan.steps],
          progress: Math.round((i / plan.steps.length) * 100),
          currentStep: `Executing batch ${Math.floor(i / BATCH_SIZE) + 1}...`,
        });

        // Execute batch in parallel
        await Promise.all(batch.map(step => executeStep(step)));
      }

      console.log('=== ALL STEPS COMPLETE ===');
      console.log('Completed:', completed);
      console.log('Failed:', failed);

      // Update background task with final step states
      backgroundTaskManager.updateTask({
        agentSteps: [...plan.steps],
        progress: 100,
        currentStep: `Completed ${completed} steps, ${failed} failed`,
      });

      // Get conversational summary of results
      let conversationalSummary = `Completed ${completed} steps, ${failed} failed`;

      // Only generate AI summary for complex tasks (3+ steps)
      // Simple tasks get a quick static summary to save API calls
      const needsSummary = completed >= 3 || failed > 0;

      if (needsSummary && (completed > 0 || failed > 0)) {
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
      } else if (completed > 0) {
        // Quick static summary for simple tasks (1-2 steps) - no API call needed
        console.log('=== SKIPPING SUMMARY API (simple task) ===');
        const descriptions = plan.steps
          .filter(s => s.status === 'completed')
          .map(s => s.description);
        conversationalSummary = descriptions.length === 1
          ? descriptions[0]
          : descriptions.join('. ');
      }

      console.log('=== AGENT TASK COMPLETE ===');
      console.log('Final output length:', conversationalSummary.length);

      // Create Git checkpoint after file operations
      let gitCheckpointHash: string | null = null;
      const hasFileOps = plan.steps.some(s =>
        ['create_file', 'write_file', 'delete_file', 'append_file'].includes(s.tool) && s.status === 'completed'
      );
      if (hasFileOps && failed === 0) {
        try {
          gitCheckpointHash = await gitService.createCheckpoint(`Agent: ${plan.goal}`);
        } catch (e) {
          console.error('Failed to create checkpoint:', e);
        }
      }

      return {
        success: failed === 0,
        plan,
        finalOutput: conversationalSummary,
        stepsCompleted: completed,
        stepsFailed: failed,
        gitCheckpointHash: gitCheckpointHash || undefined,
      };
    } catch (error) {
      console.error('=== AGENT EXECUTION FAILED ===');
      console.error('Error:', error);

      // Fail the background task
      backgroundTaskManager.failTask((error as Error).message || 'Unknown error');

      return {
        success: false,
        plan: { id: Date.now().toString(), goal: userRequest, steps: [], estimatedSteps: 0, requiresApproval: [] },
        finalOutput: `Error: ${(error as Error).message || 'Unknown error'}`,
        stepsCompleted: 0,
        stepsFailed: 1,
      };
    }
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
        content: isGLMModel ? `You are an AI coding assistant. For file/code operations, respond ONLY with JSON:
{"goal": "task","steps":[{"id":"1","description":"what","tool":"tool","parameters":{},"requiresApproval":true}]}

CRITICAL WORKFLOW FOR DELETE:
- If EXACT path is known: Use delete_file directly
- If path is UNCLEAR (user says "delete the X folders" but you don't know exact path):
  1. First step: list_directory with path "." to find folders
  2. Second step: delete_file with the actual path found
- NEVER guess paths - always list first if uncertain

For CREATE operations: Use create_file or write_file directly.
Mark requiresApproval: true for delete_file, write_file, create_file, run_command

Tools: ${availableTools.join(', ')}

For questions without file operations, just answer normally.` : `You are an AI coding assistant with access to development tools.

## Tools Available: ${availableTools.join(', ')}

${allSkillsList ? `Skills: ${allSkillsList}` : ''}

${relevantSkills ? `Relevant Skills:\n${relevantSkills}` : ''}

## When to Use JSON Plans:
- "Create"/"Make"/"Add feature"/"Setup"/"Delete" → respond with JSON plan
- Questions/Explanations → respond naturally

## JSON Format:
{"goal": "task","steps":[{"id":"x","description":"what","tool":"tool","parameters":{},"requiresApproval":false}]}

## CRITICAL - DELETE Operations:
- If exact path is known: delete_file directly
- If path is uncertain: list_directory FIRST, then delete_file with actual path
- NEVER guess folder/file names - always verify with list_directory first
- Example: "Delete tic tac toe folders" → list_directory(".") → delete_file("tictactoe")

## Other Rules:
- Create projects in separate folders (e.g., "myapp/")
- Files needing approval: write_file, create_file, delete_file, run_command, git_push
- Multi-file: create in parallel when possible

For chat: respond naturally. For tasks: respond with ONLY the JSON, no extra text.`,
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
    // Uses character-by-character parsing to avoid regex double-quote issues
    const fixGLMJSON = (json: string): string => {
      let result = '';

      // First, fix empty string keys
      let fixed = json;
      fixed = fixed.replace(/""\s*:\s*\[/g, '"steps": [');
      fixed = fixed.replace(/""\s*:\s*\{/g, '"parameters": {');

      // Fix common GLM issues
      // Fix "[ {" → "[{" (remove space before object in array)
      fixed = fixed.replace(/\[\s+\{/g, '[{');
      // Fix ", {" → ",{" (remove space before object in array)
      fixed = fixed.replace(/,\s+\{/g, ',{');

      // Fix missing commas between properties ("key1" "value1" → "key1": "value1")
      // Pattern: quote, spaces, quote (with colon after) → quote, colon, space, quote
      fixed = fixed.replace(/"\s+"/g, '": "');

      // Fix wrong tool names
      fixed = fixed.replace(/"tool":\s*"_file"/g, '"tool": "write_file"');
      fixed = fixed.replace(/"tool":\s*"create_file"/g, '"tool": "create_file"');

      // Fix "description""value" pattern (missing colon and comma)
      fixed = fixed.replace(/"description"\s+"/g, '"description": "');

      // Fix truncated JSON - close incomplete strings at the end
      // Count opening and closing quotes to detect incomplete strings
      const quoteCount = (fixed.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        // Odd number of quotes means incomplete string - add closing quote
        console.log('Detected incomplete string, adding closing quote');
        fixed += '"';
      }

      // Fix truncated objects - close incomplete objects/arrays
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;

      // Add missing closing braces/brackets
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
        console.log('Added missing closing brace');
      }
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
        console.log('Added missing closing bracket');
      }

      // Then fix trailing commas
      fixed = fixed.replace(/,\s*}/g, '}');
      fixed = fixed.replace(/,\s*]/g, ']');

      // Character-by-character parser to quote unquoted keys and values
      let i = 0;
      while (i < fixed.length) {
        const char = fixed[i];

        if (char === '"') {
          // Already quoted - copy as-is
          result += char;
          i++;

          // Find closing quote (handle escaped quotes)
          while (i < fixed.length) {
            // Check for escape sequence BEFORE adding to result
            if (fixed[i] === '\\' && i + 1 < fixed.length) {
              // Add backslash and the escaped char, then skip ahead
              result += fixed[i];     // Add backslash
              result += fixed[i + 1]; // Add escaped char
              i += 2;                 // Skip both
              continue;
            }
            result += fixed[i];
            if (fixed[i] === '"') {
              i++;
              break;
            }
            i++;
          }
        } else if (char === '{' || char === '[' || char === '}' || char === ']' ||
          char === ':' || char === ',') {
          result += char;
          i++;
        } else if (/\s/.test(char)) {
          // Whitespace
          result += char;
          i++;
        } else {
          // Potential unquoted key or value
          const start = i;

          // Read the unquoted token
          while (i < fixed.length && !/[{}[\]:,\s"]/.test(fixed[i])) {
            i++;
          }

          const token = fixed.substring(start, i);

          // Check if this is a key (followed by colon)
          let isKey = false;
          let j = i;
          while (j < fixed.length && /\s/.test(fixed[j])) j++;
          if (j < fixed.length && fixed[j] === ':') {
            isKey = true;
          }

          // Check if this is a value (after colon, before comma/brace)
          let isValue = false;
          if (!isKey) {
            // Look backwards for colon
            let k = start - 1;
            while (k >= 0 && /\s/.test(fixed[k])) k--;
            if (k >= 0 && fixed[k] === ':') {
              isValue = true;
            }
          }

          if (isKey || isValue) {
            // Quote the token
            result += `"${token}"`;
          } else {
            // Keep as-is (boolean/null/number)
            result += token;
          }
        }
      }

      // Clean up extra spaces (but keep structure)
      result = result.replace(/  +/g, ' ');

      return result;
    };

    try {
      // First, strip markdown code blocks (```json ... ```) for GLM models
      let contentToParse = fullContent;
      if (isGLMModel) {
        // Remove markdown code blocks: ```json ... ``` or ``` ... ```
        const beforeLength = contentToParse.length;
        // Remove opening ```json or ``` followed by newline
        contentToParse = contentToParse.replace(/```json\s*\n?/gi, '');
        contentToParse = contentToParse.replace(/```\s*\n?/gi, '');
        console.log('Stripped markdown code blocks, length:', beforeLength, '->', contentToParse.length);
        console.log('Content preview after strip:', contentToParse.substring(0, 200));
      }

      // Try to find JSON in the response
      let jsonMatch = contentToParse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('JSON match found, length:', jsonMatch[0].length);
        console.log('JSON match preview (first 300 chars):', jsonMatch[0].substring(0, 300));
      }

      // For GLM, try to fix common JSON issues before parsing
      if (jsonMatch && isGLMModel) {
        console.log('GLM detected, attempting to fix JSON...');
        const fixedJson = fixGLMJSON(jsonMatch[0]);
        console.log('Fixed JSON length:', fixedJson.length, 'vs original:', jsonMatch[0].length);
        try {
          // Try parsing the fixed JSON
          const testParsed = JSON.parse(fixedJson);
          if (testParsed) {
            jsonMatch[0] = fixedJson;
            console.log('GLM JSON fix successful');
          }
        } catch (e) {
          console.log('GLM JSON fix did not help, error:', (e as Error).message);
        }
      }

      if (jsonMatch) {
        console.log('JSON pattern found, attempting to parse...');
        const jsonStr = jsonMatch[0];

        // Log a sample of the JSON to debug
        console.log('JSON string sample (first 500 chars):', jsonStr.substring(0, 500));

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
              const jsonIndex = contentToParse.indexOf(jsonMatch[0]);
              const textBefore = jsonIndex > 0 ? contentToParse.substring(0, jsonIndex).trim() : '';
              const textAfter = contentToParse.substring(jsonIndex + jsonMatch[0].length).trim();

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
          // Log where the error might be
          const errorPos = (innerError as any).matcher?.[0]?.index || -1;
          if (errorPos >= 0) {
            console.warn('Error near position:', errorPos);
            console.warn('Context:', jsonStr.substring(Math.max(0, errorPos - 100), Math.min(jsonStr.length, errorPos + 100)));
          }
          // Extract text before/after the JSON as the response
          const jsonIndex = contentToParse.indexOf(jsonMatch[0]);
          const textBefore = jsonIndex > 0 ? contentToParse.substring(0, jsonIndex).trim() : '';
          const textAfter = contentToParse.substring(jsonIndex + jsonMatch[0].length).trim();

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

    // Update background task with plan info and initial steps
    backgroundTaskManager.updateTask({
      totalSteps: steps.length,
      currentStep: `Executing ${steps.length} steps...`,
      agentSteps: steps,
    });

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
