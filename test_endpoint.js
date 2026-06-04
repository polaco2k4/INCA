// Teste rápido do endpoint de reset
fetch('/api/reset-solicitar', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
        nbi: 'DEMO-006-UIG-2026', 
        email: 'joao@example.com' 
    })
})
.then(response => {
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    return response.text();
})
.then(text => {
    console.log('Resposta:', text);
})
.catch(error => {
    console.error('Erro:', error);
});
