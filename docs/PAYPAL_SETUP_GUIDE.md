# PayPal Setup Guide - Virtual Pub

## 1. Create PayPal Developer App

- Go to https://developer.paypal.com
- Apps and Credentials > Create App
- Copy Client ID and Secret to .env

## 2. Create Subscription Plans

Use the PayPal API or Dashboard to create 3 monthly plans:

- Grid: USD 2.99/month
- Pit Wall: USD 3.99/month
- Paddock: USD 4.99/month
  Copy each Plan ID to .env

## 3. Create Webhook

- Apps and Credentials > Your App > Webhooks > Add Webhook
- URL: https://your-domain.com/webhooks/paypal
- Events: BILLING.SUBSCRIPTION.ACTIVATED, BILLING.SUBSCRIPTION.CANCELLED, BILLING.SUBSCRIPTION.EXPIRED, PAYMENT.SALE.COMPLETED
- Copy Webhook ID to .env

## 4. Test with Sandbox

- Use sandbox credentials for development
- The app auto-detects sandbox vs production based on NODE_ENV
