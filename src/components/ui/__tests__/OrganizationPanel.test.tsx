import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OrganizationPanel } from '../OrganizationPanel';
import { FileSystemItem, JohnnyDecimalStructure, OrganizationSuggestion } from '../../../types';

// Mock AI service
vi.mock('../../../services/ai/OllamaService', () => ({
  OllamaService: {
    getInstance: vi.fn(() => ({
      isAvailable: vi.fn().mockResolvedValue(true),
      analyzeFiles: vi.fn().mockResolvedValue([]),
      getStatus: vi.fn().mockReturnValue('online')
    }))
  }
}));

// Mock organization engine
vi.mock('../../../services/organization/JohnnyDecimalEngine', () => ({
  JohnnyDecimalEngine: {
    getInstance: vi.fn(() => ({
      analyzeFiles: vi.fn().mockResolvedValue([]),
      generateSuggestions: vi.fn().mockResolvedValue([]),
      validateStructure: vi.fn().mockResolvedValue({ isValid: true, errors: [] })
    }))
  }
}));

const mockFiles: FileSystemItem[] = [
  {
    id: 'file-1',
    name: 'document.pdf',
    type: 'file',
    path: '/test/document.pdf',
    size: 1024000,
    modifiedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    extension: 'pdf',
    mimeType: 'application/pdf',
    children: []
  },
  {
    id: 'file-2',
    name: 'spreadsheet.xlsx',
    type: 'file',
    path: '/test/spreadsheet.xlsx',
    size: 512000,
    modifiedAt: new Date('2024-01-02'),
    createdAt: new Date('2024-01-02'),
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    children: []
  },
  {
    id: 'file-3',
    name: 'image.jpg',
    type: 'file',
    path: '/test/image.jpg',
    size: 2048000,
    modifiedAt: new Date('2024-01-03'),
    createdAt: new Date('2024-01-03'),
    extension: 'jpg',
    mimeType: 'image/jpeg',
    children: []
  }
];

const mockStructure: JohnnyDecimalStructure = {
  id: 'test-structure',
  name: 'Test Structure',
  description: 'Test Johnny Decimal structure for organization panel testing',
  rootPath: '/test',
  createdAt: new Date('2024-01-01'),
  modifiedAt: new Date('2024-01-01'),
  version: '1.0.0',
  areas: [
    {
      number: 10,
      name: 'Administration',
      description: 'Administrative documents',
      color: '#3B82F6',
      icon: 'folder',
      isActive: true,
      categories: [
        {
          number: 11,
          name: 'Correspondence',
          description: 'Letters and emails',
          isActive: true,
          items: [
            {
              number: '11.01',
              name: 'Business Letters',
              description: 'Formal business correspondence',
              files: [],
              tags: [],
              isActive: true
            }
          ]
        }
      ]
    }
  ]
};

const mockSuggestions: OrganizationSuggestion[] = [
  {
    id: 'suggestion-1',
    file: {
      id: 'file-1',
      name: 'document.pdf',
      path: '/test/document.pdf',
      size: 1024000,
      type: 'file',
      extension: 'pdf',
      createdAt: new Date('2024-01-01'),
      modifiedAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-01')
    },
    suggestedArea: {
      number: 10,
      name: 'Administration',
      isActive: true,
      categories: []
    },
    suggestedCategory: {
      number: 11,
      name: 'Correspondence',
      isActive: true,
      items: []
    },
    suggestedItem: {
      number: '11.01',
      name: 'Business Letters',
      files: [],
      tags: [],
      isActive: true
    },
    confidence: 0.85,
    reasoning: 'PDF document likely contains business correspondence'
  }
];

