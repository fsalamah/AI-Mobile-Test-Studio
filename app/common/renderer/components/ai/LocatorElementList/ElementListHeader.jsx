import React from 'react';
import { Input, Button, Typography } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

/**
 * Element List Header Component
 * Displays the title, search input, and add button
 * 
 * @param {Object} props
 * @param {string} props.searchTerm - Current search value
 * @param {function} props.onSearchChange - Search change handler
 * @param {function} props.onAddClick - Add button click handler
 */
export const ElementListHeader = ({ 
  searchTerm, 
  onSearchChange, 
  onAddClick 
}) => {
  /**
   * Handle search input change
   * @param {Event} e - Input change event
   */
  const handleSearch = (e) => {
    onSearchChange(e.target.value);
  };
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      gap: '8px' 
    }}>
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
        onClick={onAddClick}
        size="small"
      >
        Add
      </Button>
    </div>
  );
};

export default ElementListHeader;