import { FileSystemItem } from './FileSystemItem';
import { JDArea, JDCategory, JDItem } from './JohnnyDecimal';

export interface OrganizationSuggestion {
  id: string;
  file: FileSystemItem;
  suggestedArea: JDArea;
  suggestedCategory: JDCategory;
  suggestedItem?: JDItem;
  confidence: number;
  reasoning: string;
}