// IMPORTANT: This file contains server-side logic that uses secrets.
// Ensure you have set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment variables.

import {NextRequest, NextResponse} from 'next/server';
import {
    ApiError,
    OrdersController,
} from '@paypal/paypal-server-sdk';
import { getPayPalClient } from '@/lib/paypal-client';


/**
 * Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
const captureOrder = async (orderID: string) => {
    const client = getPayPalClient();
    const ordersController = new OrdersController(client);
    const collect = {
        id: orderID,
        prefer: 'return=minimal',
    };

    try {
        const {result, ...httpResponse} = await ordersController.captureOrder(
            collect
        );
        return {
            jsonResponse: result,
            httpStatusCode: httpResponse.statusCode,
        };
    } catch (error) {
        console.error("[PayPal API Error] Capture Order:", error);
        if (error instanceof ApiError) {
            // The APIError contains more details
            throw new Error(`PayPal API Error: ${error.message} - ${JSON.stringify(error.details)}`);
        }
        throw error;
    }
};

export async function POST(
  req: NextRequest,
  { params }: { params: { orderID: string } }
) {
    try {
        const { orderID } = params;
        if (!orderID) {
             return NextResponse.json({ error: "Missing Order ID" }, { status: 400 });
        }
        
        const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
        return NextResponse.json(jsonResponse, { status: httpStatusCode });

    } catch (error: any) {
        console.error("Failed to capture order:", error);
        return NextResponse.json({ error: "Failed to capture order.", details: error.message }, { status: 500 });
    }
}
