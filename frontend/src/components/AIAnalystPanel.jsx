import React, { useState, useEffect } from 'react';
import { Cpu, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <Cpu size={24} />
        <h2>Gemini AI Traffic Analyst</h2>
      </div>
      
      {isTyping && (
        <button className="skip-btn" onClick={handleSkip}>
          <SkipForward size={14} style={{ marginRight: '5px' }} />
          Skip
        </button>
      )}

      <div className="ai-body">
        {displayedText}
        {isTyping && <motion.span 
          animate={{ opacity: [1, 0] }} 
          transition={{ repeat: Infinity, duration: 0.8 }}
          style={{ display: 'inline-block', width: '2px', height: '1em', background: '#58a6ff', marginLeft: '2px', verticalAlign: 'middle' }}
        />}
      </div>
    </div>
  );
};

export default AIAnalystPanel;
