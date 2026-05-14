import React, { useState, useEffect } from 'react';
import { Cpu, SkipForward } from 'lucide-react';

const AIAnalystPanel = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!text) return;
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  const handleSkip = () => {
    setDisplayedText(text);
    setIsTyping(false);
  };

  return (
    <div className="ai-analyst-panel glass">
      <div className="ai-header">
        <Cpu size={24} color="var(--accent-blue)" />
        <h2>Gemini AI Traffic Intelligence</h2>
      </div>
      
      {isTyping && (
        <button className="skip-btn" onClick={handleSkip}>
          <SkipForward size={14} />
          Skip Analysis
        </button>
      )}

      <div className="ai-body">
        {displayedText}
        {isTyping && <span 
          className="typing-cursor"
          style={{ display: 'inline-block', width: '3px', height: '1.2em', background: 'var(--accent-blue)', marginLeft: '4px', verticalAlign: 'middle', borderRadius: '4px' }}
        />}
      </div>
    </div>
  );
};


export default AIAnalystPanel;
