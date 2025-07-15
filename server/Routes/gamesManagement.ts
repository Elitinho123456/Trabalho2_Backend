// server/Routes/gamesManagement.ts ou server/Routes/rotasMinecraft.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { conn } from "../db/conn"
import { RowDataPacket, OkPacket } from 'mysql2'; // <-- MUDANÇA: Importado OkPacket para tipagem correta
import fastifyPlugin from 'fastify-plugin';

// =======================================================
// INÍCIO DAS INTERFACES E TIPAGENS GLOBAIS
// =======================================================

// --- Tipagem para Dungeons ---
interface ItemBody {
    nome: string;
    poder: number;
    raridade: 'Comum' | 'Raro' | 'Único';
    categoria_id: number;
}

// --- Tipagem para Java Edition (Products) ---
interface IProduct {
    id?: number;
    name: string;
    description: string;
    type_id: number;
    download_url: string;
}
interface IQueryString {
    name?: string;
    type?: string;
}

// --- Tipagem para Education Edition ---
interface Lesson {
    id?: number;
    title: string;
    description: string;
    subject_id: number;
    target_age_group: string;
    content_url: string;
}
interface LessonQuery {
    title?: string;
    subject_id?: string;
}

// --- Tipagem para Legends ---
interface Skin {
    id?: number; // ID é opcional na criação
    name: string;
    imageUrl: string;
    rarity: string;
    price: number;
}

// =======================================================
// FIM DAS INTERFACES E TIPAGENS
// =======================================================


