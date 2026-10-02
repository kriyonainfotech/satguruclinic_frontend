import React, { useState } from 'react';
import axios from 'axios';
import { Title, SubTitle } from '../components/Typography';
import FormInput from '../components/FormInput';
import Button from '../components/Button';
import './Login.css';

const Login = ({ loginType = 'Superadmin' }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
                email,
                password
            });
            
            const userRole = res.data.user.role;
            // Optionally enforce login types
            if (loginType.toLowerCase() === 'admin' && userRole !== 'admin') {
                setError('Access denied: You are not an Admin.');
                return;
            }
            if (loginType.toLowerCase() === 'team' && userRole !== 'team') {
                setError('Access denied: You are not a Team member.');
                return;
            }
            
            // Token aur User ki details local storage me save kar lenge
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            alert(`Welcome ${userRole}! Login successful.`);
            
            // Dashboard par redirect karenge (abhi ke liye window reload karke simple rakha hai)
            window.location.href = '/'; 
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <Title>Satguru Clinic</Title>
                <SubTitle>{loginType} Login</SubTitle>
                
                {error && <p className="error-text">{error}</p>}
                
                <form onSubmit={handleLogin}>
                    <FormInput 
                        label="Email Address" 
                        type="email" 
                        placeholder="Enter email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                    />
                    <FormInput 
                        label="Password" 
                        type="password" 
                        placeholder="Enter password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                    />
                    <Button type="submit" className="w-100">Login</Button>
                </form>
            </div>
        </div>
    );
};

export default Login;
