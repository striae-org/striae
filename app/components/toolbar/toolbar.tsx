import { useState } from 'react';
import { Button } from '../button/button';
import { ToolbarColorSelector } from './toolbar-color-selector';
import styles from './toolbar.module.css';

type ToolId = 'number' | 'class' | 'index' | 'id' | 'notes' | 'print' | 'visibility' | 'box';

interface ToolbarProps {
  onToolSelect?: (toolId: ToolId, active: boolean) => void;
  onGeneratePDF?: () => void;
  canGeneratePDF?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  isGeneratingPDF?: boolean;
  onColorChange?: (color: string) => void;
  selectedColor?: string;
}

export const Toolbar = ({ 
  onToolSelect, 
  onVisibilityChange, 
  onGeneratePDF, 
  canGeneratePDF, 
  isGeneratingPDF = false,
  onColorChange,
  selectedColor = '#ff0000'
}: ToolbarProps) => {
  const [activeTools, setActiveTools] = useState<Set<ToolId>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const [showColorSelector, setShowColorSelector] = useState(false);

  const handleToolClick = (toolId: ToolId) => {
    if (toolId === 'print') {
      if (onGeneratePDF && canGeneratePDF) {
        onGeneratePDF();
      }
      onToolSelect?.('print', true);
      return;
    }

    if (toolId === 'visibility') {
      setIsVisible(!isVisible);
      onVisibilityChange?.(!isVisible);
      return;
    }

    setActiveTools(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
        // Hide color selector when box tool is deactivated
        if (toolId === 'box') {
          setShowColorSelector(false);
        }
      } else {
        next.add(toolId);
        // Show color selector when box tool is activated
        if (toolId === 'box') {
          setShowColorSelector(true);
        }
      }
      onToolSelect?.(toolId, next.has(toolId));
      return next;
    });    
  };

  const handleColorConfirm = (color: string) => {
    onColorChange?.(color);
    setShowColorSelector(false);
  };

  const handleColorCancel = () => {
    setShowColorSelector(false);
  };

  return (
    <div className={styles.toolbarContainer}>
      <div className={`${styles.toolbar} ${!isVisible ? styles.hidden : ''}`}>
        <div className={styles.toggleButton}>
          <Button
            iconId={isVisible ? 'eye-off' : 'eye'}
            isActive={false}
            onClick={() => handleToolClick('visibility')}
            ariaLabel={isVisible ? "Hide toolbar" : "Show toolbar"}            
          />
        </div>
      <div className={styles.toolbarContent} role="toolbar" aria-label="Annotation tools">         
      <Button
        iconId="number"
        isActive={activeTools.has('number')}
        onClick={() => handleToolClick('number')}
        ariaLabel="Case & Item Numbers"
      />
      <Button
        iconId="class"
        isActive={activeTools.has('class')}
        onClick={() => handleToolClick('class')}
        ariaLabel="Class Characteristics"
      />
      <Button
        iconId="index"
        isActive={activeTools.has('index')}
        onClick={() => handleToolClick('index')}
        ariaLabel="Index Marks"
      />
      <Button
        iconId="id"
        isActive={activeTools.has('id')}
        onClick={() => handleToolClick('id')}
        ariaLabel="Support Level"
      />
      <Button
        iconId="box"
        isActive={activeTools.has('box')}
        onClick={() => handleToolClick('box')}
        ariaLabel="Box Annotations"
      />
      <Button
        iconId="notes"
        isActive={activeTools.has('notes')}
        onClick={() => handleToolClick('notes')}
        ariaLabel="Additional Notes"
      />      
      <Button
        iconId="print"
        isActive={false}
        onClick={() => handleToolClick('print')}
        ariaLabel={isGeneratingPDF ? "Generating PDF..." : "Save/Print to PDF"}
        disabled={!canGeneratePDF || isGeneratingPDF}
        showSpinner={isGeneratingPDF}
      />
        </div>
      </div>
      
      <ToolbarColorSelector
        selectedColor={selectedColor}
        onColorConfirm={handleColorConfirm}
        onCancel={handleColorCancel}
        isVisible={showColorSelector && isVisible}
      />
    </div>
  );
};