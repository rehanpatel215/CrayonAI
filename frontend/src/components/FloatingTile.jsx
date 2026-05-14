import React from 'react';

const FloatingTile = ({ children, className = '', style = {} }) => {
  return (
    <div className={`floating-tile glass ${className}`} style={style}>
      {children}
    </div>
  );
};

export default FloatingTile;
