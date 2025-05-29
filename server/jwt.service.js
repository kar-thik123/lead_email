const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

const jwtService = {
    generateToken: (payload) => {
        try {
            return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        } catch (error) {
            console.error('JWT generation error:', error);
            throw new Error('Failed to generate JWT token');
        }
    },
    verifyToken: (token) => {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            console.error('JWT verification error:', error);
            throw new Error('Invalid or expired token');
        }
    },
    decodeToken: (token) => {
        try {
            return jwt.decode(token);
        } catch (error) {
            console.error('JWT decoding error:', error);
            return null;
        }
    },
    generateRefreshToken: (payload) => {
        try {
            return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        } catch (error) {
            console.error('Refresh token generation error:', error);
            throw new Error('Failed to generate refresh token');
        }
    }
};

module.exports = jwtService;

// Test the JWT service to ensure it's working
try {
    const testToken = jwtService.generateToken({ id: 'test', email: 'test@example.com' });
    console.log('JWT service test successful:', jwtService.verifyToken(testToken));
} catch (error) {
    console.error('JWT service initialization failed:', error);
}
