import { Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import socket from './socket';
import React, { useState } from 'react';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // სარეგისტრაციო გვერდზე (და დასალოგინებელ გვერდზეც) არის ის , რომ
  // 1. ყველაფერს უნდა გავუწეროთ რა ტიპია , განსაკუთრებით თუკი არის ყველაზე მთავარი რაღაც რაც მთლიან მექანიზმს ქლოქავს (მაგალითად handlesubmit ში e ს განსაზღვრა არის აუცილებელი)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const registrationData = { email, password };
    console.log('Registering with:', registrationData);
    socket.emit('registerAttempt', registrationData);
    setEmail('');
    setPassword('');
  };
  return (
    <div className={styles.formContainer}>
       <div className={styles.formContainer}>
      <h2>Register Page</h2>
      <p>please fill in the forms given below</p>
       <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Email: </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label>Password: </label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit">Register</button>
      </form>
      <Link to="/login" className={styles.formLink}>
        Already have an account? Login
      </Link>
      </div>
    </div>
  );
}


export default RegisterPage;