import React, { useState, useEffect } from 'react';
import { 
  List, 
  Card, 
  Button, 
  Input, 
  Typography, 
  Space, 
  Form, 
  Modal, 
  Select, 
  Badge, 
  Tooltip, 
  Popconfirm, 
  message
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExperimentOutlined,
  PlusOutlined,
  AppleOutlined,
  AndroidOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;

// Assuming this is declared elsewhere in your file
const stateLookup = {
  'id_m9s3pxws_ifjtb': 'Welcome Screen',
  'id_m9s3rx61_kh63v': 'Home Screen',
  // Add other state mappings as needed
};

export const LocatorElementList = ({ 
  onXPathChange, 
  onHandleEvaluate, 
  onElementUpdated, 
  initialElements,
  onElementsChanged // Prop for tracking all element changes
}) => {
  // Ensure elements is always initialized as an array
  const [elements, setElements] = useState(initialElements || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [form] = Form.useForm();
  
  // Grouped and sorted elements state
  const [groupedElements, setGroupedElements] = useState({});
  const [sortedStateIds, setSortedStateIds] = useState([]);
  
  // Inline editing states
  const [editingField, setEditingField] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Platform options
  const platformOptions = [
    { label: 'iOS', value: 'ios' },
    { label: 'Android', value: 'android' }
  ];

  // State options based on stateLookup
  const stateOptions = Object.entries(stateLookup).map(([id, name]) => ({
    label: name,
    value: id
  }));

  // Custom setElements function that also triggers the event
  const updateElementsAndNotify = (newElements) => {
    
    setElements(newElements);
    // Always trigger the event when elements change
    if (onElementsChanged) {alert('update')
      onElementsChanged([...newElements]);
    }
  };

  // Initial trigger of onElementsChanged with initial elements
  useEffect(() => {
    if (onElementsChanged && initialElements) {
      onElementsChanged([...initialElements]);
    }
  }, []);

  // Group by stateId and sort by devName within each group
  useEffect(() => {
    // Additional protection to ensure elements is always an array before spreading
    const elementsToProcess = Array.isArray(elements) ? [...elements] : [];
    
    // Apply search filtering if needed
    const filteredElements = !searchTerm.trim() ? elementsToProcess : elementsToProcess.filter(element => {
      const lowercasedSearch = searchTerm.toLowerCase();
      return (
        element.devName.toLowerCase().includes(lowercasedSearch) ||
        element.name.toLowerCase().includes(lowercasedSearch) ||
        element.value.toLowerCase().includes(lowercasedSearch) ||
        element.description?.toLowerCase().includes(lowercasedSearch) ||
        element.xpath.xpathExpression.toLowerCase().includes(lowercasedSearch) ||
        stateLookup[element.stateId]?.toLowerCase().includes(lowercasedSearch)
      );
    });
    
    // Group elements by stateId
    const grouped = {};
    filteredElements.forEach(element => {
      if (!grouped[element.stateId]) {
        grouped[element.stateId] = [];
      }
      grouped[element.stateId].push(element);
    });
    
    // Sort elements by devName within each state group
    Object.keys(grouped).forEach(stateId => {
      grouped[stateId].sort((a, b) => 
        a.devName.toLowerCase().localeCompare(b.devName.toLowerCase())
      );
    });
    
    // Sort state IDs alphabetically by their display names
    const sortedIds = Object.keys(grouped).sort((a, b) => {
      const nameA = stateLookup[a] || a;
      const nameB = stateLookup[b] || b;
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    });
    
    setGroupedElements(grouped);
    setSortedStateIds(sortedIds);
  }, [elements, searchTerm]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const showModal = (isEdit = false, element = null) => {
    setEditMode(isEdit);
    setEditingElement(element);
    setIsModalVisible(true);
    
    if (isEdit && element) {
      form.setFieldsValue({
        devName: element.devName,
        value: element.value,
        name: element.name,
        description: element.description,
        stateId: element.stateId,
        platform: element.platform,
        xpathExpression: element.xpath.xpathExpression
      });
    } else {
      form.resetFields();
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const validateUniqueness = (values) => {
    const isDuplicate = elements.some(
      item => 
        item.devName === values.devName && 
        item.platform === values.platform && 
        (!editingElement || item.devName !== editingElement.devName || item.platform !== editingElement.platform)
    );

    if (isDuplicate) {
      throw new Error(`The combination of devName and platform must be unique. "${values.devName}" already exists for ${values.platform}.`);
    }
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      try {
        validateUniqueness(values);
        
        const newElement = {
          devName: values.devName,
          value: values.value,
          name: values.name,
          description: values.description,
          stateId: values.stateId,
          platform: values.platform,
          xpath: {
            xpathExpression: values.xpathExpression,
            numberOfMatches: editMode && editingElement ? editingElement?.xpath?.numberOfMatches : 0,
            matchingNodes: editMode && editingElement ? editingElement?.xpath?.matchingNodes : [],
            isValid: editMode && editingElement ? editingElement?.xpath?.isValid : false
          }
        };

        if (editMode) {
          // Update existing element
          const updatedElements = elements.map(item => 
            item.devName === editingElement.devName && item.platform === editingElement.platform 
              ? newElement 
              : item
          );
          
          // Update elements and notify
          updateElementsAndNotify(updatedElements);
          
          // Trigger xpath change event if xpath was modified
          if (editingElement?.xpath?.xpathExpression !== values.xpathExpression) {
            onXPathChange && onXPathChange(editingElement);
          }
          
          // Trigger element updated event
          onElementUpdated && onElementUpdated(newElement);
        } else {
          // Add new element
          const updatedElements = [...elements, newElement];
          
          // Update elements and notify
          updateElementsAndNotify(updatedElements);
          
          // Trigger element updated event for new element
          onElementUpdated && onElementUpdated(newElement);
        }

        message.success(`Element ${editMode ? 'updated' : 'added'} successfully!`);
        setIsModalVisible(false);
        form.resetFields();
      } catch (error) {
        message.error(error.message);
      }
    });
  };

  const handleDelete = (element) => {
    const updatedElements = elements.filter(item => 
      !(item.devName === element.devName && item.platform === element.platform)
    );
    
    // Update elements and notify
    updateElementsAndNotify(updatedElements);
    
    message.success('Element removed successfully!');
  };

  const handleEvaluate = (element) => {
    message.info(`Evaluating XPath for ${element.devName}`);
    onHandleEvaluate && onHandleEvaluate(element); 
  };

  const handleView = (element) => {
    message.info(`Viewing details for ${element.devName}`);
  };

  // Start inline editing
  const startEditing = (element, field) => {
    const itemId = `${element.platform}-${element.devName}`;
    setEditingItemId(itemId);
    setEditingField(field);
    
    if (field === 'xpathExpression') {
      setEditingValue(element.xpath.xpathExpression);
    } else {
      setEditingValue(element[field]);
    }
  };

  // Cancel inline editing
  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingField(null);
    setEditingValue('');
  };

  // Save inline edit
  const saveInlineEdit = (element, field) => {
    try {
      if (field === 'devName') {
        // Check uniqueness for devName
        const isDuplicate = elements.some(
          item => item.devName === editingValue && 
                item.platform === element.platform && 
                item.devName !== element.devName
        );
        
        if (isDuplicate) {
          message.error(`The combination of devName and platform must be unique. "${editingValue}" already exists for ${element.platform}.`);
          cancelEditing();
          return;
        }
      }

      const updatedElements = elements.map(item => {
        if (item.devName === element.devName && item.platform === element.platform) {
          if (field === 'xpathExpression') {
            // Update xpath and trigger events
            const updatedItem = {
              ...item,
              xpath: {
                ...item.xpath,
                xpathExpression: editingValue
              }
            };
            // Trigger the xpath change event
            onXPathChange && onXPathChange(editingValue);
            // Trigger element updated event
            onElementUpdated && onElementUpdated(updatedItem);
            return updatedItem;
          } else {
            // Update other fields
            const updatedItem = { ...item, [field]: editingValue };
            // Trigger element updated event
            onElementUpdated && onElementUpdated(updatedItem);
            return updatedItem;
          }
        }
        return item;
      });
      
      // Update elements and notify
      updateElementsAndNotify(updatedElements);
      
      cancelEditing();
    } catch (error) {
      message.error(error.message);
    }
  };

  // Generate a unique ID for each item to use in edit mode tracking
  const getItemId = (item) => `${item.platform}-${item.devName}`;
  
  // Get match status color and text for better visual indication
  const getMatchStatus = (numberOfMatches) => {
    if (numberOfMatches === undefined || numberOfMatches === null) return { color: '#f5222d', text: '0' };
    if (numberOfMatches === 0) return { color: '#f5222d', text: '0' };
    if (numberOfMatches === 1) return { color: '#52c41a', text: '1' }; // Green for exact match
    return { color: '#faad14', text: numberOfMatches.toString() }; // Yellow/warning for multiple matches
  };
  
  // Platform icon color based on platform
  const getPlatformIconStyle = (platform) => {
    return {
      fontSize: '12px', 
      width: '16px',
      color: platform === 'ios' ? '#000000' : '#3ddc84' // Black for iOS, Green for Android
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY:'scroll', maxHeight:'100%' ,padding:'8px'}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <Title level={5} style={{ margin: 0 }}>Element List</Title>
        <Input 
          placeholder="Search elements..." 
          prefix={<SearchOutlined />} 
          allowClear
          value={searchTerm}
          onChange={handleSearch}
          style={{ flex: 1, maxWidth: '300px' }}
          size="small"
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal(false)}
          size="small"
        >
          Add
        </Button>
      </div>

      {sortedStateIds.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          No elements found
        </div>
      )}

      {sortedStateIds.map(stateId => (
        <div key={stateId} style={{ marginBottom: '8px' }} >
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '2px 8px', 
            borderRadius: '2px',
            marginBottom: '4px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {stateLookup[stateId] || stateId}
            <span style={{ marginLeft: '4px', fontSize: '10px', color: '#999', fontWeight: 'normal' }}>
              ({groupedElements[stateId].length})
            </span>
          </div>
          
          <List
            size="small"
            dataSource={groupedElements[stateId]}
            renderItem={item => {
              const itemId = getItemId(item);
              const matchStatus = getMatchStatus(item.xpath?.numberOfMatches);
              
              return (
                <List.Item
                  key={itemId}
                  style={{ padding: '2px 0' }}
                >
                  <Card 
                    size="small" 
                    style={{ width: '100%' }}
                    bodyStyle={{ padding: '4px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Left section with platform icon and match indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {/* Platform icon with color */}
                        <div style={getPlatformIconStyle(item.platform)}>
                          {item.platform === 'ios' ? <AppleOutlined /> : <AndroidOutlined />}
                        </div>
                        
                        {/* Improved match count indicator */}
                        <Tooltip title={`${matchStatus.text} ${matchStatus.text === '1' ? 'match' : 'matches'} found`}>
                          <div style={{ 
                            backgroundColor: matchStatus.color,
                            color: 'white',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            padding: '0 4px',
                            height: '14px',
                            lineHeight: '14px',
                            borderRadius: '7px',
                            minWidth: '14px',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {matchStatus.text}
                          </div>
                        </Tooltip>
                      </div>
                      
                      {/* Main content - flex grows to fill space */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* DevName - editable */}
                        {editingItemId === itemId && editingField === 'devName' ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onPressEnter={() => saveInlineEdit(item, 'devName')}
                            autoFocus
                            size="small"
                            style={{ width: '100%', height: '22px' }}
                            suffix={
                              <Space size={1}>
                                <Button type="text" size="small" icon={<CheckOutlined style={{ fontSize: '10px' }} />} onClick={() => saveInlineEdit(item, 'devName')} />
                                <Button type="text" size="small" icon={<CloseOutlined style={{ fontSize: '10px' }} />} onClick={cancelEditing} />
                              </Space>
                            }
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Tooltip title={`${item.name}: ${item.value}`}>
                              <span style={{ 
                                fontWeight: 'bold', 
                                fontSize: '12px',
                                color: (item.xpath?.matchingNodes>0?'#1890ff':'inherit'),
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {item.devName}
                              </span>
                            </Tooltip>
                            <Button 
                              type="text" 
                              icon={<EditOutlined style={{ fontSize: '10px' }} />} 
                              size="small" 
                              style={{ marginLeft: '2px', padding: '0 2px' }}
                              onClick={() => startEditing(item, 'devName')}
                            />
                          </div>
                        )}
                        
                        {/* XPath - editable */}
                        {editingItemId === itemId && editingField === 'xpathExpression' ? (
                          <Input.TextArea
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            autoFocus
                            size="small"
                            autoSize={{ minRows: 1, maxRows: 2 }}
                            style={{ width: '100%', fontSize: '10px', padding: '2px' }}
                            onPressEnter={(e) => {
                              if (!e.shiftKey) {
                                e.preventDefault();
                                saveInlineEdit(item, 'xpathExpression');
                              }
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Tooltip title={item.xpath.xpathExpression}>
                              <div style={{ 
                                fontSize: '9px', 
                                fontFamily: 'monospace',
                                color: '#666',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%'
                              }}>
                                {item.xpath.xpathExpression}
                              </div>
                            </Tooltip>
                            <Button 
                              type="text" 
                              icon={<EditOutlined style={{ fontSize: '9px' }} />} 
                              size="small" 
                              style={{ padding: '0 2px', marginLeft: '2px' }}
                              onClick={() => startEditing(item, 'xpathExpression')}
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons - compact row */}
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <Button 
                          size="small"
                          icon={<EditOutlined style={{ fontSize: '10px' }} />} 
                          onClick={() => showModal(true, item)}
                          style={{ padding: '0 4px', height: '22px' }}
                        />
                        <Button 
                          size="small"
                          icon={<ExperimentOutlined style={{ fontSize: '10px' }} />} 
                          onClick={() => handleEvaluate(item)}
                          style={{ padding: '0 4px', height: '22px' }}
                        />
                        <Button 
                          size="small"
                          icon={<EyeOutlined style={{ fontSize: '10px' }} />} 
                          onClick={() => handleView(item)}
                          style={{ padding: '0 4px', height: '22px' }}
                        />
                        <Popconfirm
                          title="Delete this element?"
                          onConfirm={() => handleDelete(item)}
                          okText="Yes"
                          cancelText="No"
                          placement="left"
                        >
                          <Button 
                            size="small"
                            danger 
                            icon={<DeleteOutlined style={{ fontSize: '10px' }} />}
                            style={{ padding: '0 4px', height: '22px' }}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  </Card>
                </List.Item>
              );
            }}
          />
        </div>
      ))}

      {/* Add/Edit Modal - more compact */}
      <Modal
        title={editMode ? "Edit Element" : "Add New Element"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" size="small" onClick={handleCancel}>
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
              onChange={(e) => {
                // Trigger xpath change event when modified in the form
                if (editMode && editingElement && e.target.value !== editingElement?.xpath?.xpathExpression) {
                  onXPathChange && onXPathChange(e.target.value);
                }
              }}
            />
          </Form.Item>

          {editMode && (
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
    </div>
  );
};