import styles from './LoginPage.module.css';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import socket from './socket';


 // სალოგინო გვერდზე (და სარეგისტრაციო გვერდზეც) არის ის , რომ
  // 1. ყველაფერს უნდა გავუწეროთ რა ტიპია , განსაკუთრებით თუკი არის ყველაზე მთავარი რაღაც რაც მთლიან მექანიზმს ქლოქავს (მაგალითად handlesubmit ში e ს განსაზღვრა არის აუცილებელი)
  // 2. როდესაც ვწერთ e.preventDefault(); , ეს გვეხმარება იმაში რომ ყველაფერი არ გადარესტარტდეს , და 
  // მთლიანი ფეიჯი არ დაიწყოს თავიდან , ეს დიდ პრობლემას შეუქმნის კავშირს სოკეტებში , რადგან სოკეტი დაიწყება თავიდან , იქნება დისქონექთი და მერე ხელახლა ქონექთი , ჩვენ ეგ არ გვჭირდება ,ჩვენ გვჭირდება მუდმივი ქონექთი
  // და ამიტომ აქ ვაზუსტებთ რა შემოყავს კლიენტს , მერე , სოკეტზე ვაგზავნით რომ რეგისტრაციაში შემოსვლის მცდელობა იყო , და ვუშვებთ თითონ ინფორმაციას ვუშვებთ რაც შემოიყვნეს
  // და საბოლოოდ ისევ ვარესტარტებთ და ყველაფერი თავიდან არის შესაყვანი 


function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

    // ნუ ეს უკვე გასაგები თუ არ არის , სტაილი არის loginPage.module.css იდან , 
    // და მერე ამ სტაილის formcontainer ს რომ ვანიჭებთ სახელად , ამავდროულად ენიჭება ის სტილიც 
    // რაც ამ კლასის სახელით ცნობილ კლასს აქვს გაწერილი css ში.
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
        {/*
        იგივე ითქმის formGroup ზე css ში , რაცაა სახელი მოაქვს 
        formGroup იდან სახელი რაც ააქვს css ში
        */}
      <h2>Login Page</h2>
      <p>fill in the form of login please.</p>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Email: </label>
            {/*  
          ნუ აქ ონჩეინჯზე რომ იცვლება ნიშნავს რომ სთეითიც ისე შეიცვლება თითონ იმეილის ,
          როგორც თითონ იმეილი ჩაიწერებათითონ ამ ლეიბლში.
          */}
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