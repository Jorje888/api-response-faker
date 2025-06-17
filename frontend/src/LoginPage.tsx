function LoginPage() {
  return (
    <div>
      <h2>Login Page</h2>
      <p>fill in the form of login please.</p>
      <form>
        <div>
          <label>Email: </label>
          <input type="email" />
        </div>
        <div>
          <label>Password: </label>
          <input type="password" />
        </div>
        <button type="submit">Log In</button>
      </form>
    </div>
  );
}

export default LoginPage;