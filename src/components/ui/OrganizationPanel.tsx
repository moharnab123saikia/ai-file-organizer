import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FileSystemItem, JohnnyDecimalStructure, OrganizationSuggestion } from '../../types';
import { Brain, CheckCircle, XCircle, Settings, FolderTree, Activity, AlertCircle } from 'lucide-react';
import './OrganizationPanel.css';

export interface OrganizationPanelProps {
  files: FileSystemItem[];
  currentStructure?: JohnnyDecimalStructure;
  suggestions?: OrganizationSuggestion[];
  isAnalyzing?: boolean;
  error?: string;
  aiAvailable?: boolean;
  onOrganize?: (suggestions: OrganizationSuggestion[]) => void;
  onPreview?: (suggestions: OrganizationSuggestion[]) => void;
  onStructureChange?: (structure: JohnnyDecimalStructure) => void;
  onAnalyze?: (files: FileSystemItem[]) => void;
  onAcceptSuggestion?: (suggestion: OrganizationSuggestion) => void;
  onRejectSuggestion?: (suggestion: OrganizationSuggestion) => void;
  onBatchAccept?: (suggestions: OrganizationSuggestion[]) => void;
  onBatchReject?: (suggestions: OrganizationSuggestion[]) => void;
  onSettingsChange?: (settings: Partial<OrganizationSettings>) => void;
}

interface OrganizationSettings {
  confidenceThreshold: number;
  previewMode: boolean;
  createBackup: boolean;
}

