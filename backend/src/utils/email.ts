import nodemailer from 'nodemailer';

import dotenv from 'dotenv';

dotenv.config();

const createTransporter = () => {
    // If specific service is set (e.g. 'gmail')
    if (process.env.SMTP_SERVICE) {
        return nodemailer.createTransport({
            service: process.env.SMTP_SERVICE,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // Generic SMTP
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASS
        }
    });
};

const transporter = createTransporter();

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        // Mock if no credentials provided to avoid errors in dev
        if (!process.env.SMTP_EMAIL || process.env.SMTP_EMAIL === 'your-email@gmail.com') {
            console.log("\n================ [MOCK EMAIL SERVICE] ================");
            console.log(`To:      ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`From:    ${process.env.SMTP_FROM || 'Visual DB'}`);
            console.log("---------------- Body ----------------");
            console.log(html.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...'); // Preview plain text
            console.log("--------------------------------------\n");
            // If it contains a link, print it clearly for the user to click
            const linkMatch = html.match(/href="([^"]*)"/);

            if (linkMatch && linkMatch[1]) {
                console.log(`[ACTION LINK]: ${linkMatch[1]}`);
            }
            console.log("======================================================\n");

            return;
        }

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Visual DB Host" <noreply@visualdb.app>',
            to,
            subject,
            html
        });

        console.log(`[Email Service] Sent to ${to} | ID: ${info.messageId}`);
    } catch (e) {
        console.error("[Email Service] Failed:", e);
        // Fallback log for dev so user doesn't get stuck
        console.log(`\n[FAILED EMAIL - FALLBACK DISPLAY] To: ${to}\nContent: ${html}\n`);
    }
};
