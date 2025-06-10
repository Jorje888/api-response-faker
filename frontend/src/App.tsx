import React from 'react';
import './App.css';
import RuleForm from './RuleForm'; 
import RuleList from './RuleList';
import type {Rule} from './RuleList';
import { useState } from 'react';


function App() {
  const [rules, setRules] = useState<Rule[]>([]);
  const handleAddRule = (newRule: Rule) => {
    setRules(prevRules => [...prevRules, newRule]);
  };

  return (
    <div className='App'>
      <h1>API response faker</h1>
      <RuleForm onAddRule={handleAddRule} />
      {/* Pass the 'rules' state variable */}
      <RuleList rules={rules} />
    </div>
  );
}

export default App
