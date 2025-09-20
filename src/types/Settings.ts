export interface AppSettings {
  general: GeneralSettings;
  theme: ThemeSettings;
  scan: ScanSettings;
  ai: AISettings;
  organization: UserOrganizationSettings;
}

export interface GeneralSettings {
  language: string;
  autoSave: boolean;
  confirmBeforeExit: boolean;
  showWelcomeScreen: boolean;
  enableAnalytics: boolean;
  checkForUpdates: boolean;
  confirmOnExit: boolean;
  showTips: boolean;
  showNotifications: boolean;
}

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  animations: boolean;
  compactMode: boolean;
}

export interface ScanSettings {
  maxDepth: number;
  followSymlinks: boolean;
  includeHidden: boolean;
  excludePatterns: string[];
  maxFileSize: number;
  scanThreads: number;
}

export interface AISettings {
  provider: 'ollama' | 'openai' | 'anthropic';
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  baseUrl?: string;
  apiKey?: string;
  endpoint: string;
  enabled: boolean;
  retryAttempts: number;
}

export interface UserOrganizationSettings {
  defaultStructure: string;
  autoApplyRules: boolean;
  createBackups: boolean;
  confirmOperations: boolean;
  preserveOriginalPaths: boolean;
  defaultCategories: string[];
  autoOrganize: boolean;
  confirmBeforeMove: boolean;
  preserveOriginalStructure: boolean;
  customRules: OrganizationRule[];
}

export interface OrganizationRule {
  id: string;
  name: string;
  pattern: string;
  target: string;
  enabled: boolean;
}

export interface SettingsChangeEvent {
  type: string;
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  settings: Partial<AppSettings>;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: SettingsValidationError[];
  warnings: SettingsValidationWarning[];
}

export interface SettingsValidationError {
  code: string;
  message: string;
  field: string;
  severity: 'error';
}

export interface SettingsValidationWarning {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}