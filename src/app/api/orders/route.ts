// IMPORTANT: This file contains server-side logic that uses secrets.
// Ensure you have set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your environment variables.

import {NextRequest, NextResponse} from 'next/server';
import {
    ApiError,
    OrdersController,
} from '@paypal/paypal-server-sdk';
import { getPayPalClient } from '@/lib/paypal-client';
import { PRICING_PLANS } from '@/config/pricing';

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    const plan = PRICING_PLANS.find(p => p.id === planId);
    if (!plan) {
        throw new Error("Invalid plan selected.");
    }
    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
    
    const client = getPayPalClient();
    const ordersController = new OrdersController(client);

    const requestBody = {
        intent: 'CAPTURE',
        purchase_units: [
            {
                amount: {
                    currency_code: 'USD',
                    value: price.toFixed(2),
                    breakdown: {
                        item_total: {
                            currency_code: 'USD',
                            value: price.toFixed(2),
                        },
                    },
                },
                items: [
                    {
                        name: `${plan.name} Plan - ${billingCycle === 'monthly' ? 'Monthly' : 'Annual'}`,
                        unit_amount: {
                            currency_code: 'USD',
                            value: price.toFixed(2),
                        },
                        quantity: '1',
                        description: `Access to ${plan.name} plan features for one ${billingCycle === 'monthly' ? 'month' : 'year'}.`,
                        sku: `${plan.id}-${billingCycle}`,
                    },
                ],
            },
        ],
    };

    const collect = {
        body: requestBody,
        prefer: 'return=representation',
    };

    try {
        const {result, ...httpResponse} = await ordersController.createOrder(collect);
        return {
            jsonResponse: result,
            httpStatusCode: httpResponse.statusCode,
        };
    } catch (error) {
        console.error("[PayPal API Error] Create Order:", error);
        if (error instanceof ApiError) {
             throw new Error(`PayPal API Error: ${error.message} - ${JSON.stringify(error.details)}`);
        }
        throw error;
    }
};


export async function POST(req: NextRequest) {
    try {
        const { planId, billingCycle } = await req.json();

        if (!planId || !billingCycle) {
            return NextResponse.json({ error: "Missing planId or billingCycle" }, { status: 400 });
        }
        
        const { jsonResponse, httpStatusCode } = await createOrder(planId, billingCycle);
        return NextResponse.json(jsonResponse, { status: httpStatusCode });
        
    } catch (error: any) {
        console.error("Failed to create order:", error);
        return NextResponse.json({ error: "Failed to create order.", details: error.message }, { status: 500 });
    }
}
