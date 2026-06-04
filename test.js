// Test script
const testReset = async () => {
    try {
        const response = await fetch('http://localhost:3001/api/reset-solicitar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                nbi: 'DEMO-006-UIG-2026', 
                email: 'tipolaco2024@gmail.com' 
            })
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (error) {
        console.error('Error:', error);
    }
};

testReset();
