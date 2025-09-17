import { useState } from 'react';
import styles from './toolbar-color-selector.module.css';

interface ToolbarColorSelectorProps {
  selectedColor: string;
  onColorConfirm: (color: string) => void;
  onCancel: () => void;
  isVisible: boolean;
}

interface ColorOption {
  value: string;
  label: string;
}

const commonColors: ColorOption[] = [
  { value: '#ff0000', label: 'Red' },
  { value: '#ff8000', label: 'Orange' },
  { value: '#ffde21', label: 'Yellow' },
  { value: '#00ff00', label: 'Green' },
  { value: '#00ffff', label: 'Cyan' },
  { value: '#0000ff', label: 'Blue' },
  { value: '#8000ff', label: 'Purple' },
  { value: '#ff00ff', label: 'Magenta' },
  { value: '#000000', label: 'Black' },
  { value: '#ffffff', label: 'White' }
];

export const ToolbarColorSelector = ({ 
  selectedColor, 
  onColorConfirm, 
  onCancel, 
  isVisible 
}: ToolbarColorSelectorProps) => {
  const [tempSelectedColor, setTempSelectedColor] = useState(selectedColor);
  const [showColorWheel, setShowColorWheel] = useState(false);

  if (!isVisible) return null;

  const handleConfirm = () => {
    onColorConfirm(tempSelectedColor);
  };

  const handleCancel = () => {
    setTempSelectedColor(selectedColor); // Reset to original color
    setShowColorWheel(false); // Reset to presets view
    onCancel();
  };

  return (
    <div className={styles.toolbarColorSelector}>
      <div className={styles.header}>
        <span className={styles.title}>Select Box Color</span>
        <div className={styles.actions}>
          <button 
            onClick={handleConfirm}
            className={styles.confirmButton}
            title="Apply selected color"
          >
            ✓
          </button>
          <button 
            onClick={handleCancel}
            className={styles.cancelButton}
            title="Cancel color selection"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.toggleSection}>
          <button 
            onClick={() => setShowColorWheel(!showColorWheel)}
            className={styles.toggleButton}
          >
            {showColorWheel ? 'Presets' : 'Custom'}
          </button>
        </div>
        
        {showColorWheel ? (
          <div className={styles.colorWheelSection}>
            <input            
              type="color"
              value={tempSelectedColor}
              onChange={(e) => setTempSelectedColor(e.target.value)}
              className={styles.colorWheel}
              title="Choose a custom color"
            />
          </div>
        ) : (
          <div className={styles.colorGrid}>
            {commonColors.map((color) => (
              <button
                key={color.value}
                className={`${styles.colorSwatch} ${color.value === tempSelectedColor ? styles.selected : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => setTempSelectedColor(color.value)}
                aria-label={`Select ${color.label}`}
                title={color.label}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};