function RegisterPage() {
  return (
    <div>
      <h2>Register Page</h2>
      <p>please fill in the forms given below</p>
       <form>
        <div>
          <label>Email: </label>
          <input type="email" />
        </div>
        <div>
          <label>Password: </label>
          <input type="password" />
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default RegisterPage;