// Função que agrupa e registra todas as rotas de jogos
export async function rotasMinecraft(fastify: FastifyInstance, opts: any) {

    // =======================================================
    // ROTAS - MINECRAFT DUNGEONS
    // =======================================================
    fastify.register(async (instance) => {
        // ROTA: Listar todas as categorias do Dungeons
        instance.get('/categorias', async (request: FastifyRequest, reply: FastifyReply) => {
            const [rows] = await conn.query('SELECT * FROM categorias_d');
            reply.send(rows);
        });

        // ROTA: Listar todos os itens do Dungeons (com filtro de raridade)
        instance.get('/itens', async (request: FastifyRequest, reply: FastifyReply) => {
            const { raridade } = request.query as { raridade?: string };
            let query = 'SELECT * FROM itens_d';
            const params: (string | number)[] = [];

            if (raridade) {
                // <-- MUDANÇA: Corrigida a vulnerabilidade de SQL Injection usando placeholders (?)
                query += ' WHERE raridade = ?';
                params.push(raridade);
            }
            const [rows] = await conn.query(query, params);
            reply.send(rows);
        });

        // ROTA: Buscar um item específico por ID
        instance.get('/itens/:id', async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            const [rows] = await conn.query('SELECT * FROM itens_d WHERE id = ?', [id]);
            if ((rows as any[]).length > 0) {
                reply.send((rows as any[])[0]);
            } else {
                reply.status(404).send({ message: 'Item não encontrado' });
            }
        });

        // ROTA: Criar um novo item
        instance.post('/itens', async (request: FastifyRequest, reply: FastifyReply) => {
            const { nome, poder, raridade, categoria_id } = request.body as ItemBody;
            await conn.query(
                'INSERT INTO itens_d (nome, poder, raridade, categoria_id) VALUES (?, ?, ?, ?)',
                [nome, poder, raridade, categoria_id]
            );
            reply.status(201).send({ message: 'Item criado com sucesso!' });
        });

        // ROTA: Atualizar um item existente
        instance.put('/itens/:id', async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            const { nome, poder, raridade, categoria_id } = request.body as ItemBody;
            await conn.query(
                'UPDATE itens_d SET nome = ?, poder = ?, raridade = ?, categoria_id = ? WHERE id = ?',
                [nome, poder, raridade, categoria_id, id]
            );
            reply.status(204).send();
        });

        // ROTA: Deletar um item
        instance.delete('/itens/:id', async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            await conn.query('DELETE FROM itens_d WHERE id = ?', [id]);
            reply.status(204).send();
        });
    }, { prefix: '/api' }); // Mantido o prefixo /api para compatibilidade


    // =======================================================
    // ROTAS - MINECRAFT JAVA EDITION (PRODUCTS)
    // =======================================================
    fastify.register(async (instance) => {
        // Rota para CRIAR um novo produto (POST)
        instance.post('/products', async (request: FastifyRequest<{ Body: IProduct }>, reply: FastifyReply) => {
            const { name, description, type_id, download_url } = request.body;

            if (!name || !type_id || !download_url) {
                return reply.status(400).send({ message: 'Nome, tipo e URL de download são obrigatórios.' });
            }

            try {
                const [result] = await conn.query<OkPacket>(
                    'INSERT INTO products (name, description, type_id, download_url) VALUES (?, ?, ?, ?)',
                    [name, description, type_id, download_url]
                );
                reply.status(201).send({ id: result.insertId, ...request.body });
            } catch (error) {
                console.error("Erro ao criar produto:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao criar produto.' });
            }
        });

        // Rota para LER todos os produtos (com filtros) (GET)
        instance.get('/products', async (request: FastifyRequest<{ Querystring: IQueryString }>, reply: FastifyReply) => {
            const { name, type } = request.query;

            let query = `
                SELECT p.id, p.name, p.description, p.download_url, p.created_at, pt.name as type_name
                FROM products p
                JOIN product_types pt ON p.type_id = pt.id
            `;
            const params: (string | number)[] = [];
            let whereClauses: string[] = [];

            if (name) {
                whereClauses.push('p.name LIKE ?');
                params.push(`%${name}%`);
            }
            if (type) {
                whereClauses.push('pt.name = ?');
                params.push(type);
            }

            if (whereClauses.length > 0) {
                query += ' WHERE ' + whereClauses.join(' AND ');
            }

            query += ' ORDER BY p.created_at DESC';

            try {
                const [rows] = await conn.query<RowDataPacket[]>(query, params);
                reply.send(rows);
            } catch (error) {
                console.error("Erro ao buscar produtos:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao buscar produtos.' });
            }
        });

        // Rota para LER os tipos de produtos
        instance.get('/product-types', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const [rows] = await conn.query<RowDataPacket[]>('SELECT id, name FROM product_types ORDER BY name');
                reply.send(rows);
            } catch (error) {
                console.error("Erro ao buscar tipos de produto:", error);
                reply.status(500).send({ message: 'Erro interno do servidor.' });
            }
        });

        // Rota para ATUALIZAR um produto (PUT)
        instance.put('/products/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: IProduct }>, reply: FastifyReply) => {
            const id = parseInt(request.params.id, 10);
            const { name, description, type_id, download_url } = request.body;

            if (isNaN(id)) {
                return reply.status(400).send({ message: 'ID de produto inválido.' });
            }
            if (!name || !type_id || !download_url) {
                return reply.status(400).send({ message: 'Nome, tipo e URL de download são obrigatórios.' });
            }

            try {
                const [result] = await conn.query<OkPacket>(
                    'UPDATE products SET name = ?, description = ?, type_id = ?, download_url = ? WHERE id = ?',
                    [name, description, type_id, download_url, id]
                );

                if (result.affectedRows === 0) {
                    return reply.status(404).send({ message: 'Produto não encontrado.' });
                }

                reply.send({ id, ...request.body });
            } catch (error) {
                console.error("Erro ao atualizar produto:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao atualizar produto.' });
            }
        });

        // Rota para DELETAR um produto (DELETE)
        instance.delete('/products/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const id = parseInt(request.params.id, 10);

            if (isNaN(id)) {
                return reply.status(400).send({ message: 'ID de produto inválido.' });
            }

            try {
                const [result] = await conn.query<OkPacket>('DELETE FROM products WHERE id = ?', [id]);

                if (result.affectedRows === 0) {
                    return reply.status(404).send({ message: 'Produto não encontrado.' });
                }

                reply.status(204).send();
            } catch (error) {
                console.error("Erro ao deletar produto:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao deletar produto.' });
            }
        });
    }, { prefix: '/api' }); // <-- MUDANÇA: Agrupado para consistência. As rotas agora são /api/products, etc.


    // =======================================================
    // ROTAS - MINECRAFT EDUCATION
    // =======================================================
    // <-- MUDANÇA: REMOVIDO O BLOCO DUPLICADO. ESTE É O ÚNICO BLOCO PARA /api/education.
    fastify.register(async (instance) => {

        // ROTA: Listar todas as matérias (Subjects)
        instance.get('/subjects', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const [rows] = await conn.query<RowDataPacket[]>('SELECT id, name FROM subjects ORDER BY name');
                reply.send({ data: rows }); // Frontend espera um objeto com a chave "data"
            } catch (error) {
                console.error("Erro ao buscar matérias:", error);
                reply.status(500).send({ message: 'Erro interno ao buscar matérias.' });
            }
        });

        // ROTA: Listar todas as aulas (Lessons) com filtros
        instance.get('/lessons', async (request: FastifyRequest<{ Querystring: LessonQuery }>, reply: FastifyReply) => {
            const { title, subject_id } = request.query;
            let query = 'SELECT * FROM lessons';
            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (title) {
                conditions.push('title LIKE ?');
                params.push(`%${title}%`);
            }
            if (subject_id) {
                conditions.push('subject_id = ?');
                params.push(parseInt(subject_id, 10));
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' ORDER BY title';

            try {
                const [rows] = await conn.query<RowDataPacket[]>(query, params);
                reply.send({ data: rows }); // Frontend espera um objeto com a chave "data"
            } catch (error) {
                console.error("Erro ao buscar aulas:", error);
                reply.status(500).send({ message: 'Erro interno ao buscar aulas.' });
            }
        });

        // ROTA: Criar uma nova aula (Lesson)
        instance.post('/lessons', async (request: FastifyRequest<{ Body: Lesson }>, reply: FastifyReply) => {
            const { title, description, subject_id, target_age_group, content_url } = request.body;
            if (!title || !subject_id) {
                return reply.status(400).send({ message: 'Título e matéria são obrigatórios.' });
            }
            try {
                const [result] = await conn.query<OkPacket>(
                    'INSERT INTO lessons (title, description, subject_id, target_age_group, content_url) VALUES (?, ?, ?, ?, ?)',
                    [title, description, subject_id, target_age_group, content_url]
                );
                reply.status(201).send({ id: result.insertId, ...request.body });
            } catch (error) {
                console.error("Erro ao criar aula:", error);
                reply.status(500).send({ message: 'Erro interno ao criar aula.' });
            }
        });

        // ROTA: Atualizar uma aula (Lesson) existente
        instance.put('/lessons/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: Lesson }>, reply: FastifyReply) => {
            const id = parseInt(request.params.id, 10);
            const { title, description, subject_id, target_age_group, content_url } = request.body;
            if (isNaN(id)) return reply.status(400).send({ message: 'ID inválido.' });
            if (!title || !subject_id) return reply.status(400).send({ message: 'Título e matéria são obrigatórios.' });

            try {
                const [result] = await conn.query<OkPacket>(
                    'UPDATE lessons SET title = ?, description = ?, subject_id = ?, target_age_group = ?, content_url = ? WHERE id = ?',
                    [title, description, subject_id, target_age_group, content_url, id]
                );
                if (result.affectedRows === 0) {
                    return reply.status(404).send({ message: 'Aula não encontrada.' });
                }
                reply.status(204).send();
            } catch (error) {
                console.error("Erro ao atualizar aula:", error);
                reply.status(500).send({ message: 'Erro interno ao atualizar aula.' });
            }
        });

        // ROTA: Deletar uma aula (Lesson)
        instance.delete('/lessons/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const id = parseInt(request.params.id, 10);
            if (isNaN(id)) return reply.status(400).send({ message: 'ID inválido.' });
            try {
                const [result] = await conn.query<OkPacket>('DELETE FROM lessons WHERE id = ?', [id]);
                if (result.affectedRows === 0) {
                    return reply.status(404).send({ message: 'Aula não encontrada.' });
                }
                reply.status(204).send();
            } catch (error) {
                console.error("Erro ao deletar aula:", error);
                reply.status(500).send({ message: 'Erro ao deletar aula.' });
            }
        });

        // ROTA: Gerar relatório de aulas por matéria
        instance.get('/report', async (request: FastifyRequest, reply: FastifyReply) => {
            const query = `
                SELECT 
                    l.id,
                    l.title,
                    l.description,
                    l.target_age_group,
                    s.name as subject_name 
                FROM lessons AS l 
                INNER JOIN subjects AS s ON l.subject_id = s.id
                ORDER BY s.name, l.title;
            `;
            try {
                const [rows] = await conn.query<RowDataPacket[]>(query);
                reply.send({ data: rows }); // Frontend espera um objeto com a chave "data"
            } catch (error) {
                console.error("Erro ao gerar relatório:", error);
                reply.status(500).send({ message: 'Erro interno ao gerar o relatório.' });
            }
        });

    }, { prefix: '/api/education' });


    // =======================================================
    // ROTAS - MINECRAFT LEGENDS (SKINS)
    // =======================================================
    // <-- MUDANÇA: Agrupado as rotas do Legends dentro de um register com prefixo para melhor organização.
    fastify.register(async (instance) => {
        // ROTA: Criar nova skin
        instance.post('/', async (request: FastifyRequest<{ Body: Skin }>, reply: FastifyReply) => {
            const { name, imageUrl, rarity, price } = request.body;

            if (!name || !imageUrl || !rarity || price === undefined) {
                return reply.status(400).send({ message: 'Todos os campos (nome, imageUrl, raridade, preço) são obrigatórios.' });
            }

            try {
                const [result] = await conn.query<OkPacket>(
                    'INSERT INTO skins (name, imageUrl, rarity, price) VALUES (?, ?, ?, ?)',
                    [name, imageUrl, rarity, price]
                );
                reply.status(201).send({ id: result.insertId, ...request.body });
            } catch (error) {
                console.error("Erro ao criar skin:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao criar skin.' });
            }
        });

        // ROTA: Ler todas as skins
        instance.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const [rows] = await conn.query<RowDataPacket[]>('SELECT id, name, imageUrl, rarity, price FROM skins');
                reply.send(rows);
            } catch (error) {
                console.error("Erro ao buscar skins:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao buscar skins.' });
            }
        });

        // ROTA: Ler uma skin específica por ID
        instance.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const id = parseInt(request.params.id, 10);

            if (isNaN(id)) {
                return reply.status(400).send({ message: 'ID de skin inválido.' });
            }

            try {
                const [rows] = await conn.query<RowDataPacket[]>('SELECT id, name, imageUrl, rarity, price FROM skins WHERE id = ?', [id]);
                if (rows.length > 0) {
                    reply.send(rows[0]);
                } else {
                    reply.status(404).send({ message: 'Skin não encontrada.' });
                }
            } catch (error) {
                console.error("Erro ao buscar skin por ID:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao buscar skin.' });
            }
        });

        // ROTA: Atualizar uma skin
        instance.put('/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: Skin }>, reply: FastifyReply) => {
            const id = parseInt(request.params.id, 10);
            const { name, imageUrl, rarity, price } = request.body;

            if (isNaN(id)) {
                return reply.status(400).send({ message: 'ID de skin inválido.' });
            }
            if (!name || !imageUrl || !rarity || price === undefined) {
                return reply.status(400).send({ message: 'Todos os campos são obrigatórios para atualização.' });
            }

            try {
                const [result] = await conn.query<OkPacket>(
                    'UPDATE skins SET name = ?, imageUrl = ?, rarity = ?, price = ? WHERE id = ?',
                    [name, imageUrl, rarity, price, id]
                );

                if (result.affectedRows > 0) {
                    reply.send({ message: 'Skin atualizada com sucesso.', id });
                } else {
                    reply.status(404).send({ message: 'Skin não encontrada.' });
                }
            } catch (error) {
                console.error("Erro ao atualizar skin:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao atualizar skin.' });
            }
        });

        // ROTA: Deletar uma skin
        instance.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const id = parseInt(request.params.id, 10);

            if (isNaN(id)) {
                return reply.status(400).send({ message: 'ID de skin inválido.' });
            }

            try {
                const [result] = await conn.query<OkPacket>('DELETE FROM skins WHERE id = ?', [id]);

                if (result.affectedRows > 0) {
                    reply.status(204).send(); // Resposta padrão para delete com sucesso
                } else {
                    reply.status(404).send({ message: 'Skin não encontrada.' });
                }
            } catch (error) {
                console.error("Erro ao deletar skin:", error);
                reply.status(500).send({ message: 'Erro interno do servidor ao deletar skin.' });
            }
        });
    }, { prefix: '/api/skins' }); // <-- MUDANÇA: Novo prefixo para as rotas de skins.

}

// Exportando o plugin para ser usado no servidor principal
export default fastifyPlugin(rotasMinecraft);