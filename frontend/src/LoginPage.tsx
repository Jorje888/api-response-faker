import styles from './LoginPage.module.css';
import { Link, useNavigate } from 'react-router-dom'; // usenavigate დავამატეთ , რადგან თუკი გვჭირდება იუზერი გადავიყვანოთ სხვა გვერდზე , ეს გაგვიადვილებს საქმეს
import React, { useState } from 'react';//სოკეტი აღარ გვჭირდება
 // სალოგინო გვერდზე (და სარეგისტრაციო გვერდზეც) არის ის , რომ
  // 1. ყველაფერს უნდა გავუწეროთ რა ტიპია , განსაკუთრებით თუკი არის ყველაზე მთავარი რაღაც რაც მთლიან მექანიზმს ქლოქავს (მაგალითად handlesubmit ში e ს განსაზღვრა არის აუცილებელი)
  // 2. როდესაც ვწერთ e.preventDefault(); , ეს გვეხმარება იმაში რომ ყველაფერი არ გადარესტარტდეს , და 
  // მთლიანი ფეიჯი არ დაიწყოს თავიდან , ეს დიდ პრობლემას შეუქმნის კავშირს სოკეტებში , რადგან სოკეტი დაიწყება თავიდან , იქნება დისქონექთი და მერე ხელახლა ქონექთი , ჩვენ ეგ არ გვჭირდება ,ჩვენ გვჭირდება მუდმივი ქონექთი
  // და ამიტომ აქ ვაზუსტებთ რა შემოყავს კლიენტს , მერე , სოკეტზე ვაგზავნით რომ რეგისტრაციაში შემოსვლის მცდელობა იყო , და ვუშვებთ თითონ ინფორმაციას ვუშვებთ რაც შემოიყვნეს
  // და საბოლოოდ ისევ ვარესტარტებთ და ყველაფერი თავიდან არის შესაყვანი 

  // loginPageProps შევქმენი რადგან loginPage იყენებს App.tsx დან წამოღებულ ფუნქციას სახელად handleLoginSuccess აიღებს
  //  , და გამოიძახებს (ნუ ეს მაშინ მოხდება რა თქმა უნდა , როდესაც დალოგინება წარმატებული იქნება.)
  interface LoginPageProps {
  onLoginSuccess: () => void;
}

// აი აქ უკვე ვხედავთ ამ ფუნქციის განმარტებას , და როცა კი დავწერთ ამ ფუნქციის გამოძახებას , მაშინვე გამოიძახებს ეს App.tsx ში handleSubmit ფუნქციას , უფრო მეტი ინფორმაციისთვის გადადით App.tsx ში...
function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // როგორც რეგისტრაციაში , აქაც ვუშვებთ api მოთხოვნას ლოკალჰოსტ 3000/login ზე post request და raw data დ ვაძლევთ ისევ 
  // ემაილს (იუზერნაიმს) და პაროლს ჯეისონის სახით ჩაწერილებს
   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json(); 
      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }
      // აი აქ უკვე გვადგება ის ფუნქცია რომელიც იყო გაწერილი წინა ქომითზე, რომ ახლა დასვიჩოს App.tsx მა და დაგვანახოს გვერდის
      //  კონტენტი , იმის მაგივრად რომ ცარიელი გვერდი გვანახოს.
      console.log('Login successful!', data);
      localStorage.setItem('authToken', data.token);
      onLoginSuccess();
       navigate('/'); 
    } catch (err: any) {
      console.error('There was an error during login:', err);
    }
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
          <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} required/>
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