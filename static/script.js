// URL da API para comunicação com o backend
const API_URL = 'http://127.0.0.1:8000';

// Variáveis globais para armazenar os dados da aplicação
let carrinho = [];     // Array para armazenar os itens do carrinho
let produtos = [];     // Array para armazenar a lista de produtos
let editingProductId = null; // Variável para controlar qual produto está sendo editado

/**
 * Inicialização da aplicação quando o DOM estiver completamente carregado
 */
document.addEventListener('DOMContentLoaded', function() {
    // Carrega os produtos e o carrinho salvo
    carregarProdutos();
    carregarCarrinhoSalvo();
    setupEventListeners();
    
    // Configura o evento para mostrar/ocultar os detalhes de pagamento conforme a seleção
    document.getElementById('payment-method').addEventListener('change', function() {
        const method = this.value;
        document.getElementById('pix-details').style.display = 'none';
        document.getElementById('card-details').style.display = 'none';
        
        if (method === 'pix') {
            document.getElementById('pix-details').style.display = 'block';
            // Atualiza o valor do PIX com o total atual
            const total = calcularTotal();
            document.getElementById('pix-amount').textContent = formatarMoeda(total);
        } else if (method === 'cartao' || method === 'debito') {
            document.getElementById('card-details').style.display = 'block';
        }
    });
    
    // Dispara o evento change para mostrar os detalhes iniciais
    document.getElementById('payment-method').dispatchEvent(new Event('change'));
    
    // Configura os eventos do modal de produtos
    setupProductModalEvents();
});

/**
 * Configura os eventos do modal de produtos
 */
function setupProductModalEvents() {
    // Evento para salvar produto
    document.getElementById('saveProduct').addEventListener('click', function() {
        salvarProduto();
    });
    
    // Evento para limpar formulário
    document.getElementById('clearForm').addEventListener('click', function() {
        limparFormulario();
    });
    
    // Evento quando o modal é aberto
    document.getElementById('productModal').addEventListener('show.bs.modal', function() {
        carregarListaProdutos();
    });
}

/**
 * Função para salvar produto (criação ou edição)
 */
