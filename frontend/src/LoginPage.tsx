import styles from './LoginPage.module.css';
import { Link } from 'react-router-dom';
function LoginPage() {
  return (
      <div className={styles.container}> 
       <div className={styles.formContainer}> 
      <h2>Login Page</h2>
      <p>fill in the form of login please.</p>
      <form>
        <div className={styles.formGroup}>
          <label>Email: </label>
          <input type="email" />
        </div>
        <div className={styles.formGroup}>
          <label>Password: </label>
          <input type="password" />
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