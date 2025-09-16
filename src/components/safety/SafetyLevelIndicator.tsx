import React from 'react';
import { SafetyLevel } from '../../types/SafetyLevel';

interface SafetyLevelIndicatorProps {
  level: SafetyLevel;
}

export const SafetyLevelIndicator: React.FC<SafetyLevelIndicatorProps> = ({ level }) => {
  const levelText = level.charAt(0).toUpperCase() + level.slice(1);
  const className = `safety-level-indicator--${level}`;

  return (
    <div className={`safety-level-indicator ${className}`}>
      {levelText}
    </div>
  );
};