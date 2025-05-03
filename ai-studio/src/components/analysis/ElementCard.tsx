import React, { useState } from 'react';
import { Card, Button, Tag, Typography, Space, Divider, Collapse, Badge, Tooltip } from 'antd';
import {
  EditOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  CopyOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import { ElementWithLocator } from '../../types/api';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ElementCardProps {
  element: ElementWithLocator;
  onEdit?: (element: ElementWithLocator) => void;
  onViewCode?: (element: ElementWithLocator) => void;
  onCopyXPath?: (xpath: string) => void;
  onHighlight?: (element: ElementWithLocator) => void;
  onFixXPath?: (element: ElementWithLocator) => void;
  showDetails?: boolean;
}

const ElementCard: React.FC<ElementCardProps> = ({
  element,
  onEdit,
  onViewCode,
  onCopyXPath,
  onHighlight,
  onFixXPath,
  showDetails = false,
}) => {
  const [expanded, setExpanded] = useState(showDetails);

  // Check if XPath is valid
  const isValidXPath = element.xpath?.success && element.xpath.numberOfMatches === 1;
  const hasMultipleMatches = element.xpath?.success && element.xpath.numberOfMatches > 1;
  const hasError = !!element.xpath?.error;

  // Format description for display
  const description = element.description || 'No description';

  // Get status tag type and text
  const getStatusTag = () => {
    if (isValidXPath) {
      return (
        <Tag color="success">
          <CheckCircleOutlined /> Valid XPath
        </Tag>
      );
    } else if (hasMultipleMatches) {
      return (
        <Tag color="warning">
          <WarningOutlined /> Multiple Matches ({element.xpath?.numberOfMatches})
        </Tag>
      );
    } else if (hasError) {
      return (
        <Tag color="error">
          <CloseCircleOutlined /> Error
        </Tag>
      );
    } else {
      return (
        <Tag color="error">
          <CloseCircleOutlined /> Invalid XPath
        </Tag>
      );
    }
  };

  return (
    <Card
      className="element-card"
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space align="center">
            <Badge 
              color={element.platform === 'ios' ? '#1890ff' : '#52c41a'} 
              text={element.platform?.toUpperCase() || 'UNKNOWN'} 
            />
            <Text strong>{element.devName}</Text>
          </Space>
          {getStatusTag()}
        </div>
      }
      extra={
        <Space>
          {onHighlight && (
            <Tooltip title="Highlight in Screenshot">
              <Button 
                type="text" 
                icon={<EllipsisOutlined />} 
                onClick={() => onHighlight(element)} 
                size="small"
              />
            </Tooltip>
          )}
          <Button 
            type="link" 
            onClick={() => setExpanded(!expanded)} 
            size="small"
          >
            {expanded ? 'Less' : 'More'}
          </Button>
        </Space>
      }
      actions={[
        onEdit && (
          <Tooltip title="Edit Element">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => onEdit(element)}
            >
              Edit
            </Button>
          </Tooltip>
        ),
        onViewCode && (
          <Tooltip title="Generate Code">
            <Button 
              type="text" 
              icon={<CodeOutlined />} 
              onClick={() => onViewCode(element)}
            >
              Code
            </Button>
          </Tooltip>
        ),
        element.xpath?.expression && onCopyXPath && (
          <Tooltip title="Copy XPath">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => onCopyXPath(element.xpath!.expression)}
            >
              Copy
            </Button>
          </Tooltip>
        ),
        !isValidXPath && onFixXPath && (
          <Tooltip title="Fix XPath">
            <Button 
              type="text" 
              danger 
              icon={<CloseCircleOutlined />} 
              onClick={() => onFixXPath(element)}
            >
              Fix
            </Button>
          </Tooltip>
        ),
      ].filter(Boolean)}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Basic Element Info */}
        <Space direction="vertical" style={{ width: '100%' }}>
          {element.name && (
            <div>
              <Text type="secondary">Name:</Text>{' '}
              <Text>{element.name}</Text>
            </div>
          )}
          
          <div>
            <Text type="secondary">Description:</Text>{' '}
            <Text>{description}</Text>
          </div>
          
          {element.value && (
            <div>
              <Text type="secondary">Value:</Text>{' '}
              <Text>{element.value}</Text>
            </div>
          )}
        </Space>

        {/* XPath Expression */}
        {expanded && element.xpath && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            
            <div>
              <Text strong>XPath Expression:</Text>
              <Paragraph 
                copyable={{ text: element.xpath.expression }}
                style={{ 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  marginTop: '4px',
                  wordBreak: 'break-all',
                }}
              >
                {element.xpath.expression}
              </Paragraph>
            </div>
            
            {/* Error Message if Present */}
            {element.xpath.error && (
              <div>
                <Text type="danger">Error:</Text>
                <Paragraph type="danger">{element.xpath.error}</Paragraph>
              </div>
            )}
            
            {/* Alternative XPaths if Available */}
            {element.alternativeXpaths && element.alternativeXpaths.length > 0 && (
              <Collapse bordered={false} ghost>
                <Panel header="Alternative XPaths" key="1">
                  {element.alternativeXpaths.map((xpath, index) => (
                    <Paragraph 
                      key={index}
                      copyable={{ text: xpath }}
                      style={{ 
                        background: '#f5f5f5', 
                        padding: '8px', 
                        borderRadius: '4px',
                        marginBottom: '8px',
                        wordBreak: 'break-all',
                      }}
                    >
                      {xpath}
                    </Paragraph>
                  ))}
                </Panel>
              </Collapse>
            )}
          </>
        )}
      </Space>
    </Card>
  );
};

export default ElementCard;