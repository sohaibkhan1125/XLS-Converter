// IMPORTANT: This file contains server-side logic that uses secrets.
// Ensure you have set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment variables.

import {
    Client,
    Environment,
    LogLevel,
} from '@paypal/paypal-server-sdk';

let clientInstance: Client | null = null;

export function getPayPalClient(): Client {
    if (clientInstance) {
        return clientInstance;
    }

    const {
        PAYPAL_CLIENT_ID,
        PAYPAL_CLIENT_SECRET,
    } = process.env;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error('PayPal API credentials are not configured in environment variables.');
    }

    const environment = process.env.NODE_ENV === 'production' 
        ? Environment.Live 
        : Environment.Sandbox;

    clientInstance = new Client({
        clientCredentialsAuthCredentials: {
            oAuthClientId: PAYPAL_CLIENT_ID,
            oAuthClientSecret: PAYPAL_CLIENT_SECRET,
        },
        timeout: 0,
        environment: environment,
        logging: {
            logLevel: LogLevel.Info,
            logRequest: { logBody: true },
            logResponse: { logHeaders: true },
        },
    });

    return clientInstance;
}