async function salvarProduto() {
    // Obtém os valores dos campos do formulário
    const productName = document.getElementById('productName').value;
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const productStock = parseInt(document.getElementById('productStock').value);
    
    // Validação básica dos campos obrigatórios
    if (!productName || isNaN(productPrice) || isNaN(productStock)) {
        alert('Por favor, preencha os campos obrigatórios (Nome, Preço e Estoque)');
        return;
    }
    
    // Prepara os dados do produto para envio (APENAS campos que o backend suporta)
    const productData = {
        nome: productName,
        preco: productPrice,
        estoque: productStock
    };
    
    try {
        let response;
        
        if (editingProductId) {
            // Modo edição - PUT request
            response = await fetch(`${API_URL}/products/${editingProductId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
        } else {
            // Modo criação - POST request
            response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
        }
        
        // Verifica se a resposta da requisição foi bem-sucedida
        if (!response.ok) {
            throw new Error('Erro ao salvar produto');
        }
        
        const savedProduct = await response.json();
        alert(`Produto ${editingProductId ? 'atualizado' : 'cadastrado'} com sucesso!`);
        
        // Recarrega a lista de produtos
        carregarProdutos();
        carregarListaProdutos();
        
        // Limpa o formulário e reseta o modo de edição
        limparFormulario();
        
    } catch (error) {
        alert('Erro ao salvar produto: ' + error.message);
    }
}

/**
 * Função para carregar a lista de produtos na tabela do modal
 */
async function carregarListaProdutos() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        const produtos = await response.json();
        const tableBody = document.getElementById('productTableBody');
        tableBody.innerHTML = '';
        
        // Verifica se há produtos para exibir
        if (produtos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum produto cadastrado</td></tr>';
            return;
        }
        
        // Preenche a tabela com os produtos
        produtos.forEach(produto => {
            // Determina a classe CSS baseada no nível de estoque
            let stockClass = 'stock-high';
            if (produto.estoque < 5) stockClass = 'stock-low';
            else if (produto.estoque < 10) stockClass = 'stock-medium';
            
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${produto.nome}</td>
                <td>R$ ${produto.preco.toFixed(2)}</td>
                <td class="${stockClass}">${produto.estoque}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editarProduto(${produto.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirProduto(${produto.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        document.getElementById('productTableBody').innerHTML = `
            <tr><td colspan="4" class="text-center text-danger">Erro ao carregar produtos: ${error.message}</td></tr>
        `;
    }
}

/**
 * Função para editar um produto existente
 * @param {number} productId - ID do produto a ser editado
 */
async function editarProduto(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        if (!response.ok) throw new Error('Erro ao carregar produto');
        
        const produto = await response.json();
        
        // Preenche o formulário com os dados do produto (APENAS campos que o backend suporta)
        document.getElementById('productName').value = produto.nome;
        document.getElementById('productPrice').value = produto.preco;
        document.getElementById('productStock').value = produto.estoque;
        
        // Configura o modo de edição
        editingProductId = productId;
        document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-pencil"></i> Editar Produto';
        document.getElementById('saveProduct').innerHTML = '<i class="bi bi-check-circle"></i> Atualizar Produto';
        
    } catch (error) {
        alert('Erro ao carregar produto: ' + error.message);
    }
}

/**
 * Função para excluir um produto
 * @param {number} productId - ID do produto a ser excluído
 */
async function excluirProduto(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao excluir produto');
        }
        
        alert('Produto excluído com sucesso!');
        
        // Recarrega as listas de produtos
        carregarProdutos();
        carregarListaProdutos();
        
    } catch (error) {
        alert('Erro ao excluir produto: ' + error.message);
    }
}

/**
 * Função para limpar o formulário de produto
 */
function limparFormulario() {
    document.getElementById('productForm').reset();
    editingProductId = null;
    document.getElementById('productModalLabel').innerHTML = '<i class="bi bi-box-seam"></i> Cadastro de Produto';
    document.getElementById('saveProduct').innerHTML = '<i class="bi bi-check-circle"></i> Salvar Produto';
}

/**
 * Função para formatar o número do cartão de crédito
 * @param {HTMLInputElement} input - Campo de input do número do cartão
 */
function formatCardNumber(input) {
    // Remove tudo que não é dígito
    let value = input.value.replace(/\D/g, '');
    
    // Adiciona espaços a cada 4 dígitos
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedValue += ' ';
        }
        formattedValue += value[i];
    }
    
    // Atualiza o valor formatado
    input.value = formattedValue;
}

/**
 * Função para formatar a data de validade do cartão
 * @param {HTMLInputElement} input - Campo de input da data de validade
 */
function formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 2) {
        input.value = value.substring(0, 2) + '/' + value.substring(2, 4);
    } else {
        input.value = value;
    }
}

/**
 * Função para formatar valores em moeda (Real brasileiro)
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado como moeda
 */
function formatarMoeda(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Calcula o total do carrinho
 * @returns {number} Valor total do carrinho
 */
function calcularTotal() {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantity), 0);
}

/**
 * Carrega os produtos da API
 */
async function carregarProdutos() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        
        produtos = await response.json();
        exibirProdutos(produtos);
        
    } catch (error) {
        document.getElementById('loading').innerHTML = `
            <div class="alert alert-danger">
                ❌ Erro ao carregar produtos: ${error.message}
            </div>
        `;
    }
}

/**
 * Carrega o carrinho salvo no localStorage
 */
function carregarCarrinhoSalvo() {
    const carrinhoSalvo = localStorage.getItem('carrinho');
    if (carrinhoSalvo) {
        carrinho = JSON.parse(carrinhoSalvo);
        atualizarCarrinho();
    }
}

/**
 * Salva o carrinho no localStorage
 */
function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
}

/**
 * Exibe os produtos na tela
 * @param {Array} produtos - Array de produtos a serem exibidos
 */
function exibirProdutos(produtos) {
    const container = document.getElementById('produtos-container');
    const loading = document.getElementById('loading');
    
    container.innerHTML = '';
    
    // Verifica se há produtos para exibir
    if (produtos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    📝 Nenhum produto cadastrado. 
                    <a href="#" data-bs-toggle="modal" data-bs-target="#productModal">
                        Clique aqui para adicionar o primeiro produto
                    </a>
                </div>
            </div>
        `;
        loading.style.display = 'none';
        return;
    }

    // Cria os cards para cada produto
    produtos.forEach(produto => {
        // Determina a classe CSS baseada no nível de estoque
        let stockClass = 'stock-high';
        if (produto.estoque < 5) stockClass = 'stock-low';
        else if (produto.estoque < 10) stockClass = 'stock-medium';
        
        const card = `
            <div class="col">
                <div class="card product-card h-100" onclick="adicionarAoCarrinho(${produto.id})">
                    <div class="card-body">
                        <h6 class="card-title">${produto.nome}</h6>
                        <p class="card-text">
                            <span class="text-success fw-bold fs-5">
                                R$ ${produto.preco.toFixed(2)}
                            </span>
                            <br>
                            <small class="text-muted ${stockClass}">
                                Estoque: ${produto.estoque} unidades
                            </small>
                        </p>
                        ${produto.estoque > 0 ? 
                            '<span class="badge bg-success">Disponível</span>' : 
                            '<span class="badge bg-danger">Esgotado</span>'
                        }
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });

    loading.style.display = 'none';
}

/**
 * Adiciona um produto ao carrinho
 * @param {number} productId - ID do produto a ser adicionado
 */
window.adicionarAoCarrinho = function(productId) {
    const produto = produtos.find(p => p.id === productId);
    
    if (!produto) {
        alert('Produto não encontrado!');
        return;
    }

    if (produto.estoque < 1) {
        alert('❌ Produto fora de estoque!');
        return;
    }

    // Verifica se o produto já está no carrinho
    const itemIndex = carrinho.findIndex(item => item.product_id === productId);
    
    if (itemIndex > -1) {
        // Aumenta a quantidade se já estiver no carrinho
        if (carrinho[itemIndex].quantity >= produto.estoque) {
            alert(`⚠️ Só temos ${produto.estoque} unidades em estoque!`);
            return;
        }
        carrinho[itemIndex].quantity += 1;
    } else {
        // Adiciona novo item ao carrinho
        carrinho.push({
            product_id: productId,
            quantity: 1,
            nome: produto.nome,
            preco: produto.preco,
            estoque: produto.estoque
        });
    }

    atualizarCarrinho();
    salvarCarrinho();
    
    // Feedback visual
    const btn = document.querySelector(`[onclick="adicionarAoCarrinho(${productId})"]`);
    btn.classList.add('bg-success', 'text-white');
    setTimeout(() => {
        btn.classList.remove('bg-success', 'text-white');
    }, 300);
};

/**
 * Remove um item do carrinho
 * @param {number} index - Índice do item a ser removido
 */
window.removerDoCarrinho = function(index) {
    carrinho.splice(index, 1);
    atualizarCarrinho();
    salvarCarrinho();
};

/**
 * Altera a quantidade de um item no carrinho
 * @param {number} index - Índice do item no carrinho
 * @param {number} change - Valor a ser adicionado/subtraído (1 ou -1)
 */
window.alterarQuantidade = function(index, change) {
    const novoValor = carrinho[index].quantity + change;
    
    if (novoValor < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    if (novoValor > carrinho[index].estoque) {
        alert(`⚠️ Só temos ${carrinho[index].estoque} unidades em estoque!`);
        return;
    }
    
    carrinho[index].quantity = novoValor;
    atualizarCarrinho();
    salvarCarrinho();
};

/**
 * Atualiza a exibição do carrinho
 */
function atualizarCarrinho() {
    const lista = document.getElementById('lista-carrinho');
    const totalElement = document.getElementById('total-carrinho');
    const btnCheckout = document.getElementById('btn-checkout');
    const cartCount = document.getElementById('cart-count');
    const carrinhoVazio = document.getElementById('carrinho-vazio');
    const carrinhoItens = document.getElementById('carrinho-itens');
    
    lista.innerHTML = '';
    let total = 0;

    // Atualiza o contador de itens no carrinho
    cartCount.textContent = carrinho.reduce((sum, item) => sum + item.quantity, 0);

    // Verifica se o carrinho está vazio
    if (carrinho.length === 0) {
        carrinhoVazio.style.display = 'block';
        carrinhoItens.style.display = 'none';
        btnCheckout.disabled = true;
        return;
    }

    carrinhoVazio.style.display = 'none';
    carrinhoItens.style.display = 'block';

    // Adiciona os itens ao carrinho
    carrinho.forEach((item, index) => {
        const subtotal = item.preco * item.quantity;
        total += subtotal;

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item p-3';
        itemElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${item.nome}</h6>
                    <small class="text-muted">R$ ${item.preco.toFixed(2)} cada</small>
                </div>
                <div class="text-end">
                    <div class="d-flex align-items-center mb-2">
                        <button class="btn btn-sm btn-outline-secondary" 
                                onclick="alterarQuantidade(${index}, -1)">
                            −
                        </button>
                        <span class="mx-2 fw-bold">${item.quantity}</span>
                        <button class="btn btn-sm btn-outline-secondary" 
                                onclick="alterarQuantidade(${index}, 1)">
                            +
                        </button>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="text-success fw-bold">
                            R$ ${subtotal.toFixed(2)}
                        </span>
                        <button class="btn btn-sm btn-danger ms-2" 
                                onclick="removerDoCarrinho(${index})">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
        lista.appendChild(itemElement);
    });

    totalElement.textContent = formatarMoeda(total);
    btnCheckout.disabled = carrinho.length === 0;
    
    // Atualiza o valor do PIX se estiver visível
    if (document.getElementById('pix-details').style.display === 'block') {
        document.getElementById('pix-amount').textContent = formatarMoeda(total);
    }
}

/**
 * Finaliza a compra
 */
async function finalizarCompra() {
    const paymentMethod = document.getElementById('payment-method').value;
    
    // Valida as informações de cartão se for o caso
    if (paymentMethod === 'cartao' || paymentMethod === 'debito') {
        const cardNumber = document.querySelector('#card-details input[type="text"]').value;
        if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
            alert('Por favor, informe um número de cartão válido');
            return;
        }
    }
    
    // Prepara os dados para o checkout (usando product_id que o backend espera)
    const checkoutData = {
        items: carrinho.map(item => ({
            product_id: item.product_id,  // backend espera product_id (com underline)
            quantity: item.quantity
        }))
    };

    try {
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(checkoutData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erro no checkout');
        }

        const resultado = await response.json();
        mostrarResultadoCheckout(resultado, paymentMethod);

    } catch (error) {
        alert('❌ Erro ao finalizar compra: ' + error.message);
    }
}

/**
 * Mostra o resultado do checkout
 * @param {Object} resultado - Resultado do checkout
 * @param {string} paymentMethod - Método de pagamento utilizado
 */
function mostrarResultadoCheckout(resultado, paymentMethod) {
    const total = resultado.total;
    const desconto = paymentMethod === 'pix' ? total * 0.1 : 0;
    const totalComDesconto = total - desconto;

    // Preenche os detalhes do checkout
    document.getElementById('checkout-details').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>📦 Itens comprados:</strong></p>
                <ul class="list-group">
                    ${carrinho.map(item => `
                        <li class="list-group-item">
                            ${item.quantity}x ${item.nome} - R$ ${(item.preco * item.quantity).toFixed(2)}
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="col-md-6">
                <p><strong>💰 Resumo do pagamento:</strong></p>
                <div class="list-group">
                    <div class="list-group-item">Subtotal: R$ ${total.toFixed(2)}</div>
                    ${desconto > 0 ? `
                        <div class="list-group-item text-success">
                            Desconto PIX (10%): -R$ ${desconto.toFixed(2)}
                        </div>
                    ` : ''}
                    <div class="list-group-item fw-bold">
                        Total: R$ ${totalComDesconto.toFixed(2)}
                    </div>
                    <div class="list-group-item">
                        Pagamento: ${getPaymentMethodIcon(paymentMethod)} ${getPaymentMethodName(paymentMethod)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Exibe o resultado do checkout
    document.getElementById('checkout-result').style.display = 'block';
    
    // Limpa o carrinho
    carrinho = [];
    localStorage.removeItem('carrinho');
    atualizarCarrinho();
}

/**
 * Retorna o ícone do método de pagamento
 * @param {string} method - Método de pagamento
 * @returns {string} Ícone do método de pagamento
 */
function getPaymentMethodIcon(method) {
    const icons = {
        'pix': '📱', 
        'cartao': '💳',
        'debito': '💳'
    };
    return icons[method] || '💰';
}

/**
 * Retorna o nome do método de pagamento
 * @param {string} method - Método de pagamento
 * @returns {string} Nome do método de pagamento
 */
function getPaymentMethodName(method) {
    const names = {
        'pix': 'PIX', 
        'cartao': 'Cartão de Crédito',
        'debito': 'Cartão de Débito'
    };
    return names[method] || method;
}

/**
 * Configura os event listeners da aplicação
 */
function setupEventListeners() {
    document.getElementById('btn-checkout').addEventListener('click', finalizarCompra);
    
    // Adiciona os event listeners para formatação dos campos de cartão
    document.querySelectorAll('.card-input').forEach(input => {
        input.addEventListener('input', function() {
            formatCardNumber(this);
        });
    });
    
    document.querySelectorAll('input[placeholder="MM/AA"]').forEach(input => {
        input.addEventListener('input', function() {
            formatExpiryDate(this);
        });
    });
}