describe('OrganizationPanel Component', () => {
  const defaultProps = {
    files: mockFiles,
    currentStructure: mockStructure,
    onOrganize: vi.fn(),
    onPreview: vi.fn(),
    onStructureChange: vi.fn(),
    isAnalyzing: false,
    suggestions: mockSuggestions
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders organization panel correctly', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByText('File Organization')).toBeInTheDocument();
      expect(screen.getByText('Johnny Decimal System')).toBeInTheDocument();
    });

    it('displays file count', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByText('3 files selected')).toBeInTheDocument();
    });

    it('shows AI status indicator', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByTestId('ai-status-indicator')).toBeInTheDocument();
    });

    it('displays organization type selector', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      const selector = screen.getByRole('combobox', { name: /organization type/i });
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveValue('johnny-decimal');
    });

    it('shows current structure information', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByText('Test Structure')).toBeInTheDocument();
      expect(screen.getByText('1 area, 1 category')).toBeInTheDocument();
    });
  });

  describe('Organization Type Selection', () => {
    it('allows changing organization type', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} />);
      
      const selector = screen.getByRole('combobox', { name: /organization type/i });
      await user.selectOptions(selector, 'date-based');
      
      expect(selector).toHaveValue('date-based');
    });

    it('shows Johnny Decimal configuration when selected', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByText('Structure Configuration')).toBeInTheDocument();
      expect(screen.getByText('Areas')).toBeInTheDocument();
    });

    it('hides Johnny Decimal config when other type selected', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} />);
      
      const selector = screen.getByRole('combobox', { name: /organization type/i });
      await user.selectOptions(selector, 'date-based');
      
      expect(screen.queryByText('Structure Configuration')).not.toBeInTheDocument();
    });
  });

  describe('AI Analysis', () => {
    it('shows analyze button when not analyzing', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      const analyzeButton = screen.getByRole('button', { name: /analyze files/i });
      expect(analyzeButton).toBeInTheDocument();
      expect(analyzeButton).not.toBeDisabled();
    });

    it('shows analyzing state', () => {
      render(<OrganizationPanel {...defaultProps} isAnalyzing={true} />);
      
      expect(screen.getByRole('status')).toHaveTextContent('Analyzing files with AI...');
      expect(screen.getByRole('button', { name: /analyze files/i })).toBeDisabled();
    });

    it('calls analyze function when button clicked', async () => {
      const user = userEvent.setup();
      const mockAnalyze = vi.fn();
      render(<OrganizationPanel {...defaultProps} onAnalyze={mockAnalyze} />);
      
      const analyzeButton = screen.getByRole('button', { name: /analyze files/i });
      await user.click(analyzeButton);
      
      expect(mockAnalyze).toHaveBeenCalledWith(mockFiles);
    });

    it('shows progress indicator during analysis', () => {
      render(<OrganizationPanel {...defaultProps} isAnalyzing={true} />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays analysis results count', () => {
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      expect(screen.getByText('1 suggestion available')).toBeInTheDocument();
    });
  });

  describe('Suggestions Display', () => {
    it('shows suggestions when available', () => {
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      expect(screen.getByText('Organization Suggestions')).toBeInTheDocument();
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('Administration → Correspondence')).toBeInTheDocument();
    });

    it('displays confidence levels', () => {
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      expect(screen.getByText('85% confidence')).toBeInTheDocument();
    });

    it('shows reasoning for suggestions', () => {
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      expect(screen.getByText('PDF document likely contains business correspondence')).toBeInTheDocument();
    });

    it('allows accepting individual suggestions', async () => {
      const user = userEvent.setup();
      const mockAccept = vi.fn();
      render(<OrganizationPanel {...defaultProps} onAcceptSuggestion={mockAccept} />);
      
      const acceptButton = screen.getByRole('button', { name: /accept suggestion/i });
      await user.click(acceptButton);
      
      expect(mockAccept).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('allows rejecting individual suggestions', async () => {
      const user = userEvent.setup();
      const mockReject = vi.fn();
      render(<OrganizationPanel {...defaultProps} onRejectSuggestion={mockReject} />);
      
      const rejectButton = screen.getByRole('button', { name: /reject suggestion/i });
      await user.click(rejectButton);
      
      expect(mockReject).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('shows empty state when no suggestions', () => {
      render(<OrganizationPanel {...defaultProps} suggestions={[]} />);
      
      expect(screen.getByText('No suggestions available')).toBeInTheDocument();
      expect(screen.getByText('Run analysis to get organization suggestions')).toBeInTheDocument();
    });
  });

  describe('Structure Configuration', () => {
    it('displays current structure areas', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByText('10 - Administration')).toBeInTheDocument();
    });

    it('allows editing area names', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit area/i });
      await user.click(editButton);
      
      const input = screen.getByDisplayValue('Administration');
      await user.clear(input);
      await user.type(input, 'Management');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(defaultProps.onStructureChange).toHaveBeenCalled();
    });

    it('allows adding new areas', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} />);
      
      const addButton = screen.getByRole('button', { name: /add area/i });
      await user.click(addButton);
      
      expect(screen.getByRole('heading', { name: 'Add New Area' })).toBeInTheDocument();
    });

    it('validates structure changes', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit area/i });
      await user.click(editButton);
      
      const input = screen.getByDisplayValue('Administration');
      await user.clear(input);
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(screen.getByText('Area name is required')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('shows preview button when suggestions available', () => {
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      const previewButton = screen.getByRole('button', { name: /preview organization/i });
      expect(previewButton).toBeInTheDocument();
      expect(previewButton).not.toBeDisabled();
    });

    it('shows organize button when suggestions available', () => {
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      const organizeButton = screen.getByRole('button', { name: /organize files/i });
      expect(organizeButton).toBeInTheDocument();
      expect(organizeButton).not.toBeDisabled();
    });

    it('disables buttons when no suggestions', () => {
      render(<OrganizationPanel {...defaultProps} suggestions={[]} />);
      
      const previewButton = screen.getByRole('button', { name: /preview organization/i });
      const organizeButton = screen.getByRole('button', { name: /organize files/i });
      
      expect(previewButton).toBeDisabled();
      expect(organizeButton).toBeDisabled();
    });

    it('disables buttons during analysis', () => {
      render(<OrganizationPanel {...defaultProps} isAnalyzing={true} />);
      
      const previewButton = screen.getByRole('button', { name: /preview organization/i });
      const organizeButton = screen.getByRole('button', { name: /organize files/i });
      
      expect(previewButton).toBeDisabled();
      expect(organizeButton).toBeDisabled();
    });

    it('calls preview function when preview clicked', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      const previewButton = screen.getByRole('button', { name: /preview organization/i });
      await user.click(previewButton);
      
      expect(defaultProps.onPreview).toHaveBeenCalledWith(mockSuggestions);
    });

    it('calls organize function when organize clicked', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      const organizeButton = screen.getByRole('button', { name: /organize files/i });
      await user.click(organizeButton);
      
      expect(defaultProps.onOrganize).toHaveBeenCalledWith(mockSuggestions);
    });
  });

  describe('Batch Operations', () => {
    it('allows selecting all suggestions', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      await user.click(selectAllCheckbox);
      
      expect(selectAllCheckbox).toBeChecked();
    });

    it('shows batch action buttons when suggestions selected', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      await user.click(selectAllCheckbox);
      
      expect(screen.getByRole('button', { name: /accept selected/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject selected/i })).toBeInTheDocument();
    });

    it('performs batch accept operation', async () => {
      const user = userEvent.setup();
      const mockBatchAccept = vi.fn();
      render(<OrganizationPanel {...defaultProps} onBatchAccept={mockBatchAccept} />);
      
      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      await user.click(selectAllCheckbox);
      
      const batchAcceptButton = screen.getByRole('button', { name: /accept selected/i });
      await user.click(batchAcceptButton);
      
      expect(mockBatchAccept).toHaveBeenCalledWith(mockSuggestions);
    });
  });

  describe('Settings and Configuration', () => {
    it('shows confidence threshold setting', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByLabelText(/confidence threshold/i)).toBeInTheDocument();
    });

    it('allows adjusting confidence threshold', async () => {
      const user = userEvent.setup();
      const mockSettingsChange = vi.fn();
      render(<OrganizationPanel {...defaultProps} onSettingsChange={mockSettingsChange} />);
      
      const slider = screen.getByLabelText(/confidence threshold/i);
      fireEvent.change(slider, { target: { value: '0.7' } });
      
      expect(mockSettingsChange).toHaveBeenCalledWith({ confidenceThreshold: 0.7 });
    });

    it('shows preview mode toggle', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByLabelText(/preview mode/i)).toBeInTheDocument();
    });

    it('shows backup creation option', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByLabelText(/create backup/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error when analysis fails', () => {
      render(<OrganizationPanel {...defaultProps} error="Analysis failed: Connection timeout" />);
      
      expect(screen.getByText('Analysis failed: Connection timeout')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('shows AI service unavailable message', () => {
      render(<OrganizationPanel {...defaultProps} aiAvailable={false} />);
      
      expect(screen.getByText('AI service is not available')).toBeInTheDocument();
      expect(screen.getByText('Please check your AI configuration')).toBeInTheDocument();
    });

    it('handles empty file list gracefully', () => {
      render(<OrganizationPanel {...defaultProps} files={[]} />);
      
      expect(screen.getByText('No files selected')).toBeInTheDocument();
      expect(screen.getByText('Select files to organize')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<OrganizationPanel {...defaultProps} />);
      
      expect(screen.getByRole('region', { name: /organization panel/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<OrganizationPanel {...defaultProps} suggestions={mockSuggestions} />);
      
      await user.tab();
      expect(screen.getByRole('combobox', { name: /organization type/i })).toHaveFocus();
    });

    it('announces status changes to screen readers', () => {
      render(<OrganizationPanel {...defaultProps} isAnalyzing={true} />);
      
      expect(screen.getByRole('status')).toHaveTextContent('Analyzing files with AI...');
    });
  });
});