import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import DevNameEditor from '../DevNamesEditor';
import { Footer } from 'antd/lib/layout/layout.js';

const DevNamesEditorModal = ({ originalData, onSave, onProceed, visible, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (updatedData) => {
    setIsSaving(true);
    onSave(updatedData);
    setIsSaving(false);
  };

  const handleProceed = () => {
    onProceed();
    onClose(); // Close the modal after proceeding
  };

  return (
    <Modal
      title="Dev Names Editor"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="proceed" type="primary" onClick={handleProceed}>
          Proceed
        </Button>,
      ]}
      width="80%"
    >
      <DevNameEditor originalData={originalData} onSave={handleSave} />
      
    </Modal>
  );
};

export default DevNamesEditorModal;