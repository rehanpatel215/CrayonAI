import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-select-container" ref={containerRef}>
      <span className="control-label" style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>
        {label}
      </span>
      <div 
        className="custom-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : 'Select...'}</span>
        <ChevronDown size={14} className={isOpen ? 'rotate' : ''} />
      </div>

      {isOpen && (
        <div className="custom-options-container">
          {options.map((option, index) => (
            <div 
              key={option.value}
              className={`custom-option-tile glass ${value === option.value ? 'selected' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
