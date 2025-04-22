const XrayComponent = () => {
    return (
      <div>
        <h1>Embedded HTML Page</h1>
        <iframe
          src={`/neo.html`} // Adjust the path as necessary
          title="Embedded Page"
          style={{ width: '100%', height: '500px', border: 'none' }}
        />
      </div>
    );
  };
  
  export default XrayComponent;