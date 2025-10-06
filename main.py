from fastapi import FastAPI, HTTPException
# Sistema de Estoque
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.orm import sessionmaker
# Formulários de Cadastro
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse

# ==================================================
# CONFIGURAÇÃO INICIAL DA APLICAÇÃO FASTAPI
# ==================================================
app = FastAPI(title="Mini PDV API")

# Serve arquivos estáticos (CSS, JS, imagens)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configuração de CORS para permitir requisições de qualquer origem
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  #  Deixa QUALQUER loja frontend acessar
    allow_credentials=True, #  Permite cookies/autorização 
    allow_methods=["*"],  #  Permite todos métodos (GET, POST, etc.)
    allow_headers=["*"],  #  Permite todos cabeçalhos
)
# ==================================================
# SERVE O HTML PRINCIPAL
# ==================================================
@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve a página HTML principal"""
    try:
        return FileResponse("static/index.html")
    except FileNotFoundError:
        return HTMLResponse("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Mini PDV - Backend Online</title>
        </head>
        <body>
            <h1>✅ Backend FastAPI está funcionando!</h1>
            <p>O backend está rodando, mas o arquivo HTML não foi encontrado.</p>
            <p>Acesse:</p>
            <ul>
                <li><a href="/docs">Documentação da API (Swagger)</a></li>
                <li><a href="/products">Lista de produtos (JSON)</a></li>
            </ul>
        </body>
        </html>
        """)
# ==================================================
# CONFIGURAÇÃO DO BANCO DE DADOS SQLITE
# ==================================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./pdv.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para os modelos do banco de dados
Base = declarative_base()

# ==================================================
# MODELOS DO BANCO DE DADOS
# ==================================================

# Modelo da tabela "produtos" - armazena informações dos produtos
class Produto(Base):
    __tablename__ = "produtos"
    id = Column(Integer, primary_key=True, index=True)  # ID único do produto
    nome = Column(String, nullable=False)               # Nome do produto
    preco = Column(Float, nullable=False)               # Preço do produto
    estoque = Column(Integer, default=0)                # Quantidade em estoque

# Modelo da tabela "vendas" - armazena histórico de vendas
class Venda(Base):
    __tablename__ = "vendas"
    id = Column(Integer, primary_key=True, index=True)  # ID único da venda
    total = Column(Float, default=0.0)                  # Valor total da venda
    itens = Column(String)                              # Itens da venda em formato JSON

# Cria as tabelas no banco de dados (se não existirem)
Base.metadata.create_all(bind=engine)

# ==================================================
# MODELOS PYDANTIC PARA VALIDAÇÃO DE DADOS
# ==================================================

# Modelo para criação de novo produto
class ProdutoCreate(BaseModel):
    nome: str 
    preco: float
    estoque: int 

# Modelo para resposta de produto (retorno da API)
class ProdutoResponse(BaseModel):
    id: int 
    nome: str 
    preco: float 
    estoque: int

# Modelo para item do carrinho de compras
class ItemCarrinho(BaseModel):
    product_id: int
    quantity: int

# Modelo para requisição de checkout
class CheckoutRequest(BaseModel):
    items: List[ItemCarrinho]

# Modelo para resposta de venda
class VendaResponse(BaseModel):
    id: int
    total: float
    items: str

# ==================================================
# ENDPOINTS DA API
# ==================================================

@app.get("/ping")
def ping():
    """Endpoint de health check - verifica se a API está funcionando"""
    return {"message": "pong", "status": "API funcionando"}

@app.get("/products", response_model=List[ProdutoResponse])
def listar_produtos():
    """Retorna todos os produtos cadastrados no sistema"""
    db = SessionLocal()
    produtos = db.query(Produto).all()
    db.close()
    return produtos

@app.post("/products", response_model=ProdutoResponse)
def criar_produto(produto: ProdutoCreate):
    """Cria um novo produto no sistema"""
    db = SessionLocal()
    db_produto = Produto(**produto.dict())
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    db.close()
    return db_produto


# ✅ ADICIONE ESTE CÓDIGO NO BACKEND - depois do @app.post("/products")
@app.put("/products/{product_id}", response_model=ProdutoResponse)
def atualizar_produto(product_id: int, produto: ProdutoCreate):
    """Atualiza um produto existente"""
    db = SessionLocal()
    
    # Busca o produto pelo ID
    db_produto = db.query(Produto).filter(Produto.id == product_id).first()
    if not db_produto:
        db.close()
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Atualiza os campos
    db_produto.nome = produto.nome
    db_produto.preco = produto.preco
    db_produto.estoque = produto.estoque
    
    db.commit()
    db.refresh(db_produto)
    db.close()
    
    return db_produto
@app.delete("/products/{product_id}")
def deletar_produto(product_id: int):
    """
    DELETE - Remove permanentemente um produto do sistema
    
    Parâmetros:
    - product_id: ID do produto a ser removido
    
    Retorno:
    - Mensagem de confirmação da exclusão
    - HTTP 404 se o produto não for encontrado
    """
    db = SessionLocal()
    
    # Busca o produto pelo ID
    produto = db.query(Produto).filter(Produto.id == product_id).first()
    
    if not produto:
        db.close()
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Remove o produto do banco de dados
    db.delete(produto)
    db.commit()
    db.close()
    
    return {"message": f"Produto '{produto.nome}' (ID: {product_id}) removido com sucesso"}

@app.post("/checkout", response_model=VendaResponse)
def checkout(order: CheckoutRequest):
    """Processa uma venda, atualizando estoques e registrando a venda"""
    db = SessionLocal()
    total = 0
    itens_venda = []
    
    for item in order.items:
        produto = db.query(Produto).filter(Produto.id == item.product_id).first()
        
        if not produto:
            db.close()
            raise HTTPException(status_code=404, detail=f"Produto {item.product_id} não encontrado")
        
        if produto.estoque < item.quantity:
            db.close()
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente para {produto.nome}")
        
        # Atualiza estoque
        produto.estoque -= item.quantity
        
        # Calcula total
        subtotal = produto.preco * item.quantity
        total += subtotal
        
        # Adiciona item à venda
        itens_venda.append({
            "product_id": produto.id,
            "nome": produto.nome,
            "quantidade": item.quantity,
            "preco_unitario": produto.preco,
            "subtotal": subtotal
        })
    
    # Cria a venda
    venda = Venda(total=total, itens=str(itens_venda))
    db.add(venda)
    db.commit()
    db.refresh(venda)
    db.close()
    
    return VendaResponse(
        id=venda.id,
        total=venda.total,
        items=venda.itens
    )

@app.get("/sales", response_model=List[VendaResponse])
def listar_vendas():
    """Retorna todas as vendas realizadas"""
    db = SessionLocal()
    vendas = db.query(Venda).all()
    db.close()
    return vendas

@app.get("/sales/{venda_id}", response_model=VendaResponse)
def obter_venda(venda_id: int):
    """Retorna os detalhes de uma venda específica"""
    db = SessionLocal()
    venda = db.query(Venda).filter(Venda.id == venda_id).first()
    db.close()
    
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    return venda