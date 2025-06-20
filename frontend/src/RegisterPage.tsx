import { Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import socket from './socket';
import React, { useState } from 'react';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // სარეგისტრაციო გვერდზე (და დასალოგინებელ გვერდზეც) არის ის , რომ
  // 1. ყველაფერს უნდა გავუწეროთ რა ტიპია , განსაკუთრებით თუკი არის ყველაზე მთავარი რაღაც რაც მთლიან მექანიზმს ქლოქავს (მაგალითად handlesubmit ში e ს განსაზღვრა არის აუცილებელი)
  // 2. როდესაც ვწერთ e.preventDefault(); , ეს გვეხმარება იმაში რომ ყველაფერი არ გადარესტარტდეს , და 
  // მთლიანი ფეიჯი არ დაიწყოს თავიდან , ეს დიდ პრობლემას შეუქმნის კავშირს სოკეტებში
  // და ამიტომ აქ ვაზუსტებთ რა შემოყავს კლიენტს , მერე , სოკეტზე ვაგზავნით რომ რეგისტრაციაში შემოსვლის მცდელობა იყო , და ვუშვებთ თითონ ინფორმაციას ვუშვებთ რაც შემოიყვნეს
  // და საბოლოოდ ისევ ვარესტარტებთ და ყველაფერი თავიდან არის შესაყვანი 
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const registrationData = { email, password };
    console.log('Registering with:', registrationData);
    socket.emit('registerAttempt', registrationData);
    setEmail('');
    setPassword('');
  };
  return (
    // ნუ ეს უკვე გასაგები თუ არ არის , სტაილი არის registerPage.module.css იდან , 
    // და მერე ამ სტაილის formcontainer ს რომ ვანიჭებთ სახელად , ამავდროულად ენიჭება ის სტილიც 
    // რაც ამ კლასის სახელით ცნობილ კლასს აქვს გაწერილი css ში.
    <div className={styles.formContainer}>
       <div className={styles.formContainer}>
      <h2>Register Page</h2>
      <p>please fill in the forms given below</p>
       <form onSubmit={handleSubmit}>
        {/*
        იგივე ითქმის formGroup ზე css ში , რაცაა სახელი მოაქვს 
        formGroup იდან სახელი რაც ააქვს css ში
        */}
        <div className={styles.formGroup}>
          <label>Email: </label>
          {/*  
          ნუ აქ ონჩეინჯზე რომ იცვლება ნიშნავს რომ სთეითიც ისე შეიცვლება თითონ იმეილის ,
          როგორც თითონ იმეილი ჩაიწერებათითონ ამ ლეიბლში.
          */}
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