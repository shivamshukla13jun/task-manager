import * as nodemailer from 'nodemailer';
import config from 'config/env';

const transporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: Number(config.EMAIL_PORT),
     secure: Number(config.EMAIL_PORT) === 465, // ← ✅ Fix here

    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASSWORD
    
    },
});

const sendEmail = async ({to,subject,html,attachments=[],cc,bcc}:{to: string, subject: string, html: string, attachments?: Array<{filename: string,content:Buffer}>, cc?: string[], bcc?: string[]}) => {
    try {
        console.log("email sent  to",to)
        const mailOptions: any = {
            from: config.EMAIL_USER,
            to,
            subject,
            html,
            attachments
        };

        if (cc && cc.length > 0) {
            mailOptions.cc = cc;
        }

        if (bcc && bcc.length > 0) {
            mailOptions.bcc = bcc;
        }

        await transporter.sendMail(mailOptions);
        console.info('Email sent successfully');
    } catch (error) {
        console.warn('Error sending email:', error);
        throw error;
    }
};
export default sendEmail