const handleCancelEdit = () => {
  setEditingKey(null);
  form.resetFields();
};import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Select, Form, message, Card, Statistic, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Footer } from 'antd/lib/layout/layout.js';

const { Option } = Select;

const DevNameEditor = ({ originalData, onSave }) => {
const [stateOsPairs, setStateOsPairs] = useState([]);
const [uniqueDevNames, setUniqueDevNames] = useState([]);
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

// Step 1: Generate unique state/OS pairs
const generateStateOsPairs = (data) => {
  const pairs = [];
  data.forEach(({ state_id, osVersion }) => {
    if (!pairs.find(p => p.state_id === state_id && p.os === osVersion)) {
      pairs.push({ state_id, os: osVersion });
    }
  });
  return pairs;
};

// Step 2: Extract unique devNames
const extractUniqueDevNames = (data) => {
  const map = new Map();
  let totalElementCount = 0;
  
  // Calculate state/OS pairs count inside this function
  const localPairs = generateStateOsPairs(data);

  data.forEach(({ state_id, osVersion, elements }) => {
    totalElementCount += elements.length;
    elements.forEach(({ devName, description }) => {
      if (!map.has(devName)) {
        map.set(devName, {
          devName,
          stateId: state_id,
          descriptions: []
        });
      }
      const item = map.get(devName);
      item.descriptions.push({ OS: osVersion, StateID: state_id, Description: description });
    });
  });

  const uniqueNames = Array.from(map.values());
  
  // Update element counts with localPairs instead of undefined 'pairs'
  setElementCounts({
    totalElements: totalElementCount,
    uniqueDevNames: uniqueNames.length,
    stateOsPairs: localPairs.length
  });

  return uniqueNames;
};

const validateDevNameUniqueness = (devName, selectedOsList, data, currentDevName = null) => {
  for (const os of selectedOsList) {
    const conflict = data.find(entry =>
      entry.devName !== currentDevName &&
      entry.descriptions.some(desc => desc.OS === os && entry.devName === devName)
    );
    if (conflict) return { valid: false, conflictOS: os };
  }
  return { valid: true };
};

const handleSave = () => {
  const newJson = JSON.parse(JSON.stringify(originalData));

  // Rebuild original JSON with updated devNames
  newJson.forEach((screen) => {
    screen.elements = screen.elements.map(element => {
      const matched = uniqueDevNames.find(dev =>
        dev.descriptions.some(desc => desc.OS === screen.osVersion && desc.StateID === screen.state_id && dev.devName === element.devName)
      );

      if (matched) {
        return {
          ...element,
          devName: matched.devName
        };
      }
      return element;
    });
  });

  onSave(newJson);
  message.success('Changes saved to original data.');
};

const handleProceedToXPath = () => {
  const newJson = JSON.parse(JSON.stringify(originalData));

  // Rebuild original JSON with updated devNames
  newJson.forEach((screen) => {
    screen.elements = screen.elements.map(element => {
      const matched = uniqueDevNames.find(dev =>
        dev.descriptions.some(desc => desc.OS === screen.osVersion && desc.StateID === screen.state_id && dev.devName === element.devName)
      );

      if (matched) {
        return {
          ...element,
          devName: matched.devName
        };
      }
      return element;
    });
  });

  // Call the original onSave handler
  onSave(newJson);
  message.success('Proceeding to XPath Analysis...');
};

const handleEdit = (record) => {
  // Reset any previous editing state
  setEditingKey(null);
  form.resetFields();
  
  // Set the current record as editing and populate the form
  setEditingKey(record.devName);
  form.setFieldsValue({ 
    devName: record.devName 
  });
};

const handleDeleteConfirm = () => {
  if (itemToDelete) {
    const filtered = uniqueDevNames.filter(dev => dev.devName !== itemToDelete.devName);
    setUniqueDevNames(filtered);
    
    // Update the element counts after deletion
    setElementCounts(prev => ({
      ...prev,
      uniqueDevNames: filtered.length
    }));
    
    message.success(`Element "${itemToDelete.devName}" deleted successfully`);
  }
  setDeleteModalVisible(false);
  setItemToDelete(null);
};

const handleDeleteCancel = () => {
  setDeleteModalVisible(false);
  setItemToDelete(null);
};

const showDeleteConfirm = (record) => {
  setItemToDelete(record);
  setDeleteModalVisible(true);
};

const handleModalSubmit = () => {
  form.validateFields().then(values => {
    const { devName, stateOsList, description } = values;
    const osList = stateOsList.map(pair => pair.split('|')[1]);
    const validation = validateDevNameUniqueness(devName, osList, uniqueDevNames);

    if (!validation.valid) {
      return message.error(`Duplicate element name found in OS: ${validation.conflictOS}`);
    }

    const descriptions = stateOsList.map(pair => {
      const [state, os] = pair.split('|');
      return { OS: os, StateID: state, Description: description };
    });

    // Add new element at the beginning of the array
    setUniqueDevNames([{ devName, stateId: descriptions[0].StateID, descriptions }, ...uniqueDevNames]);
    
    // Update the element counts after addition
    setElementCounts(prev => ({
      ...prev,
      uniqueDevNames: prev.uniqueDevNames + 1
    }));
    
    setIsModalVisible(false);
    form.resetFields();
  });
};

const handleUpdate = (oldDevName) => {
  form.validateFields().then(values => {
    const updatedDevName = values.devName;
    const currentItem = uniqueDevNames.find(d => d.devName === oldDevName);
    
    if (!currentItem) {
      return message.error('Element not found');
    }
    
    const osList = currentItem.descriptions.map(d => d.OS);

    const validation = validateDevNameUniqueness(updatedDevName, osList, uniqueDevNames, oldDevName);
    if (!validation.valid) return message.error(`Duplicate element name in OS: ${validation.conflictOS}`);

    // Create a new array with the updated element at the beginning
    const updatedList = uniqueDevNames.filter(item => item.devName !== oldDevName);
    const updatedItem = { ...currentItem, devName: updatedDevName };
    
    // Add the updated item at the beginning of the array and set the new state
    setUniqueDevNames([updatedItem, ...updatedList]);
    setEditingKey(null);
    
    // Clear form fields after successful update
    form.resetFields();
  }).catch(error => {
    console.error('Validation failed:', error);
  });
};

useEffect(() => {
  const pairs = generateStateOsPairs(originalData);
  setStateOsPairs(pairs);
  
  // Extract unique devNames - counts are now updated inside extractUniqueDevNames
  const uniqueNames = extractUniqueDevNames(originalData);
  setUniqueDevNames(uniqueNames);
  
  // We no longer need this duplicate code since counts are updated in extractUniqueDevNames
}, [originalData]);

const columns = [
  {
    title: 'Element Name',
    dataIndex: 'devName',
    key: 'devName',
    render: (_, record) =>
      editingKey === record.devName ? (
        <Form form={form} component={false}>
          <Form.Item 
            name="devName" 
            style={{ margin: 0 }} 
            rules={[{ required: true, message: 'Required' }]}
            initialValue={record.devName} // Ensure the initial value is set
          > 
            <Input autoFocus /> {/* Add autoFocus to improve usability */}
          </Form.Item>
        </Form>
      ) : (
        record.devName
      )
  },
  {
    title: 'Descriptions',
    dataIndex: 'descriptions',
    key: 'descriptions',
    render: (descriptions) => descriptions.map(d => `${d.OS} (${d.Description})`).join(', ')
  },
  {
    title: 'Actions',
    render: (_, record) =>
      editingKey === record.devName ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => handleUpdate(record.devName)} 
            type="primary" 
            size="small"
          >
            Save
          </Button>
          <Button 
            onClick={handleCancelEdit} 
            size="small"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} type="link" />
          <Button icon={<DeleteOutlined />} onClick={() => showDeleteConfirm(record)} type="link" danger />
        </>
      )
  }
];

return (
  <div>
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
      <Button icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>Add Element Name</Button>
      <Button 
        type="primary" 
        icon={<ArrowRightOutlined />} 
        onClick={handleProceedToXPath} 
      >
        Proceed to XPath Analysis
      </Button>
    </div>
    <Table rowKey="devName" dataSource={uniqueDevNames} columns={columns} pagination={false} />
    {/* Remove the Footer with the old button */}
    
            <Modal
      title="Add New Element Name"
      open={isModalVisible}
      onCancel={() => setIsModalVisible(false)}
      onOk={handleModalSubmit}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="devName" label="Element Name" rules={[{ required: true, message: 'Required' }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Required' }]}> 
          <Input />
        </Form.Item>
        <Form.Item name="stateOsList" label="State/OS Target" rules={[{ required: true, message: 'Required' }]}> 
          <Select mode="multiple" placeholder="Select state/OS"> 
            {stateOsPairs.map(pair => (
              <Option key={`${pair.state_id}|${pair.os}`} value={`${pair.state_id}|${pair.os}`}>
                {pair.state_id} / {pair.os}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </div>
);
};

export default DevNameEditor;