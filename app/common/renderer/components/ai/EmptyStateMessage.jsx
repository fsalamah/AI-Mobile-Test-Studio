// EmptyStateMessage.jsx
import React from "react";
import { Typography, Button, Divider } from "antd";
import { ArrowLeftOutlined, FolderOpenOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const EmptyStateMessage = ({ type = "default", onOpenFile }) => {
    if (type === "deselected") {
        return (
            <div style={{ textAlign: 'center', marginTop: '20vh' }}>
                <ArrowLeftOutlined style={{ fontSize: '48px', color: '#d9d9d9' }}/>
                <Title level={4} type="secondary" style={{ marginTop: 16 }}>Page Deselected</Title>
                <Text type="secondary">Select the page again to view details.</Text>
            </div>
        );
    }
    
    return (
        <div style={{ textAlign: 'center', marginTop: '20vh' }}>
            <Title level={4} type="secondary" style={{ marginTop: 16 }}>Select a Page</Title>
            <Text type="secondary">Choose a page to view its states, or open a saved file.</Text>
            <Divider/>
            <Button icon={<FolderOpenOutlined />} onClick={onOpenFile}>
                Open Saved File...
            </Button>
        </div>
    );
};

export default EmptyStateMessage;