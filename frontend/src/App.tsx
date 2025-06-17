import React from 'react';
import './App.css';
import RuleForm from './RuleForm'; 
import RuleList from './RuleList';
import type {Rule} from './RuleList';
import { useState } from 'react';
import socket from './socket';
import { useEffect } from 'react';


// ამ კოდს შევცვლი იმის მიხედვით როგორ მომიწევს გატესტვა , საიდან რისი ჩამოტვირთვა მომიწევს ,
// სოკეტიდან როგორ , რა ბრძანებთ მიიღებენ ინფორმაციას

function App() {
const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log('Connected to server , dachi made it!' + socket.id);
    });
    socket.on('disconnect', (reason) => {
      console.log(`Disconnected from server: ${reason}`);
    });

    socket.on('ruleAddedSuccess', (data: any) => {
      setRules(prevRules => [...prevRules, data]);
    });

    socket.on('ruleAddError', (error: any) => {
      error.printstacktrace(); // specific error details
    });

    return () => {
      socket.disconnect();
      socket.off('connect');
      socket.off('disconnect');
      socket.off('ruleAddedSuccess');
      socket.off('ruleAddError');
    };
  }, []);

  const handleAddRule = (newRule: Rule) => {
    setRules(prevRules => [...prevRules, newRule]);
    socket.emit('addRule', newRule);
  };

  return (
    <div className='App'>
      <h1>API response faker</h1>
      <RuleForm onAddRule={handleAddRule} />
      <RuleList rules={rules} />
    </div>
  );
}

export default App
