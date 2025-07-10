import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { conn } from "../db/conn"
import { RowDataPacket } from 'mysql2';
import fastifyPlugin from 'fastify-plugin';

// =======================================================
// INÍCIO DAS ROTAS - MINECRAFT DUNGEONS CRUD
// =======================================================

// Tipagem para o corpo da requisição de um item
interface ItemBody {
    nome: string;
    poder: number;
    raridade: 'Comum' | 'Raro' | 'Único';
    categoria_id: number;
}

// Interface para o corpo da requisição de um produto
interface IProduct { // Produto
    id?: number; // ID é opcional em algumas respostas
    name: string; // Nome é obrigatório
    description: string; // Descrição é obrigatória
    type_id: number; // ID do tipo é obrigatório
    download_url: string; // URL de download é obrigatória
}

// Interface para os parâmetros de query (filtros)
interface IQueryString {
    name?: string; // Nome do produto (opcional)
    type?: string; // Tipo do produto (opcional)
}

// Função que agrupa e registra todas as rotas do CRUD de Dungeons
export async function rotasMinecraft(fastify: FastifyInstance, opts: any) {


    fastify.register(async (instance) => {
        // ROTA: Listar todas as categorias do Dungeons
        fastify.get('/categoria', async (request: FastifyRequest, reply: FastifyReply) => {
            const [rows] = await conn.query('SELECT * FROM categorias_d');
            reply.send(rows);
        });

        // ROTA: Listar todos os itens do Dungeons (com filtro de raridade)
        fastify.get('/itens', async (request: FastifyRequest, reply: FastifyReply) => {
            const { raridade } = request.query as { raridade?: string };
            let query = 'SELECT * FROM itens_d';
            if (raridade) {
                query += ` WHERE raridade = '${raridade}'`;
            }
            const [rows] = await conn.query(query);
            reply.send(rows);
        });

        // ROTA: Buscar um item específico por ID
        fastify.get('/itens/:id', async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            const [rows] = await conn.query('SELECT * FROM itens_d WHERE id = ?', [id]);
            if ((rows as any[]).length > 0) {
                reply.send((rows as any[])[0]);
            } else {
                reply.status(404).send({ message: 'Item não encontrado' });
            }
        });

        // ROTA: Criar um novo item
        fastify.post('/itens', async (request: FastifyRequest, reply: FastifyReply) => {
            const { nome, poder, raridade, categoria_id } = request.body as ItemBody;
            await conn.query(
                'INSERT INTO itens_d (nome, poder, raridade, categoria_id) VALUES (?, ?, ?, ?)',
                [nome, poder, raridade, categoria_id]
            );
            reply.status(201).send({ message: 'Item criado com sucesso!' });
        });

        // ROTA: Atualizar um item existente
        fastify.put('/itens/:id', async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            const { nome, poder, raridade, categoria_id } = request.body as ItemBody;
            await conn.query(
                'UPDATE itens_d SET nome = ?, poder = ?, raridade = ?, categoria_id = ? WHERE id = ?',
                [nome, poder, raridade, categoria_id, id]
            );
            reply.status(204).send();
        });

        // ROTA: Deletar um item
        fastify.delete('/itens/:id', async (request: FastifyRequest, reply: FastifyReply) => {
            const { id } = request.params as { id: string };
            await conn.query('DELETE FROM itens_d WHERE id = ?', [id]);
            reply.status(204).send();
        });
    }, { prefix: '/api' });

    //<------------------------------------------>
    //Rotas para o Java
    //<------------------------------------------>

    // Rota para CRIAR um novo produto (POST)
    
    fastify.post('/api/products', async (request: FastifyRequest<{ Body: IProduct }>, reply: FastifyReply) => {
        const { name, description, type_id, download_url } = request.body;

        if (!name || !type_id || !download_url) {
            return reply.status(400).send({ message: 'Nome, tipo e URL de download são obrigatórios.' });
        }

        try {
            const [result] = await conn.query(
                'INSERT INTO products (name, description, type_id, download_url) VALUES (?, ?, ?, ?)',
                [name, description, type_id, download_url]
            );
            const insertId = (result as any).insertId;
            reply.status(201).send({ id: insertId, ...request.body });
        } catch (error) {
            console.error("Erro ao criar produto:", error);
            reply.status(500).send({ message: 'Erro interno do servidor ao criar produto.' });
        }
    });

    // Rota para LER todos os produtos (com filtros) (GET)
    fastify.get('/api/products', async (request: FastifyRequest<{ Querystring: IQueryString }>, reply: FastifyReply) => {
        const { name, type } = request.query;

        let query = `
            SELECT p.id, p.name, p.description, p.download_url, p.created_at, pt.name as type_name
            FROM products p
            JOIN product_types pt ON p.type_id = pt.id
        `;
        const params: (string | number)[] = [];

        let whereClause = '';
        if (name) {
            whereClause += 'p.name LIKE ?';
            params.push(`%${name}%`);
        }
        if (type) {
            if (whereClause) whereClause += ' AND ';
            whereClause += 'pt.name = ?';
            params.push(type);
        }

        if (whereClause) {
            query += ' WHERE ' + whereClause;
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
    fastify.get('/api/product-types', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const [rows] = await conn.query<RowDataPacket[]>('SELECT id, name FROM product_types ORDER BY name');
            reply.send(rows);
        } catch (error) {
            console.error("Erro ao buscar tipos de produto:", error);
            reply.status(500).send({ message: 'Erro interno do servidor.' });
        }
    });

    // Rota para ATUALIZAR um produto (PUT)
    fastify.put('/api/products/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: IProduct }>, reply: FastifyReply) => {
        const id = parseInt(request.params.id, 10);
        const { name, description, type_id, download_url } = request.body;

        if (isNaN(id)) {
            return reply.status(400).send({ message: 'ID de produto inválido.' });
        }
        if (!name || !type_id || !download_url) {
            return reply.status(400).send({ message: 'Nome, tipo e URL de download são obrigatórios.' });
        }

        try {
            const [result] = await conn.query(
                'UPDATE products SET name = ?, description = ?, type_id = ?, download_url = ? WHERE id = ?',
                [name, description, type_id, download_url, id]
            );

            if ((result as any).affectedRows === 0) {
                return reply.status(404).send({ message: 'Produto não encontrado.' });
            }

            reply.send({ id, ...request.body });
        } catch (error) {
            console.error("Erro ao atualizar produto:", error);
            reply.status(500).send({ message: 'Erro interno do servidor ao atualizar produto.' });
        }
    });

    // Rota para DELETAR um produto (DELETE)
    fastify.delete('/api/products/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        const id = parseInt(request.params.id, 10);

        if (isNaN(id)) {
            return reply.status(400).send({ message: 'ID de produto inválido.' });
        }

        try {
            const [result] = await conn.query('DELETE FROM products WHERE id = ?', [id]);

            if ((result as any).affectedRows === 0) {
                return reply.status(404).send({ message: 'Produto não encontrado.' });
            }

            reply.status(204).send();
        } catch (error) {
            console.error("Erro ao deletar produto:", error);
            reply.status(500).send({ message: 'Erro interno do servidor ao deletar produto.' });
        }
    });

}

// Exportando o plugin para ser usado no servidor principal
export default fastifyPlugin(rotasMinecraft);