// Test completo do fluxo de reset
const testCompleteFlow = async () => {
    try {
        console.log('=== 1. Solicitar Reset ===');
        const response1 = await fetch('http://localhost:3001/api/reset-solicitar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                nbi: 'DEMO-006-UIG-2026', 
                email: 'tipolaco2024@gmail.com' 
            })
        });

        const data1 = await response1.json();
        console.log('Status:', response1.status);
        console.log('Resposta:', JSON.stringify(data1, null, 2));

        if (data1.success && data1.demoToken) {
            console.log('\n=== 2. Verificar Token ===');
            const response2 = await fetch(`http://localhost:3001/api/reset-verificar?token=${data1.demoToken}&nbi=DEMO-006-UIG-2026`);
            const data2 = await response2.json();
            console.log('Status:', response2.status);
            console.log('Resposta:', JSON.stringify(data2, null, 2));

            if (data2.success) {
                console.log('\n=== 3. Confirmar Reset ===');
                const response3 = await fetch('http://localhost:3001/api/reset-confirmar', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        token: data1.demoToken, 
                        nbi: 'DEMO-006-UIG-2026', 
                        novoPin: '654321' 
                    })
                });
                const data3 = await response3.json();
                console.log('Status:', response3.status);
                console.log('Resposta:', JSON.stringify(data3, null, 2));
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

testCompleteFlow();
