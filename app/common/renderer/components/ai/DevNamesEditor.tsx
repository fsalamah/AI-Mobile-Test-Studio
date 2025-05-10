import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Select, Form, message, Card, Statistic, Row, Col, Tooltip, Space } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ArrowRightOutlined, ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

const DevNameEditor = ({ originalData, onSave, onRegenerate, onProceedToXpath, inTabView = false }) => {
  // Simple flat representation of element names and their mappings
  const [elementNames, setElementNames] = useState([]);
  const [stateOsPairs, setStateOsPairs] = useState([]);
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [elementCounts, setElementCounts] = useState({
    totalElements: 0,
    uniqueDevNames: 0,
    stateOsPairs: 0
  });

  // Initialize the element names from original data
  useEffect(() => {
    const { elementList, pairs, counts } = processOriginalData(originalData);
    setElementNames(elementList);
    setStateOsPairs(pairs);
    setElementCounts(counts);
  }, [originalData]);

  // Process the original data into a simpler structure
  const processOriginalData = (data) => {
    if (!data || !Array.isArray(data)) {
      console.warn("Invalid data provided to processOriginalData:", data);
      return { elementList: [], pairs: [], counts: { totalElements: 0, uniqueDevNames: 0, stateOsPairs: 0 } };
    }

    // First, extract state titles from the data
    // This looks for any title or description information for states
    const stateInfo = new Map();
    data.forEach(item => {
      if (!item || !item.state_id) return;
      
      // Try to find state name/title from various possible properties
      // Look at all possible property names that might contain the state name
      const stateName = item.stateName || item.title || item.stateTitle || item.name || `State ${item.state_id}`;
      
      stateInfo.set(item.state_id, {
        name: stateName,
        id: item.state_id
      });
    });

    // Extract unique state/OS pairs with additional metadata
    const uniquePairs = new Map();
    data.forEach(item => {
      if (!item || !item.state_id || !item.osVersion || !item.elements) return;
      
      // Generate a unique key for this state/OS pair
      const pairKey = `${item.state_id}|${item.osVersion}`;
      
      // Get state info from our map, or use a default
      const state = stateInfo.get(item.state_id) || {
        name: `State ${item.state_id}`,
        id: item.state_id
      };
      
      // Store more detailed information about the state
      uniquePairs.set(pairKey, { 
        state_id: item.state_id, 
        os: item.osVersion,
        name: state.name,
        platform: item.osVersion,
        // Store display name for the dropdown
        displayName: `${state.name} (${item.osVersion.toUpperCase()})`
      });
    });
    
    const pairs = Array.from(uniquePairs.values());

    // Create a map of devNames with their occurrences in different state/OS combinations
    const devNameMap = new Map();
    let totalElements = 0;

    data.forEach(item => {
      if (!item || !Array.isArray(item.elements)) return;
      
      const { state_id, osVersion, elements } = item;
      totalElements += elements.length;
      
      elements.forEach(element => {
        if (!element || !element.devName) return;
        
        const { devName, description = "" } = element;
        
        if (!devNameMap.has(devName)) {
          devNameMap.set(devName, {
            id: Math.random().toString(36).substr(2, 9), // Generate a unique ID
            devName,
            originalName: devName, // Keep track of original name
            descriptions: []
          });
        }
        
        const entry = devNameMap.get(devName);
        
        // Get state name for description
        const state = stateInfo.get(state_id) || { name: `State ${state_id}` };
        
        entry.descriptions.push({
          OS: osVersion,
          StateID: state_id,
          StateName: state.name, // Store state name for display
          Description: description || ""
        });
      });
    });

    return {
      elementList: Array.from(devNameMap.values()),
      pairs,
      counts: {
        totalElements,
        uniqueDevNames: devNameMap.size,
        stateOsPairs: pairs.length
      }
    };
  };

  // Group states by their name for the dropdown (similar to FinalResizableTabsContainer)
  const getGroupedStates = () => {
    const groups = {};
    
    stateOsPairs.forEach(state => {
      const { name, state_id, os } = state;
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(state);
    });
    
    return groups;
  };

  // Create updated JSON with the new dev names
  const createUpdatedData = () => {
    if (!originalData || !Array.isArray(originalData)) return [];
    
    // Create a map of original names to new names
    const nameMap = new Map();
    elementNames.forEach(elem => {
      nameMap.set(elem.originalName, elem.devName);
    });
    
    // Clone the original data and update element names
    const newData = JSON.parse(JSON.stringify(originalData));
    
    newData.forEach(screen => {
      if (!screen.elements || !Array.isArray(screen.elements)) return;
      
      screen.elements = screen.elements.map(element => {
        if (nameMap.has(element.devName)) {
          return {
            ...element,
            devName: nameMap.get(element.devName)
          };
        }
        return element;
      });
    });
    
    return newData;
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingKey(null);
    form.resetFields();
  };

  // Handle edit button click
  const handleEdit = (record) => {
    setEditingKey(record.id);
    form.setFieldsValue({ 
      devName: record.devName
    });
  };

  // Handle update after edit
  const handleUpdate = async () => {
    try {
      const row = await form.validateFields();
      const newDevName = row.devName.trim();
      
      const editingItem = elementNames.find(item => item.id === editingKey);
      if (!editingItem) {
        message.error("Could not find the item being edited");
        return;
      }
      
      // Check if the name is already in use
      const isDuplicate = elementNames.some(item => 
        item.id !== editingKey && item.devName === newDevName
      );
      
      if (isDuplicate) {
        message.error(`The name "${newDevName}" is already in use by another element`);
        return;
      }
      
      // Update the element name
      const updatedElements = elementNames.map(item => {
        if (item.id === editingKey) {
          return { ...item, devName: newDevName };
        }
        return item;
      });
      
      setElementNames(updatedElements);
      setEditingKey(null);
      message.success(`Element name updated to "${newDevName}"`);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    
    const filteredElements = elementNames.filter(item => item.id !== itemToDelete.id);
    setElementNames(filteredElements);
    
    setElementCounts(prev => ({
      ...prev,
      uniqueDevNames: filteredElements.length
    }));
    
    message.success(`Element "${itemToDelete.devName}" deleted`);
    setDeleteModalVisible(false);
    setItemToDelete(null);
  };

  // Show delete confirmation
  const showDeleteConfirm = (record) => {
    setItemToDelete(record);
    setDeleteModalVisible(true);
  };

  // Handle add new element modal submission
  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { devName, stateOsList, description } = values;
      
      // Check if name already exists
      if (elementNames.some(item => item.devName === devName)) {
        message.error(`Element name "${devName}" already exists`);
        return;
      }
      
      // Create descriptions from selected state/OS pairs
      const descriptions = stateOsList.map(pairString => {
        const [stateId, os] = pairString.split('|');
        
        // Find the state in our stateOsPairs to get the state name
        const stateObj = stateOsPairs.find(s => s.state_id === stateId && s.os === os);
        const stateName = stateObj ? stateObj.name : `State ${stateId}`;
        
        return {
          OS: os,
          StateID: stateId,
          StateName: stateName,
          Description: description
        };
      });
      
      // Add new element
      const newElement = {
        id: Math.random().toString(36).substr(2, 9),
        devName,
        originalName: devName,
        descriptions
      };
      
      setElementNames([newElement, ...elementNames]);
      
      setElementCounts(prev => ({
        ...prev,
        uniqueDevNames: prev.uniqueDevNames + 1
      }));
      
      message.success(`Added new element "${devName}"`);
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  // Handle save button click
  const handleSave = () => {
    const updatedData = createUpdatedData();
    onSave(updatedData);
    message.success('Changes saved successfully');
  };

  // Handle proceed to XPath button click
  const handleProceedToXPath = () => {
    // Create updated data with new element names
    const updatedData = createUpdatedData();
    
    // Then call the parent component function to handle XPath generation
    if (typeof onProceedToXpath === 'function') {
      // Call the parent function with the updated data
      onProceedToXpath(updatedData);
    } else {
      // If no proceed function is provided, just save the changes
      onSave(updatedData);
      message.success('Changes saved successfully. XPath generation not available.');
    }
  };

  // Handle regenerate button click
  const handleRegenerateDevNames = () => {
    if (typeof onRegenerate === 'function') {
      Modal.confirm({
        title: 'Regenerate Element Names',
        content: 'This will regenerate all element names through the AI service. Your current changes will be lost. Are you sure you want to continue?',
        onOk() {
          onRegenerate();
        }
      });
    } else {
      message.error('Regenerate function not available');
    }
  };

  // Format description text to include state names
  const formatDescription = (description) => {
    return `${description.StateName || `State ${description.StateID}`} (${description.OS.toUpperCase()}): ${description.Description || "No description"}`;
  };

  // Table columns definition
  const columns = [
    {
      title: 'Element Name',
      dataIndex: 'devName',
      key: 'devName',
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Form form={form} component={false}>
              <Form.Item
                name="devName"
                style={{ margin: 0 }}
                rules={[{ required: true, message: 'Element name is required' }]}
                initialValue={record.devName}
              >
                <Input autoFocus />
              </Form.Item>
            </Form>
          );
        }
        return (
          <Tooltip title={record.originalName !== record.devName ? `Original: ${record.originalName}` : null}>
            <span>{record.devName}</span>
          </Tooltip>
        );
      }
    },
    {
      title: 'Descriptions',
      dataIndex: 'descriptions',
      key: 'descriptions',
      render: (descriptions) => descriptions.map(d => formatDescription(d)).join(', ')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        if (editingKey === record.id) {
          return (
            <Space>
              <Button onClick={handleUpdate} type="primary" size="small">Save</Button>
              <Button onClick={handleCancelEdit} size="small">Cancel</Button>
            </Space>
          );
        }
        return (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} type="link" />
            <Button icon={<DeleteOutlined />} onClick={() => showDeleteConfirm(record)} type="link" danger />
          </Space>
        );
      }
    }
  ];

  // Get grouped states for dropdown
  const groupedStates = getGroupedStates();

  return (
    <div style={{ height: inTabView ? 'calc(100% - 16px)' : 'auto' }}>
      {/* Element Detection Summary */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Total Elements"
              value={elementCounts.totalElements}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Unique Element Names"
              value={elementCounts.uniqueDevNames}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="State/OS Combinations"
              value={elementCounts.stateOsPairs}
            />
          </Col>
        </Row>
      </Card>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Button 
            icon={<PlusOutlined />} 
            onClick={() => {
              form.resetFields();
              setIsModalVisible(true);
            }} 
            style={{ marginRight: 8 }}
          >
            Add Element Name
          </Button>
          {onRegenerate && (
            <Tooltip title="Regenerate element names using AI">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRegenerateDevNames}
              >
                Regenerate Elements
              </Button>
            </Tooltip>
          )}
        </div>
        <div>
          <Button 
            onClick={handleSave} 
            style={{ marginRight: 8 }}
          >
            Save Changes
          </Button>
          <Button 
            type="primary" 
            icon={<ArrowRightOutlined />} 
            onClick={handleProceedToXPath} 
          >
            Proceed to XPath Analysis
          </Button>
        </div>
      </div>
      
      <Table
        rowKey="id"
        dataSource={elementNames}
        columns={columns}
        pagination={false}
        scroll={inTabView ? { y: 'calc(100vh - 500px)' } : undefined}
        rowClassName={record => editingKey === record.id ? 'editing-row' : ''}
        style={{ height: inTabView ? 'calc(100% - 200px)' : 'auto' }}
      />
      
      <Modal
        title="Add New Element Name"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleModalSubmit}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="devName" 
            label="Element Name" 
            rules={[{ required: true, message: 'Element name is required' }]}
          > 
            <Input placeholder="Enter a unique element name" />
          </Form.Item>
          <Form.Item 
            name="description" 
            label="Description" 
            rules={[{ required: true, message: 'Description is required' }]}
          > 
            <Input placeholder="What is this element for?" />
          </Form.Item>
          <Form.Item 
            name="stateOsList" 
            label="State/OS Target" 
            rules={[{ required: true, message: 'Please select at least one State/OS target' }]}
          > 
            <Select 
              mode="multiple" 
              placeholder="Select state/OS"
              dropdownMatchSelectWidth={false}
            > 
              {/* Use grouped states in dropdown similar to FinalResizableTabsContainer */}
              {Object.entries(groupedStates).map(([stateName, stateVersions]) => (
                <Select.OptGroup key={stateName} label={stateName}>
                  {stateVersions.map(state => (
                    <Option key={`${state.state_id}|${state.os}`} value={`${state.state_id}|${state.os}`}>
                      {state.name} ({state.os.toUpperCase()})
                    </Option>
                  ))}
                </Select.OptGroup>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Confirm Delete"
        open={deleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete the element "{itemToDelete?.devName}"?</p>
      </Modal>
    </div>
  );
};

export default DevNameEditor;