export const OrganizationPanel: React.FC<OrganizationPanelProps> = ({
  files,
  currentStructure,
  suggestions = [],
  isAnalyzing = false,
  error,
  aiAvailable = true,
  onOrganize,
  onPreview,
  onStructureChange,
  onAnalyze,
  onAcceptSuggestion,
  onRejectSuggestion,
  onBatchAccept,
  onBatchReject,
  onSettingsChange
}) => {
  const [organizationType, setOrganizationType] = useState<string>('johnny-decimal');
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [settings, setSettings] = useState<OrganizationSettings>({
    confidenceThreshold: 0.8,
    previewMode: true,
    createBackup: true
  });
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showAddArea, setShowAddArea] = useState(false);

  const fileCount = files.length;
  const suggestionCount = suggestions.length;
  const selectedCount = selectedSuggestions.length;

  // Handle settings changes
  const handleSettingsChange = useCallback((newSettings: Partial<OrganizationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    onSettingsChange?.(newSettings);
  }, [settings, onSettingsChange]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestionId: string, selected: boolean) => {
    setSelectedSuggestions(prev => 
      selected 
        ? [...prev, suggestionId]
        : prev.filter(id => id !== suggestionId)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedSuggestions(selected ? suggestions.map(s => `${s.file.path}`) : []);
  }, [suggestions]);

  // Handle batch operations
  const handleBatchAccept = useCallback(() => {
    const selectedSuggestionObjects = suggestions.filter(s => 
      selectedSuggestions.includes(s.file.path)
    );
    onBatchAccept?.(selectedSuggestionObjects);
    setSelectedSuggestions([]);
  }, [suggestions, selectedSuggestions, onBatchAccept]);

  const handleBatchReject = useCallback(() => {
    const selectedSuggestionObjects = suggestions.filter(s => 
      selectedSuggestions.includes(s.file.path)
    );
    onBatchReject?.(selectedSuggestionObjects);
    setSelectedSuggestions([]);
  }, [suggestions, selectedSuggestions, onBatchReject]);

  // Handle individual suggestion actions
  const handleAcceptSuggestion = useCallback((suggestion: OrganizationSuggestion) => {
    onAcceptSuggestion?.(suggestion);
  }, [onAcceptSuggestion]);

  const handleRejectSuggestion = useCallback((suggestion: OrganizationSuggestion) => {
    onRejectSuggestion?.(suggestion);
  }, [onRejectSuggestion]);

  // Handle area editing
  const handleEditArea = useCallback((areaNumber: number) => {
    const area = currentStructure?.areas.find(a => a.number === areaNumber);
    if (area) {
      setEditingArea(String(areaNumber));
      setNewAreaName(area.name);
    }
  }, [currentStructure]);

  const handleSaveArea = useCallback(() => {
    if (!newAreaName.trim()) {
      setValidationErrors({ area: 'Area name is required' });
      return;
    }

    if (currentStructure && editingArea) {
      const updatedStructure = {
        ...currentStructure,
        areas: currentStructure.areas.map(area => 
          area.number === parseInt(editingArea)
            ? { ...area, name: newAreaName.trim() }
            : area
        )
      };
      onStructureChange?.(updatedStructure);
    }

    setEditingArea(null);
    setNewAreaName('');
    setValidationErrors({});
  }, [newAreaName, currentStructure, editingArea, onStructureChange]);

  const handleCancelEdit = useCallback(() => {
    setEditingArea(null);
    setNewAreaName('');
    setValidationErrors({});
  }, []);

  // Handle analysis
  const handleAnalyze = useCallback(() => {
    if (onAnalyze && files.length > 0) {
      onAnalyze(files);
    }
  }, [onAnalyze, files]);

  // Compute derived state
  const hasValidSuggestions = suggestions.length > 0;
  const canPerformActions = hasValidSuggestions && !isAnalyzing;
  const structureInfo = currentStructure 
    ? `${currentStructure.areas.length} area${currentStructure.areas.length !== 1 ? 's' : ''}, ${currentStructure.areas.reduce((sum, area) => sum + area.categories.length, 0)} categor${currentStructure.areas.reduce((sum, area) => sum + area.categories.length, 0) !== 1 ? 'ies' : 'y'}`
    : 'No structure defined';

  return (
    <div className="organization-panel" role="region" aria-label="Organization Panel">
      {/* Header */}
      <div className="organization-panel__header">
        <h2 className="organization-panel__title">
          <FolderTree className="organization-panel__title-icon" />
          File Organization
        </h2>
        
        {/* AI Status */}
        <div className="organization-panel__ai-status" data-testid="ai-status-indicator">
          <Brain className={`ai-status-icon ${aiAvailable ? 'ai-status-icon--online' : 'ai-status-icon--offline'}`} />
          <span className="ai-status-text">
            {aiAvailable ? 'AI Ready' : 'AI Offline'}
          </span>
        </div>
      </div>

      {/* File Count */}
      <div className="organization-panel__file-count">
        {fileCount > 0 ? `${fileCount} files selected` : 'No files selected'}
        {fileCount === 0 && <p className="file-count-message">Select files to organize</p>}
      </div>

      {/* Error Display */}
      {error && (
        <div className="organization-panel__error" role="alert">
          <AlertCircle className="error-icon" />
          <span>{error}</span>
          <button className="error-retry-btn" onClick={handleAnalyze}>Retry</button>
        </div>
      )}

      {/* AI Unavailable Message */}
      {!aiAvailable && (
        <div className="organization-panel__ai-unavailable" role="alert">
          <AlertCircle className="warning-icon" />
          <div>
            <p>AI service is not available</p>
            <p className="ai-config-message">Please check your AI configuration</p>
          </div>
        </div>
      )}

      {/* Organization Type Selector */}
      <div className="organization-panel__type-selector">
        <label htmlFor="organization-type" className="type-selector-label">
          Organization Type
        </label>
        <select 
          id="organization-type"
          value={organizationType} 
          onChange={(e) => setOrganizationType(e.target.value)}
          className="type-selector-dropdown"
          aria-label="Organization Type"
        >
          <option value="johnny-decimal">Johnny Decimal System</option>
          <option value="date-based">Date-Based Organization</option>
          <option value="type-based">File Type Organization</option>
          <option value="custom">Custom Structure</option>
        </select>
      </div>

      {/* Johnny Decimal Configuration */}
      {organizationType === 'johnny-decimal' && (
        <div className="organization-panel__structure-config">
          <h3>Structure Configuration</h3>
          <div className="structure-info">
            <h4>{currentStructure?.name || 'Johnny Decimal System'}</h4>
            <p className="structure-summary">{structureInfo}</p>
          </div>

          {/* Areas List */}
          {currentStructure && (
            <div className="areas-list">
              <h4>Areas</h4>
              {currentStructure.areas.map(area => (
                <div key={area.number} className="area-item">
                  {editingArea === String(area.number) ? (
                    <div className="area-edit-form">
                      <input
                        type="text"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        className="area-name-input"
                        placeholder="Area name"
                      />
                      {validationErrors.area && (
                        <span className="validation-error">{validationErrors.area}</span>
                      )}
                      <div className="area-edit-actions">
                        <button onClick={handleSaveArea} className="btn btn--primary">Save</button>
                        <button onClick={handleCancelEdit} className="btn btn--secondary">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="area-display">
                      <span className="area-name">{area.number} - {area.name}</span>
                      <button 
                        onClick={() => handleEditArea(area.number)}
                        className="btn btn--icon"
                        aria-label="Edit Area"
                      >
                        <Settings className="icon" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add New Area */}
              <button 
                onClick={() => setShowAddArea(true)}
                className="btn btn--outline add-area-btn"
                aria-label="Add Area"
              >
                Add New Area
              </button>
              
              {showAddArea && (
                <div className="add-area-dialog">
                  <h4>Add New Area</h4>
                  <input
                    type="text"
                    placeholder="Area name"
                    className="area-name-input"
                  />
                  <div className="dialog-actions">
                    <button className="btn btn--primary">Add</button>
                    <button 
                      onClick={() => setShowAddArea(false)}
                      className="btn btn--secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analysis Section */}
      <div className="organization-panel__analysis">
        <div className="analysis-header">
          <h3>AI Analysis</h3>
          {isAnalyzing && (
            <div className="analysis-progress" role="progressbar" aria-label="Analyzing files">
              <Activity className="progress-icon spinning" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing || fileCount === 0 || !aiAvailable}
          className="btn btn--primary analyze-btn"
          aria-label="Analyze Files"
        >
          {isAnalyzing ? 'Analyzing files with AI...' : 'Analyze Files'}
        </button>

        {isAnalyzing && (
          <div className="analysis-status" role="status" aria-live="polite">
            Analyzing files with AI...
          </div>
        )}

        {suggestionCount > 0 && (
          <p className="suggestion-count">
            {suggestionCount} suggestion{suggestionCount !== 1 ? 's' : ''} available
          </p>
        )}
      </div>

      {/* Suggestions Display */}
      <div className="organization-panel__suggestions">
        {hasValidSuggestions ? (
          <>
            <div className="suggestions-header">
              <h3>Organization Suggestions</h3>
              <div className="suggestions-controls">
                <label className="select-all-control">
                  <input
                    type="checkbox"
                    checked={selectedCount === suggestionCount}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select All"
                  />
                  Select All
                </label>
              </div>
            </div>

            {/* Batch Actions */}
            {selectedCount > 0 && (
              <div className="batch-actions">
                <button
                  onClick={handleBatchAccept}
                  className="btn btn--success"
                  aria-label="Accept Selected"
                >
                  Accept Selected ({selectedCount})
                </button>
                <button
                  onClick={handleBatchReject}
                  className="btn btn--danger"
                  aria-label="Reject Selected"
                >
                  Reject Selected ({selectedCount})
                </button>
              </div>
            )}

            {/* Suggestion List */}
            <div className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <div key={`${suggestion.file.path}-${index}`} className="suggestion-item">
                  <div className="suggestion-content">
                    <label className="suggestion-select">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions.includes(suggestion.file.path)}
                        onChange={(e) => handleSuggestionSelect(suggestion.file.path, e.target.checked)}
                      />
                    </label>
                    
                    <div className="suggestion-details">
                      <h4 className="file-name">{suggestion.file.name}</h4>
                      <p className="suggestion-path">
                        {suggestion.suggestedArea.name} → {suggestion.suggestedCategory.name}
                      </p>
                      <p className="suggestion-confidence">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </p>
                      <p className="suggestion-reasoning">{suggestion.reasoning}</p>
                    </div>
                  </div>
                  
                  <div className="suggestion-actions">
                    <button
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="btn btn--success btn--sm"
                      aria-label="Accept Suggestion"
                    >
                      <CheckCircle className="icon" />
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(suggestion)}
                      className="btn btn--danger btn--sm"
                      aria-label="Reject Suggestion"
                    >
                      <XCircle className="icon" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="suggestions-empty">
            <p>No suggestions available</p>
            <p className="empty-message">Run analysis to get organization suggestions</p>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="organization-panel__settings">
        <h3>Settings</h3>
        
        <div className="setting-item">
          <label htmlFor="confidence-threshold" className="setting-label">
            Confidence Threshold: {Math.round(settings.confidenceThreshold * 100)}%
          </label>
          <input
            id="confidence-threshold"
            type="range"
            min="0.5"
            max="1"
            step="0.1"
            value={settings.confidenceThreshold}
            onChange={(e) => handleSettingsChange({ confidenceThreshold: parseFloat(e.target.value) })}
            className="setting-slider"
            aria-label="Confidence Threshold"
          />
        </div>

        <div className="setting-item">
          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={settings.previewMode}
              onChange={(e) => handleSettingsChange({ previewMode: e.target.checked })}
              aria-label="Preview Mode"
            />
            Preview Mode
          </label>
        </div>

        <div className="setting-item">
          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={settings.createBackup}
              onChange={(e) => handleSettingsChange({ createBackup: e.target.checked })}
              aria-label="Create Backup"
            />
            Create Backup Before Organizing
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="organization-panel__actions">
        <button
          onClick={() => onPreview?.(suggestions)}
          disabled={!canPerformActions}
          className="btn btn--secondary"
          aria-label="Preview Organization"
        >
          Preview Organization
        </button>
        
        <button
          onClick={() => onOrganize?.(suggestions)}
          disabled={!canPerformActions}
          className="btn btn--primary"
          aria-label="Organize Files"
        >
          Organize Files
        </button>
      </div>
    </div>
  );
};

OrganizationPanel.displayName = 'OrganizationPanel';