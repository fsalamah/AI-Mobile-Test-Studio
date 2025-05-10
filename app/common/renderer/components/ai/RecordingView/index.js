import RecordingHeader from './RecordingHeader';
import RecordingToolbar from './RecordingToolbar';
import StatesList from './StatesList';
import ScreenshotViewer from './ScreenshotViewer';
import TransitionDetails from './TransitionDetails';
import PlaybackControls from './PlaybackControls';
import AIAnalysisView from './AIAnalysisView';

// Custom scrollbar styles
export const scrollbarStyleId = 'custom-scrollbar-styles';
export const customScrollbarStyle = `
/* Custom scrollbar styles */
/* WebKit browsers (Chrome, Safari) */
.custom-scrollbar::-webkit-scrollbar {
  width: 14px !important;
  height: 14px !important;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f0f0f0 !important;
  border-radius: 0 !important;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #c1c1c1 !important;
  border-radius: 7px !important;
  border: 3px solid #f0f0f0 !important;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #a0a0a0 !important;
}
.custom-scrollbar::-webkit-scrollbar-corner {
  background: #f0f0f0 !important;
}
/* Firefox and other browsers */
.custom-scrollbar {
  scrollbar-width: thin !important;
  scrollbar-color: #c1c1c1 #f0f0f0 !important;
}
/* Force scrollbars to be visible */
.force-scrollbar {
  overflow-y: scroll !important;
  min-height: 100px !important;
}
/* Ensure tab panels are properly sized */
.ant-tabs-tabpane {
  height: 100% !important;
  overflow: hidden !important;
}
.ant-tabs-content {
  height: 100% !important;
  flex: 1 !important;
  display: flex !important;
}
.ant-tabs-tabpane-active {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}
.ant-tabs-content-holder {
  overflow: hidden !important;
  height: 100% !important;
}
.recording-tabs .ant-tabs-nav {
  margin-bottom: 0 !important;
}
.recording-tabs .ant-tabs-content-holder, .analysis-tabs .ant-tabs-content-holder {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}
.recording-tabs, .analysis-tabs {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  margin-bottom: 0 !important;
}

.analysis-tabs .ant-tabs-content {
  height: 100% !important;
  flex: 1 !important;
}

.analysis-tabs .ant-tabs-tabpane {
  height: 100% !important;
}
/* Ensure content fits properly */
.recording-view-container {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  overflow: hidden !important;
  position: absolute !important;
  top: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
}
/* Pulse animation for playback */
@keyframes playback-pulse {
  0% { background-color: #e6f7ff; }
  50% { background-color: #bae7ff; }
  100% { background-color: #e6f7ff; }
}
.playback-active {
  animation: playback-pulse 1.5s infinite ease-in-out;
}

/* Flow steps timeline customizations */
.flow-steps-timeline .ant-timeline-item {
  padding-bottom: 20px !important;
}

.flow-steps-timeline .ant-timeline-item-tail {
  height: calc(100% - 10px) !important;
  left: 88px !important; /* Keep connector line aligned with dots */
}

.flow-steps-timeline .ant-timeline-item-label {
  width: 80px !important;
  text-align: left !important;
  padding-right: 8px !important;
  position: absolute !important;
  left: 0 !important; /* Ensure label starts at the far left */
}

.flow-steps-timeline .ant-timeline-item-head {
  left: 88px !important; /* Position dots consistently */
}

.flow-steps-timeline .ant-timeline-item-content {
  left: 100px !important;
  margin-left: 8px !important;
  width: calc(100% - 120px) !important;
  margin-top: -4px !important;
  text-align: left !important;
  position: relative !important; /* Ensure proper positioning relative to timeline */
}
`;

export {
  RecordingHeader,
  RecordingToolbar,
  StatesList,
  ScreenshotViewer,
  TransitionDetails,
  PlaybackControls,
  AIAnalysisView
};

// Export the main RecordingView component as default
export { default } from './RecordingView';