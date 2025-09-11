import type { 
  AppSettings, 
  ThemeSettings, 
  ScanSettings, 
  AISettings, 
  UserOrganizationSettings, 
  GeneralSettings,
  SettingsChangeEvent,
  SettingsValidationResult,
  SettingsValidationError,
  SettingsValidationWarning
} from '../../types';

export class SettingsService {
  private settings: AppSettings;
  private eventListeners: ((event: SettingsChangeEvent) => void)[] = [];
  private readonly STORAGE_KEY = 'ai-file-organizer-settings';
  private readonly SETTINGS_VERSION = '1.0.0';

  constructor() {
    this.settings = this.getDefaultSettings();
  }

  /**
   * Initialize the settings service by loading from localStorage
   */
  public async initialize(): Promise<void> {
    try {
      const storedSettings = localStorage.getItem(this.STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        this.settings = this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage, using defaults:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * Get current settings
   */
  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Update theme settings
   */
  public async updateThemeSettings(themeSettings: ThemeSettings): Promise<void> {
    this.validateThemeSettings(themeSettings);
    
    this.settings.theme = { ...themeSettings };
    await this.saveSettings();
    
    this.emitEvent({
      type: 'theme',
      settings: themeSettings,
      timestamp: new Date(),
    });
  }

  /**
   * Update scan settings
   */
  public async updateScanSettings(scanSettings: ScanSettings): Promise<void> {
    this.validateScanSettings(scanSettings);
    
    this.settings.scan = { ...scanSettings };
    await this.saveSettings();
    
    this.emitEvent({
      type: 'scan',
      settings: scanSettings,
      timestamp: new Date(),
    });
  }

  /**
   * Update AI settings
   */
  public async updateAISettings(aiSettings: AISettings): Promise<void> {
    this.validateAISettings(aiSettings);
    
    this.settings.ai = { ...aiSettings };
    await this.saveSettings();
    
    this.emitEvent({
      type: 'ai',
      settings: aiSettings,
      timestamp: new Date(),
    });
  }

  /**
   * Update organization settings
   */
  public async updateOrganizationSettings(orgSettings: UserOrganizationSettings): Promise<void> {
    this.validateOrganizationSettings(orgSettings);
    
    this.settings.organization = { ...orgSettings };
    await this.saveSettings();
    
    this.emitEvent({
      type: 'organization',
      settings: orgSettings,
      timestamp: new Date(),
    });
  }

  /**
   * Update general settings
   */
  public async updateGeneralSettings(generalSettings: GeneralSettings): Promise<void> {
    this.validateGeneralSettings(generalSettings);
    
    this.settings.general = { ...generalSettings };
    await this.saveSettings();
    
    this.emitEvent({
      type: 'general',
      settings: generalSettings,
      timestamp: new Date(),
    });
  }

  /**
   * Reset all settings to defaults
   */
  public async resetToDefaults(): Promise<void> {
    this.settings = this.getDefaultSettings();
    await this.saveSettings();
    
    this.emitEvent({
      type: 'reset',
      settings: this.settings,
      timestamp: new Date(),
    });
  }

  /**
   * Export settings as JSON string
   */
  public async exportSettings(): Promise<string> {
    const exportData = {
      settings: this.settings,
      exportedAt: new Date().toISOString(),
      version: this.SETTINGS_VERSION,
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import settings from JSON string
   */
  public async importSettings(settingsJson: string): Promise<void> {
    try {
      const importData = JSON.parse(settingsJson);
      
      if (!importData.settings) {
        throw new Error('Invalid settings structure');
      }
      
      // Validate the imported settings structure
      this.validateImportedSettings(importData.settings);
      
      this.settings = this.mergeWithDefaults(importData.settings);
      await this.saveSettings();
      
      this.emitEvent({
        type: 'reset',
        settings: this.settings,
        timestamp: new Date(),
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid settings format');
      }
      throw error;
    }
  }

  /**
   * Add event listener for settings changes
   */
  public onSettingsChange(listener: (event: SettingsChangeEvent) => void): () => void {
    this.eventListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Validate theme settings
   */
  public validateThemeSettings(settings: ThemeSettings): void {
    const validModes = ['light', 'dark', 'system', 'high_contrast'];
    if (!validModes.includes(settings.mode)) {
      throw new Error('Invalid theme mode');
    }
    
    const validFontSizes = ['small', 'medium', 'large', 'extra-large'];
    if (!validFontSizes.includes(settings.fontSize)) {
      throw new Error('Invalid font size');
    }
    
    // Validate color format (simple hex color validation)
    if (!/^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor)) {
      throw new Error('Invalid color format');
    }
    
    if (typeof settings.compactMode !== 'boolean') {
      throw new Error('Invalid compact mode value');
    }
  }

  /**
   * Validate scan settings
   */
  public validateScanSettings(settings: ScanSettings): void {
    if (settings.maxDepth < 0 || settings.maxDepth > 50) {
      throw new Error('Max depth must be between 0 and 50');
    }
    
    if (typeof settings.includeHidden !== 'boolean') {
      throw new Error('Include hidden must be boolean');
    }
    
    if (!Array.isArray(settings.excludePatterns)) {
      throw new Error('Exclude patterns must be array');
    }
    
    if (settings.maxFileSize < 0) {
      throw new Error('Max file size must be positive');
    }
    
    if (typeof settings.followSymlinks !== 'boolean') {
      throw new Error('Follow symlinks must be boolean');
    }
  }

  /**
   * Validate AI settings
   */
  public validateAISettings(settings: AISettings): void {
    const validProviders = ['ollama', 'openai', 'anthropic', 'local'];
    if (!validProviders.includes(settings.provider)) {
      throw new Error('Invalid AI provider');
    }
    
    if (!settings.model || typeof settings.model !== 'string') {
      throw new Error('Model name is required');
    }
    
    if (settings.maxTokens < 1 || settings.maxTokens > 32000) {
      throw new Error('Max tokens must be between 1 and 32000');
    }
    
    if (settings.temperature < 0 || settings.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }
    
    if (!settings.endpoint || typeof settings.endpoint !== 'string') {
      throw new Error('Endpoint is required');
    }
    
    if (typeof settings.enabled !== 'boolean') {
      throw new Error('Enabled must be boolean');
    }
  }

  /**
   * Validate organization settings
   */
  public validateOrganizationSettings(settings: UserOrganizationSettings): void {
    if (typeof settings.autoOrganize !== 'boolean') {
      throw new Error('Auto organize must be boolean');
    }
    
    if (typeof settings.confirmBeforeMove !== 'boolean') {
      throw new Error('Confirm before move must be boolean');
    }
    
    if (typeof settings.createBackups !== 'boolean') {
      throw new Error('Create backups must be boolean');
    }
    
    if (typeof settings.preserveOriginalStructure !== 'boolean') {
      throw new Error('Preserve original structure must be boolean');
    }
  }

  /**
   * Validate general settings
   */
  public validateGeneralSettings(settings: GeneralSettings): void {
    if (!settings.language || typeof settings.language !== 'string') {
      throw new Error('Language is required');
    }
    
    if (typeof settings.autoSave !== 'boolean') {
      throw new Error('Auto save must be boolean');
    }
    
    if (typeof settings.confirmOnExit !== 'boolean') {
      throw new Error('Confirm on exit must be boolean');
    }
    
    if (typeof settings.showTips !== 'boolean') {
      throw new Error('Show tips must be boolean');
    }
    
    if (typeof settings.checkForUpdates !== 'boolean') {
      throw new Error('Check for updates must be boolean');
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): AppSettings {
    return {
      theme: {
        mode: 'light',
        primaryColor: '#007bff',
        fontSize: 'medium',
        compactMode: false,
      },
      scan: {
        maxDepth: 10,
        includeHidden: false,
        excludePatterns: ['node_modules', '.git', 'dist', 'build'],
        maxFileSize: 100 * 1024 * 1024, // 100MB
        followSymlinks: false,
      },
      ai: {
        provider: 'ollama',
        model: 'llama3.2',
        maxTokens: 2048,
        temperature: 0.7,
        endpoint: 'http://localhost:11434',
        enabled: true,
      },
      organization: {
        autoOrganize: false,
        confirmBeforeMove: true,
        createBackups: true,
        preserveOriginalStructure: true,
      },
      general: {
        language: 'en',
        autoSave: true,
        confirmOnExit: true,
        showTips: true,
        checkForUpdates: true,
      },
    };
  }

  /**
   * Merge imported settings with defaults
   */
  private mergeWithDefaults(importedSettings: Partial<AppSettings>): AppSettings {
    const defaults = this.getDefaultSettings();
    
    return {
      theme: { ...defaults.theme, ...importedSettings.theme },
      scan: { ...defaults.scan, ...importedSettings.scan },
      ai: { ...defaults.ai, ...importedSettings.ai },
      organization: { ...defaults.organization, ...importedSettings.organization },
      general: { ...defaults.general, ...importedSettings.general },
    };
  }

  /**
   * Save settings to localStorage
   */
  private async saveSettings(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Emit settings change event
   */
  private emitEvent(event: SettingsChangeEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in settings event listener:', error);
      }
    });
  }

  /**
   * Validate imported settings structure
   */
  private validateImportedSettings(settings: any): void {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings structure');
    }
    
    // Basic structure validation
    const requiredSections = ['theme', 'scan', 'ai', 'organization', 'general'];
    for (const section of requiredSections) {
      if (!settings[section] || typeof settings[section] !== 'object') {
        throw new Error(`Missing or invalid ${section} settings`);
      }
    }
  }
}