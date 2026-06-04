// Test login com novo PIN
const testLogin = async () => {
    try {
        console.log('=== Testar Login com Novo PIN ===');
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                nbi: 'DEMO-006-UIG-2026', 
                pin: '654321' 
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Resposta:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
};

testLogin();
