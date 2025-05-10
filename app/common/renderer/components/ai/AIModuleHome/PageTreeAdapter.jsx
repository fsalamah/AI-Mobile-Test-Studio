import React from 'react';
import PageTree from '../PageTree';

/**
 * PageTreeAdapter Component
 * 
 * This component adapts between the AIModuleHome page interface and the PageTree component.
 * It transforms the simplified props format into the format expected by PageTree.
 */
const PageTreeAdapter = ({
  pages = [],
  selectedIds = [],
  onSelect,
  setPages
}) => {
  // Transform pages to treeData format
  const treeData = pages.map(page => ({
    key: page.id,
    title: page.name,
    isModule: false,
    pageData: page
  }));

  // Handle selection
  const handleSelect = (keys) => {
    if (keys.length > 0 && onSelect) {
      onSelect(keys[0]);
    }
  };

  // Handle editing
  const handleEdit = (pageData) => {
    if (pageData && setPages) {
      // This would typically show an edit modal
      // For now, we just ensure the page exists in the pages array
      const pageExists = pages.some(p => p.id === pageData.id);
      if (pageExists) {
        // Trigger a state update by making a copy of the pages array
        setPages([...pages]);
      }
    }
  };

  // Handle deletion
  const handleDelete = (pageId) => {
    if (pageId && setPages) {
      // Filter out the page with the given id
      const newPages = pages.filter(p => p.id !== pageId);
      setPages(newPages);
    }
  };

  return (
    <PageTree
      pages={pages}
      treeData={treeData}
      selectedKeys={selectedIds}
      expandedKeys={[]}
      autoExpandParent={true}
      onSelect={handleSelect}
      onExpand={() => {}}
      onEdit={handleEdit}
      onDelete={handleDelete}
      searchTerm=""
      projectId=""
    />
  );
};

export default PageTreeAdapter;