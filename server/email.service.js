const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

// Debug: Log environment variables
console.log('=== Email Service Configuration ===');
console.log('Environment variables:', {
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'Set' : 'Not set',
    FRONTEND_URL: process.env.FRONTEND_URL || 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'Not set'
});

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dtactics.dt@gmail.com',
        pass: process.env.EMAIL_PASSWORD // Use app-specific password for Gmail
    }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('=== Email Service Error ===');
        console.error('Transporter verification failed:', error);
    } else {
        console.log('=== Email Service Ready ===');
        console.log('Server is ready to send emails');
    }
});

const emailService = {
    // Send password reset email
    sendPasswordResetEmail: async (to, resetToken) => {
        console.log('=== Sending Password Reset Email ===');
        console.log('To:', to);
        try {
            // Use default URL if FRONTEND_URL is not set
            const baseUrl = 'http://25.5.93.125:4200';
            const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;
            console.log('Reset link generated:', resetLink);
            
            const mailOptions = {
                from: 'dtactics.dt@gmail.com',
                to: to,
                subject: 'Password Reset Request',
                html: `
                    <h2>Password Reset Request</h2>
                    <p>You have requested to reset your password. Click the link below to proceed:</p>
                    <p><a href="${resetLink}">Reset Password</a></p>
                    <p>If you did not request this, please ignore this email.</p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If the link above doesn't work, copy and paste this URL into your browser:</p>
                    <p>${resetLink}</p>
                `
            };

            console.log('Sending email with options:', {
                from: mailOptions.from,
                to: mailOptions.to,
                subject: mailOptions.subject
            });

            const info = await transporter.sendMail(mailOptions);
            console.log('Password reset email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            console.error('=== Email Sending Error ===');
            console.error('Error type:', error.name);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error stack:', error.stack);
            throw error;
        }
    },

    // Send welcome email
    sendWelcomeEmail: async (to, username) => {
        try {
            const mailOptions = {
                from: 'dtpass.dt@gmail.com',
                to: to,
                subject: 'Welcome to Lead Management System',
                html: `
                    <h2>Welcome to Lead Management System!</h2>
                    <p>Hello ${username},</p>
                    <p>Thank you for joining our platform. We're excited to have you on board!</p>
                    <p>You can now log in to your account and start managing your leads.</p>
                    <p>If you have any questions, feel free to contact our support team.</p>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Welcome email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending welcome email:', error);
            throw error;
        }
    },

    // Send lead notification email
    sendLeadNotification: async (to, leadDetails) => {
        try {
            const mailOptions = {
                from: 'dtpass.dt@gmail.com',
                to: to,
                subject: 'New Lead Assignment',
                html: `
                    <h2>New Lead Assignment</h2>
                    <p>You have been assigned a new lead:</p>
                    <ul>
                        <li><strong>Name:</strong> ${leadDetails.first_name} ${leadDetails.last_name || ''}</li>
                        <li><strong>Email:</strong> ${leadDetails.email_id_1}</li>
                        <li><strong>Phone:</strong> ${leadDetails.phone_no_1}</li>
                        <li><strong>Status:</strong> ${leadDetails.status}</li>
                    </ul>
                    <p>Please follow up with this lead as soon as possible.</p>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Lead notification email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending lead notification email:', error);
            throw error;
        }
    }
};

module.exports = emailService; 