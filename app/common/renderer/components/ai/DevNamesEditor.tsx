import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Select, Form, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Footer } from 'antd/lib/layout/layout.js';

const { Option } = Select;

const DevNameEditor = ({ originalData, onSave }) => {
  const [stateOsPairs, setStateOsPairs] = useState([]);
  const [uniqueDevNames, setUniqueDevNames] = useState([]);
  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

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

    data.forEach(({ state_id, osVersion, elements }) => {
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

    return Array.from(map.values());
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

  const handleEdit = (record) => {
    setEditingKey(record.devName);
    form.setFieldsValue({ devName: record.devName });
  };

  const handleDelete = (record) => {
    const filtered = uniqueDevNames.filter(dev => dev.devName !== record.devName);
    setUniqueDevNames(filtered);
  };

  const handleModalSubmit = () => {
    form.validateFields().then(values => {
      const { devName, stateOsList, description } = values;
      const osList = stateOsList.map(pair => pair.split('|')[1]);
      const validation = validateDevNameUniqueness(devName, osList, uniqueDevNames);

      if (!validation.valid) {
        return message.error(`Duplicate devName found in OS: ${validation.conflictOS}`);
      }

      const descriptions = stateOsList.map(pair => {
        const [state, os] = pair.split('|');
        return { OS: os, StateID: state, Description: description };
      });

      setUniqueDevNames([...uniqueDevNames, { devName, stateId: descriptions[0].StateID, descriptions }]);
      setIsModalVisible(false);
      form.resetFields();
    });
  };

  const handleUpdate = (oldDevName) => {
    form.validateFields().then(values => {
      const updatedDevName = values.devName;
      const currentItem = uniqueDevNames.find(d => d.devName === oldDevName);
      const osList = currentItem.descriptions.map(d => d.OS);

      const validation = validateDevNameUniqueness(updatedDevName, osList, uniqueDevNames, oldDevName);
      if (!validation.valid) return message.error(`Duplicate devName in OS: ${validation.conflictOS}`);

      setUniqueDevNames(prev =>
        prev.map(item =>
          item.devName === oldDevName ? { ...item, devName: updatedDevName } : item
        )
      );
      setEditingKey(null);
    });
  };

  useEffect(() => {
    setStateOsPairs(generateStateOsPairs(originalData));
    setUniqueDevNames(extractUniqueDevNames(originalData));
  }, [originalData]);

  const columns = [
    {
      title: 'Dev Name',
      dataIndex: 'devName',
      key: 'devName',
      render: (_, record) =>
        editingKey === record.devName ? (
          <Form form={form} component={false}>
            <Form.Item name="devName" style={{ margin: 0 }} rules={[{ required: true, message: 'Required' }]}> 
              <Input />
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
          <Button onClick={() => handleUpdate(record.devName)} type="link">Save</Button>
        ) : (
          <>
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} type="link" />
            <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record)} type="link" danger />
          </>
        )
    }
  ];

  return (
    <div>
      <Button icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)} style={{ marginBottom: 16 }}>Add Dev Name</Button>
      <Table rowKey="devName" dataSource={uniqueDevNames} columns={columns} pagination={false} />
      <Footer>
      <Button type="primary" onClick={handleSave} style={{ marginTop: 16 }}>Save Changes</Button>
      </Footer>
      
      <Modal
        title="Add New Dev Name"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleModalSubmit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="devName" label="Dev Name" rules={[{ required: true, message: 'Required' }]}> 
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