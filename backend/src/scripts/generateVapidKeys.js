import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('Add these to backend/.env (and VITE_VAPID_PUBLIC_KEY to client/.env):\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
