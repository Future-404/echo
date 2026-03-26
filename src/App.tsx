import React from 'react'

const App: React.FC = () => {
  console.log('[App ZERO] Pure React component, no imports!');
  return (
    <div style={{ background: 'purple', color: 'white', padding: '40px' }}>
      <h1>BISECT 0: ZERO IMPORTS</h1>
      <p>If this works, the issue is 100% in the import chain of useAppStore or other hooks.</p>
    </div>
  )
}

export default App
