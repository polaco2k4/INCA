// Testar se a página reset-senha.html está funcionando
const testResetPage = async () => {
    try {
        console.log('=== Testar Página Reset Senha ===');
        
        // Testar se a página carrega
        const response = await fetch('http://localhost:3001/reset-senha.html');
        console.log('Status página:', response.status);
        
        if (response.ok) {
            console.log('✅ Página reset-senha.html está acessível');
            
            // Testar o endpoint
            const resetResponse = await fetch('http://localhost:3001/api/reset-solicitar', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    nbi: 'DEMO-006-UIG-2026', 
                    email: 'tipolaco2024@gmail.com' 
                })
            });
            
            const data = await resetResponse.json();
            console.log('Status endpoint:', resetResponse.status);
            console.log('Endpoint funcionando:', data.success);
        }
    } catch (error) {
        console.error('Erro:', error);
    }
};

testResetPage();
