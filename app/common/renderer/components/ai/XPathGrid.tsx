import { useState, useMemo, useEffect } from 'react';
import { 
  Input, 
  Select, 
  Button, 
  Card, 
  Collapse, 
  Modal, 
  Form, 
  InputNumber, 
  Checkbox, 
  Space, 
  Tag, 
  Divider, 
  Typography, 
  Badge, 
  Empty
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  DownloadOutlined, 
  RightOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined
} from '@ant-design/icons';
import { BiChevronRight } from 'react-icons/bi';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;
const { TextArea } = Input;

export default function XPathGrid({ data: initialData = [], onSave }) {
  const [selectedOS, setSelectedOS] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState({});
  const [data, setData] = useState(initialData);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [errors, setErrors] = useState({});
  const [originalDevName, setOriginalDevName] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    if(onSave) {
      onSave(data);
    }
  }, [data, onSave]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    return data.filter(item => {
      const basicMatch = ['devName', 'value', 'name', 'description'].some(prop => 
        String(item[prop]).toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (basicMatch) return true;
      return Object.keys(item).some(key => {
        if (key.includes('_xpath') && item[key]) {
          return String(item[key].xpathExpression).toLowerCase().includes(searchTerm.toLowerCase()) ||
            item[key].matchingNodes?.some(node => 
              String(node).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return false;
      });
    });
  }, [data, searchTerm]);

  const groupedItems = useMemo(() => {
    const groups = {};
    filteredData.forEach(item => {
      if (!groups[item.devName]) {
        groups[item.devName] = {
          devName: item.devName,
          value: item.value,
          name: item.name,
          description: item.description,
          platforms: []
        };
      }
      Object.keys(item).forEach(key => {
        if (key.includes('_xpath')) {
          const platform = key.split('_')[0];
          if (!selectedOS || platform === selectedOS) {
            groups[item.devName].platforms.push({
              platform,
              stateId: item[`${platform}_StateId`] || '',
              xpath: item[key].xpathExpression,
              numberOfMatches: item[key].numberOfMatches,
              matchingNodes: item[key].matchingNodes,
              isValid: item[key].isValid
            });
          }
        }
      });
    });
    return Object.values(groups);
  }, [filteredData, selectedOS]);
  
  useEffect(() => {
    const initialCollapsed = {};
    groupedItems.forEach(group => {
      initialCollapsed[group.devName] = true;
    });
    setIsCollapsed(initialCollapsed);
  }, [groupedItems]);

  const getUniquePlatforms = useMemo(() => {
    const platforms = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key.includes('_xpath')) {
          platforms.add(key.split('_')[0]);
        }
      });
    });
    return Array.from(platforms);
  }, [data]);

  const getBlankForm = () => ({
    devName: '',
    value: '',
    name: '',
    description: '',
    platform: getUniquePlatforms[0] || 'android',
    stateId: '',
    xpathExpression: '',
    numberOfMatches: 0,
    matchingNodes: [],
    isValid: true
  });

  const validateForm = (formData) => {
    const newErrors = {};
    if (!formData.devName) newErrors.devName = 'Dev name is mandatory';
    if (!formData.xpathExpression) newErrors.xpathExpression = 'XPath expression is mandatory';
    
    if (formData.devName) {
      const platformKey = `${formData.platform}_xpath`;
      const isDuplicate = data.some(item => 
        item.devName === formData.devName && 
        item[platformKey] &&
        (isEditing ? item !== currentItem._originalItem : true)
      );
      if (isDuplicate) newErrors.devName = `Dev name must be unique for ${formData.platform}`;
    }

    if (formData.platform) {
      const hasDuplicateOS = data.some(item => 
        item.devName === formData.devName && 
        item[`${formData.platform}_xpath`] &&
        (isEditing ? item !== currentItem._originalItem : true)
      );
      if (hasDuplicateOS) newErrors.platform = `Platform '${formData.platform}' already exists`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const formData = {
        ...currentItem,
        ...values,
        matchingNodes: values.matchingNodes.split('\n').filter(node => node.trim() !== '')
      };
      
      if (!validateForm(formData)) return;

      const newItem = {
        devName: formData.devName,
        value: formData.value,
        name: formData.name,
        description: formData.description,
        [`${formData.platform}_StateId`]: formData.stateId,
        [`${formData.platform}_xpath`]: {
          xpathExpression: formData.xpathExpression,
          numberOfMatches: formData.numberOfMatches,
          matchingNodes: formData.matchingNodes,
          isValid: formData.isValid
        }
      };

      setData(prev => isAdding ? [...prev, newItem] : prev.map(item => {
        if (item === currentItem._originalItem) {
          return originalDevName !== formData.devName ? 
            { ...newItem, ...Object.fromEntries(Object.entries(item)
              .filter(([k]) => !k.startsWith(formData.platform))) } : 
            { ...item, ...newItem };
        }
        return item;
      }));
      closeForm();
    });
  };

  const handleDelete = (item, platform) => {
    Modal.confirm({
      title: platform ? 
        `Delete ${platform} entry for ${item.devName}?` : 
        `Delete all entries for ${item.devName}?`,
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        setData(prev => platform ? 
          prev.map(dataItem => {
            if (dataItem === item) {
              const updated = { ...dataItem };
              delete updated[`${platform}_StateId`];
              delete updated[`${platform}_xpath`];
              return Object.keys(updated).some(k => k.includes('_xpath')) ? updated : null;
            }
            return dataItem;
          }).filter(Boolean) : 
          prev.filter(dataItem => dataItem.devName !== item.devName)
        );
      }
    });
  };

  const toggleCollapse = (devName) => {
    setIsCollapsed(prev => ({ ...prev, [devName]: !prev[devName] }));
  };

  const openAddForm = () => {
    const blankForm = getBlankForm();
    setCurrentItem(blankForm);
    setIsAdding(true);
    setIsEditing(false);
    setErrors({});
    setOriginalDevName('');
    
    form.setFieldsValue({
      ...blankForm,
      matchingNodes: blankForm.matchingNodes.join('\n')
    });
  };

  const openEditForm = (item, platform) => {
    const formData = {
      _originalItem: item,
      devName: item.devName,
      value: item.value,
      name: item.name,
      description: item.description,
      platform,
      stateId: item[`${platform}_StateId`] || '',
      xpathExpression: item[`${platform}_xpath`].xpathExpression,
      numberOfMatches: item[`${platform}_xpath`].numberOfMatches,
      matchingNodes: item[`${platform}_xpath`].matchingNodes,
      isValid: item[`${platform}_xpath`].isValid
    };
    
    setCurrentItem(formData);
    setIsEditing(true);
    setIsAdding(false);
    setErrors({});
    setOriginalDevName(item.devName);
    
    form.setFieldsValue({
      ...formData,
      matchingNodes: formData.matchingNodes.join('\n')
    });
  };

  const closeForm = () => {
    setIsAdding(false);
    setIsEditing(false);
    setCurrentItem(null);
    setErrors({});
    setOriginalDevName('');
    form.resetFields();
  };

  const exportToJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'locators.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Title level={4} style={{ margin: 0 }}>XPath Information</Title>
          <Space>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={exportToJson}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Export to JSON
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={openAddForm}
            >
              Add New Item
            </Button>
          </Space>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Input
              placeholder="Search any attribute..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center' }}>
            <Text style={{ marginRight: '8px' }}>Platform:</Text>
            <Select
              style={{ flex: 1 }}
              value={selectedOS || ''}
              onChange={(value) => setSelectedOS(value || null)}
              placeholder="Select a platform"
            >
              <Option value="">All Platforms</Option>
              {getUniquePlatforms.map(platform => (
                <Option key={platform} value={platform}>{platform}</Option>
              ))}
            </Select>
          </div>
        </div>

        <Text type="secondary">
          Found {groupedItems.length} items ({filteredData.length} entries)
        </Text>
      </div>

      <Modal
        title={isAdding ? 'Add New Item' : 'Edit Item'}
        open={isAdding || isEditing}
        onCancel={closeForm}
        footer={[
          <Button key="cancel" onClick={closeForm}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {isAdding ? 'Add' : 'Update'}
          </Button>
        ]}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: '16px' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <Form.Item
              name="devName"
              label="Dev Name *"
              validateStatus={errors.devName ? 'error' : ''}
              help={errors.devName}
              rules={[{ required: true, message: 'Dev name is mandatory' }]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="value"
              label="Value"
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="name"
              label="Name"
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="platform"
              label="Platform *"
              validateStatus={errors.platform ? 'error' : ''}
              help={errors.platform}
              rules={[{ required: true, message: 'Platform is mandatory' }]}
            >
              <Select disabled={isEditing}>
                {getUniquePlatforms.map(platform => (
                  <Option key={platform} value={platform}>{platform}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="description"
              label="Description"
              style={{ gridColumn: '1 / span 2' }}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="stateId"
              label="State ID"
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="numberOfMatches"
              label="Number of Matches"
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item
              name="xpathExpression"
              label="XPath Expression *"
              validateStatus={errors.xpathExpression ? 'error' : ''}
              help={errors.xpathExpression}
              rules={[{ required: true, message: 'XPath expression is mandatory' }]}
              style={{ gridColumn: '1 / span 2' }}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="isValid"
              valuePropName="checked"
              label="Valid XPath"
            >
              <Checkbox>Is Valid</Checkbox>
            </Form.Item>
            
            <div style={{ gridColumn: '1 / span 2' }}>
              <Form.Item
                name="matchingNodes"
                label="Matching Nodes"
              >
                <TextArea rows={4} style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>

      {groupedItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {groupedItems.map((group) => (
            <Card 
              key={group.devName} 
              size="small" 
              style={{ borderRadius: '8px' }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  cursor: 'pointer' 
                }}
                onClick={() => toggleCollapse(group.devName)}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    transform: isCollapsed[group.devName] ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.3s'
                  }}>
                    <BiChevronRight size={16} />
                  </div>
                  <div style={{ marginLeft: '8px' }}>
                    <Text strong>{group.devName}</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {group.name} | {group.platforms.length} platform(s)
                      </Text>
                    </div>
                  </div>
                </div>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(group, null);
                  }}
                  title="Delete all entries for this devName"
                />
              </div>
              
              {!isCollapsed[group.devName] && (
                <div style={{ marginTop: '16px', paddingLeft: '24px' }}>
                  <Paragraph type="secondary" style={{ fontSize: '12px' }}>
                    {group.description}
                  </Paragraph>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {group.platforms.map((platformInfo, index) => {
                      const originalItem = data.find(item => 
                        item.devName === group.devName && 
                        item[`${platformInfo.platform}_xpath`]
                      );
                      
                      return (
                        <Card 
                          key={`${group.devName}-${platformInfo.platform}-${index}`} 
                          size="small"
                          style={{ backgroundColor: '#f5f5f5', borderRadius: '4px' }}
                          bodyStyle={{ padding: '8px' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <Space>
                              <Text strong style={{ color: '#1890ff' }}>{platformInfo.platform}</Text>
                              <Text type="secondary">
                                {platformInfo.numberOfMatches} {platformInfo.numberOfMatches === 1 ? 'match' : 'matches'}
                              </Text>
                              {platformInfo.isValid ? (
                                <Badge status="success" text={<Text style={{ color: '#52c41a' }}>Valid</Text>} />
                              ) : (
                                <Badge status="error" text={<Text style={{ color: '#f5222d' }}>Invalid</Text>} />
                              )}
                            </Space>
                            <Space>
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => openEditForm(originalItem, platformInfo.platform)}
                              />
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDelete(originalItem, platformInfo.platform)}
                              />
                            </Space>
                          </div>
                          <div style={{ 
                            backgroundColor: '#f0f0f0', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontFamily: 'monospace', 
                            fontSize: '12px',
                            overflowX: 'auto'
                          }}>
                            {platformInfo.xpath}
                          </div>
                          {platformInfo.matchingNodes?.[0] && (
                            <div style={{ 
                              marginTop: '4px',
                              backgroundColor: '#f0f0f0', 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontFamily: 'monospace', 
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} 
                            title={platformInfo.matchingNodes[0]}
                            >
                              {platformInfo.matchingNodes[0].substring(0, 60)}
                              {platformInfo.matchingNodes[0].length > 60 ? '...' : ''}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Empty description="No items match your search criteria." />
      )}
    </div>
  );
}