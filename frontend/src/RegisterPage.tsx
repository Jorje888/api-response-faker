import { Link } from 'react-router-dom';
import styles from './RegisterPage.module.css'; // 1. Import the CSS module

function RegisterPage() {
  return (
    <div className={styles.formContainer}>
       <div className={styles.formContainer}>
      <h2>Register Page</h2>
      <p>please fill in the forms given below</p>
       <form>
        <div className={styles.formGroup}>
          <label>Email: </label>
          <input type="email" />
        </div>
        <div className={styles.formGroup}>
          <label>Password: </label>
          <input type="password" />
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


      <div className={styles.formContainer}>




      </div>

export default RegisterPage;