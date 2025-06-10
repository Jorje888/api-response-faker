import React from 'react';
import './App.css';
import RuleForm from './RuleForm'; 
import RuleList from './RuleList';
import type {Rule} from './RuleList';


function App() {
const rules: Rule[] = [];
  return (
    <>

    <div className='App'>
      <h1>API response faker</h1>
      <RuleForm></RuleForm>
       <RuleList rules={rules} />

    </div>
    </>
  )
}

export default App
