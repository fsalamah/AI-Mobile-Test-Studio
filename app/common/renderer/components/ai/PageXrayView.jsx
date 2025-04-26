// PageXrayView.jsx
import React from "react";
import FinalResizableTabsContainer from "../Xray/XrayRootComponent.jsx";

const PageXrayView = ({ 
    page, 
    onApplyChanges, 
    onProceedToPom, 
    onExit,
    viewMode,
    onRegenerateLocators // New prop for handling regenerate locators event
}) => {
    return (
        <FinalResizableTabsContainer 
            viewMode={viewMode}
            onApplyChanges={onApplyChanges}
            page={page}
            onProceedToPom={onProceedToPom}
            pageChanged={onApplyChanges}
            onExit={onExit} 
            onRegenerateLocators={onRegenerateLocators} // Pass the new prop to XrayRootComponent
        />
    );
};

export default PageXrayView;