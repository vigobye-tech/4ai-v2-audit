// Dynamic LLM role assignment and specialization system

export interface ModelCapabilities {
  reasoning: number;
  creativity: number;
  coding: number;
  analysis: number;
  writing: number;
  multilingual: number;
}

export interface ModelProfile {
  name: string;
  url: string;
  capabilities: ModelCapabilities;
  contextWindow: number;
  strengths: string[];
  weaknesses: string[];
  optimalFor: string[];
  specializations: Record<string, number>;
}

export interface TaskType {
  name: string;
  optimalModel: string;
  alternativeModels: string[];
  chainStrategy: string;
}

export interface ChainStrategy {
  description: string;
  steps: number;
  roles?: string[];
}

export interface ModelProfiles {
  version: string;
  lastUpdated: string;
  models: Record<string, ModelProfile>;
  taskTypes: Record<string, TaskType>;
  chainStrategies: Record<string, ChainStrategy>;
}

export class ModelManager {
  private profiles: ModelProfiles | null = null;

  async loadProfiles(): Promise<ModelProfiles> {
    if (this.profiles) {
      return this.profiles;
    }

    try {
      // Try to load from Tauri backend
      const profilesJson = await window.__TAURI__.invoke('load_model_profiles') as string;
      this.profiles = JSON.parse(profilesJson);
      if (this.profiles) {
        return this.profiles;
      }
    } catch (error) {
      console.warn('[MODEL MANAGER] Failed to load profiles from backend, using defaults:', error);
    }
    
    // Fallback to default profiles
    this.profiles = this.getDefaultProfiles();
    return this.profiles;
  }

  async suggestOptimalChain(taskDescription: string): Promise<{
    models: string[];
    strategy: string;
    reasoning: string;
  }> {
    const profiles = await this.loadProfiles();
    
    // Analyze task description to determine task type
    const taskType = this.analyzeTaskType(taskDescription);
    const taskConfig = profiles.taskTypes[taskType];
    
    if (!taskConfig) {
      return {
        models: ['chatgpt'], // Fallback
        strategy: 'single_best',
        reasoning: 'Default fallback - task type not recognized'
      };
    }

    const strategy = profiles.chainStrategies[taskConfig.chainStrategy];
    let models: string[] = [];

    if (strategy.steps === 1) {
      models = [taskConfig.optimalModel];
    } else if (strategy.steps === 2) {
      models = [
        taskConfig.optimalModel,
        taskConfig.alternativeModels[0] || taskConfig.optimalModel
      ];
    } else {
      models = [
        taskConfig.optimalModel,
        ...taskConfig.alternativeModels.slice(0, strategy.steps - 1)
      ];
    }

    const reasoning = this.explainChainChoice(taskType, models, taskConfig.chainStrategy);

    return {
      models,
      strategy: taskConfig.chainStrategy,
      reasoning
    };
  }

  private analyzeTaskType(description: string): string {
    const desc = description.toLowerCase();
    
    // Pattern matching for task types
    const patterns: Record<string, string[]> = {
      'creative_writing': ['story', 'creative', 'write', 'novel', 'poem', 'fiction'],
      'code_generation': ['code', 'program', 'function', 'script', 'implement', 'develop'],
      'code_review': ['review', 'check', 'debug', 'fix', 'optimize', 'refactor'],
      'academic_analysis': ['analyze', 'analysis', 'research', 'study', 'academic', 'paper'],
      'translation': ['translate', 'tłumacz', 'translation', 'language'],
      'brainstorming': ['brainstorm', 'ideas', 'suggest', 'generate', 'think'],
      'document_processing': ['document', 'summarize', 'extract', 'process', 'read'],
      'research': ['research', 'investigate', 'find', 'search', 'facts']
    };

    for (const [taskType, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return taskType;
      }
    }

    return 'brainstorming'; // Default fallback
  }

