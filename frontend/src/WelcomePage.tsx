import React from 'react';
import { Link } from 'react-router-dom';

// Some simple inline styling to make it look nice
const containerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '10rem',
  padding: '2rem',
};

const linkStyle: React.CSSProperties = {
    margin: '0 1rem',
    fontSize: '1.2rem'
}

function WelcomePage() {
  return (
    <div style={containerStyle}>
      <h1>Welcome to the API Response Faker</h1>
      <p style={{ fontSize: '1.2rem', color: '#555' }}>
        To begin creating and managing API rules, please log in or create an account.
      </p>
      <div>
        <Link to="/login" style={linkStyle}>Login</Link>
        <span style={{color: '#ccc'}}>|</span>
        <Link to="/register" style={linkStyle}>Register</Link>
      </div>
    </div>
  );
}

export default WelcomePage;