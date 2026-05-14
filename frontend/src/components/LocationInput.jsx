import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const LocationInput = ({ placeholder, value, onChange, icon: Icon, iconColor }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Don't search if the user just selected a suggestion (matches exactly)
    if (suggestions.some(s => s.display_name === value)) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5`);
        const data = await response.json();
        if (data && data.length > 0) {
          setSuggestions(data);
          setIsOpen(true);
        } else {
          setSuggestions([]);
          setIsOpen(false);
        }
      } catch (err) {
        console.error("Geocoding error", err);
      }
    }, 600); // 600ms debounce to be gentle on Nominatim API

    return () => clearTimeout(timer);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (suggestion) => {
    onChange(suggestion.display_name);
    setIsOpen(false);
  };

  return (
    <div className="location-input-container" ref={wrapperRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        {Icon ? <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} /> : <Search size={18} color="var(--text-dim)" style={{ flexShrink: 0 }} />}
        <input 
          type="text" 
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          className="city-input compact"
        />
      </div>
      
      {isOpen && suggestions.length > 0 && (
        <div className="custom-options-container location-suggestions">
          {suggestions.map((s, i) => (
            <div 
              key={i} 
              className="custom-option-tile glass"
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => handleSelect(s)}
              title={s.display_name}
            >
              {s.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationInput;