  private explainChainChoice(taskType: string, models: string[], strategy: string): string {
    const explanations: Record<string, string> = {
      'creative_writing': `Creative writing task detected. Using ${models[0]} for its superior creative capabilities.`,
      'code_generation': `Code generation task. Using ${models[0]} to generate, then ${models[1] || 'same model'} to review and optimize.`,
      'code_review': `Code review task. Using ${models[0]} for its strong analytical and code comprehension abilities.`,
      'academic_analysis': `Academic analysis task. Using ${models[0]} for deep analysis, then ${models[1] || 'verification'} for verification.`,
      'translation': `Translation task. Using ${models[0]} for its multilingual capabilities, then ${models[1] || 'refinement'} for refinement.`,
      'research': `Research task. Using multiple models for different perspectives: ${models.join(' → ')}.`,
      'brainstorming': `Brainstorming task. Using ${models[0]} for idea generation${models[1] ? ` and ${models[1]} for expansion` : ''}.`,
      'document_processing': `Document processing task. Using ${models[0]} for its superior context window and processing capabilities.`
    };

    return explanations[taskType] || `Task type: ${taskType}. Using ${models.join(' → ')} with ${strategy} strategy.`;
  }

  async getModelCapabilities(modelId: string): Promise<ModelProfile | null> {
    const profiles = await this.loadProfiles();
    return profiles.models[modelId] || null;
  }

  async compareModels(modelIds: string[]): Promise<{
    comparison: Record<string, ModelCapabilities>;
    recommendations: string[];
  }> {
    const profiles = await this.loadProfiles();
    const comparison: Record<string, ModelCapabilities> = {};
    const recommendations: string[] = [];

    for (const modelId of modelIds) {
      const model = profiles.models[modelId];
      if (model) {
        comparison[modelId] = model.capabilities;
      }
    }

    // Generate recommendations based on capabilities
    const categories = ['reasoning', 'creativity', 'coding', 'analysis', 'writing', 'multilingual'];
    
    for (const category of categories) {
      let best = '';
      let bestScore = 0;
      
      for (const [modelId, capabilities] of Object.entries(comparison)) {
        if (capabilities[category as keyof ModelCapabilities] > bestScore) {
          bestScore = capabilities[category as keyof ModelCapabilities];
          best = modelId;
        }
      }
      
      if (best) {
        recommendations.push(`Best for ${category}: ${best} (${bestScore}/10)`);
      }
    }

    return { comparison, recommendations };
  }

  private getDefaultProfiles(): ModelProfiles {
    return {
      version: "1.0.0",
      lastUpdated: new Date().toISOString().split('T')[0],
      models: {
        chatgpt: {
          name: "ChatGPT",
          url: "https://chatgpt.com",
          capabilities: { reasoning: 8, creativity: 9, coding: 9, analysis: 8, writing: 8, multilingual: 8 },
          contextWindow: 128000,
          strengths: ["Code generation", "Creative content", "Problem-solving"],
          weaknesses: ["Real-time information", "Factual accuracy"],
          optimalFor: ["coding", "creative_tasks"],
          specializations: { code_generation: 9, creative_writing: 9 }
        },
        claude: {
          name: "Claude",
          url: "https://claude.ai",
          capabilities: { reasoning: 9, creativity: 8, coding: 8, analysis: 9, writing: 9, multilingual: 7 },
          contextWindow: 200000,
          strengths: ["Analysis", "Writing", "Reasoning"],
          weaknesses: ["Real-time information"],
          optimalFor: ["analysis", "writing"],
          specializations: { academic_writing: 9, code_explanation: 8 }
        },
        gemini: {
          name: "Gemini",
          url: "https://gemini.google.com",
          capabilities: { reasoning: 8, creativity: 7, coding: 8, analysis: 8, writing: 7, multilingual: 9 },
          contextWindow: 1000000,
          strengths: ["Large context", "Multilingual"],
          weaknesses: ["Creativity"],
          optimalFor: ["document_processing", "translation"],
          specializations: { translation: 9, large_context: 10 }
        }
      },
      taskTypes: {
        creative_writing: { name: "Creative Writing", optimalModel: "chatgpt", alternativeModels: ["claude"], chainStrategy: "single_best" },
        coding: { name: "Coding", optimalModel: "chatgpt", alternativeModels: ["claude"], chainStrategy: "generate_then_review" },
        analysis: { name: "Analysis", optimalModel: "claude", alternativeModels: ["gemini"], chainStrategy: "single_best" }
      },
      chainStrategies: {
        single_best: { description: "Use single best model", steps: 1 },
        generate_then_review: { description: "Generate then review", steps: 2, roles: ["generator", "reviewer"] }
      }
    };
  }
}

// Global instance
export const modelManager = new ModelManager();