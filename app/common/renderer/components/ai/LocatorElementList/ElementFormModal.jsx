import React from 'react';
import { Form, Input, Select, Modal, Button, Typography, Badge } from 'antd';
import { getMatchStatus, createElementObject, validateElementUniqueness } from './elementUtils';

const { Text } = Typography;
const { TextArea } = Input;

/**
 * Element Form Modal Component
 * Provides add/edit form modal for elements
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility
 * @param {boolean} props.editMode - Whether in edit or add mode
 * @param {Object} props.editingElement - Element being edited (if in edit mode)
 * @param {function} props.onCancel - Cancel handler
 * @param {function} props.onSubmit - Submit handler
 * @param {function} props.onXPathChange - XPath change handler
 * @param {Array} props.elements - All elements (for uniqueness validation)
 * @param {Array} props.platformOptions - Platform options
 * @param {Array} props.stateOptions - State options
 * @param {string} props.currentPlatform - Current selected platform
 * @param {string} props.currentStateId - Current selected state
 */
export const ElementFormModal = ({
  visible,
  editMode,
  editingElement,
  onCancel,
  onSubmit,
  onXPathChange,
  elements,
  platformOptions,
  stateOptions,
  currentPlatform,
  currentStateId
}) => {
  const [form] = Form.useForm();
  
  // Initialize form when modal opens
  React.useEffect(() => {
    if (visible) {
      if (editMode && editingElement) {
        form.setFieldsValue({
          devName: editingElement.devName,
          value: editingElement.value,
          name: editingElement.name,
          description: editingElement.description,
          stateId: editingElement.stateId,
          platform: editingElement.platform,
          xpathExpression: editingElement.xpath?.xpathExpression || ''
        });
      } else {
        form.resetFields();
        // Set default values for new elements
        form.setFieldsValue({
          platform: currentPlatform,
          stateId: currentStateId
        });
      }
    }
  }, [visible, editMode, editingElement, form, currentPlatform, currentStateId]);
  
  // Validate form submission
  const handleSubmit = () => {
    form.validateFields().then(values => {
      try {
        // Validate uniqueness
        if (editMode) {
          validateElementUniqueness(
            { ...editingElement, ...values },
            'devName',
            values.devName,
            elements,
            editingElement.id
          );
        } else {
          validateElementUniqueness(
            values,
            'devName',
            values.devName,
            elements
          );
        }
        
        // Create element object
        const newElement = createElementObject(values, editMode ? editingElement : null);
        
        // Submit to parent
        onSubmit(newElement, editMode);
        
      } catch (error) {
        // Show error and prevent modal from closing
        throw error;
      }
    });
  };
  
  // Handle XPath input change
  const handleXPathChange = (e) => {
    if (editMode && editingElement && e.target.value !== editingElement?.xpath?.xpathExpression) {
      onXPathChange && onXPathChange(e.target.value);
    }
  };
  
  return (
    <Modal
      title={editMode ? "Edit Element" : "Add New Element"}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" size="small" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" size="small" type="primary" onClick={handleSubmit}>
          {editMode ? "Update" : "Add"}
        </Button>
      ]}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        labelCol={{ style: { padding: '0 0 2px' } }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Form.Item
            name="devName"
            label="Dev Name"
            rules={[{ required: true, message: 'Required' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Enter dev name" />
          </Form.Item>

          <Form.Item
            name="platform"
            label="Platform"
            rules={[{ required: true, message: 'Required' }]}
            style={{ width: '100px' }}
          >
            <Select
              placeholder="Platform"
              options={platformOptions}
            />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Required' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Enter name" />
          </Form.Item>

          <Form.Item
            name="value"
            label="Value"
            rules={[{ required: true, message: 'Required' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Enter value" />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Form.Item
            name="description"
            label="Description"
            style={{ flex: 1 }}
          >
            <Input placeholder="Enter description" />
          </Form.Item>

          <Form.Item
            name="stateId"
            label="State"
            rules={[{ required: true, message: 'Required' }]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="Select state"
              options={stateOptions}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="xpathExpression"
          label="XPath Expression"
          rules={[{ required: true, message: 'Required' }]}
        >
          <TextArea 
            placeholder="Enter XPath expression"
            autoSize={{ minRows: 2, maxRows: 4 }}
            onChange={handleXPathChange}
          />
        </Form.Item>

        {editMode && editingElement && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
            <div>
              <Text type="secondary">Matches: </Text>
              {(() => {
                const status = getMatchStatus(editingElement?.xpath?.numberOfMatches);
                return (
                  <Badge 
                    count={status.text} 
                    style={{ 
                      backgroundColor: status.color,
                    }}
                  />
                );
              })()}
            </div>
            <div>
              <Text type="secondary">Valid: </Text>
              <Text>{editingElement?.xpath?.isValid ? 'Yes' : 'No'}</Text>
            </div>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default ElementFormModal;