// bannerManagement.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fastifyPlugin } from 'fastify-plugin'
// Importa RowDataPacket para resultados de SELECT e OkPacket para resultados de INSERT/UPDATE/DELETE.
import { RowDataPacket, OkPacket } from 'mysql2/promise';
import { conn } from '../db/conn'; // Reutiliza sua conexão com o banco de dados

// Interface para definir a estrutura de um banner
interface Banner {
    id?: number;
    type: string;
    title: string;
    description?: string;
    images: string[]; // Array de URLs de imagens
}

async function bannerRoutes(fastify: FastifyInstance) {

    // Rota para criar um novo banner (POST)
    fastify.post('/banners', async (request: FastifyRequest<{ Body: Banner }>, reply: FastifyReply) => {
        try {
            const { type, title, description, images } = request.body;

            if (!type || !title || !images || !Array.isArray(images) || images.length === 0) {
                return reply.status(400).send({ message: 'Tipo, título e imagens são obrigatórios e imagens deve ser um array não vazio.' });
            }

            const imagesJson = JSON.stringify(images); // Converte o array de imagens para uma string JSON para armazenar no banco.

            // A função `conn.execute` retorna uma tupla `[resultados, campos]`.
            // Para operações INSERT, o primeiro elemento `resultados` é do tipo `OkPacket`.
            // Usamos a desestruturação `[result]` e fazemos o cast para `OkPacket` para garantir a tipagem correta.
            const [result] = await conn.execute<OkPacket>(
                'INSERT INTO banners (type, title, description, images) VALUES (?, ?, ?, ?)',
                [type, title, description || null, imagesJson]
            );

            // Agora podemos acessar `insertId` diretamente do `result` tipado como `OkPacket`.
            const insertId = result.insertId;
            reply.status(201).send({ id: insertId, type, title, description, images });

        } catch (error) {
            console.error('Erro ao criar banner:', error);
            reply.status(500).send({ message: 'Erro interno do servidor ao criar banner.' });
        }
    });

    // Rota para obter todos os banners (GET)
    fastify.get('/banners', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Para operações SELECT, o primeiro elemento `resultados` é um array de `RowDataPacket`.
            // Fazemos o cast explícito para `RowDataPacket[]`. Não precisamos mais da variável `fields`.
            const [rows] = await conn.execute<RowDataPacket[]>('SELECT * FROM banners');
            // Mapeamos as linhas para parsear a string JSON de imagens de volta para um array.
            const banners = rows.map(row => ({
                ...row,
                // `row.images` é uma string JSON, então a convertemos para um array de strings.
                images: JSON.parse(row.images)
            }));
            reply.status(200).send(banners);
        } catch (error) {
            console.error('Erro ao buscar banners:', error);
            reply.status(500).send({ message: 'Erro interno do servidor ao buscar banners.' });
        }
    });

    // Rota para obter um banner por ID (GET)
    fastify.get('/banners/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
            const { id } = request.params;
            // Similar ao GET de todos os banners, esperamos um array de `RowDataPacket`.
            const [rows] = await conn.execute<RowDataPacket[]>('SELECT * FROM banners WHERE id = ?', [id]);

            if (rows.length === 0) {
                return reply.status(404).send({ message: 'Banner não encontrado.' });
            }

            // Acessamos o primeiro (e único) elemento do array de linhas.
            const banner = {
                ...rows[0],
                // Converte a string JSON de imagens de volta para array.
                images: JSON.parse(rows[0].images)
            };
            reply.status(200).send(banner);
   
        } catch (error) {
            console.error('Erro ao buscar banner por ID:', error);
            reply.status(500).send({ message: 'Erro interno do servidor ao buscar banner.' });
        }
    });

    // Rota para atualizar um banner (PUT)
    fastify.put('/banners/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: Banner }>, reply: FastifyReply) => {
        try {
            const { id } = request.params;
            const { type, title, description, images } = request.body;

            if (!type || !title || !images || !Array.isArray(images) || images.length === 0) {
                return reply.status(400).send({ message: 'Tipo, título e imagens são obrigatórios e imagens deve ser um array não vazio.' });
            }

            const imagesJson = JSON.stringify(images); // Converte o array de imagens para string JSON.

            // Para operações UPDATE, o resultado é um `OkPacket`.
            const [result] = await conn.execute<OkPacket>(
                'UPDATE banners SET type = ?, title = ?, description = ?, images = ? WHERE id = ?',
                [type, title, description || null, imagesJson, id]
            );

            // Verificamos `affectedRows` do `OkPacket` para saber se a atualização ocorreu.
            if (result.affectedRows === 0) {
                return reply.status(404).send({ message: 'Banner não encontrado para atualização.' });
            }

            reply.status(200).send({ id: parseInt(id), type, title, description, images });

        } catch (error) {
            console.error('Erro ao atualizar banner:', error);
            reply.status(500).send({ message: 'Erro interno do servidor ao atualizar banner.' });
        }
    });

    // Rota para deletar um banner (DELETE)
    fastify.delete('/banners/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
        try {
            const { id } = request.params;

            // Para operações DELETE, o resultado é um `OkPacket`.
            const [result] = await conn.execute<OkPacket>('DELETE FROM banners WHERE id = ?', [id]);

            // Verificamos `affectedRows` do `OkPacket` para saber se a deleção ocorreu.
            if (result.affectedRows === 0) {
                return reply.status(404).send({ message: 'Banner não encontrado para exclusão.' });
            }

            reply.status(204).send(); // 204 No Content - Indica sucesso sem conteúdo para retornar.

        } catch (error) {
            console.error('Erro ao deletar banner:', error);
            reply.status(500).send({ message: 'Erro interno do servidor ao deletar banner.' });
        }
    });
}

export default fastifyPlugin(bannerRoutes);