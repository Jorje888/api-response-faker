import { Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import socket from './socket';
import React, { useState } from 'react';

function RegisterPage() {
  // ემაილის მაგივრად პოსტ მეთოდში იღებენ უზერნეიმს , და ამიტო მომიწია გადარქმევა
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // სარეგისტრაციო გვერდზე (და დასალოგინებელ გვერდზეც) არის ის , რომ
  // 1. ყველაფერს უნდა გავუწეროთ რა ტიპია , განსაკუთრებით თუკი არის ყველაზე მთავარი რაღაც რაც მთლიან მექანიზმს ქლოქავს (მაგალითად handlesubmit ში e ს განსაზღვრა არის აუცილებელი)
  // 2. როდესაც ვწერთ e.preventDefault(); , ეს გვეხმარება იმაში რომ ყველაფერი არ გადარესტარტდეს , და 
  // მთლიანი ფეიჯი არ დაიწყოს თავიდან , ეს დიდ პრობლემას შეუქმნის კავშირს სოკეტებში
  // და ამიტომ აქ ვაზუსტებთ რა შემოყავს კლიენტს , მერე , სოკეტზე ვაგზავნით რომ რეგისტრაციაში შემოსვლის მცდელობა იყო , და ვუშვებთ თითონ ინფორმაციას ვუშვებთ რაც შემოიყვნეს
  // და საბოლოოდ ისევ ვარესტარტებთ და ყველაფერი თავიდან არის შესაყვანი 
  const handleSubmit = async(e: React.FormEvent) => {
    //რო არ გადაიტვირთოს ყველაფერი თავიდან და არ გაწყდეს კავშირი ვწერთ e.preventDefault();
    e.preventDefault();

    // ეს იგივეა , პოსტმენში რომ გადავცე POST method ში
    // ინფორმაცია და raw info ში ჩავუწერო უზერნეიმი და პასვორდი ,
    // და მერე რა პასუხსაც მივიღებთ , ის შევინახოთ რაღაც კონსტანტაში. ez 
    const registrationData = { username, password };
     try {
    const response = await fetch('http://localhost:3000/register', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    // მერე შევამოწმოთ ყველაფერი რიგზე თუ აქვს ამ რესპონსს.
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed!');
    }

    // აქ ჯეისონის ობიექტად ჩაწერილ დეითას ვაბრუნებთ
    const data = await response.json();
    console.log('Registration successful! Received data:', data);

  } catch (error) {
    console.error('There was an error during registration:', error);
  }

  // რომ შეიყვანენ რეგისტრაციაში ემაილს და პაროლს , უნდა გადავშალოთ
  //  ცარიელებად , რომ ვაგრძნობინოთ იუზერს რომ სახელი შეყვანილია ბაზაში , რომ მერე შევადაროთ.
  setPassword('');
  setUsername('');
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
          <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} />
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