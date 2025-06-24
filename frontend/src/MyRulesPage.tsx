import React, { useState, useEffect } from 'react';
import socket from './socket';
import RuleList from './RuleList';
import type { Rule } from './RuleList';

function MyRulesPage() {
  const [myRules, setMyRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true); // To show a loading message

  useEffect(() => {
    const username = localStorage.getItem('username');
    console.log(`username: ${username}`);
    if (!username) {
      console.error("Could not find username in localStorage to fetch rules.");
      setIsLoading(false);
      return;
    }
    console.log(`Asking server for rules belonging to: ${username}`);
    socket.emit('getMyRules', username);

    function onYourRules(rulesFromServer: Rule[]) {
      console.log("Received my rules:", rulesFromServer);
      setMyRules(rulesFromServer);
      setIsLoading(false);
    }
    socket.on('yourRules', onYourRules);
    return () => {
      socket.off('yourRules', onYourRules);
    };
  }, []); // The empty array `[]` means this effect only runs ONCE when the page first loads.

  // --- The part the user sees ---
  
  if (isLoading) {
    return <div>Loading your rules...</div>;
  }

  return (
    <div>
      <h1>My Rules</h1>
      <p>Here are all the API rules you have created.</p>
      
      {myRules.length > 0 ? (
        <RuleList rules={myRules} />
      ) : (
        <p>You haven't created any rules yet.</p>
      )}
    </div>
  );
}

export default MyRulesPage;