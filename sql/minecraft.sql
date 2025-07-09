CREATE DATABASE IF NOT EXISTS `Mojang`;

USE `Mojang`;

-- =======================================================================
-- SCRIPT PARA BANCO DE DADOS - SEÇÃO MINECRAFT DUNGEONS (COM PREFIXOS)
-- =======================================================================
-- Usando o banco de dados principal do grupo (ou crie um se necessário)
-- Ex: USE trabalho_final_db;
-- COMANDO 1: CREATE TABLE `categorias_d`
-- Finalidade: Armazena os tipos de itens específicos do Dungeons.
-- O sufixo '_d' evita conflito com tabelas de outros jogos.
CREATE TABLE
    categorias_d (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nome VARCHAR(100) NOT NULL UNIQUE
    );

-- COMANDO 2: CREATE TABLE `itens_d`
-- Finalidade: Armazena os itens do Dungeons.
-- A chave estrangeira `categoria_id` agora referencia a tabela `categorias_d`.
CREATE TABLE
    itens_d (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nome VARCHAR(255) NOT NULL,
        poder INT NOT NULL,
        raridade ENUM ('Comum', 'Raro', 'Único') NOT NULL,
        categoria_id INT,
        FOREIGN KEY (categoria_id) REFERENCES categorias_d (id) ON DELETE SET NULL
    );

-- COMANDO 3: INSERT INTO
-- Finalidade: Popula as tabelas do Dungeons com dados de exemplo.
INSERT INTO
    categorias_d (nome)
VALUES
    ('Arma Corpo a Corpo'),
    ('Arma à Distância'),
    ('Armadura'),
    ('Artefato');

INSERT INTO
    itens_d (nome, poder, raridade, categoria_id)
VALUES
    ('Lâminas do Dançarino', 108, 'Único', 1),
    ('Armadura do Lobo', 110, 'Único', 3),
    ('Arco do Guardião Sussurrante', 105, 'Raro', 2),
    ('Bota de Plumas', 100, 'Comum', 4),
    ('Foice Congelante', 112, 'Único', 1);

-- COMANDO 4: SELECT com INNER JOIN (Para a Página de Relatório do Dungeons)
-- Finalidade: Consulta específica para o relatório do Dungeons,
-- juntando as tabelas `itens_d` e `categorias_d`.



-- Java
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Em um ambiente de produção, sempre armazene senhas com hash.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Tipos de Produto
-- Tabela de lookup para categorizar os produtos (Mod, Textura, Skin, etc.).
CREATE TABLE IF NOT EXISTS product_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Inserir alguns tipos de produto padrão
INSERT INTO product_types (name) VALUES ('Mod'), ('Textura'), ('Skin'), ('Mapa')
ON DUPLICATE KEY UPDATE name=name;

-- Tabela de Produtos
-- Armazena os produtos do Minecraft (mods, texturas, etc.)
-- Contém uma chave estrangeira para a tabela product_types.
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type_id INT,
    download_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES product_types(id) ON DELETE SET NULL
);

-- Tabela de Junção para Relatórios (Downloads de Usuários)
-- Rastreia quais usuários baixaram quais produtos.
-- Essencial para o relatório com INNER JOIN.
CREATE TABLE IF NOT EXISTS user_downloads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    product_id INT,
    download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id) -- Impede que o mesmo usuário baixe o mesmo produto várias vezes no relatório
);

-- Inserir alguns dados de exemplo para teste
INSERT INTO users (name, email, password) VALUES
('Alice', 'alice@example.com', 'hashed_password'),
('Bob', 'bob@example.com', 'hashed_password');

INSERT INTO products (name, description, type_id, download_url) VALUES
('OptiFine', 'Mod de otimização gráfica.', 1, 'http://example.com/optifine'),
('Faithful', 'Pacote de textura que mantém o estilo original.', 2, 'http://example.com/faithful');

INSERT INTO user_downloads (user_id, product_id) VALUES
(1, 1),
(1, 2),
(2, 1);
