// PageOperations.jsx
import React, { useState, useEffect } from "react";
import { Modal, Form, Input, message } from "antd";

/**
 * Component to handle page creation and editing modals
 */
export const PageOperations = ({ generateId, onCreatePage, onEditPage }) => {
    const [newPageModalVisible, setNewPageModalVisible] = useState(false);
    const [editPageModalVisible, setEditPageModalVisible] = useState(false);
    const [editingPageData, setEditingPageData] = useState(null);
    const [newPageForm] = Form.useForm();
    const [editPageForm] = Form.useForm();

    useEffect(() => {
        // Listen for events from other components
        const handleShowNewPageModal = () => {
            showNewPageModal();
        };

        const handleShowEditPageModal = (event) => {
            const { pageData } = event.detail;
            showEditPageModal(pageData);
        };

        document.addEventListener('showNewPageModal', handleShowNewPageModal);
        document.addEventListener('showEditPageModal', handleShowEditPageModal);

        return () => {
            document.removeEventListener('showNewPageModal', handleShowNewPageModal);
            document.removeEventListener('showEditPageModal', handleShowEditPageModal);
        };
    }, []);

    const showNewPageModal = () => {
        newPageForm.resetFields();
        setNewPageModalVisible(true);
    };

    const createNewPage = async () => {
        try {
            const values = await newPageForm.validateFields();
            const newPage = {
                id: generateId(),
                name: values.name.trim(),
                description: values.description?.trim() || '',
                module: values.module?.trim().replace(/\/$/, '') || '',
                states: [],
                createdAt: new Date().toISOString()
            };
            onCreatePage(newPage);
            setNewPageModalVisible(false);
        } catch (errorInfo) {
            console.log('Validation failed:', errorInfo);
            message.error("Please fill in the required fields.");
        }
    };

    const showEditPageModal = (pageData) => {
        setEditingPageData(pageData);
        editPageForm.setFieldsValue({
            name: pageData.name,
            description: pageData.description,
            module: pageData.module
        });
        setEditPageModalVisible(true);
    };

    const editPage = async () => {
        if (!editingPageData) return;
        try {
            const values = await editPageForm.validateFields();
            const updatedPage = {
                ...editingPageData,
                name: values.name.trim(),
                description: values.description?.trim() || '',
                module: values.module?.trim().replace(/\/$/, '') || '',
            };
            onEditPage(updatedPage);
            setEditPageModalVisible(false);
            setEditingPageData(null);
        } catch (errorInfo) {
            console.log('Validation failed:', errorInfo);
            message.error("Please fill in the required fields.");
        }
    };

    return (
        <>
            {/* Create New Page Modal */}
            <Modal 
                title="Create New Page" 
                open={newPageModalVisible} 
                onOk={createNewPage} 
                onCancel={() => setNewPageModalVisible(false)} 
                okText="Create" 
                destroyOnClose
            >
                <Form form={newPageForm} layout="vertical" name="newPageForm">
                    <Form.Item 
                        name="name" 
                        label="Page Name" 
                        rules={[{ required: true, message: 'Please enter page name', whitespace: true }]}
                    >
                        <Input placeholder="e.g., Login Screen" />
                    </Form.Item>
                    <Form.Item 
                        name="module" 
                        label="Module Path (Optional)" 
                        tooltip="Use '/' for hierarchy, e.g., Auth/Login"
                    >
                        <Input placeholder="e.g., Settings/Profile" />
                    </Form.Item>
                    <Form.Item 
                        name="description" 
                        label="Description (Optional)"
                    >
                        <Input.TextArea rows={3} placeholder="Page's purpose" />
                    </Form.Item>
                </Form>
            </Modal>
            
            {/* Edit Page Modal */}
            <Modal 
                title={`Edit Page: ${editingPageData?.name || ''}`} 
                open={editPageModalVisible} 
                onOk={editPage} 
                onCancel={() => { 
                    setEditPageModalVisible(false); 
                    setEditingPageData(null); 
                }} 
                okText="Save Changes" 
                destroyOnClose
            >
                <Form form={editPageForm} layout="vertical" name="editPageForm">
                    <Form.Item 
                        name="name" 
                        label="Page Name" 
                        rules={[{ required: true, message: 'Please enter page name', whitespace: true }]}
                    >
                        <Input placeholder="e.g., Login Screen" />
                    </Form.Item>
                    <Form.Item 
                        name="module" 
                        label="Module Path (Optional)" 
                        tooltip="Use '/' for hierarchy, e.g., Auth/Login"
                    >
                        <Input placeholder="e.g., Settings/Profile" />
                    </Form.Item>
                    <Form.Item 
                        name="description" 
                        label="Description (Optional)"
                    >
                        <Input.TextArea rows={3} placeholder="Page's purpose" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};