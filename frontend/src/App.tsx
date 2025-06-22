import React from 'react';
import './App.css';
import RuleForm from './RuleForm'; 
import RuleList from './RuleList';
import type {Rule} from './RuleList';
import { useState } from 'react';
import socket from './socket';
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route , Navigate} from 'react-router-dom';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import { Link } from 'react-router-dom';

// ამ კოდს შევცვლი იმის მიხედვით როგორ მომიწევს გატესტვა , საიდან რისი ჩამოტვირთვა მომიწევს ,
// სოკეტიდან როგორ , რა ბრძანებთ მიიღებენ ინფორმაციას

function App() {
const [rules, setRules] = useState<Rule[]>([]);
//შევქმენით ახალი ტიპი რომეიც ამოწმებს დალოგინებულენბი ვართ თუ არა , და ამის მერე (დეფაულტად არ ვართ), როდესაც დალოგინებულები ვიქნებით , შეიცვლება ეს თრუდ , და გამოვაჩენთ თითონ აპის იმ ნაწილს რომელიც ჯერჯერობით დამალული არ არის)  
const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('authToken'));;

  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem('authToken');
      if (token) {
      socket.auth = { token: token };
    socket.connect();

    socket.on('connect', () => {
      console.log('Connected to server , dachi made it!' + socket.id);
    });
    socket.on('disconnect', (reason) => {
      console.log(`Disconnected from server: ${reason}`);
    });

     socket.on('ruleAddedSuccess', (data: { status: string, receivedRule: Rule }) => {
      console.log('Server confirmed rule was added:', data.receivedRule);
      setRules(prevRules => [...prevRules, data.receivedRule]);
    });

    socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err.message);
        });

    socket.on('ruleAddError', (error: any) => {
      error.printstacktrace(); // specific error details
    });
  }
  }else{
     socket.disconnect();
      socket.off('connect');
      socket.off('disconnect');
      socket.off('ruleAddedSuccess');
      socket.off('connect_error');
      socket.off('ruleAddError');
  }
    return () => {
      socket.disconnect();
      socket.off('connect');
      socket.off('disconnect');
      socket.off('ruleAddedSuccess');
      socket.off('ruleAddError');
      socket.off('connect_error');
    };
  }, [isLoggedIn]);

  const handleAddRule = (newRule: Rule) => {
    socket.emit('addRule', newRule);
  };
 // უკვე ავხსენი რასაც უნდა აკეთებდეს ეს ფუნქცია , ფაქტობრივად სვიჩია , როდესაც დალოგინდები , ჩაგერთვება კონტენტი , თუ გამოხვალ , გამოირთვება კონტენტი
   const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  }

   const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    console.log('User logged out. isLoggedIn is now:', false);
    // The useEffect above will handle disconnecting the socket when isLoggedIn becomes false
  };

  return (
    <div className='App'>
  <BrowserRouter>
      <nav style={{ padding: '1rem', background: '#f0f0f0', borderBottom: '1px solid #ccc' }}>
        {/*აქ ავაგეთ თითონ ლინკები*/}
        <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
         {!isLoggedIn ? ( // თუ არ ვართ დალოგინებულები, ვაჩვენებთ Login/Register ლინკებს
            <>
        <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
        <Link to="/register">Register</Link>
         </>
          ) : ( // დავამატოთ ლოგაუთის ღილაკი
          <>
          <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Logout
            </button>
          </>
          )}
      </nav>
      <main style={{ padding: '1rem' }}>
        <Routes>
          {/*აქ ვსვამთ სარეგიტრაციო და სალოგინო ლინკებს , და ანუ აქ იმ აგებულ ლინკებს რომ დავაწვებით სად გადაგვიყვანს ეგაა მოცემული*/}
          <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess}/>} />
          <Route path="/register" element={<RegisterPage />} />
          {/*ეს ელემენტი იგივე სახლში მიდის , და ელემენტის აღწერაში იგივე გავუწერე , რაც უკვე იყო გაწერილი App.tsx ში , 
          უბრალოდ მაინც რომ შემენარჩუნებინა ფუნქციონალი ასე ჯობდა რომ გამეკეთებინა*/}
          <Route path="/" element={
              isLoggedIn ? (
            <>
              <h1>API response faker</h1>
              <RuleForm onAddRule={handleAddRule} />
              <RuleList rules={rules} />
            </>
            ) : (<>
                <Navigate to="/login" replace /> {/*Navigate კომპონენტი გადამისამართებისთვის*/}
                </>
              )
          } />
        </Routes>
      </main>
    </BrowserRouter>
    </div>
  );
}

export default App
