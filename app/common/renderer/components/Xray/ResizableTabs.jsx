import React, { useState, useRef, useEffect } from 'react';
import './ResizableTabs.css'; // Import the CSS file

const ResizableTabs = ({ tabs }) => {
  // Set optimized default tab widths: 
  // - Screenshot tab: 0.25 (25% for the image)
  // - Element list: 0.4167 (approximately 42% to fill available space)
  // - XML viewer: 0.3333 (33% as requested)
  const getOptimizedWidths = () => {
    if (tabs.length === 3) {
      // Check if first tab is Screenshot (typical Xray layout)
      if (tabs[0].label === 'Screenshot') {
        return [0.25, 0.4167, 0.3333];
      }
    }
    // Fall back to equal widths for any other configuration
    return tabs.map(() => 1 / tabs.length);
  };
  
  const [tabWidths, setTabWidths] = useState(getOptimizedWidths());
  const containerRef = useRef(null);
  const dividerRefs = useRef(tabs.slice(0, -1).map(() => useRef(null)));
  const [isResizing, setIsResizing] = useState(false);
  const [resizingDividerIndex, setResizingDividerIndex] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidths, setStartWidths] = useState([]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isResizing) return;

      const containerWidth = containerRef.current.offsetWidth;
      const deltaX = event.clientX - startX;
      const newTabWidths = [...startWidths];
      const numTabs = tabs.length;

      if (resizingDividerIndex !== null) {
        const leftTabIndex = resizingDividerIndex;
        const rightTabIndex = resizingDividerIndex + 1;

        const deltaWidth = deltaX / containerWidth;

        newTabWidths[leftTabIndex] = Math.max(0, startWidths[leftTabIndex] + deltaWidth);
        newTabWidths[rightTabIndex] = Math.max(0, startWidths[rightTabIndex] - deltaWidth);

        // Normalize widths to ensure they still add up to 1 (approximately)
        const totalWidth = newTabWidths.reduce((sum, width) => sum + width, 0);
        setTabWidths(newTabWidths.map(width => width / totalWidth));
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        setResizingDividerIndex(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizingDividerIndex, startX, startWidths, tabs.length]);

  const handleMouseDown = (event, index) => {
    setIsResizing(true);
    setResizingDividerIndex(index);
    setStartX(event.clientX);
    setStartWidths([...tabWidths]);
  };

  return (
    <div className="resizable-tabs-container" ref={containerRef}>
      <div className="control-bar">
        {/* Tab titles */}
        {tabs.map((tab, index) => (
          <span key={`control-${index}`} style={{ flexGrow: 1, textAlign: 'center' }}>
            {tab.label || `Tab ${index + 1}`}
          </span>
        ))}
      </div>
      <div className="tabs-wrapper">
        {tabs.map((tab, index) => (
          <React.Fragment key={`tab-${index}`}>
            <div
              className={`tab tab-background ${tab.props.className || ''}`}
              style={{ width: `${tabWidths[index] * 100}%`, height: '100%' }}
            >
              {/* Render the passed component with its arguments */}
              {React.createElement(tab.component, tab.props)}
            </div>
            {index < tabs.length - 1 && (
              <div
                ref={dividerRefs.current[index]}
                className="divider"
                onMouseDown={(e) => handleMouseDown(e, index)}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ResizableTabs;