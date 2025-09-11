import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsService } from '../SettingsService';
import type { AppSettings, ThemeSettings, ScanSettings, AISettings, UserOrganizationSettings, GeneralSettings } from '../../../types';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('SettingsService', () => {
  let settingsService: SettingsService;

  const defaultSettings: AppSettings = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    settingsService = new SettingsService();
  });

  describe('initialization', () => {
    it('should initialize with default settings when localStorage is empty', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await settingsService.initialize();
      const settings = settingsService.getSettings();

      expect(settings).toEqual(defaultSettings);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('ai-file-organizer-settings');
    });

    it('should load existing settings from localStorage', async () => {
      const existingSettings: Partial<AppSettings> = {
        theme: {
          mode: 'dark',
          primaryColor: '#ff6b35',
          fontSize: 'large',
          compactMode: true,
        },
        ai: {
          provider: 'ollama',
          model: 'codellama',
          maxTokens: 4096,
          temperature: 0.5,
          endpoint: 'http://localhost:11434',
          enabled: false,
        },
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingSettings));

      await settingsService.initialize();
      const settings = settingsService.getSettings();

      expect(settings.theme).toEqual(existingSettings.theme);
      expect(settings.ai).toEqual(existingSettings.ai);
      expect(settings.scan).toEqual(defaultSettings.scan); // Should use defaults for missing sections
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      await settingsService.initialize();
      const settings = settingsService.getSettings();

      expect(settings).toEqual(defaultSettings);
    });
  });

  describe('settings management', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      await settingsService.initialize();
    });

    it('should update theme settings', async () => {
      const newTheme: ThemeSettings = {
        mode: 'dark',
        primaryColor: '#28a745',
        fontSize: 'large',
        compactMode: true,
      };

      await settingsService.updateThemeSettings(newTheme);
      const settings = settingsService.getSettings();

      expect(settings.theme).toEqual(newTheme);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ai-file-organizer-settings',
        JSON.stringify(settings)
      );
    });

    it('should update scan settings', async () => {
      const newScan: ScanSettings = {
        maxDepth: 5,
        includeHidden: true,
        excludePatterns: ['node_modules', '.git'],
        maxFileSize: 50 * 1024 * 1024,
        followSymlinks: true,
      };

      await settingsService.updateScanSettings(newScan);
      const settings = settingsService.getSettings();

      expect(settings.scan).toEqual(newScan);
    });

    it('should update AI settings', async () => {
      const newAI: AISettings = {
        provider: 'ollama',
        model: 'mistral',
        maxTokens: 1024,
        temperature: 0.3,
        endpoint: 'http://localhost:11434',
        enabled: false,
      };

      await settingsService.updateAISettings(newAI);
      const settings = settingsService.getSettings();

      expect(settings.ai).toEqual(newAI);
    });

    it('should update organization settings', async () => {
      const newOrg: UserOrganizationSettings = {
        autoOrganize: true,
        confirmBeforeMove: false,
        createBackups: false,
        preserveOriginalStructure: false,
      };

      await settingsService.updateOrganizationSettings(newOrg);
      const settings = settingsService.getSettings();

      expect(settings.organization).toEqual(newOrg);
    });

    it('should validate settings before updating', async () => {
      const invalidTheme = {
        mode: 'invalid-mode',
        primaryColor: 'not-a-color',
        fontSize: 'huge',
        compactMode: 'yes',
      } as any;

      await expect(settingsService.updateThemeSettings(invalidTheme)).rejects.toThrow(
        'Invalid theme settings'
      );
    });
  });

  describe('settings validation', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      await settingsService.initialize();
    });

    it('should validate theme mode', () => {
      const validTheme: ThemeSettings = {
        mode: 'dark',
        primaryColor: '#007bff',
        fontSize: 'medium',
        compactMode: false,
      };

      const invalidTheme = { ...validTheme, mode: 'rainbow' as any };

      expect(() => settingsService.validateThemeSettings(validTheme)).not.toThrow();
      expect(() => settingsService.validateThemeSettings(invalidTheme)).toThrow();
    });

    it('should validate color format', () => {
      const validTheme: ThemeSettings = {
        mode: 'light',
        primaryColor: '#ff6b35',
        fontSize: 'medium',
        compactMode: false,
      };

      const invalidTheme = { ...validTheme, primaryColor: 'not-a-color' };

      expect(() => settingsService.validateThemeSettings(validTheme)).not.toThrow();
      expect(() => settingsService.validateThemeSettings(invalidTheme)).toThrow();
    });

    it('should validate scan settings ranges', () => {
      const validScan: ScanSettings = {
        maxDepth: 5,
        includeHidden: false,
        excludePatterns: ['node_modules'],
        maxFileSize: 1024 * 1024,
        followSymlinks: false,
      };

      const invalidScan = { ...validScan, maxDepth: -1 };

      expect(() => settingsService.validateScanSettings(validScan)).not.toThrow();
      expect(() => settingsService.validateScanSettings(invalidScan)).toThrow();
    });
  });

  describe('settings export/import', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      await settingsService.initialize();
    });

    it('should export settings as JSON', async () => {
      const exported = await settingsService.exportSettings();
      const parsed = JSON.parse(exported);

      expect(parsed).toEqual(defaultSettings);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.version).toBeDefined();
    });

    it('should import valid settings', async () => {
      const settingsToImport: AppSettings = {
        ...defaultSettings,
        theme: { ...defaultSettings.theme, mode: 'dark' },
      };

      const exportedData = {
        ...settingsToImport,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      await settingsService.importSettings(JSON.stringify(exportedData));
      const settings = settingsService.getSettings();

      expect(settings.theme.mode).toBe('dark');
    });

    it('should reject invalid import data', async () => {
      await expect(settingsService.importSettings('invalid-json')).rejects.toThrow(
        'Invalid settings format'
      );

      await expect(settingsService.importSettings('{}')).rejects.toThrow(
        'Invalid settings structure'
      );
    });
  });

  describe('settings events', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      await settingsService.initialize();
    });

    it('should emit events when settings change', async () => {
      const eventSpy = vi.fn();
      settingsService.onSettingsChange(eventSpy);

      const newTheme: ThemeSettings = {
        mode: 'dark',
        primaryColor: '#28a745',
        fontSize: 'large',
        compactMode: true,
      };

      await settingsService.updateThemeSettings(newTheme);

      expect(eventSpy).toHaveBeenCalledWith({
        type: 'theme',
        settings: newTheme,
        timestamp: expect.any(Date),
      });
    });

    it('should allow multiple event listeners', async () => {
      const eventSpy1 = vi.fn();
      const eventSpy2 = vi.fn();
      
      settingsService.onSettingsChange(eventSpy1);
      settingsService.onSettingsChange(eventSpy2);

      await settingsService.updateThemeSettings({
        mode: 'dark',
        primaryColor: '#007bff',
        fontSize: 'medium',
        compactMode: false,
      });

      expect(eventSpy1).toHaveBeenCalled();
      expect(eventSpy2).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const eventSpy = vi.fn();
      const unsubscribe = settingsService.onSettingsChange(eventSpy);

      unsubscribe();

      await settingsService.updateThemeSettings({
        mode: 'dark',
        primaryColor: '#007bff',
        fontSize: 'medium',
        compactMode: false,
      });

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    beforeEach(async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      await settingsService.initialize();
    });

    it('should reset to default settings', async () => {
      // First modify some settings
      await settingsService.updateThemeSettings({
        mode: 'dark',
        primaryColor: '#ff0000',
        fontSize: 'large',
        compactMode: true,
      });

      // Then reset
      await settingsService.resetToDefaults();
      const settings = settingsService.getSettings();

      expect(settings).toEqual(defaultSettings);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ai-file-organizer-settings',
        JSON.stringify(defaultSettings)
      );
    });

    it('should emit reset event', async () => {
      const eventSpy = vi.fn();
      settingsService.onSettingsChange(eventSpy);

      await settingsService.resetToDefaults();

      expect(eventSpy).toHaveBeenCalledWith({
        type: 'reset',
        settings: defaultSettings,
        timestamp: expect.any(Date),
      });
    });
  });
});