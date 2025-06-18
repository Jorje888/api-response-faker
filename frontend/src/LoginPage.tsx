import styles from './LoginPage.module.css';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import socket from './socket';
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const loginData = { email, password };
    console.log('Sending login data to backend:', loginData);
    socket.emit('loginAttempt', loginData);
    setEmail('');
    setPassword('');
  };
  return (
      <div className={styles.formContainer}> 
       <div className={styles.formContainer}> 
      <h2>Login Page</h2>
      <p>fill in the form of login please.</p>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Email: </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
        </div>
        <div className={styles.formGroup}>
          <label>Password: </label>
          <input type="password"  value={password} onChange={(e) => setPassword(e.target.value)} required/>
        </div>
        <button type="submit">Log In</button>
         <Link to="/register" className={styles.formLink}>
          Don't have an account? Register
        </Link>
      </form>
      </div>
    </div>
  );
}

export default LoginPage;