# Enunciado do Projeto — Mini-PDV (FastAPI + HTML) no WSL

## Objetivo

Você vai criar um **mini sistema de PDV** (ponto de venda) com:

* **Backend** em **FastAPI** e **SQLite** (listar produtos, cadastrar, adicionar ao carrinho e fechar venda).
* **Frontend** simples em **HTML + Bootstrap + JavaScript** para consumir a API.

A ideia é ser **didático e tranquilo**: vamos fazer por passos curtos, testando a cada etapa. 🙂

---

## O que você vai aprender

* Criar e ativar um **ambiente virtual** no WSL.
* Instalar dependências com `pip` e gerar um **requirements.txt**.
* Subir um servidor FastAPI (**uvicorn**) e testar no navegador/Swagger.
* Montar uma página HTML que chama a API.

---

## Pré-requisitos rápidos

* WSL 2 com Ubuntu (ou similar).
* Python 3.10+ instalado no WSL.
* Navegador no Windows (pode abrir links do WSL via `wslview`).

> Dicas:
>
> * Confira a versão do Python: `python3 --version`
> * Se `pip` não existir, use `python3 -m ensurepip --upgrade` e depois `python3 -m pip install --upgrade pip`

---

## Passo 1 — Criar a pasta do projeto no WSL

Abra o **WSL (Ubuntu)** e rode:

```bash
# 1) vá para uma pasta confortável no WSL (dentro do Linux, não em /mnt/c)
cd ~
mkdir -p dev/mini-pdv
cd dev/mini-pdv
```

Estrutura que vamos ter ao final:

```
mini-pdv/
├─ app.py            # backend FastAPI
├─ requirements.txt  # lista de dependências
└─ web/
   └─ index.html     # frontend simples
```

---

## Passo 2 — Criar e ativar o ambiente virtual

```bash
# criar o ambiente virtual (pasta .venv ficará dentro do projeto)
python3 -m venv .venv

# ativar o ambiente
source .venv/bin/activate

# (opcional) atualizar o pip
python -m pip install --upgrade pip
```

> Repare que, dentro do venv, o prompt geralmente mostra `(.venv)` no começo da linha.
> Para **desativar** depois: `deactivate`.

---

## Passo 3 — Instalar as dependências

Vamos instalar o que o backend precisa:

```bash
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic
```

Agora gere o **requirements.txt** (congela as versões que você instalou):

```bash
pip freeze > requirements.txt
```

> Dica: no futuro, para recriar o ambiente em outra máquina:
> `pip install -r requirements.txt`

---

## Passo 4 — Criar o backend mínimo (teste de vida)

Crie o arquivo `app.py`:

```bash
cat > app.py << 'PY'
from fastapi import FastAPI

app = FastAPI(title="Mini PDV - API")

@app.get("/ping")
def ping():
    return {"message": "pong"}
PY
```

Rode o servidor:

```bash
uvicorn app:app --reload
```

Abra no navegador:

* Documentação Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* Rota de teste: [http://127.0.0.1:8000/ping](http://127.0.0.1:8000/ping)

> Se estiver no WSL e quiser abrir direto no navegador do Windows:
> `sudo apt update && sudo apt install -y wslu`
> Depois: `wslview http://127.0.0.1:8000/docs`

---

## Passo 5 — Evoluir o backend (rotas do PDV)

Agora você vai criar as rotas principais:

1. **Produtos**

   * `GET /products` → listar produtos
   * `POST /products` → cadastrar produto (`name`, `price`, `stock`)
2. **Checkout**

   * `POST /checkout` → receber itens do carrinho e registrar a venda
3. **Vendas**

   * `GET /sales` e `GET /sales/{id}` → listar vendas e ver detalhes

### Dica de implementação

* Use **SQLAlchemy** com **SQLite** (`sqlite:///./pdv.db`).
* Crie modelos: `Product`, `Sale`, `SaleItem`.
* Use **Pydantic** para validar entrada/saída.
* Teste cada rota pelo **Swagger** em `/docs`.

> Se quiser um guia pronto de modelos/rotas, me peça que te envio um esqueleto completo para colar.

---

## Passo 6 — Criar a interface web

Crie a pasta `web` e o arquivo `index.html`:

```bash
mkdir -p web
cat > web/index.html << 'HTML'
<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Mini PDV</title>
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"/>
</head>
<body class="bg-light">
<div class="container py-4">
  <h1 class="mb-4">Mini PDV</h1>
  <p>Em breve: tabela de produtos, carrinho e botão de checkout.</p>
</div>

<script>
  // Dica: quando você tiver as rotas prontas, consuma aqui:
  // const API = "http://127.0.0.1:8000";
  // fetch(API + "/products").then(r=>r.json()).then(console.log);
</script>
</body>
</html>
HTML
```

### Como abrir o `index.html`

* Jeito simples: `wslview web/index.html` (abre no navegador do Windows)
* Ou sirva o `index.html` pelo FastAPI (opcional) — posso te mandar esse trecho se quiser.

---

## Passo 7 — Testar o fluxo

1. Suba o backend: `uvicorn app:app --reload`
2. Em `/docs`, **cadastre alguns produtos** via `POST /products`.
3. No `index.html`, comece a **listar produtos** com `fetch("/products")`.
4. Crie um **carrinho** em JS (array/Map), calcule o total e chame `POST /checkout`.

> Vá devagar: primeiro só **listar**, depois **adicionar no carrinho**, e por fim **fechar venda**.

---

## Passo 8 — Salvar e reusar (requirements.txt)

* Sempre que instalar algo novo (ex.: `pip install python-multipart`), **atualize**:

  ```bash
  pip freeze > requirements.txt
  ```
* Para recomeçar do zero em outra máquina:

  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  ```

---

## Entregáveis (o que você deve me mostrar)

1. Projeto rodando com:

   * `app.py` com rotas de produtos e checkout.
   * `web/index.html` listando produtos e simulando carrinho.
2. **requirements.txt** gerado a partir do seu ambiente.
3. Um pequeno **vídeo ou prints** mostrando:

   * Cadastro de produto pelo `/docs`.
   * Listagem na página HTML.
   * Checkout funcionando (pode ser o JSON de resposta).

---

## Problemas comuns (e soluções rápidas)

* **Porta ocupada**: troque a porta (`uvicorn app:app --reload --port 8001`) ou feche o processo antigo.
* **`pip`**\*\* errado\*\*: dentro do venv use sempre `python -m pip ...`.
* **Projeto lento no WSL**: mantenha seus arquivos no **home do WSL** (ex.: `~/dev/mini-pdv`), não em `/mnt/c/...`.
* **CORS** no frontend: se a página estiver servida por arquivo `file:///`, habilite CORS no FastAPI; se servir o `index.html` pelo próprio FastAPI, isso simplifica.

---

## Bonus (opcional, se sobrar tempo)

* Botão “Novo produto” no frontend que usa `POST /products`.
* Selecionar forma de pagamento (ex.: PIX/dinheiro) e salvar no checkout.
* Relatório simples: `GET /sales` filtrando por data.

---
