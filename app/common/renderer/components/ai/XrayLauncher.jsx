// import React, { useState } from 'react';
// import AppiumInspector from './AppiumInspector';

// const XrayLauncher = () => {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <>
//       <button onClick={() => setIsOpen(true)}>
//         Open Inspector (Full‑Screen)
//       </button>

//       {isOpen && (
//         <div
//           style={{
//             position: 'fixed',
//             top: 0, left: 0, right: 0, bottom: 0,
//             backgroundColor: 'rgba(0, 0, 0, 0.8)',
//             zIndex: 9999,
//             display: 'flex',
//             flexDirection: 'column'
//           }}
//         >
//           <div style={{ padding: 10, textAlign: 'right' }}>
//             <button
//               style={{
//                 background: '#333',
//                 color: '#fff',
//                 border: 'none',
//                 padding: '8px 12px',
//                 borderRadius: 4,
//                 cursor: 'pointer'
//               }}
//               onClick={() => setIsOpen(false)}
//             >
//               Close
//             </button>
//           </div>
//           <div style={{ flex: 1, overflow: 'hidden' }}>
//             <AppiumInspector />
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default XrayLauncher;
